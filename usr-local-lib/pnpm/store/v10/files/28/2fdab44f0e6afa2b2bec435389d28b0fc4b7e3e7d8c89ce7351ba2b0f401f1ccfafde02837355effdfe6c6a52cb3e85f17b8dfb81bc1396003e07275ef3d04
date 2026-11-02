import { cliBinaryName } from "./registry.js";
const DEFAULT_WIDTH = 88;
const BODY_INDENT = "  ";
export function renderCatalogEntries(entries, commandPrefix) {
    return entries.flatMap((entry, index) => {
        const lines = [
            `${entry.name} (${entry.category}) - ${cliBinaryName(entry)}`,
            ...wrapText(entry.description, DEFAULT_WIDTH, BODY_INDENT),
            `${BODY_INDENT}install: ${commandPrefix} install ${entry.name}`,
        ];
        return index === entries.length - 1 ? lines : [...lines, ""];
    });
}
export function renderInstalledEntries(entries) {
    return entries.flatMap((entry, index) => {
        const lines = [
            `${entry.name} (${entry.version}) - ${entry.binary}`,
            ...wrapText(entry.description, DEFAULT_WIDTH, BODY_INDENT),
        ];
        return index === entries.length - 1 ? lines : [...lines, ""];
    });
}
function wrapText(text, width, indent) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return [];
    }
    const lines = [];
    let line = indent;
    for (const word of words) {
        const candidate = line === indent ? `${indent}${word}` : `${line} ${word}`;
        if (candidate.length > width && line !== indent) {
            lines.push(line);
            line = `${indent}${word}`;
        }
        else {
            line = candidate;
        }
    }
    lines.push(line);
    return lines;
}
//# sourceMappingURL=format.js.map