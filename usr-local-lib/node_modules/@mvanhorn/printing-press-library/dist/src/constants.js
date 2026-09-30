export const CLI_COMMAND_NAME = "printing-press-library";
export const NPM_PACKAGE_NAME = "@mvanhorn/printing-press-library";
export const NPX_COMMAND_PREFIX = `npx -y ${NPM_PACKAGE_NAME}`;
export function commandPrefixForInvocation(scriptPath = process.argv[1] ?? "", env = process.env) {
    if (isNpxInvocation(scriptPath, env)) {
        return NPX_COMMAND_PREFIX;
    }
    return CLI_COMMAND_NAME;
}
function isNpxInvocation(scriptPath, env) {
    if (env.npm_command === "exec") {
        return true;
    }
    return /(^|[/\\])_npx([/\\]|$)/.test(scriptPath);
}
//# sourceMappingURL=constants.js.map