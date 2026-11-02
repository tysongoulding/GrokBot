import { type Registry, type RegistryEntry } from "../registry.js";
interface SearchDeps {
    fetchRegistry: (url: string) => Promise<Registry>;
    stdout: (message: string) => void;
    stderr: (message: string) => void;
    commandPrefix: string;
}
export declare function createSearchCommand(overrides?: Partial<SearchDeps>): (args: string[]) => Promise<number>;
export declare const searchCommand: (args: string[]) => Promise<number>;
export declare function searchRegistry(entries: RegistryEntry[], query: string): RegistryEntry[];
export {};
