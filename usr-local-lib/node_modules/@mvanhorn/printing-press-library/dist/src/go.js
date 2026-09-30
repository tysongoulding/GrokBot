import { execFileRunner } from "./process.js";
export async function detectGo(runner = execFileRunner) {
    const result = await runner("go", ["version"]);
    if (result.code !== 0) {
        return { installed: false };
    }
    const match = result.stdout.match(/\bgo version go(\S+)/);
    return {
        installed: true,
        version: match?.[1],
    };
}
export async function goInstall(modulePath, options = {}) {
    const runner = options.runner ?? execFileRunner;
    const ref = options.ref ?? "latest";
    return runner("go", ["install", `${modulePath}@${ref}`], { env: options.env });
}
/**
 * Returns the directory `go install` actually writes to. `go install` writes to
 * `$GOBIN` when set, otherwise `$GOPATH/bin` (and `go env` resolves `GOPATH` to
 * its default `~/go` when unset). We ask `go env` rather than reading the
 * process environment directly so the same defaults Go uses are honored.
 */
export async function goInstallDir(runner = execFileRunner, platform = process.platform) {
    const result = await runner("go", ["env", "GOBIN", "GOPATH"]);
    if (result.code !== 0) {
        return { binDir: null, gobin: "", gopath: "" };
    }
    const lines = result.stdout.split(/\r?\n/).map((line) => line.trim());
    const gobin = lines[0] ?? "";
    const gopath = lines[1] ?? "";
    const sep = platform === "win32" ? "\\" : "/";
    // Strip trailing separators so a user with `GOBIN=/home/user/go/bin/` doesn't
    // produce a double-slash path that fails to match what `which` resolves.
    const stripTrailing = (p) => p.replace(/[\\/]+$/, "");
    if (gobin) {
        return { binDir: stripTrailing(gobin), gobin, gopath };
    }
    if (gopath) {
        return { binDir: `${stripTrailing(gopath)}${sep}bin`, gobin, gopath };
    }
    return { binDir: null, gobin, gopath };
}
//# sourceMappingURL=go.js.map