export declare const DEFAULT_REGISTRY_URL = "https://raw.githubusercontent.com/mvanhorn/printing-press-library/main/registry.json";
export interface MCPBlock {
    binary: string;
    transports: string[];
    tool_count: number;
    public_tool_count?: number;
    auth_type: string;
    env_vars: string[];
    mcp_ready?: string;
}
export interface RegistryEntry {
    name: string;
    category: string;
    api: string;
    description: string;
    search_terms?: string[];
    path: string;
    release?: ReleaseMetadata;
    mcp?: MCPBlock;
}
export interface ReleaseMetadata {
    cli_name: string;
    version: string;
    released_at: string;
    source_commit: string;
}
export interface Registry {
    schema_version: number;
    entries: RegistryEntry[];
}
type RegistryFetch = (url: string, init?: RequestInit) => Promise<Response>;
/**
 * Parse a raw registry payload into a typed Registry.
 *
 * Per-entry validation errors are surfaced as warnings to `warn` (defaulting to
 * stderr) and the offending entry is skipped. The remainder of the registry is
 * returned intact. This is the defense-in-depth that paired with the library-side
 * `--validate` gate keeps a single malformed upstream entry from breaking every
 * installer call (the original lawhub failure mode).
 *
 * Registry-level shape failures (non-object payload, unsupported schema_version,
 * non-array entries) still throw because they signal a wrong-protocol payload
 * the installer cannot recover from.
 */
export declare function parseRegistry(value: unknown, warn?: (message: string) => void): Registry;
export declare function fetchRegistry(url?: string, fetchImpl?: RegistryFetch): Promise<Registry>;
export declare function fetchGoModulePath(entryPath: string, registryUrl?: string, fetchImpl?: RegistryFetch): Promise<string | null>;
export declare function lookupByName(registry: Registry, name: string): RegistryEntry | null;
export declare function cliSkillName(entry: RegistryEntry): string;
export declare function cliBinaryName(entry: RegistryEntry): string;
export declare function parseGoModulePath(goMod: string): string | null;
export {};
