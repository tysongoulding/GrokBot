import { type Runner } from "./process.js";
export interface GoDetection {
    installed: boolean;
    version?: string;
}
export declare function detectGo(runner?: Runner): Promise<GoDetection>;
export interface GoInstallOptions {
    ref?: string;
    env?: NodeJS.ProcessEnv;
    runner?: Runner;
}
export declare function goInstall(modulePath: string, options?: GoInstallOptions): Promise<import("./process.js").RunResult>;
export interface GoInstallDir {
    /** Directory go install writes binaries to (GOBIN if set, otherwise GOPATH/bin). */
    binDir: string | null;
    /** Raw values for diagnostics. */
    gobin: string;
    gopath: string;
}
/**
 * Returns the directory `go install` actually writes to. `go install` writes to
 * `$GOBIN` when set, otherwise `$GOPATH/bin` (and `go env` resolves `GOPATH` to
 * its default `~/go` when unset). We ask `go env` rather than reading the
 * process environment directly so the same defaults Go uses are honored.
 */
export declare function goInstallDir(runner?: Runner, platform?: NodeJS.Platform): Promise<GoInstallDir>;
