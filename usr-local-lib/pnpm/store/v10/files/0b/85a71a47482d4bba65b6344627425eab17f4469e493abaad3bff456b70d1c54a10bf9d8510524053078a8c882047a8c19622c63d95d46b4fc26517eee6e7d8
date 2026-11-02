import spawn from "cross-spawn";
export const execFileRunner = (command, args, options = {}) => {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            env: options.env ? { ...process.env, ...options.env } : process.env,
        });
        let stdout = "";
        let stderr = "";
        child.stdout?.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", (error) => {
            if (error.code === "ENOENT") {
                resolve({ code: 127, stdout, stderr });
                return;
            }
            resolve({ code: 126, stdout, stderr });
        });
        child.on("close", (code) => {
            resolve({ code: code ?? 0, stdout, stderr });
        });
    });
};
export async function commandOnPath(binary, runner = execFileRunner, platform = process.platform) {
    const command = platform === "win32" ? "where" : "which";
    const result = await runner(command, [binary]);
    if (result.code !== 0) {
        return null;
    }
    return result.stdout.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? null;
}
//# sourceMappingURL=process.js.map