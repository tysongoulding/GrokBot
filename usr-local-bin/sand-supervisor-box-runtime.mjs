import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BOOT_FETCH_GIT_SHA_REGEX,
  HOST_DIR,
  HOST_VERSION_PATH,
} from "./sand-supervisor-contract.mjs";

export const BOX_RUNTIME_SOURCE_DIR = `${HOST_DIR}/box-runtime`;
export const BOX_RUNTIME_APPLIED_MARKER_PATH = "/var/lib/sand-box-runtime/applied";
export const BOX_RUNTIME_FLOOR_DIR = "/var/lib/sand-box-runtime/floor";
export const BOX_RUNTIME_ROLLOUT_MARKER_PATH = "/opt/sand/box-runtime-rollout";
export const BOX_RUNTIME_PROCESS_RESTART_PATH = "/opt/sand/box-runtime-process-restart";
export const BOX_RUNTIME_INHERITED_BUNDLE_MARKER_PATH =
  "/var/lib/sand-box-runtime/bundle-root-inherited-from-box";
export const BOX_RUNTIME_ALLOW_DIR = "/var/lib/sand-box-runtime/allow";
export const BOX_RUNTIME_ALLOW_PATH = `${BOX_RUNTIME_ALLOW_DIR}/authorized`;
export const BOX_RUNTIME_INSTALLER_PATH = `${BOX_RUNTIME_ALLOW_DIR}/sand-supervisor-box-runtime.mjs`;
export const BOX_RUNTIME_PROCESS_RESTART_GROUPS = Object.freeze(["governor", "tunnel"]);
export const BOX_RUNTIME_INSTALL_ARGV = Object.freeze([
  "/exec-daemon/node",
  BOX_RUNTIME_INSTALLER_PATH,
]);
export const BOX_RUNTIME_RETRY_BACKOFF_MS = 5 * 60_000;
const BOX_RUNTIME_VERSION_MAX_BYTES = 64;
const BOX_RUNTIME_MANIFEST_MAX_BYTES = 64 * 1024;

const SHA256_RE = /^[0-9a-f]{64}$/;
const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export const BOX_RUNTIME_ALLOWLIST = Object.freeze([
  row("box-contract.generated.mjs", "/usr/local/bin/box-contract.generated.mjs", "governor", true),
  row("sand-ua-governor.mjs", "/usr/local/bin/sand-ua-governor.mjs", "governor", true),
  row("cdp-cookies.mjs", "/usr/local/bin/cdp-cookies.mjs", "governor", true),
  row(
    "sand-fingerprint-profiles.mjs",
    "/usr/local/bin/sand-fingerprint-profiles.mjs",
    "governor",
    true,
  ),
  row("sand-egress-timezone.mjs", "/usr/local/bin/sand-egress-timezone.mjs", "governor", true),
  row("sand-locale-match.mjs", "/usr/local/bin/sand-locale-match.mjs", "governor", true),
  row("sand-session-sync.mjs", "/usr/local/bin/sand-session-sync.mjs", null, true),
  row("sand-web-bot-auth.mjs", "/usr/local/bin/sand-web-bot-auth.mjs", null, true),
  row("sand-cookie-persist.mjs", "/usr/local/bin/sand-cookie-persist.mjs", null, true),
  row("sand-cookie-import.mjs", "/usr/local/bin/sand-cookie-import.mjs", null, true),
  row("sand-egress-tunnel", "/usr/local/bin/sand-egress-tunnel", "tunnel", false),
]);

function row(name, dest, restart, required, also = []) {
  return Object.freeze({ name, dest, restart, required, also: Object.freeze(also) });
}

function allowlistRow(name) {
  return BOX_RUNTIME_ALLOWLIST.find((entry) => entry.name === name) ?? null;
}

function emptyInstall(status, reason, version = null) {
  return { status, reason, restart: [], version };
}

function containedPath(rootDir, name) {
  const root = resolve(rootDir);
  const file = resolve(root, name);
  if (file === root || !file.startsWith(`${root}${sep}`)) return null;
  return file;
}

export function parseBoxRuntimeManifest(raw) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "manifest-malformed" };
  }
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "manifest-malformed" };
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "files" || !Array.isArray(value.files)) {
    return { ok: false, reason: "manifest-malformed" };
  }
  const files = [];
  const seen = new Set();
  for (const entry of value.files) {
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, reason: "manifest-malformed" };
    }
    const entryKeys = Object.keys(entry).sort();
    if (entryKeys.length !== 2 || entryKeys[0] !== "name" || entryKeys[1] !== "sha256") {
      return { ok: false, reason: "manifest-malformed" };
    }
    if (typeof entry.name !== "string" || !NAME_RE.test(entry.name) || seen.has(entry.name)) {
      return {
        ok: false,
        reason: seen.has(entry.name) ? "manifest-duplicate" : "manifest-malformed",
      };
    }
    if (typeof entry.sha256 !== "string" || !SHA256_RE.test(entry.sha256)) {
      return { ok: false, reason: "manifest-malformed" };
    }
    const allowed = allowlistRow(entry.name);
    if (allowed == null) return { ok: false, reason: "name-not-allowed" };
    seen.add(entry.name);
    files.push(allowed);
  }
  for (const allowed of BOX_RUNTIME_ALLOWLIST) {
    if (allowed.required && !seen.has(allowed.name)) {
      return { ok: false, reason: "required-missing" };
    }
  }
  const digests = new Map(value.files.map((entry) => [entry.name, entry.sha256]));
  return { ok: true, files, digests };
}

export function writeMarkerNoFollow(path, contents, sync = fsyncSync) {
  const flags =
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  const openMarker = () => {
    try {
      return openSync(path, flags, 0o644);
    } catch (error) {
      if (error != null && (error.code === "ELOOP" || error.code === "EEXIST")) return undefined;
      throw error;
    }
  };
  let fd = openMarker();
  if (fd == null) {
    rmSync(path, { force: true });
    fd = openMarker();
  }
  if (fd == null) {
    const error = new Error("marker path is a symlink");
    error.code = "ELOOP";
    throw error;
  }
  try {
    writeSync(fd, contents);
    fchmodSync(fd, 0o644);
    sync(fd);
  } finally {
    closeSync(fd);
  }
  const dirfd = openSync(dirname(path), constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try {
    sync(dirfd);
  } finally {
    closeSync(dirfd);
  }
}

function writeFileAtomic(dest, bytes, mode) {
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.sand-runtime-tmp`;
  const fd = openSync(tmp, "w", mode);
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } catch (error) {
    closeSync(fd);
    rmSync(tmp, { force: true });
    throw error;
  }
  closeSync(fd);
  try {
    renameSync(tmp, dest);
  } catch (error) {
    rmSync(tmp, { force: true });
    throw error;
  }
}

function readOptional(path) {
  try {
    return readFileSync(path);
  } catch (error) {
    if (error != null && error.code === "ENOENT") return null;
    throw error;
  }
}

function installerTrustedOwnerUids() {
  const uids = [0];
  if (typeof process.geteuid === "function") uids.push(process.geteuid());
  const sudoUid = Number.parseInt(process.env.SUDO_UID ?? "", 10);
  if (Number.isInteger(sudoUid) && sudoUid >= 0) uids.push(sudoUid);
  return uids;
}

function pathPresentOrUnknown(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    return error == null || error.code !== "ENOENT";
  }
}

function regularFileBytesOrNull(path) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error != null && error.code === "ENOENT") return null;
    throw error;
  }
  return stat.isFile() ? readFileSync(path) : null;
}

export function installBoxRuntime({
  sourceDir,
  manifestText,
  bundleVersion,
  appliedMarkerPath,
  processRestartPath,
  inheritedBundleMarkerPath,
  floorDir,
  destFor = (entry) => entry.dest,
  trustedOwnerUids = installerTrustedOwnerUids(),
  markerSync = fsyncSync,
}) {
  const version = gitShaOrNull(bundleVersion);
  if (pathPresentOrUnknown(inheritedBundleMarkerPath)) {
    return emptyInstall("noop", "bundle-root-inherited-from-box", version);
  }
  const parsed = parseBoxRuntimeManifest(manifestText);
  if (!parsed.ok) return emptyInstall("failed", parsed.reason, version);
  if (version == null) {
    return emptyInstall("failed", "version-unreadable", null);
  }
  let applied = null;
  try {
    applied = readFileSync(appliedMarkerPath, "utf8").trim();
  } catch (error) {
    if (error == null || error.code !== "ENOENT") {
      return emptyInstall("failed", "marker-unreadable", bundleVersion);
    }
  }
  if (applied === bundleVersion) {
    return emptyInstall("noop", "marker current", bundleVersion);
  }

  const staged = [];
  for (const entry of parsed.files) {
    const source = containedPath(sourceDir, entry.name);
    if (source == null) return emptyInstall("failed", "source-escape", bundleVersion);
    let sourceStat;
    try {
      sourceStat = lstatSync(source);
    } catch (error) {
      if (error != null && error.code === "ENOENT") {
        return emptyInstall("failed", "source-missing", bundleVersion);
      }
      return emptyInstall("failed", "source-unreadable", bundleVersion);
    }
    if (!sourceStat.isFile()) return emptyInstall("failed", "source-not-file", bundleVersion);
    if (!trustedOwnerUids.includes(sourceStat.uid)) {
      return emptyInstall("failed", "source-owner-untrusted", bundleVersion);
    }
    let bytes;
    try {
      bytes = readFileSync(source);
    } catch (error) {
      return emptyInstall(
        "failed",
        installFailureReason("source-unreadable", error),
        bundleVersion,
      );
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== parsed.digests.get(entry.name)) {
      return emptyInstall("failed", "digest-mismatch", bundleVersion);
    }
    const targets = [];
    for (const dest of [entry.dest, ...(entry.also ?? [])]) {
      const path = destFor({ ...entry, dest });
      if (typeof path !== "string" || !path.startsWith("/") || path.includes("\0")) {
        return emptyInstall("failed", "dest-refused", bundleVersion);
      }
      let destStat = null;
      try {
        destStat = lstatSync(path);
      } catch (error) {
        if (error == null || error.code !== "ENOENT") {
          return emptyInstall("failed", "dest-unreadable", bundleVersion);
        }
      }
      if (destStat != null && !destStat.isFile()) {
        return emptyInstall("failed", "dest-not-file", bundleVersion);
      }
      let previous = null;
      if (destStat != null) {
        try {
          previous = readFileSync(path);
        } catch (error) {
          return emptyInstall(
            "failed",
            installFailureReason("dest-unreadable", error),
            bundleVersion,
          );
        }
      }
      targets.push({ dest: path, previous, floor: dest === entry.dest });
    }
    staged.push({ name: entry.name, restart: entry.restart, bytes, targets });
  }

  try {
    for (const file of staged) {
      const primary = file.targets.find((target) => target.floor);
      if (primary?.previous == null) continue;
      const floorPath = join(floorDir, file.name);
      if (!existsSync(floorPath)) writeFileAtomic(floorPath, primary.previous, 0o644);
    }
  } catch (error) {
    return emptyInstall("failed", installFailureReason("floor-failed", error), bundleVersion);
  }

  const replaced = [];
  const requests = [];
  const queueRequest = (path, contentsFor) => {
    const previous = regularFileBytesOrNull(path);
    requests.push({ path, previous });
    writeMarkerNoFollow(path, contentsFor(previous), markerSync);
  };
  const restart = parseProcessRestartRequest(
    staged
      .filter((file) =>
        file.targets.some(
          (target) => target.previous == null || !target.previous.equals(file.bytes),
        ),
      )
      .map((file) => file.restart)
      .join("\n"),
  );
  try {
    if (restart.length > 0) {
      queueRequest(processRestartPath, (previous) =>
        processRestartRequestText([...restart, ...parseProcessRestartRequest(previous)]),
      );
    }
    for (const file of staged) {
      const written = [];
      for (const target of file.targets) {
        if (target.previous != null && target.previous.equals(file.bytes)) continue;
        writeFileAtomic(target.dest, file.bytes, 0o755);
        written.push(target);
      }
      if (written.length > 0) replaced.push({ ...file, written });
    }
    writeFileAtomic(appliedMarkerPath, Buffer.from(`${bundleVersion}\n`), 0o644);
  } catch (error) {
    let rollbackCode = "";
    let restoredAll = true;
    for (const file of replaced) {
      for (const target of file.written) {
        try {
          if (target.previous == null) rmSync(target.dest, { force: true });
          else writeFileAtomic(target.dest, target.previous, 0o755);
        } catch (rollbackError) {
          restoredAll = false;
          rollbackCode = errorCode(rollbackError);
        }
      }
    }
    if (restoredAll) {
      for (const request of requests) {
        try {
          if (request.previous != null) {
            writeMarkerNoFollow(request.path, request.previous, markerSync);
          } else if (regularFileBytesOrNull(request.path) != null) {
            rmSync(request.path, { force: true });
          }
        } catch (rollbackError) {
          rollbackCode = errorCode(rollbackError);
        }
      }
    }
    const reason =
      rollbackCode.length > 0
        ? installFailureReason("rollback-failed", rollbackCode)
        : installFailureReason("publish-failed", error);
    return emptyInstall("failed", reason, bundleVersion);
  }

  return {
    status: "synced",
    reason: "ok",
    restart,
    version: bundleVersion,
  };
}

export function parseProcessRestartRequest(contents) {
  const groups = new Set();
  for (const line of String(contents ?? "").split("\n")) {
    const group = line.trim();
    if (BOX_RUNTIME_PROCESS_RESTART_GROUPS.includes(group)) groups.add(group);
  }
  return [...groups].sort();
}

export function processRestartRequestText(groups) {
  return `${parseProcessRestartRequest(groups.join("\n")).join("\n")}\n`;
}

export function readProcessRestartRequest(path) {
  return parseProcessRestartRequest(regularFileBytesOrNull(path));
}

function errorCode(error) {
  if (error != null && typeof error.code === "string" && error.code.length > 0) return error.code;
  if (error instanceof Error && error.name.length > 0) return error.name;
  return "unknown";
}

function installFailureReason(kind, error) {
  const code = typeof error === "string" ? error : errorCode(error);
  return `${kind}:${code}`;
}

function gitShaOrNull(value) {
  return typeof value === "string" && BOOT_FETCH_GIT_SHA_REGEX.test(value) ? value : null;
}

function readBundleTextNoFollow(path, maxBytes) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    return {
      ok: false,
      missing: error != null && error.code === "ENOENT",
      cause: errorCode(error),
    };
  }
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) return { ok: false, missing: false, cause: "not-regular-file" };
    if (stat.size > maxBytes) return { ok: false, missing: false, cause: "too-large" };
    const buffer = Buffer.alloc(maxBytes + 1);
    const read = readSync(fd, buffer, 0, buffer.length, 0);
    if (read > maxBytes) return { ok: false, missing: false, cause: "too-large" };
    return { ok: true, text: buffer.subarray(0, read).toString("utf8") };
  } catch (error) {
    return { ok: false, missing: false, cause: errorCode(error) };
  } finally {
    closeSync(fd);
  }
}

function readVersionFile(path) {
  const read = readBundleTextNoFollow(path, BOX_RUNTIME_VERSION_MAX_BYTES);
  return read.ok ? gitShaOrNull(read.text.trim()) : null;
}

export function installBoxRuntimeFromBundle({
  versionPath = HOST_VERSION_PATH,
  sourceDir = BOX_RUNTIME_SOURCE_DIR,
  appliedMarkerPath = BOX_RUNTIME_APPLIED_MARKER_PATH,
  processRestartPath = BOX_RUNTIME_PROCESS_RESTART_PATH,
  inheritedBundleMarkerPath = BOX_RUNTIME_INHERITED_BUNDLE_MARKER_PATH,
  floorDir = BOX_RUNTIME_FLOOR_DIR,
  destFor,
  trustedOwnerUids,
} = {}) {
  if (pathPresentOrUnknown(inheritedBundleMarkerPath)) {
    return emptyInstall("noop", "bundle-root-inherited-from-box", null);
  }
  const version = readVersionFile(versionPath);
  const manifest = readBundleTextNoFollow(
    join(sourceDir, "manifest.json"),
    BOX_RUNTIME_MANIFEST_MAX_BYTES,
  );
  if (!manifest.ok) {
    return manifest.missing
      ? emptyInstall("noop", "bundle carries no box-runtime", version)
      : emptyInstall("failed", "manifest-unreadable", version);
  }
  return installBoxRuntime({
    sourceDir,
    manifestText: manifest.text,
    bundleVersion: version,
    appliedMarkerPath,
    processRestartPath,
    inheritedBundleMarkerPath,
    floorDir,
    ...(destFor === undefined ? {} : { destFor }),
    ...(trustedOwnerUids === undefined ? {} : { trustedOwnerUids }),
  });
}

export function boxRuntimeRolloutEnabled({ markerExists = false } = {}) {
  return markerExists === true;
}

export function trustedRolloutMarker(stat, euid) {
  if (stat == null || typeof stat.isFile !== "function" || !stat.isFile()) return false;
  if (typeof euid !== "number" || stat.uid !== euid) return false;
  return (stat.mode & 0o022) === 0;
}

export function trustedProcessRestartRequest(stat, euid) {
  if (stat == null || typeof stat.isFile !== "function" || !stat.isFile()) return false;
  if (stat.uid !== 0 && (typeof euid !== "number" || stat.uid !== euid)) return false;
  return (stat.mode & 0o022) === 0;
}

function parseInstallStdout(stdout) {
  const lines = String(stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"));
  const line = lines.length > 0 ? lines[lines.length - 1] : null;
  if (line == null) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export function runInstalledBoxRuntime({
  enabled,
  asRoot,
  install = installBoxRuntimeFromBundle,
  spawnImpl = spawnSync,
  authorizationPresent = rolloutAuthorizationPresent,
  gateOpen = installerGateOpen,
}) {
  if (!enabled) return emptyInstall("noop", "gate-off");
  if (!authorizationPresent()) return emptyInstall("noop", "authorization-absent");
  if (asRoot) return gateOpen() ? install() : emptyInstall("failed", "gate-off");
  const result = spawnImpl("/usr/bin/sudo", ["-n", ...BOX_RUNTIME_INSTALL_ARGV], {
    encoding: "utf8",
    timeout: 30_000,
  });
  const parsed = parseInstallStdout(result?.stdout);
  if (
    parsed != null &&
    (parsed.status === "synced" || parsed.status === "noop" || parsed.status === "failed")
  ) {
    const restart = Array.isArray(parsed.restart)
      ? parsed.restart.filter((name) => BOX_RUNTIME_PROCESS_RESTART_GROUPS.includes(name))
      : [];
    return {
      status: parsed.status,
      reason: typeof parsed.reason === "string" ? parsed.reason : "privileged-install-unreadable",
      restart,
      version: typeof parsed.version === "string" ? parsed.version : null,
    };
  }
  return emptyInstall("failed", privilegedInstallFailure(result));
}

function privilegedInstallFailure(result) {
  if (result == null) return "privileged-install-unavailable:unknown";
  if (result.error != null) {
    const code = errorCode(result.error);
    return code === "ETIMEDOUT"
      ? "privileged-install-timeout"
      : `privileged-install-unavailable:${code}`;
  }
  if (typeof result.signal === "string" && result.signal.length > 0) {
    return `privileged-install-killed:${result.signal}`;
  }
  if (result.status !== 0) return "privileged-install-refused";
  return "privileged-install-unreadable";
}

function topMount(dir, mountinfo) {
  const target = dir.endsWith("/") && dir !== "/" ? dir.slice(0, -1) : dir;
  let top = null;
  for (const line of String(mountinfo ?? "").split("\n")) {
    const parts = line.split(" ");
    if (parts.length < 6) continue;
    const mountpoint = parts[4].replaceAll("\\040", " ");
    const point =
      mountpoint.endsWith("/") && mountpoint !== "/" ? mountpoint.slice(0, -1) : mountpoint;
    if (point !== target && point !== "/" && !target.startsWith(`${point}/`)) continue;
    top = { own: point === target, readOnly: parts[5].split(",").includes("ro") };
  }
  return top;
}

export function pathMountedReadOnly(dir, mountinfo) {
  const top = topMount(dir, mountinfo);
  return top != null && top.own && top.readOnly;
}

export function rolloutAuthorizationTrusted(authorization) {
  const stat = authorization?.stat;
  if (stat == null || typeof stat.isFile !== "function" || !stat.isFile()) return false;
  if (stat.uid !== 0) return false;
  if ((stat.mode & 0o022) !== 0) return false;
  return authorization.readOnly === true;
}

export function installerGateOpen({ stat, hostUid, authorization } = {}) {
  const marker = stat === undefined ? readRolloutMarkerStat() : stat;
  if (!trustedInstallerMarker(marker, hostUid)) return false;
  const allow = authorization === undefined ? readRolloutAuthorization() : authorization;
  return rolloutAuthorizationTrusted(allow);
}

function trustedInstallerMarker(marker, hostUid) {
  if (marker == null || typeof marker.isFile !== "function" || !marker.isFile()) return false;
  if ((marker.mode & 0o022) !== 0) return false;
  if (marker.uid === 0) return true;
  const uid = hostUid === undefined ? sandHostUid() : hostUid;
  return typeof uid === "number" && marker.uid === uid;
}

function readRolloutMarkerStat() {
  try {
    return lstatSync(BOX_RUNTIME_ROLLOUT_MARKER_PATH);
  } catch (error) {
    if (error != null && (error.code === "ENOENT" || error.code === "EACCES")) return null;
    throw error;
  }
}

function readMountinfo() {
  try {
    return readFileSync("/proc/self/mountinfo", "utf8");
  } catch (error) {
    if (error != null && error.code === "ENOENT") return "";
    throw error;
  }
}

function readRolloutAuthorization() {
  let stat = null;
  try {
    stat = lstatSync(BOX_RUNTIME_ALLOW_PATH);
  } catch (error) {
    if (error == null || (error.code !== "ENOENT" && error.code !== "EACCES")) throw error;
  }
  return { stat, readOnly: pathMountedReadOnly(BOX_RUNTIME_ALLOW_DIR, readMountinfo()) };
}

export async function revokeRolloutAuthorization({
  run = commandSucceeds,
  allowDir = BOX_RUNTIME_ALLOW_DIR,
  allowPath = BOX_RUNTIME_ALLOW_PATH,
  remove = rmSync,
  mountinfo = readMountinfo,
} = {}) {
  if (topMount(allowDir, mountinfo())?.own !== true) {
    try {
      remove(allowPath, { force: true });
      return true;
    } catch {
      return false;
    }
  }
  if (!(await run("mount", ["-o", "remount,bind,rw", allowDir]))) return false;
  try {
    remove(allowPath, { force: true });
  } catch {
    await run("mount", ["-o", "remount,bind,ro", allowDir]);
    return false;
  }
  return run("mount", ["-o", "remount,bind,ro", allowDir]);
}

function commandSucceeds(command, args) {
  return new Promise((settle) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.once("error", () => settle(false));
    child.once("close", (code) => settle(code === 0));
  });
}

export function rolloutAuthorizationPresent(path = BOX_RUNTIME_ALLOW_PATH) {
  try {
    return lstatSync(path).isFile();
  } catch (error) {
    if (error != null && (error.code === "ENOENT" || error.code === "EACCES")) return false;
    throw error;
  }
}

export function revokeInstalledBoxRuntimeAuthorization({ spawnImpl = spawnSync } = {}) {
  const result = spawnImpl("/usr/bin/sudo", ["-n", ...BOX_RUNTIME_INSTALL_ARGV, "revoke"], {
    encoding: "utf8",
    timeout: 30_000,
  });
  return result?.status === 0;
}

function sandHostUid(name = process.env.SAND_HOST_USER || "sand-host") {
  try {
    const line = readFileSync("/etc/passwd", "utf8")
      .split("\n")
      .find((row) => row.startsWith(`${name}:`));
    const uid = Number(line?.split(":")[2]);
    return Number.isInteger(uid) ? uid : null;
  } catch (error) {
    if (error != null && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function runInstallerCli({
  argv,
  install,
  write,
  gateOpen = installerGateOpen,
  revoke = revokeRolloutAuthorization,
}) {
  if (argv.length === 3 && argv[2] === "revoke") {
    const revoked = (await revoke()) === true;
    write(
      `${JSON.stringify(
        emptyInstall(
          revoked ? "noop" : "failed",
          revoked ? "authorization-revoked" : "authorization-revoke-failed",
        ),
      )}\n`,
    );
    return revoked ? 0 : 1;
  }
  if (argv.length !== 2) {
    write(`${JSON.stringify(emptyInstall("failed", "installer-arguments"))}\n`);
    return 2;
  }
  if (!gateOpen()) {
    write(`${JSON.stringify(emptyInstall("failed", "gate-off"))}\n`);
    return 1;
  }
  let outcome;
  try {
    outcome = install();
  } catch (error) {
    outcome = emptyInstall("failed", installFailureReason("installer-crashed", error));
  }
  write(`${JSON.stringify(outcome)}\n`);
  return outcome.status === "failed" ? 1 : 0;
}

function errno(error) {
  return error != null && typeof error.code === "string" ? error.code : "";
}

function missingProcess(error) {
  const code = errno(error);
  return code === "ENOENT" || code === "ESRCH" || code === "EACCES";
}

export function processAlreadyExited(error) {
  return errno(error) === "ESRCH";
}

export function readProcCmdlines(procRoot) {
  let names;
  try {
    names = readdirSync(procRoot);
  } catch (error) {
    if (missingProcess(error)) return [];
    throw error;
  }
  const processes = [];
  for (const name of names) {
    if (!/^[0-9]+$/.test(name)) continue;
    const pid = Number(name);
    if (pid === process.pid) continue;
    let bytes;
    try {
      bytes = readFileSync(join(procRoot, name, "cmdline"));
    } catch (error) {
      if (missingProcess(error)) continue;
      throw error;
    }
    const argv = bytes.toString("utf8").split("\0");
    if (argv.at(-1) === "") argv.pop();
    processes.push({ pid, argv });
  }
  return processes;
}

export function runtimeProcessGroup(argv) {
  if (!Array.isArray(argv) || argv.length === 0) return null;
  if (argv[0] === allowlistRow("sand-egress-tunnel").dest) return "tunnel";
  if (
    argv.length >= 2 &&
    basename(argv[0]) === "node" &&
    argv[1] === allowlistRow("sand-ua-governor.mjs").dest
  ) {
    return "governor";
  }
  return null;
}

export function signalRuntimeProcesses({ groups, processes, signal, onlyPids = null }) {
  const wanted = new Set(groups);
  const limit = onlyPids == null ? null : new Set(onlyPids);
  const signaled = [];
  const failed = [];
  for (const proc of processes) {
    if (limit != null && !limit.has(proc.pid)) continue;
    const group = runtimeProcessGroup(proc.argv);
    if (group == null || !wanted.has(group)) continue;
    if (signal(proc.pid) === true) signaled.push({ pid: proc.pid, group });
    else failed.push({ pid: proc.pid, group });
  }
  return { signaled, failed };
}

function isDirectRun() {
  const entry = process.argv[1];
  if (typeof entry !== "string" || entry.length === 0) return false;
  let entryPath;
  try {
    entryPath = realpathSync(entry);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return false;
    throw error;
  }
  return entryPath === realpathSync(fileURLToPath(import.meta.url));
}

if (isDirectRun()) {
  runInstallerCli({
    argv: process.argv,
    install: installBoxRuntimeFromBundle,
    write: (text) => process.stdout.write(text),
  }).then((code) => process.exit(code));
}
