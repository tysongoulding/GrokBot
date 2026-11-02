import { type RunResult } from "../process.js";
import { type Registry } from "../registry.js";
interface UninstallDeps {
    fetchRegistry: (url: string) => Promise<Registry>;
    commandOnPath: (binary: string) => Promise<string | null>;
    removeFile: (path: string) => Promise<void>;
    removeSkill: (skillName: string, agents: string[]) => Promise<RunResult>;
    stdout: (message: string) => void;
    stderr: (message: string) => void;
}
export declare function createUninstallCommand(overrides?: Partial<UninstallDeps>): (args: string[]) => Promise<number>;
export declare const uninstallCommand: (args: string[]) => Promise<number>;
export {};
