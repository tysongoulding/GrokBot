import { type RegistryEntry } from "./registry.js";
export declare function renderCatalogEntries(entries: RegistryEntry[], commandPrefix: string): string[];
export interface InstalledDisplayEntry {
    name: string;
    binary: string;
    version: string;
    description: string;
}
export declare function renderInstalledEntries(entries: InstalledDisplayEntry[]): string[];
