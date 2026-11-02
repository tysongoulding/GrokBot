export interface RunResult {
    code: number;
    stdout: string;
    stderr: string;
}
export interface RunOptions {
    env?: NodeJS.ProcessEnv;
}
export type Runner = (command: string, args: string[], options?: RunOptions) => Promise<RunResult>;
export declare const execFileRunner: Runner;
export declare function commandOnPath(binary: string, runner?: Runner, platform?: NodeJS.Platform): Promise<string | null>;
