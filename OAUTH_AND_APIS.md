# GrokBot Marketplace Tools, OAuth, APIs & Credential Storage Architecture

Comprehensive architecture guide detailing how external marketplace tools, MCP servers, OAuth handshakes, API transports, and credentials are configured, executed, and persisted across the GrokBot cloud microVM environment.

---

## 📑 Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Marketplace Tools & MCP API Protocols Matrix](#2-marketplace-tools--mcp-api-protocols-matrix)
3. [OAuth & Authentication Protocols Deep Dive](#3-oauth--authentication-protocols-deep-dive)
   - [Google Workspace (`gmail`, `google-calendar`, `google-drive`)](#google-workspace-gmail-google-calendar-google-drive)
   - [Slack (`slack`)](#slack-slack)
   - [Atlassian Cloud (`atlassian` / Jira, Confluence, Rovo)](#atlassian-cloud-atlassian--jira-confluence-rovo)
   - [PagerDuty (`pagerduty`)](#pagerduty-pagerduty)
   - [1Password (`1password`)](#1password-1password)
   - [AWS Core (`aws-core`)](#aws-core-aws-core)
   - [Context-Mode (`context-mode`)](#context-mode-context-mode)
4. [Storage Topology: Where Credentials & States Live](#4-storage-topology-where-credentials--states-live)
   - [Manifests & Global Settings](#a-manifests--global-settings)
   - [CLI Tool Credential Vault (`persist-cli-auth`)](#b-cli-tool-credential-vault-persist-cli-auth)
   - [Browser Sessions & Live RAM CDP Sync (`sand-session-sync`)](#c-browser-sessions--live-ram-cdp-sync-sand-session-sync)
   - [Hardware Passkey / WebAuthn Reverse Tunnel](#d-hardware-passkey--webauthn-reverse-tunnel)
   - [Ephemeral IPC & Runtime Tokens (`/tmp`)](#e-ephemeral-ipc--runtime-tokens-tmp)
5. [Key Implementation Files in Repository](#5-key-implementation-files-in-repository)

---

## 1. Architectural Overview

The GrokBot cloud microVM (`sand` runtime) executes in an isolated Linux container (`box@cursor:/workspace`). To enable autonomous workflows across external SaaS providers (Google Workspace, Slack, Jira, Confluence, AWS, PagerDuty), the system integrates:

* **Remote Streamable Model Context Protocol (MCP)** servers over HTTPS.
* **Local MCP Stdio Bridges** spawned on-demand via Node/Python runtimes (`uvx`, `npx`).
* **Interactive OAuth 2.0 / 2.1 Handshakes** with automated loopback redirect listeners.
* **Continuous Multi-Screen Session Synchronizers** mirroring cookies and web tokens from memory without triggering anti-bot flags.
* **Persistent Credential Vaults** surviving ephemeral microVM container restarts.

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             GrokBot MicroVM Sandbox                              │
│                                                                                  │
│   ┌────────────────────────┐      Connect-RPC      ┌─────────────────────────┐   │
│   │   Exec Daemon (1337)   │ ◄───────────────────► │  Sand Host (Port 1340)  │   │
│   └───────────┬────────────┘                       └────────────┬────────────┘   │
│               │                                                 │                │
│       ┌───────┴────────┐                               ┌────────┴────────┐       │
│       ▼                ▼                               ▼                 ▼       │
│  Local Stdio     Remote HTTP                      Chrome CDP        WebAuthn     │
│  MCP Proxies     MCP Endpoints                    (Port 9222+N)      Bridge      │
│  (AWS, 1Pass)    (Google, Slack, Atlassian)       Live Cookies      (YubiKey)    │
│       │                │                               │                 │       │
│       └────────────────┴───────────────┬───────────────┴─────────────────┘       │
│                                        │                                         │
│                                        ▼                                         │
│                      Persistent Credential Vault                                 │
│                 (/home/box/cli-config & settings.json)                           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Marketplace Tools & MCP API Protocols Matrix

| Plugin / Tool | Category | Transport Protocol | Remote Endpoint / Command | Auth Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Google Workspace**<br>• [`gmail`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/gmail/)<br>• [`google-calendar`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/google-calendar/)<br>• [`google-drive`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/google-drive/) | Productivity | Streamable HTTP | `https://gmailmcp.googleapis.com/mcp/v1`<br>`https://calendarmcp.googleapis.com/mcp/v1`<br>`https://drivemcp.googleapis.com/mcp/v1` | **OAuth 2.0**<br>(Interactive Google Account login) |
| **Slack**<br>• [`slack`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/) | Collaboration | HTTP MCP | `https://mcp.slack.com/mcp` | **OAuth 2.0** (Port `3118` loopback)<br>+ Token Fallback (`xoxb-`, `xoxp-`) |
| **Atlassian**<br>• [`atlassian`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/) | Issue & Project Management | HTTP MCP | `https://mcp.atlassian.com/v1/mcp/authv2`<br>`https://mcp.atlassian.com/v1/mcp` | **OAuth 2.1 (3LO)** (Just-in-Time)<br>+ Cloud API Token Fallback |
| **PagerDuty**<br>• [`pagerduty`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/pagerduty/) | Incident Response | Streamable HTTP | `https://mcp.pagerduty.com/mcp` | **Static API Token**<br>(`Authorization: Token ${PAGERDUTY_API_TOKEN}`) |
| **1Password**<br>• [`1password`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/1password/) | Secret Management | Local `stdio` | `1password-mcp` | **Local Desktop App IPC**<br>(OS Keychain / Biometric Master) |
| **AWS Core**<br>• [`aws-core`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/) | Cloud Infrastructure | Local `stdio` proxy | `uv tool uvx mcp-proxy-for-aws@1.6.0`<br>&rarr; `https://aws-mcp.us-east-1.api.aws/mcp` | **AWS IAM / SSO**<br>+ OAuth Callback Server |
| **Context-Mode**<br>• [`context-mode`](system-specs/custom-configs/sand-data/plugins/cache/context-mode/) | Code Intelligence | Local plugin / stdio | In-process token compressor & SessionDB SQLite | **None (Local Execution)** |
| **Grafana Assistant**<br>• [`grafana-assistant`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/grafana-assistant/) | Observability | Rule & Skill sets | CLI execution wrappers | **Grafana Service Account Tokens** |
| **Playwright Browser MCP**<br>• [`sand-playwright-mcp`](usr-local-lib/sand-playwright-mcp/) | Browser Automation | Local `stdio` / Unix socket | `/usr/local/libexec/sand-playwright-isolate`<br>&rarr; Chrome CDP (`9222+N`) | **Process Isolation Boundary**<br>+ Session SQLite / CDP Cookie Mirroring |
| **Zabbix Observability**<br>• `@nks-hub/zabbix-mcp` | Systems Monitoring | Local `stdio` proxy | `npm exec @nks-hub/zabbix-mcp` | **Zabbix API Token** |

---

## 3. OAuth & Authentication Protocols Deep Dive

### Google Workspace (`gmail`, `google-calendar`, `google-drive`)
* **Endpoint Architecture**: Directly hosted by Google at `https://*mcp.googleapis.com/mcp/v1`.
* **OAuth Flow**: Standard Google OAuth 2.0 Web/Installed App flow.
* **Consent & Token Scope**: Cursor/Agent prompts for user sign-in. Access tokens grant specific scopes:
  * Mail search, reading, thread extraction, and draft creation.
  * Calendar event search, attendee availability, and scheduling.
  * Drive file search, metadata retrieval, document reading, and export.
* **Token Handling**: Short-lived Bearer tokens refreshed via Google OAuth authorization servers.

### Slack (`slack`)
* **Configuration Files**:
  * Manifest: [`.cursor-plugin/plugin.json`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/.cursor-plugin/plugin.json)
  * Server Specs: [`.mcp.json`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/.mcp.json) & [`.cursor-mcp.json`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/.cursor-mcp.json)
* **OAuth Client IDs**:
  * Production: `1601185624273.8899143856786`
  * Secondary / Cursor: `3660753192626.8903469228982`
* **Loopback Callback Listener**:
  * Automatically binds to `http://localhost:3118` to receive OAuth authorization codes.
* **Token Fallback Mechanisms**:
  * **Bot User OAuth Token** (`xoxb-...`): For automated messaging, channel listening, and background tasks.
  * **User OAuth Token** (`xoxp-...`): For acting on behalf of a specific developer.
  * **CI / Evaluation Token** (`SLACK_MCP_TOKEN`): Loaded via `.env` in automated eval test suites (`test_tool_selection.py`).

### Atlassian Cloud (`atlassian` / Jira, Confluence, Rovo)
* **Configuration Files**:
  * MCP Config: [`.mcp.json`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/.mcp.json) & [`gemini-extension.json`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/gemini-extension.json)
* **OAuth 2.1 3-Legged OAuth (3LO)**:
  * Uses modern OAuth 2.1 PKCE authorization flow.
  * **Just-In-Time (JIT) Tenant Consent**: Users do not need org admins to pre-install an app in Jira/Confluence. Installation is initiated lazily upon user consent.
  * **Granular RBAC**: The MCP server strictly inherits the authenticated user's exact Atlassian permissions. An agent cannot access Jira projects or Confluence spaces the user cannot see.
* **Headless / Service Account Fallback**: Accepts Atlassian Cloud API tokens (`user_email + api_token`) for headless microVM executions.

### PagerDuty (`pagerduty`)
* **Transport**: Streamable HTTP endpoint `https://mcp.pagerduty.com/mcp`.
* **Authentication**: Direct header injection:
  ```http
  Authorization: Token ${PAGERDUTY_API_TOKEN}
  ```
* Configured securely via plugin variable schemas without exposing tokens to git.

### 1Password (`1password`)
* **Transport**: Local `stdio` execution of `1password-mcp`.
* **Zero-Network-Token Model**: Avoids passing static vault tokens over HTTP. Communicates locally with the 1Password desktop app (Labs MCP socket), inheriting the host operating system's biometric / master password authorization.

### AWS Core (`aws-core`)
* **Transport**: Proxied local execution `uvx mcp-proxy-for-aws@1.6.4 https://aws-mcp.us-east-1.api.aws/mcp --skip-auth`.
* **SSO & OAuth Helper**:
  * Bundles [`skills/launch-with-aws/scripts/auth_callback_server.py`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/launch-with-aws/scripts/auth_callback_server.py) and [`auth.py`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/launch-with-aws/scripts/auth.py).
  * Spawns a background HTTP server with CSRF state verification (`_OAuthState`) to handle AWS Builder ID and IAM Identity Center SSO code exchange.

### Context-Mode (`context-mode`)
* **Transport**: Embedded AST chunker and full-text indexer.
* **Authentication**: Fully self-contained local operations; operates against on-disk SQLite session databases (`SessionDB`) without external network egress.

### Playwright MCP & Browser Automation (`sand-playwright-mcp`)
* **Transport**: Local stdio bridge and Chrome DevTools Protocol (`CDP`) WebSocket.
* **Architecture**: Bundled under `usr-local-lib/sand-playwright-mcp/`, integrating `@anysphere/sand-playwright-runtime`, `@playwright/mcp`, and `playwright-core 1.63.0-alpha`.
* **Privilege & Process Isolation**:
  * Executed through `/usr/local/libexec/sand-playwright-isolate` with passwordless sudo (`sudoers.d/sand-playwright`).
  * Connects to Chrome debugging ports (`127.0.0.1:9222+N`) to manipulate DOM elements, intercept network requests, and manage authentication state without exposing raw browser credentials over external networks.

### Zabbix Observability MCP (`@nks-hub/zabbix-mcp`)
* **Transport**: Local stdio MCP bridge spawned via `npm exec @nks-hub/zabbix-mcp`.
* **Authentication**: Token-based API access interacting with Zabbix servers for metric telemetry, host inventories, and alerting.

---


## 4. Storage Topology: Where Credentials & States Live

Understanding where secrets, manifests, and tokens reside is critical for auditing and disaster recovery. In this environment, storage is split across four distinct boundaries:

```text
                               Storage Architecture
                               
   Repo Working Tree                     MicroVM Runtime Filesystem
 ┌──────────────────────┐              ┌───────────────────────────────┐
 │ system-specs/        │              │ /home/box/                    │
 │   custom-configs/    │  Mounts to   │   sand-data/                  │
 │     sand-data/       │ ───────────► │     plugins/ (manifests)      │
 │       plugins/       │              │     settings.json             │
 │       settings.json  │              │     search-index.db           │
 └──────────────────────┘              │                               │
                                       │   cli-config/  ◄───┐          │
                                       │     (Vault)        │ Sync 30s │
                                       │   .config/gh/  ────┘          │
                                       │   .aws/                       │
                                       │                               │
                                       │   chrome-profile/ (SQLite)    │
                                       │     Default/Cookies           │
                                       └──────────────┬────────────────┘
                                                      │ CDP Sync 1500ms
                                                      ▼
                                       ┌───────────────────────────────┐
                                       │ RAM & Ephemeral (/tmp)        │
                                       │   Chrome V8 Heap (Cookies)    │
                                       │   sand-web-bot-auth-signed    │
                                       │   sand-window-tokens.d/       │
                                       └───────────────────────────────┘
```

### A. Manifests & Global Settings
* **Repository Path**: `system-specs/custom-configs/sand-data/`
* **MicroVM In-Box Path**: `/home/box/sand-data/`
* **Key Files**:
  * `/home/box/sand-data/settings.json` — Global MCP box server registrations, enabled scopes, and agent UUID mappings.
  * `/home/box/sand-data/plugins/cache/cursor-public/` — Cached plugin repositories and schemas.
  * `/home/box/sand-data/search-index.db` — SQLite full-text index feeding code search.

### B. CLI Tool Credential Vault (`persist-cli-auth`)
Managed by [`usr-local-bin/persist-cli-auth`](usr-local-bin/persist-cli-auth) to prevent token loss during ephemeral container teardowns:
* **Active Working Paths**:
  * GitHub CLI: `/home/box/.config/gh/hosts.yml` (stores GitHub OAuth tokens)
  * AWS CLI & SSO: `/home/box/.aws/credentials` and `/home/box/.aws/config`
  * Google Cloud SDK: `/home/box/.config/gcloud/credentials.db` & `access_tokens.db`
  * Docker: `/home/box/.docker/config.json`
  * npm Registry: `/home/box/.npmrc` (stores `//registry.npmjs.org/:_authToken`)
  * SSH & Git: `/home/box/.ssh/id_*`, `/home/box/.gitconfig`, `/home/box/.git-credentials`
* **Encrypted Mirror Vault**:
  * Location: `/home/box/cli-config/` (or `$CLI_AUTH_MIRROR`)
  * Swept and updated every 30 seconds (`CLI_AUTH_SAVE_INTERVAL_S=30`).
  * Enforces directory permissions `0700` and file permissions `0600`.
  * Computes deterministic SHA-256 state signatures (`content_sig`) before updating.

### C. Browser Sessions & Live RAM CDP Sync (`sand-session-sync`)
Managed by [`usr-local-bin/sand-session-sync.mjs`](usr-local-bin/sand-session-sync.mjs) and [`usr-local-bin/link-chrome-session`](usr-local-bin/link-chrome-session):
* **On-Disk SQLite Files**:
  * Primary Display (`:1`): `/home/box/chrome-profile/Default/Cookies` and `Login Data`.
  * Forked Agent Displays (`:N`): Symlinked from `/home/box/chrome-profile-N/Default/` to the primary profile.
* **Live In-Memory (V8 Heap) Sync**:
  * Background daemon attaches to Chrome DevTools Protocol ports `9222 + N` every 1,500ms.
  * Injects `httpOnly`, `Secure` session cookies across all active browser instances.
  * Mirrors Single-Page App (SPA) `localStorage` keys across origins—specifically Slack web application tokens (`xoxc-`)—allowing multiple displays to remain authenticated without page reloading.

### D. Hardware Passkey / WebAuthn Reverse Tunnel
Managed by [`usr-local-share/sand-webauthn-proxy/`](usr-local-share/sand-webauthn-proxy/):
* **Chrome Managed Policy**: Force-installs extension `pkjakndclmokfbgfnpgjieoebnbghhgb` via `/etc/opt/chrome/policies/managed/sand-webauthn.json`.
* **Execution Flow**:
  1. Headless Chrome encounters a FIDO2 / WebAuthn prompt.
  2. The extension intercepts `navigator.credentials.get()` / `create()`.
  3. Relays the payload via Native Messaging ([`sand-webauthn-proxy-host`](usr-local-bin/sand-webauthn-proxy-host)) to the Sand Host Gateway on port `1340`.
  4. Port `1340` reverse-tunnels the ceremony back to the developer's physical workstation to be signed by their physical hardware key (YubiKey, Touch ID, Windows Hello).

### E. Ephemeral IPC & Runtime Tokens (`/tmp`)
Governed by [`usr-local-bin/box-contract.generated.mjs`](usr-local-bin/box-contract.generated.mjs):
* **Window Router Tokens**: `/tmp/sand-window-tokens.d/` (authenticates calls on port `1339`).
* **noVNC Virtual Desktop Tokens**: `/tmp/sand-novnc-tokens.d/` (authorizes websockify port `6081` multiplexing to displays).
* **Web Bot Signed Token Cache**: `/tmp/sand-web-bot-auth-signed.json` (origin signatures cached with a 120-second TTL).

---

## 5. Key Implementation Files in Repository

For further code inspection, see these files in the repository:

* **Supervisor & Auth Daemons**:
  * [`usr-local-bin/persist-cli-auth`](usr-local-bin/persist-cli-auth) — Credential vault backup and restore logic.
  * [`usr-local-bin/sand-session-sync.mjs`](usr-local-bin/sand-session-sync.mjs) — Live CDP cookie & Slack token synchronizer.
  * [`usr-local-bin/sand-web-bot-auth.mjs`](usr-local-bin/sand-web-bot-auth.mjs) — Web bot signature verification cache.
  * [`usr-local-bin/link-chrome-session`](usr-local-bin/link-chrome-session) — Multi-display Chrome profile symlinker.
  * [`usr-local-share/sand-webauthn-proxy/`](usr-local-share/sand-webauthn-proxy/) — Hardware passkey reverse tunnel extension.
* **Plugin Configurations**:
  * Slack MCP: [`system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/.cursor-mcp.json`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/.cursor-mcp.json)
  * Atlassian Rovo: [`system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/.mcp.json`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/.mcp.json)
  * PagerDuty MCP: [`system-specs/custom-configs/sand-data/plugins/cache/cursor-public/pagerduty/c66579f1df02a7b8e4e69d7a22830f2824cf4ca3/mcp.json`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/pagerduty/c66579f1df02a7b8e4e69d7a22830f2824cf4ca3/mcp.json)
  * Google Workspace: [`system-specs/custom-configs/sand-data/plugins/cache/cursor-public/gmail/7314f723a487ec406b6369fe5865ba034cfed166/mcp.json`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/gmail/7314f723a487ec406b6369fe5865ba034cfed166/mcp.json)
