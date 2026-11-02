import { type Runner } from "../process.js";
import { type Registry } from "../registry.js";
interface ListDeps {
    fetchRegistry: (url: string) => Promise<Registry>;
    commandOnPath: (binary: string) => Promise<string | null>;
    runner: Runner;
    stdout: (message: string) => void;
    stderr: (message: string) => void;
    commandPrefix: string;
}
export declare function createListCommand(overrides?: Partial<ListDeps>): (args?: string[]) => Promise<number>;
export declare const listCommand: (args?: string[]) => Promise<number>;
export {};
