import { type Registry } from "../registry.js";
/** Output sinks handed to a single buffered install run. */
interface InstallIO {
    stdout: (message: string) => void;
    stderr: (message: string) => void;
}
interface UpdateDeps {
    fetchRegistry: (url: string) => Promise<Registry>;
    commandOnPath: (binary: string) => Promise<string | null>;
    /**
     * Build an install command bound to the given output sinks. A factory (rather
     * than a single shared install fn) lets the bulk path give each concurrent run
     * its own buffer, so parallel installs don't interleave their lines.
     */
    createInstall: (io: InstallIO) => (args: string[]) => Promise<number>;
    stdout: (message: string) => void;
    stderr: (message: string) => void;
}
export declare function createUpdateCommand(overrides?: Partial<UpdateDeps>): (args: string[]) => Promise<number>;
export declare const updateCommand: (args: string[]) => Promise<number>;
export {};
