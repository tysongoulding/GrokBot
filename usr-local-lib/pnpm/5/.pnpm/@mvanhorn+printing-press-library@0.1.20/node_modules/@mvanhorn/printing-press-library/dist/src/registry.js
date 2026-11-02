export const DEFAULT_REGISTRY_URL = "https://raw.githubusercontent.com/mvanhorn/printing-press-library/main/registry.json";
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
export function parseRegistry(value, warn = defaultWarn) {
    if (!isRecord(value)) {
        throw new Error("registry payload must be an object");
    }
    if (value.schema_version !== 2) {
        throw new Error(`unsupported registry schema_version: ${String(value.schema_version)}`);
    }
    if (!Array.isArray(value.entries)) {
        throw new Error("registry entries must be an array");
    }
    const entries = [];
    let skipped = 0;
    for (let i = 0; i < value.entries.length; i++) {
        const raw = value.entries[i];
        try {
            entries.push(parseRegistryEntry(raw));
        }
        catch (error) {
            const name = isRecord(raw) && typeof raw.name === "string" && raw.name.trim() !== ""
                ? raw.name
                : `(unnamed at index ${i})`;
            const message = error instanceof Error ? error.message : String(error);
            warn(`[printing-press-library] skipping malformed registry entry: ${name}: ${message}`);
            skipped++;
        }
    }
    if (skipped > 0) {
        const word = skipped === 1 ? "entry" : "entries";
        warn(`[printing-press-library] skipped ${skipped} malformed registry ${word}; install/search may be missing items.`);
    }
    return {
        schema_version: 2,
        entries,
    };
}
function defaultWarn(message) {
    process.stderr.write(message + "\n");
}
export async function fetchRegistry(url = DEFAULT_REGISTRY_URL, fetchImpl = fetch) {
    const response = await fetchImpl(url, githubRequestInit(url));
    if (!response.ok) {
        const authHint = response.status === 404 || response.status === 401
            ? " If the catalog repository is private, set GITHUB_TOKEN or GH_TOKEN."
            : "";
        throw new Error(`failed to fetch registry: HTTP ${response.status}.${authHint}`);
    }
    return parseRegistry(await response.json());
}
export async function fetchGoModulePath(entryPath, registryUrl = DEFAULT_REGISTRY_URL, fetchImpl = fetch) {
    const goModUrl = goModUrlForRegistryEntry(registryUrl, entryPath);
    if (!goModUrl) {
        return null;
    }
    const response = await fetchImpl(goModUrl, githubRequestInit(goModUrl));
    if (!response.ok) {
        return null;
    }
    const goMod = await response.text();
    return parseGoModulePath(goMod);
}
export function lookupByName(registry, name) {
    const normalized = normalizeName(name);
    return (registry.entries.find((entry) => {
        const entryName = normalizeName(entry.name);
        return entryName === normalized || normalizeName(entry.api) === normalized;
    }) ?? null);
}
export function cliSkillName(entry) {
    return `pp-${entry.name.replace(/-pp-cli$/, "")}`;
}
export function cliBinaryName(entry) {
    return entry.name.endsWith("-pp-cli") ? entry.name : `${entry.name}-pp-cli`;
}
function parseRegistryEntry(value) {
    if (!isRecord(value)) {
        throw new Error("registry entry must be an object");
    }
    const entry = {
        name: requiredString(value, "name"),
        category: requiredString(value, "category"),
        api: requiredString(value, "api"),
        description: requiredString(value, "description"),
        search_terms: optionalStringArray(value, "search_terms"),
        path: requiredString(value, "path"),
        release: isRecord(value.release)
            ? {
                cli_name: requiredString(value.release, "cli_name"),
                version: requiredString(value.release, "version"),
                released_at: requiredString(value.release, "released_at"),
                source_commit: requiredString(value.release, "source_commit"),
            }
            : undefined,
    };
    return isRecord(value.mcp)
        ? {
            ...entry,
            mcp: {
                binary: requiredString(value.mcp, "binary"),
                transports: requiredStringArray(value.mcp, "transports"),
                tool_count: requiredNumber(value.mcp, "tool_count"),
                public_tool_count: typeof value.mcp.public_tool_count === "number" ? value.mcp.public_tool_count : undefined,
                auth_type: requiredString(value.mcp, "auth_type"),
                env_vars: Array.isArray(value.mcp.env_vars) ? value.mcp.env_vars.map(String) : [],
                mcp_ready: typeof value.mcp.mcp_ready === "string" ? value.mcp.mcp_ready : undefined,
            },
        }
        : entry;
}
function normalizeName(value) {
    return value.toLowerCase().replace(/^pp-/, "").replace(/-pp-cli$/, "").replace(/[^a-z0-9]+/g, "-");
}
function requiredString(value, key) {
    if (typeof value[key] !== "string" || value[key].trim() === "") {
        throw new Error(`registry entry missing string field: ${key}`);
    }
    return value[key];
}
function requiredNumber(value, key) {
    if (typeof value[key] !== "number") {
        throw new Error(`registry entry missing number field: ${key}`);
    }
    return value[key];
}
function requiredStringArray(value, key) {
    const raw = value[key];
    if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error(`registry entry missing non-empty string array field: ${key}`);
    }
    const out = [];
    for (const item of raw) {
        if (typeof item !== "string" || item.trim() === "") {
            throw new Error(`registry entry has non-string value in array field: ${key}`);
        }
        out.push(item);
    }
    return out;
}
function optionalStringArray(value, key) {
    const raw = value[key];
    if (raw === undefined || raw === null) {
        return undefined;
    }
    if (!Array.isArray(raw)) {
        throw new Error(`registry entry has non-array field: ${key}`);
    }
    const out = [];
    for (const item of raw) {
        if (typeof item !== "string" || item.trim() === "") {
            throw new Error(`registry entry has non-string value in array field: ${key}`);
        }
        out.push(item);
    }
    return out.length > 0 ? out : undefined;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseGoModulePath(goMod) {
    for (const line of goMod.split(/\r?\n/)) {
        const match = line.match(/^module\s+(\S+)/);
        if (match) {
            return match[1];
        }
    }
    return null;
}
function goModUrlForRegistryEntry(registryUrl, entryPath) {
    let parsed;
    try {
        parsed = new URL(registryUrl);
    }
    catch {
        return null;
    }
    if (parsed.hostname !== "raw.githubusercontent.com") {
        return null;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 4 || parts.at(-1) !== "registry.json") {
        return null;
    }
    parsed.pathname = `/${parts.slice(0, -1).join("/")}/${entryPath}/go.mod`;
    return parsed.toString();
}
function githubRequestInit(url) {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (!token || !isTrustedGitHubUrl(url)) {
        return undefined;
    }
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    };
}
function isTrustedGitHubUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname === "raw.githubusercontent.com" || parsed.hostname === "api.github.com";
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=registry.js.map