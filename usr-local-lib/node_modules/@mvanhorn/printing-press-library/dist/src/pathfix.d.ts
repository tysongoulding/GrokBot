/**
 * Platform- and shell-aware instructions for adding a binary directory to PATH.
 * Used when a freshly installed CLI binary is not yet discoverable by name — either
 * because it was written to the default user bin directory (`~/.local/bin` on
 * macOS/Linux, `%LOCALAPPDATA%\\Programs\\PrintingPress\\bin` on Windows) or to Go's
 * `$(go env GOPATH)/bin`. Builds the exact, copy-pasteable fix for the detected
 * (platform, shell) rather than a single Unix-flavored hint that is wrong on
 * Windows and imprecise on fish.
 *
 * Pure and dependency-free so the full (platform × shell) matrix is unit-testable.
 */
export interface PathFixContext {
    /** Resolved `go install` directory (GOBIN or GOPATH/bin). Null when `go env` couldn't resolve it. */
    binDir: string | null;
    platform: NodeJS.Platform;
    /** process.env.SHELL — the login shell on Unix; set under Git Bash/MSYS on Windows. */
    shell?: string;
    /** process.env.HOME ?? process.env.USERPROFILE — used to prefer portable $HOME/... forms. */
    home?: string;
}
/**
 * Returns a copy-pasteable instruction block (no leading/trailing newline) telling
 * the user how to add `binDir` to PATH for their detected platform and shell.
 */
export declare function pathFixInstructions(ctx: PathFixContext): string;
