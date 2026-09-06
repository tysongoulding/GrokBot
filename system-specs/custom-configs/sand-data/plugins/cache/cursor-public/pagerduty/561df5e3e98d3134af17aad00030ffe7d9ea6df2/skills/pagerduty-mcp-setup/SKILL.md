---
name: pagerduty-mcp-setup
description: REQUIRED setup for how to use the PagerDuty MCP server. IMPORTANT If you want to use PagerDuty MCP tools, read these instructions BEFORE checking tool schemas or doing any PagerDuty investigation because the MCP may not work until the API token is configured.
---

IMPORTANT: Before using the PagerDuty MCP or doing any other investigation related to PagerDuty, you must follow these directions and make sure that the following requirements are met.

### Context

The configuration for the MCP of the PagerDuty Plugin lives in the following directory relative to the path to this SKILL.md file: `../../mcp.json`

In a non-configured state, the Authorization header contains the placeholder `Token ${PAGERDUTY_API_TOKEN}`.

IMPORTANT: Before using the PagerDuty MCP you MUST ensure that this placeholder has been replaced with a real PagerDuty User API token.

The PagerDuty-hosted MCP service expects the header to look like this:

```json
{
  "Authorization": "Token your-pagerduty-api-token-here"
}
```

If this has not been customized for the user, you should not do anything except tell the user that the PagerDuty MCP is not configured yet and help them finish setup.

Do not continue investigating PagerDuty or checking PagerDuty MCP tool schemas until the token is configured.

### Steps

Before continuing, take the following steps:

1. Read the `mcp.json` file in the plugin directory. This is in the grandparent directory relative to this SKILL.md file (`../../mcp.json`).
2. If the file still contains `Token ${PAGERDUTY_API_TOKEN}` or `${PAGERDUTY_API_TOKEN}`, stop immediately. Tell the user the PagerDuty MCP is not configured yet.
3. In that message, do all of the following:
   - Cite `mcp.json` and specifically point to the `headers.Authorization` lines in that file so the user knows exactly what to edit.
   - Include a JSON code block with the current `mcp.json` config so they can copy it directly.
   - Tell them to replace `${PAGERDUTY_API_TOKEN}` with their PagerDuty User API token, keeping the `Token ` prefix in the Authorization header.
   - Tell them they can follow PagerDuty's API token instructions here: `https://support.pagerduty.com/main/docs/pagerduty-mcp-server-integration-guide#generate-your-pagerduty-api-token`
   - Do not ask them to send you the token.
   - Do not inspect PagerDuty MCP tools or continue the PagerDuty task yet.
4. Once the token has been added to `mcp.json`, tell the user to refresh Cursor by opening the Command Palette (`⌘⇧P` on Mac or `Ctrl+Shift+P` on Windows/Linux) and running `Reload Window`. Use the current operating system to decide what keybinding to show.
5. Continue on to using the PagerDuty MCP.

### Reference

- PagerDuty API token setup instructions: `https://support.pagerduty.com/main/docs/pagerduty-mcp-server-integration-guide#generate-your-pagerduty-api-token`
- PagerDuty hosted MCP setup guide: `https://support.pagerduty.com/main/docs/pagerduty-mcp-server-integration-guide`
- PagerDuty developer docs: `https://developer.pagerduty.com/docs/mcp-tooling-remote-server`

### Example code block to show the user

When prompting the user to configure the token, include a reference to the header section like so:

```3:5:mcp.json
    "headers": {
      "Authorization": "Token ${PAGERDUTY_API_TOKEN}"
    },
```
