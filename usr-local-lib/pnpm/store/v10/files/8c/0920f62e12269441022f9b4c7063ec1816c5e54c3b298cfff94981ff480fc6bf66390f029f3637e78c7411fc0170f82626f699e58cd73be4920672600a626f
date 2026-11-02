import { type Runner } from "./process.js";
export interface InstallSkillOptions {
    agents?: string[];
    runner?: Runner;
}
export declare function skillSource(skillName: string): string;
export declare function skillsAddArgs(skillName: string, options?: InstallSkillOptions): string[];
export declare function installSkill(skillName: string, options?: InstallSkillOptions): Promise<import("./process.js").RunResult>;
export declare function skillsRemoveArgs(skillName: string, options?: InstallSkillOptions): string[];
export declare function removeSkill(skillName: string, options?: InstallSkillOptions): Promise<import("./process.js").RunResult>;
