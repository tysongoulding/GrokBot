import { type GoDetection, type GoInstallDir } from "../go.js";
import { type RunResult } from "../process.js";
import { type Registry } from "../registry.js";
interface InstallDeps {
    fetchRegistry: (url: string) => Promise<Registry>;
    resolveModulePath: (entryPath: string, registryUrl: string) => Promise<string | null>;
    detectGo: () => Promise<GoDetection>;
    goInstall: (modulePath: string, ref: string, env?: NodeJS.ProcessEnv) => Promise<RunResult>;
    goInstallDir: () => Promise<GoInstallDir>;
    commandOnPath: (binary: string) => Promise<string | null>;
    realpath: (path: string) => Promise<string | null>;
    mkdir: (path: string) => Promise<void>;
    installSkill: (skillName: string, agents: string[]) => Promise<RunResult>;
    stdout: (message: string) => void;
    stderr: (message: string) => void;
    platform: NodeJS.Platform;
    /** Login shell (Unix) or Git Bash marker (Windows); drives the per-shell PATH fix. */
    shell?: string;
    /** Home directory, used to resolve the default per-user binary directory and PATH instructions. */
    home?: string;
    /** Environment inherited by subprocesses; injectable for targeted install tests. */
    env: NodeJS.ProcessEnv;
}
export declare function createInstallCommand(overrides?: Partial<InstallDeps>): (args: string[]) => Promise<number>;
export declare const installCommand: (args: string[]) => Promise<number>;
export {};
