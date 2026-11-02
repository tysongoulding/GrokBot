import { execFileRunner } from "./process.js";
const LIBRARY_SOURCE = "mvanhorn/printing-press-library";
export function skillSource(skillName) {
    return `${LIBRARY_SOURCE}/cli-skills/${skillName}`;
}
export function skillsAddArgs(skillName, options = {}) {
    const args = ["-y", "skills@latest", "add", skillSource(skillName), "-g", "-y"];
    for (const agent of options.agents ?? []) {
        args.push("-a", agent);
    }
    return args;
}
export async function installSkill(skillName, options = {}) {
    const runner = options.runner ?? execFileRunner;
    return runner("npx", skillsAddArgs(skillName, options));
}
export function skillsRemoveArgs(skillName, options = {}) {
    const args = ["-y", "skills@latest", "remove", skillName, "-g", "-y"];
    for (const agent of options.agents ?? []) {
        args.push("-a", agent);
    }
    return args;
}
export async function removeSkill(skillName, options = {}) {
    const runner = options.runner ?? execFileRunner;
    return runner("npx", skillsRemoveArgs(skillName, options));
}
//# sourceMappingURL=skill.js.map