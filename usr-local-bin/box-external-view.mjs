#!/exec-daemon/node
import { spawn } from "node:child_process";
import { chownSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

import { isLoopbackHostname, startRelay } from "./box-external-view-relay.mjs";

// >>> box port table (from sand/src/shared/box/box-contract.ts; regenerate: pnpm --filter sand run gen:box-ports) >>>
export const RELAY_PORT_BASE = 9400;
const TAILNET_CHROME_CDP_PORT = 9600;
// <<< box port table <<<

export const EXIT = Object.freeze({ ok: 0, failed: 1, usage: 64, unavailable: 69, busy: 73 });
export const MAX_DISPLAY_NUMBER = TAILNET_CHROME_CDP_PORT - RELAY_PORT_BASE - 1;
export const MAX_INPUT_LINE_BYTES = 16 * 1024;
export const VIEWER_RESTART_LIMIT = 1;
export const VIEWER_WM_CLASS = "sand-external-view";
export const STATE_DIR_PREFIX = "/tmp/sand-external-view-";
export const VIEWER_CHROME = "google-chrome-stable";

const MAX_PIPE_MESSAGE_BYTES = 8 * 1024 * 1024;
const REQUIRED_TOOLS = ["wmctrl", "xprop", "xdpyinfo", VIEWER_CHROME];
const EGRESS_PROXY_FILE = "/tmp/sand-egress-proxy";
const WRAPPER_URL = new URL("./box-external-view.html", import.meta.url);
const START_FIELDS = ["connectUrl", "liveViewUrl"];
const COMMAND_FIELDS = ["kind", "liveViewUrl"];
const USAGE = "usage: box-external-view start <N> | stop <N> | --probe";
const VIEWER_STATUS_BINDING = "sandExternalViewStatus";
const VIEWER_STATUSES = new Set(["disconnected"]);
const WRAPPER_READY_EXPRESSION = `new Promise((resolve) => {
  const ready = () => resolve(typeof window.sandExternalView?.show === "function");
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
})`;

function ok(value) {
  return { ok: true, value };
}

function err(error) {
  return { ok: false, error };
}

export function parseDisplayNumber(raw) {
  if (
    typeof raw !== "string" ||
    !/^[1-9][0-9]{0,3}$/.test(raw) ||
    Number(raw) > MAX_DISPLAY_NUMBER
  ) {
    return err(`display number must be an integer from 1 to ${MAX_DISPLAY_NUMBER}`);
  }
  return ok(Number(raw));
}

function parseUrlField(value, field, secureProtocol, loopbackProtocol) {
  if (typeof value !== "string") return err(`${field} must be a string`);
  const url = URL.parse(value);
  if (url === null) return err(`${field} is not a URL`);
  if (url.username !== "" || url.password !== "") return err(`${field} must not carry credentials`);
  if (url.protocol === secureProtocol) return ok(url);
  if (url.protocol === loopbackProtocol && isLoopbackHostname(url.hostname)) return ok(url);
  return err(`${field} must be ${secureProtocol}// or a loopback ${loopbackProtocol}// URL`);
}

function parseJsonObjectLine(line, fields) {
  if (Buffer.byteLength(line) > MAX_INPUT_LINE_BYTES) {
    return err(`input line is over ${MAX_INPUT_LINE_BYTES} bytes`);
  }
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return err(`input line is not JSON (${error.name})`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return err("input line is not a JSON object");
  }
  const keys = Object.keys(parsed);
  if (keys.length !== fields.length || !fields.every((field) => keys.includes(field))) {
    return err(`input line must have exactly the fields ${fields.join(", ")}`);
  }
  return ok(parsed);
}

export function parseStartInput(line) {
  const object = parseJsonObjectLine(line, START_FIELDS);
  if (!object.ok) return object;
  const connectUrl = parseUrlField(object.value.connectUrl, "connectUrl", "wss:", "ws:");
  if (!connectUrl.ok) return connectUrl;
  const liveViewUrl = parseUrlField(object.value.liveViewUrl, "liveViewUrl", "https:", "http:");
  if (!liveViewUrl.ok) return liveViewUrl;
  return ok(Object.freeze({ connectUrl: connectUrl.value, liveViewUrl: liveViewUrl.value }));
}

export function parseCommand(line) {
  const object = parseJsonObjectLine(line, COMMAND_FIELDS);
  if (!object.ok) return object;
  if (object.value.kind !== "navigate") return err('kind must be "navigate"');
  const liveViewUrl = parseUrlField(object.value.liveViewUrl, "liveViewUrl", "https:", "http:");
  if (!liveViewUrl.ok) return liveViewUrl;
  return ok(Object.freeze({ kind: "navigate", liveViewUrl: liveViewUrl.value }));
}

export function parseEgressProxyAddr(text) {
  const first = text.split("\n", 1)[0].trim();
  return /^(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\]):[0-9]{1,5}$/.test(first) ? first : null;
}

export function relayPort(displayNumber) {
  return RELAY_PORT_BASE + displayNumber;
}

export function stateDir(displayNumber) {
  return `${STATE_DIR_PREFIX}${displayNumber}`;
}

export function viewerChromeArgs({ profileDir, wrapperUrl, proxyAddr }) {
  const proxy =
    proxyAddr === null
      ? []
      : [`--proxy-server=http://${proxyAddr}`, "--proxy-bypass-list=localhost;127.0.0.1;[::1]"]; // pragma: allowlist secret
  return [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--password-store=basic",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-crash-restore-bubble",
    "--noerrdialogs",
    "--disable-translate",
    "--disable-features=Translate,MediaRouter",
    "--kiosk",
    `--class=${VIEWER_WM_CLASS}`,
    `--user-data-dir=${profileDir}`,
    "--remote-debugging-pipe",
    ...proxy,
    wrapperUrl,
  ];
}

export function viewerWindowIds(wmctrlList, viewerPid) {
  const ids = [];
  for (const line of wmctrlList.split("\n")) {
    const [id, , pid] = line.trim().split(/\s+/);
    if (id?.startsWith("0x") && pid === String(viewerPid)) ids.push(id);
  }
  return ids;
}

export function viewerStatusLine(payload) {
  return VIEWER_STATUSES.has(payload) ? `${JSON.stringify({ status: payload })}\n` : null;
}

export function decideViewerExit({ stopping, restartsUsed }) {
  if (stopping) return "ignore";
  return restartsUsed < VIEWER_RESTART_LIMIT ? "restart" : "give_up";
}

function log(message) {
  process.stderr.write(`box-external-view: ${message}\n`);
}

function runTool(command, args, env = process.env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "ignore"] });
    const chunks = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.once("error", (error) => resolve({ status: null, stdout: "", error: error.code }));
    child.once("close", (status) =>
      resolve({ status, stdout: Buffer.concat(chunks).toString("utf8") }),
    );
  });
}

async function toolExists(command) {
  const found = await runTool("sh", ["-c", 'command -v "$1" >/dev/null', "sh", command]);
  return found.status === 0;
}

async function displayIsUp(displayNumber) {
  return (await runTool("xdpyinfo", ["-display", `:${displayNumber}`])).status === 0;
}

async function boxUser() {
  if (process.getuid?.() !== 0) return null;
  const uid = Number((await runTool("id", ["-u", "box"])).stdout.trim());
  const gid = Number((await runTool("id", ["-g", "box"])).stdout.trim());
  return Number.isInteger(uid) && Number.isInteger(gid) && uid > 0 ? { uid, gid } : null;
}

function readEgressProxyAddr() {
  try {
    return parseEgressProxyAddr(readFileSync(EGRESS_PROXY_FILE, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return null;
  }
}

function processCmdline(pid) {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0");
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ESRCH") return null;
    throw error;
  }
}

function isController(pid) {
  return processCmdline(pid)?.some((arg) => arg.endsWith("box-external-view.mjs")) ?? false;
}

function readControllerPid(dir) {
  let text;
  try {
    text = readFileSync(`${dir}/controller.pid`, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const pid = Number(text.trim());
  return Number.isInteger(pid) && pid > 1 && isController(pid) ? pid : null;
}

function viewerPids(dir) {
  const profileArg = `--user-data-dir=${dir}/profile`;
  return readdirSync("/proc")
    .filter((entry) => /^[0-9]+$/.test(entry))
    .map(Number)
    .filter((pid) => processCmdline(pid)?.includes(profileArg) ?? false);
}

function killIfRunning(pid, signal) {
  try {
    process.kill(pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

export function controlSocketPath(dir) {
  return `${dir}/control.sock`;
}

function listenForStop(dir) {
  const server = net.createServer((socket) => {
    socket.on("error", () => socket.destroy());
    socket.resume();
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(controlSocketPath(dir), () => resolve(server));
  });
}

function connectToController(dir) {
  return new Promise((resolve) => {
    const socket = net.connect(controlSocketPath(dir));
    socket.once("connect", () => {
      socket.resume();
      resolve({ closed: new Promise((closed) => socket.once("close", closed)) });
    });
    socket.once("error", (error) => {
      log(`controller has no stop socket (${error.code ?? "error"}); not waiting for it`);
      resolve(null);
    });
  });
}

function claimStateDir(displayNumber) {
  const dir = stateDir(displayNumber);
  for (const attempt of [1, 2]) {
    try {
      mkdirSync(dir, { mode: 0o700 });
      writeFileSync(`${dir}/controller.pid`, `${process.pid}\n`, { mode: 0o600 });
      return ok(dir);
    } catch (error) {
      if (error.code !== "EEXIST") return err(`cannot create ${dir}: ${error.code}`);
      if (readControllerPid(dir) !== null) return err("busy");
      if (attempt === 2) return err(`cannot claim ${dir}`);
      for (const pid of viewerPids(dir)) killIfRunning(pid, "SIGKILL");
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return err(`cannot claim ${dir}`);
}

function prepareViewerDirs(dir, user) {
  for (const sub of ["profile", "home", "xdg"]) {
    mkdirSync(`${dir}/${sub}`, { mode: 0o700, recursive: true });
    if (user !== null) chownSync(`${dir}/${sub}`, user.uid, user.gid);
  }
  if (user !== null) chownSync(dir, user.uid, user.gid);
}

function openDevtoolsPipe(writable, readable) {
  const pending = new Map();
  const eventWaiters = new Set();
  const eventListeners = new Set();
  const ids = { next: 1 };
  const partial = { chunks: [], bytes: 0 };
  let closedReason = null;
  const failAll = (reason) => {
    closedReason ??= reason;
    for (const waiter of [...pending.values(), ...eventWaiters]) waiter.reject(new Error(reason));
    pending.clear();
    eventWaiters.clear();
  };
  const dispatch = (message) => {
    if (message.id === undefined) {
      for (const listener of eventListeners) {
        if (listener.matches(message)) listener.handle(message);
      }
      for (const waiter of eventWaiters) {
        if (!waiter.matches(message)) continue;
        eventWaiters.delete(waiter);
        waiter.resolve(message);
      }
      return;
    }
    const waiter = pending.get(message.id);
    if (waiter === undefined) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
    else waiter.resolve(message.result);
  };
  readable.on("data", (chunk) => {
    let start = 0;
    for (let end = chunk.indexOf(0); end !== -1; end = chunk.indexOf(0, start)) {
      partial.chunks.push(chunk.subarray(start, end));
      const message = Buffer.concat(partial.chunks).toString("utf8");
      partial.chunks.length = 0;
      partial.bytes = 0;
      start = end + 1;
      dispatch(JSON.parse(message));
    }
    if (start === chunk.length) return;
    partial.chunks.push(chunk.subarray(start));
    partial.bytes += chunk.length - start;
    if (partial.bytes > MAX_PIPE_MESSAGE_BYTES) {
      failAll(`DevTools message over ${MAX_PIPE_MESSAGE_BYTES} bytes`);
      readable.destroy();
    }
  });
  readable.on("close", () => failAll("DevTools pipe closed"));
  writable.on("error", () => failAll("DevTools pipe closed"));
  return {
    send(method, params = {}, sessionId = undefined) {
      if (closedReason !== null) return Promise.reject(new Error(closedReason));
      const id = ids.next++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        writable.write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
      });
    },
    nextEvent(matches) {
      if (closedReason !== null) return Promise.reject(new Error(closedReason));
      return new Promise((resolve, reject) => {
        eventWaiters.add({ matches, resolve, reject });
      });
    },
    onEvent(matches, handle) {
      eventListeners.add({ matches, handle });
    },
  };
}

function isWrapperTarget(message) {
  const info = message.params?.targetInfo;
  return (
    (message.method === "Target.targetCreated" || message.method === "Target.targetInfoChanged") &&
    info?.type === "page" &&
    info.url === WRAPPER_URL.href
  );
}

async function attachToWrapper(pipe) {
  const wrapperTarget = pipe.nextEvent(isWrapperTarget);
  await pipe.send("Target.setDiscoverTargets", { discover: true });
  const { targetId } = (await wrapperTarget).params.targetInfo;
  const { sessionId } = await pipe.send("Target.attachToTarget", { targetId, flatten: true });
  const ready = await pipe.send(
    "Runtime.evaluate",
    { expression: WRAPPER_READY_EXPRESSION, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (ready.result?.value !== true) throw new Error("wrapper page loaded without its controls");
  return sessionId;
}

async function followViewerStatus(pipe, sessionId, session) {
  pipe.onEvent(
    (message) =>
      message.method === "Runtime.bindingCalled" &&
      message.sessionId === sessionId &&
      message.params?.name === VIEWER_STATUS_BINDING,
    (message) => {
      const line = viewerStatusLine(message.params.payload);
      if (line === null || session.stopping) return;
      log(`viewer reports ${message.params.payload}`);
      process.stdout.write(line);
    },
  );
  await pipe.send("Runtime.addBinding", { name: VIEWER_STATUS_BINDING }, sessionId);
}

async function showLiveView(viewer, liveViewUrl) {
  const shown = await viewer.pipe.send(
    "Runtime.evaluate",
    { expression: `window.sandExternalView.show(${JSON.stringify(liveViewUrl.href)})` },
    viewer.sessionId,
  );
  if (shown.exceptionDetails !== undefined) throw new Error("wrapper page rejected the live view");
}

// xfwm4 drops an unfocused fullscreen window below the focused one, so the viewer leaves fullscreen for the above layer (https://github.com/xfce-mirror/xfwm4/blob/xfwm4-4.18.0/src/stacking.c).
export function stackAboveCommands(windowId, screen) {
  return [
    ["-i", "-r", windowId, "-b", "remove,fullscreen"],
    ["-i", "-r", windowId, "-b", "add,above"],
    ["-i", "-r", windowId, "-e", `0,0,0,${screen.width},${screen.height}`],
    ["-i", "-a", windowId],
  ];
}

export function parseScreenSize(xdpyinfo) {
  const match = /dimensions:\s+([0-9]+)x([0-9]+) pixels/.exec(xdpyinfo);
  return match === null ? null : { width: Number(match[1]), height: Number(match[2]) };
}

function spyUntil(env, xpropArgs, viewerChild, check) {
  return new Promise((resolve, reject) => {
    const spy = spawn("xprop", ["-spy", ...xpropArgs], {
      env,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let settled = false;
    const settle = (finish, value) => {
      if (settled) return;
      settled = true;
      viewerChild.off("exit", onViewerExit);
      spy.kill();
      finish(value);
    };
    const onViewerExit = () => settle(reject, new Error("viewer exited before it was stacked"));
    viewerChild.once("exit", onViewerExit);
    spy.once("error", (error) => settle(reject, new Error(`xprop failed (${error.code})`)));
    spy.once("exit", () => settle(reject, new Error(`xprop ${xpropArgs.join(" ")} stopped`)));
    let checks = Promise.resolve();
    createInterface({ input: spy.stdout }).on("line", (line) => {
      checks = checks.then(async () => {
        if (settled) return;
        const value = await check(line);
        if (value !== null) settle(resolve, value);
      });
    });
  });
}

async function stackAbove(displayNumber, viewerChild) {
  const env = { ...process.env, DISPLAY: `:${displayNumber}` };
  const screen = parseScreenSize(
    (await runTool("xdpyinfo", ["-display", `:${displayNumber}`])).stdout,
  );
  if (screen === null) throw new Error(`cannot read the size of :${displayNumber}`);
  const ids = await spyUntil(env, ["-root"], viewerChild, async (line) => {
    if (!line.startsWith("_NET_CLIENT_LIST(")) return null;
    const listed = (await runTool("wmctrl", ["-l", "-p"], env)).stdout;
    const found = viewerWindowIds(listed, viewerChild.pid);
    return found.length > 0 ? found : null;
  });
  for (const id of ids) {
    await spyUntil(env, ["-id", id], viewerChild, async (line) =>
      line.startsWith("_NET_WM_STATE(") && line.includes("_NET_WM_STATE_FULLSCREEN") ? true : null,
    );
    for (const args of stackAboveCommands(id, screen)) await runTool("wmctrl", args, env);
  }
}

async function launchViewer(session, liveViewUrl) {
  const { dir, displayNumber, user, proxyAddr } = session;
  const child = spawn(
    VIEWER_CHROME,
    viewerChromeArgs({ profileDir: `${dir}/profile`, wrapperUrl: WRAPPER_URL.href, proxyAddr }),
    {
      env: {
        PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
        DISPLAY: `:${displayNumber}`,
        HOME: `${dir}/home`,
        XDG_RUNTIME_DIR: `${dir}/xdg`,
      },
      stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"],
      ...(user ?? {}),
    },
  );
  const exited = new Promise((resolve) => {
    child.once("exit", resolve);
    child.once("error", (error) => {
      log(`viewer spawn failed (${error.code ?? "error"})`);
      resolve(null);
    });
  });
  const pipe = openDevtoolsPipe(child.stdio[3], child.stdio[4]);
  try {
    const sessionId = await attachToWrapper(pipe);
    await followViewerStatus(pipe, sessionId, session);
    const viewer = { child, pipe, sessionId, exited };
    await showLiveView(viewer, liveViewUrl);
    await stackAbove(displayNumber, child);
    return viewer;
  } catch (error) {
    child.kill("SIGKILL");
    await exited;
    throw error;
  }
}

async function closeViewer(viewer) {
  if (viewer.child.exitCode === null && viewer.child.signalCode === null) {
    viewer.child.kill("SIGKILL");
  }
  await viewer.exited;
}

async function readFirstLine(lineIterator) {
  const first = await lineIterator.next();
  return first.done ? null : first.value;
}

async function followCommands(lineIterator, session) {
  for (let next = await lineIterator.next(); !next.done; next = await lineIterator.next()) {
    const command = parseCommand(next.value);
    if (!command.ok) {
      log(`ignoring command: ${command.error}`);
      continue;
    }
    session.liveViewUrl = command.value.liveViewUrl;
    if (session.viewer === null) continue;
    try {
      await showLiveView(session.viewer, session.liveViewUrl);
    } catch (error) {
      log(`navigate failed (${error.message})`);
    }
  }
}

async function runStart(displayArg) {
  const display = parseDisplayNumber(displayArg);
  if (!display.ok) {
    log(display.error);
    return EXIT.usage;
  }
  const displayNumber = display.value;
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lineIterator = lines[Symbol.asyncIterator]();
  const firstLine = await readFirstLine(lineIterator);
  const input = firstLine === null ? err("no start input on stdin") : parseStartInput(firstLine);
  if (!input.ok) {
    log(input.error);
    lines.close();
    return EXIT.usage;
  }
  if (!(await displayIsUp(displayNumber))) {
    log(`display :${displayNumber} is not running`);
    lines.close();
    return EXIT.unavailable;
  }
  const claimed = claimStateDir(displayNumber);
  if (!claimed.ok) {
    log(
      claimed.error === "busy"
        ? `external view already running on :${displayNumber}`
        : claimed.error,
    );
    lines.close();
    return claimed.error === "busy" ? EXIT.busy : EXIT.failed;
  }

  try {
    await listenForStop(claimed.value);
  } catch (error) {
    log(`cannot listen for stop (${error.code ?? "error"})`);
    rmSync(claimed.value, { recursive: true, force: true });
    lines.close();
    return EXIT.failed;
  }
  const user = await boxUser();
  const session = {
    dir: claimed.value,
    displayNumber,
    user,
    proxyAddr: readEgressProxyAddr(),
    liveViewUrl: input.value.liveViewUrl,
    viewer: null,
    relay: null,
    restartsUsed: 0,
    stopping: false,
  };
  prepareViewerDirs(session.dir, user);

  const finished = new Promise((resolve) => {
    session.finish = resolve;
  });
  const shutdown = async (reason) => {
    if (session.stopping) return;
    session.stopping = true;
    log(`stopping (${reason})`);
    lines.close();
    if (session.viewer !== null) await closeViewer(session.viewer);
    for (const pid of viewerPids(session.dir)) killIfRunning(pid, "SIGKILL");
    if (session.relay !== null) await session.relay.close();
    rmSync(session.dir, { recursive: true, force: true });
    session.finish();
  };
  for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"])
    process.once(signal, () => shutdown(signal));

  try {
    session.relay = await startRelay({
      port: relayPort(displayNumber),
      connectUrl: input.value.connectUrl,
      proxyAddr: session.proxyAddr,
      log,
    });
  } catch (error) {
    log(`relay could not listen on ${relayPort(displayNumber)} (${error.code ?? "error"})`);
    await shutdown("relay failed");
    return EXIT.failed;
  }

  const superviseViewer = (viewer) => {
    session.viewer = viewer;
    viewer.exited.then(async () => {
      const decision = decideViewerExit(session);
      if (decision === "ignore") return;
      session.viewer = null;
      if (decision === "give_up") {
        log("viewer exited again; the relay keeps serving without a viewer");
        return;
      }
      session.restartsUsed++;
      log("viewer exited; restarting it once");
      const url = session.liveViewUrl;
      try {
        const restarted = await launchViewer(session, url);
        if (session.stopping) {
          await closeViewer(restarted);
          return;
        }
        superviseViewer(restarted);
        if (session.liveViewUrl !== url) await showLiveView(restarted, session.liveViewUrl);
      } catch (error) {
        log(`viewer restart failed (${error.message})`);
      }
    });
  };

  try {
    superviseViewer(await launchViewer(session, session.liveViewUrl));
  } catch (error) {
    log(`viewer did not start (${error.message})`);
    await shutdown("viewer failed");
    return EXIT.failed;
  }

  process.stdout.write(
    `${JSON.stringify({ status: "ready", relayPort: relayPort(displayNumber) })}\n`,
  );
  void followCommands(lineIterator, session);
  await finished;
  return EXIT.ok;
}

async function runStop(displayArg) {
  const display = parseDisplayNumber(displayArg);
  if (!display.ok) {
    log(display.error);
    return EXIT.usage;
  }
  const dir = stateDir(display.value);
  const controller = readControllerPid(dir);
  if (controller !== null) {
    const connection = await connectToController(dir);
    killIfRunning(controller, "SIGTERM");
    await connection?.closed;
  }
  const orphans = viewerPids(dir);
  for (const pid of orphans) killIfRunning(pid, "SIGKILL");
  rmSync(dir, { recursive: true, force: true });
  const stopped = controller !== null || orphans.length > 0;
  process.stdout.write(`external view :${display.value} ${stopped ? "stopped" : "not running"}\n`);
  return EXIT.ok;
}

async function runProbe() {
  const found = await Promise.all(REQUIRED_TOOLS.map(toolExists));
  const missing = REQUIRED_TOOLS.filter((_, index) => !found[index]);
  if (missing.length > 0) {
    log(`missing ${missing.join(", ")}`);
    return EXIT.unavailable;
  }
  process.stdout.write("box-external-view supported\n");
  return EXIT.ok;
}

async function main(argv) {
  const [command, displayArg, ...rest] = argv;
  if (command === "--probe" && displayArg === undefined) return runProbe();
  const hasDisplayOnly = displayArg !== undefined && rest.length === 0;
  if (hasDisplayOnly && command === "start") return runStart(displayArg);
  if (hasDisplayOnly && command === "stop") return runStop(displayArg);
  log(USAGE);
  return EXIT.usage;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(await main(process.argv.slice(2)));
}
