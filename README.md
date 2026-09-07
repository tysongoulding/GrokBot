# GrokBot Cloud MicroVM Architecture & Complete Asset Archive

Complete reverse-engineered replication archive for the autonomous cloud agent microVM (`box@cursor:/workspace`, internally codenamed `sand` / `@anysphere/exec-daemon-runtime`).

---

## 🌳 Full MicroVM Root Filesystem Map (`/`)

This diagram shows the complete Linux root filesystem hierarchy (`/`) of the microVM running on `/dev/vda`:

```text
/ (MicroVM Root Filesystem - OverlayFS on /dev/vda)
├── bin -> usr/bin                          # Core user binaries symlink
├── boot/                                   # Kernel boot files (MicroVM boots host vmlinux-6.12 directly)
│
├── dev/                                    # Device nodes
│   ├── vda                                 # VirtIO block device (rootfs disk)
│   ├── ttyS0                               # Primary serial console (console=ttyS0 earlyprintk=ttyS0)
│   ├── shm/                                # Shared memory (POSIX shm)
│   └── pts/                                # Virtual pseudo-terminal slave multiplexer
│
├── etc/                                    # System configuration
│   ├── machine-id                          # 32-char hardware UUID (synced to Chrome profile)
│   ├── sudoers.d/box                       # Passwordless sudo configuration for 'box' user
│   ├── opt/chrome/policies/managed/        # Managed Chrome policies (sand-webauthn, webrtc, efficiency)
│   └── opt/chrome/native-messaging-hosts/  # WebAuthn native proxy bridge registration
│
├── exec-daemon/                            # Root-Owned Agent Execution Runtime (@anysphere)
│   ├── exec-daemon                         # Daemon entrypoint script
│   ├── index.js                            # Core agent server bundle (14.3 MB)
│   ├── cursorsandbox                        # Sandbox supervisor binary (4.7 MB)
│   ├── node                                # Standalone Node.js binary (120 MB)
│   ├── pty.node / polished-renderer.node   # Native terminal & WebP rendering C++ addons
│   ├── agent-sdk/                          # Canvas UI SDK (React types, DAG layout, diffs)
│   ├── canvas-runtime/                     # Canvas execution runtime (canvas-runtime.esm.js)
│   └── tools/                              # origin (104 MB), rg, gh, tmux
│
├── home/
│   └── box/                                # Default unprivileged agent user (UID 1000, GID 1000)
│       ├── sand-host/                      # Master Sand Host Gateway (PID 608, Port 1340)
│       │   ├── host-main.cjs               # Connect-RPC / gRPC gateway & supervisor
│       │   ├── diff-worker.js              # Multi-threaded diff and patch worker
│       │   ├── agent-isolation/            # Multi-tenant agent store & transcript mirroring
│       │   └── extensions/content-search/  # Full-text SQLite code indexer worker
│       ├── deps/                           # Native Code Intelligence Addons
│       │   ├── @anysphere/tree-chunk-napi  # Native Rust semantic code chunking
│       │   ├── cursor-proclist             # C++ native process inspector
│       │   └── web-tree-sitter             # WebAssembly AST parser
│       ├── chrome-profile/                 # Primary Chrome profile (Screen :1, port 9223)
│       │   └── Default/                    # Cookies & Login Data (canonical SQLite store)
│       ├── chrome-profile-N/               # Per-display profiles (Screen :N, port 9222+N)
│       │   └── Default/                    # Symlinked Cookies & Login Data -> primary
│       ├── sand-data/                      # Persistent agent state & settings (settings.json)
│       └── .config/                        # Plank dock items, XFCE4 XML channels, dconf DB
│
├── lib -> usr/lib                          # Shared system libraries symlink
├── lib64 -> usr/lib64                      # 64-bit dynamic linker & libraries
├── media/                                  # Mount points for removable media
├── mnt/                                    # Temporary host filesystem mount points
├── opt/                                    # Optional third-party software packages
│
├── proc/                                   # Kernel process & hardware state
│   ├── 1/environ                           # Hypervisor boot environment variables
│   ├── 53/environ                          # sand-exit-watch environment
│   ├── cmdline                             # Boot parameters (console=ttyS0 root=/dev/vda ...)
│   └── cpuinfo / meminfo / mounts          # Hardware topology & active mount table
│
├── root/                                   # Root user home directory
├── run/                                    # Ephemeral system runtime state (dbus, sshd)
├── sbin -> usr/sbin                        # System administration binaries symlink
├── srv/                                    # Service data directory
│
├── sys/                                    # Kernel sysfs & hardware control
│   └── fs/cgroup/                          # Unified cgroup v2 hierarchy
│       ├── interactive/                    # High-priority slice (Xvfb, VNC, WM, Compositor)
│       └── agent/                          # Background slice (compilers, runners, subagents)
│
├── tmp/                                    # Ephemeral IPC, locks & dynamic routing
│   ├── .X11-unix/                          # Headless X11 sockets (X1, X4, X6, X7)
│   ├── sand-novnc-tokens.d/                # noVNC dynamic routing tokens (4 -> 5904, 7 -> 5907)
│   ├── sand-window-tokens.d/               # Window router authorization tokens
│   ├── xdg-runtime-box/                    # Primary user XDG runtime & DBus session bus
│   ├── xdg-runtime-box-N/                  # Per-screen XDG runtime directories
│   ├── *.log & *.lock                      # Circular RAM logs (bounded to 1 MB)
│   └── sand-box-telemetry.log              # Crash and fault telemetry ring buffer
│
├── usr/                                    # Secondary hierarchy for system packages
│   ├── bin/                                # System binaries (Xvfb, x11vnc, websockify, chrome)
│   ├── local/bin/                          # 40+ custom Grokbot / sand supervisor scripts
│   │   ├── sand-exit-watch                 # PID 53 root subreaper (crash logging & liveness)
│   │   ├── sand-window-router.mjs          # Port 1339 multi-screen HTTP/WS router
│   │   ├── start-desktop.sh                # Turnkey headless desktop supervisor
│   │   ├── box-chrome / box-chrome-policy  # Chrome launcher & managed policy generator
│   │   ├── box-cgroups.sh                  # Cgroup v2 scheduler configuration
│   │   ├── box-doctor                      # 10-point system diagnostic checker
│   │   ├── box-bounded-log / .mjs          # Bounded in-memory RAM log ring
│   │   ├── link-chrome-session             # Multi-screen SQLite cookie/session linker
│   │   └── box-xvfb / box-x11vnc / etc.    # Collision & crash-loop prevention wrappers
│   ├── local/share/sand-webauthn-proxy/    # Inverted WebAuthn Chrome extension source & CRX
│   └── share/backgrounds/                  # Cursor wallpapers (cursor-box-wallpaper.jpg)
│
├── var/                                    # Variable data (system logs, package caches)
└── workspace/                              # Active project working tree & user repositories
```

---

## 📂 GrokBot Replication Repository Layout

This map illustrates how the scraped assets are organized in this GitHub archive:

```text
GrokBot/
├── README.md
├── MARKDOWN_INVENTORY.md                 # Complete directory & links to all 674 markdown files
├── SKILLS_LIST.md                        # Master catalog & table of all 70 SKILL.md definitions
├── OAUTH_AND_APIS.md                     # Marketplace tools, OAuth & credential storage architecture
├── screenshots/                          # UI screenshots (desktop, settings, marketplace, routines)
│
├── exec-daemon/                          # Scraped @anysphere/exec-daemon-runtime
│   ├── index.js                          # Main agent server daemon bundle (14.3 MB)
│   ├── cursorsandbox                     # Low-level sandbox execution binary (4.7 MB)
│   ├── node.part.* / node.recombine.sh   # Node.js runtime (split for GitHub 100MB limit)
│   ├── polished-renderer.node            # Native rendering / WebP compression C++ addon
│   ├── pty.node                          # Native node-pty terminal binding
│   ├── agent-sdk/                        # Internal Canvas UI SDK (React types, diff-view, DAG)
│   ├── canvas-runtime/                   # Canvas execution runtime (canvas-runtime.esm.js)
│   ├── tools/                            # Bundled binaries (origin, rg, gh, tmux)
│   │   ├── origin.part.* / recombine.sh  # Origin CLI tool
│   │   ├── rg                            # Ripgrep binary
│   │   ├── gh                            # GitHub CLI binary
│   │   └── tmux                          # Managed tmux binary & configs
│   └── node_modules/                     # Runtime dependencies (esbuild-wasm, tree-sitter, etc.)
│
├── home-box/
│   ├── sand-host/                        # Master Sand Host Service (PID 608, Port 1340)
│   │   ├── host-main.cjs                 # Connect-RPC / gRPC gateway & supervisor
│   │   ├── diff-worker.js                # Multi-threaded diff & patch worker
│   │   ├── agent-isolation/              # Agent isolation & transcript mirror workers
│   │   ├── extensions/content-search/    # SQLite full-text search indexer
│   │   └── node_modules/piscina/         # Multi-threaded worker pool
│   ├── deps/                             # Native Code Intelligence Binaries
│   │   ├── @anysphere/tree-chunk-napi    # Rust semantic code chunker (.node)
│   │   ├── cursor-proclist               # C++ native process inspector (.node)
│   │   └── web-tree-sitter               # WebAssembly AST parser
│   ├── .config/                          # Plank dock items, XFCE XML channels, dconf DB
│   └── sand-data/                        # Persistent agent settings (settings.json)
│
├── usr-local-bin/                        # All 40+ process supervisor & daemon scripts
├── usr-local-share/                      # Inverted WebAuthn proxy extension & signing keys
├── etc-policies/                         # Chrome managed policies & native messaging JSONs
│
└── system-specs/                         # Hardware, Kernel & OS Architecture Audit
    ├── hardware/                         # lscpu, memory, lsblk, dmidecode, virt
    ├── kernel/                           # Linux 6.12 monolithic cmdline, sysctl, dmesg
    ├── systemd/                          # Active units, timers, and service definitions
    ├── cron/                             # System and user crontabs
    ├── libraries/                        # ldconfig shared library cache, dpkg manifest
    ├── network/                          # IP interfaces, routing tables, firewall rules (iptables/nft)
    └── custom-configs/                   # dconf dump, hypervisor boot envs (PID 1/53), sudoers
```

---

## 📑 Markdown Files & Skills Directory

A complete indexed inventory with links to all 674 markdown files across the repository is available in **[`MARKDOWN_INVENTORY.md`](MARKDOWN_INVENTORY.md)**.

### Quick Links to Custom Skills & Workflows

| Category | Description | Primary Links |
| :--- | :--- | :--- |
| **Custom Workflows** | Network ops, Cisco ACI, and alerts | [`optconnect-network-knowledge`](system-specs/custom-configs/sand-data/workflows/optconnect-network-knowledge/SKILL.md) • [`check-google-chat-net-eng-alerts`](system-specs/custom-configs/sand-data/workflows/check-google-chat-net-eng-alerts/SKILL.md) • [`aci-configure`](system-specs/custom-configs/sand-data/workflows/aci-configure/SKILL.md) • [`aci-troubleshoot`](system-specs/custom-configs/sand-data/workflows/aci-troubleshoot/SKILL.md) • [`aci-design`](system-specs/custom-configs/sand-data/workflows/aci-design/SKILL.md) |
| **Managed Skills** | Bot system capabilities & automation | [`box-desktop`](system-specs/custom-configs/sand-data/managed-skills/skills/box-desktop/SKILL.md) • [`code-changes`](system-specs/custom-configs/sand-data/managed-skills/skills/code-changes/SKILL.md) • [`skill-authoring`](system-specs/custom-configs/sand-data/managed-skills/skills/skill-authoring/SKILL.md) • [`channels`](system-specs/custom-configs/sand-data/managed-skills/skills/channels/SKILL.md) • [`routines`](system-specs/custom-configs/sand-data/managed-skills/skills/routines/SKILL.md) • [`add-connector`](system-specs/custom-configs/sand-data/managed-skills/skills/add-connector/SKILL.md) • [View all 12...](MARKDOWN_INVENTORY.md#managed-skills) |
| **Agent State & Memory** | Persistent memory logs & user profiles | [`user-memory profiles`](MARKDOWN_INVENTORY.md#user-profiles) • [`agent memory logs`](MARKDOWN_INVENTORY.md#agent-memory-logs--profiles) • [`agent attachments`](MARKDOWN_INVENTORY.md#agent-attachments) |
| **Plugin Docs & Tools** | Cached skills and tool reference guides | [`aws-core` (305 files)](MARKDOWN_INVENTORY.md#cachecursor-public) • [`slack` (27 files)](MARKDOWN_INVENTORY.md#cachecursor-public) • [`atlassian` (18 files)](MARKDOWN_INVENTORY.md#cachecursor-public) • [`context-mode` (46 files)](MARKDOWN_INVENTORY.md#cachecontext-mode) |

👉 *For the exhaustive directory of all 674 markdown files, see [**MARKDOWN_INVENTORY.md**](MARKDOWN_INVENTORY.md).*  
⚡ *For the complete catalog and trigger table of all 70 agent skills, see [**SKILLS_LIST.md**](SKILLS_LIST.md).*  
🔐 *For marketplace tool protocols, OAuth mechanics, and credential persistence, see [**OAUTH_AND_APIS.md**](OAUTH_AND_APIS.md).*

---

## 📸 GrokBot UI & Desktop Screenshots

Visual captures of the running GrokBot desktop, agent controls, marketplace, routines, and settings:

| Screenshot | Category | Description |
| :--- | :--- | :--- |
| [**`main.png`**](screenshots/main.png) | Main UI | Primary GrokBot chat and workspace interface |
| [**`screen.png`**](screenshots/screen.png) | Virtual Desktop | Full cloud microVM desktop running Plank dock and XFCE |
| [**`screen chrome.png`**](screenshots/screen%20chrome.png) | Browser | Headless Google Chrome instance (Display `:1`) |
| [**`screen terminal.png`**](screenshots/screen%20terminal.png) | Terminal | Active virtual PTY multiplexer stream |
| [**`screen filesystem.png`**](screenshots/screen%20filesystem.png) | Filesystem | In-box project workspace file tree |
| [**`marketplace bots.png`**](screenshots/marketplace%20bots.png) | Marketplace | Curated bots and community agent directory |
| [**`marketplace plugins.png`**](screenshots/marketplace%20plugins.png) | Marketplace | MCP connector and integration plugin store |
| [**`bot rountines.png`**](screenshots/bot%20rountines.png) | Automation | Scheduled and recurring agent routines manager |
| [**`bot seetings.png`**](screenshots/bot%20seetings.png) | Settings | Active bot configuration and scope parameters |
| [**`teach a task.png`**](screenshots/teach%20a%20task.png) | Demonstration | Screen-recorded task teaching interface (`learn-from-demonstration`) |
| [**`side menu.png`**](screenshots/side%20menu.png) | Navigation | Sidebar agent navigation and workspace switching |
| [**`settings computer.png`**](screenshots/settings%20computer.png) | Machine Settings | Computer connection and remote execution bindings |
| [**`settings general.png`**](screenshots/settings%20general.png) | General | User profile, timezone, and global preferences |
| [**`settings update.png`**](screenshots/settings%20update.png) | Updates | Auto-update preferences and idle update opt-in settings |
| [**`settings uage and billing.png`**](screenshots/settings%20uage%20and%20billing.png) | Billing | MicroVM compute usage and subscription metrics |
| [**`bottom left settings .png`**](screenshots/bottom%20left%20settings%20.png) | Preferences | Quick settings drawer and account switcher |
| [**`bot view before import.png`**](screenshots/bot%20view%20before%20import.png) | Setup | Blank agent state prior to template import |

👉 *All full-resolution screenshots are stored in [`screenshots/`](screenshots/).*

---

## 🌐 Network & Port Topology

| Port | Protocol | Component | Purpose |
| :--- | :--- | :--- | :--- |
| `1337` | HTTP/WS | Primary Exec Daemon | Primary agent control endpoint (Display `:1`) |
| `1338` | WebSocket | Primary PTY | Primary terminal multiplexer stream (Display `:1`) |
| `1339` | HTTP/WS | `sand-window-router` | Multi-screen tokenized router (`x-sand-display` header) |
| `1340` | HTTP/RPC | `sand-host` (PID 608) | **Host Gateway**: Connect-RPC, WebAuthn & credential broker |
| `2375` | TCP | Docker Bridge | Docker daemon socket bridge |
| `5900` | RFB/TCP | `x11vnc` Display `:1` | Local virtual VNC server (Screen 1) |
| `5900 + N` | RFB/TCP | `x11vnc` Display `:N` | Forked virtual VNC servers (`5904`, `5906`, `5907`) |
| `6080` | HTTP/WS | `websockify` | Default noVNC direct proxy to port `5900` |
| `6081` | HTTP/WS | `websockify` | Token-multiplexed noVNC proxy (`/tmp/sand-novnc-tokens.d`) |
| `8790` | WebSocket | `sand-egress-tunnel` | Egress tunnel WebSocket for external connectivity |
| `8791` | HTTP/TCP | `sand-egress-tunnel` | CONNECT proxy for outbound traffic filtering |
| `9222 + N` | HTTP/WS | Chrome CDP | Chrome DevTools Protocol debugging per display |
| `13600 + N`| WebSocket | Per-Screen PTY | Virtual terminal stream for agent fork screen `N` |
| `14000 + N`| HTTP/RPC | Per-Screen Daemon | Agent command executor for screen `N` (`--computer-use-enabled`) |
| `50052` | gRPC | In-Box RPC Service | In-box cloud coordination gRPC channel |

---

## 🔑 Key Architectural Findings

### 1. The Sand Host Gateway & Multi-Threaded Worker Pool (`home-box/sand-host/`)
* **Core Engine**: Running as PID 608 on port `1340` via [`host-main.cjs`](home-box/sand-host/host-main.cjs).
* **Connect-RPC / Protobuf Transport**: Full Connect-RPC and Protobuf implementation handling in-box agent service routing.
* **Worker Offloading via `piscina`**: Offloads compute-heavy tasks onto separate V8 worker threads:
  * [`diff-worker.js`](home-box/sand-host/diff-worker.js) & [`unified-diff-worker.js`](home-box/sand-host/unified-diff-worker.js): Parallelized diff generation and atomic patch validation.
  * [`agent-isolation/agent-store-worker.cjs`](home-box/sand-host/agent-isolation/agent-store-worker.cjs): Per-agent filesystem sandbox and state isolation.
  * [`agent-isolation/transcript-mirror-worker.cjs`](home-box/sand-host/agent-isolation/transcript-mirror-worker.cjs): Real-time agent transcript mirroring.
  * [`extensions/content-search/search-index-worker.cjs`](home-box/sand-host/extensions/content-search/search-index-worker.cjs): Background full-text code indexer feeding SQLite WAL search databases.
  * [`pdf-worker.js`](home-box/sand-host/pdf-worker.js): Background PDF text extraction and document parsing.

### 2. Native Code Intelligence & Semantic Chunking Engine (`home-box/deps/`)
* **Rust Semantic Chunker**: [`@anysphere/tree-chunk-napi`](home-box/deps/@anysphere/tree-chunk-napi) compiles a custom Rust binary (`tree-chunk-napi.linux-x64-gnu.node`) providing sub-millisecond semantic code chunking for LLM context windows.
* **Kernel Process Inspector**: [`cursor-proclist`](home-box/deps/cursor-proclist) uses a native C++ addon (`cursor_proclist.node`) to inspect process trees without spawning expensive shell forks (`ps`/`pgrep`).
* **WebAssembly AST Parsing**: Ships `web-tree-sitter` (`tree-sitter.wasm`) for fast syntax tree generation across 10+ programming languages.

### 3. Server-Side Skia 2D Canvas Engine
* **File**: `home-box/sand-host/node_modules/@napi-rs/canvas`
* Employs a native Linux x64 Skia engine (`skia.linux-x64-gnu.node`) enabling the server daemon to render diagrams, canvas primitives, and images server-side without an active GPU.

### 4. Dual-Tier Session Sync: Cold Disk SQLite + Live CDP Sync
* **The Problem**: Chrome loads cookies into memory at startup and never re-reads on-disk SQLite files while running. Writing to a shared disk database only affects *future* browser launches; a user logging in on Screen 1 leaves Screen 4 logged out.
* **The Solution** ([`sand-session-sync.mjs`](usr-local-bin/sand-session-sync.mjs) & [`link-chrome-session`](usr-local-bin/link-chrome-session)):
  1. **Cold Disk Linker**: Symlinks `Cookies` and `Login Data` SQLite databases from the primary profile (`/home/box/chrome-profile/Default`) into forked monitor profiles (`chrome-profile-N/Default`).
  2. **Live RAM CDP Sync**: Background daemon polls Chrome DevTools Protocol ports (`9222 + N`) every 1,500ms, pushing `httpOnly` and `Secure` session cookies across all active browser processes.
  3. **SPA `localStorage` Sync**: Mirrors `localStorage` keys across origins (specifically Slack `xoxc-` tokens) so single-page apps stay authenticated across all screens without page reload.
  4. **Zero-Automation Tell**: Attaches transiently via CDP for a single tick and detaches immediately without enabling `Runtime` or `Page` domains, keeping `navigator.webdriver` false and undetected by anti-bot systems.

### 5. Inverted WebAuthn / Passkey Hardware Key Bridge
* **The Problem**: A headless cloud VM cannot physically access the developer's local USB YubiKey, Apple Touch ID, or Windows Hello biometric sensor.
* **The Solution** ([`usr-local-share/sand-webauthn-proxy/`](usr-local-share/sand-webauthn-proxy)):
  1. Chrome managed policy (`ExtensionSettings` in [`sand-webauthn.json`](etc-policies/policies/managed/sand-webauthn.json)) force-installs the proxy extension `pkjakndclmokfbgfnpgjieoebnbghhgb`.
  2. The extension uses Chrome's `chrome.webAuthenticationProxy` API to intercept `navigator.credentials.get` and `create` calls.
  3. Forwards ceremonies via Native Messaging ([`sand-webauthn-proxy-host`](usr-local-bin/sand-webauthn-proxy-host)) to the host gateway on port `1340`.
  4. The host gateway reverse-tunnels the ceremony back to the user's local machine to be signed by their hardware key, completing cloud authentication without exposing private keys to the cloud VM.

### 6. Self-Updating Host Runtime & Protected Deny-List
* **The Architecture** ([`sand-supervisor.mjs`](usr-local-bin/sand-supervisor.mjs)):
  * On boot, `sand-supervisor.mjs` probes an S3 bucket (`public-asphr-vm-daemon-bucket.s3.us-east-1.amazonaws.com/sand-host-bundle`) within a strict 20-second budget.
  * Pulls dynamic updates to `/home/box/sand-host/host-main.cjs` and syncs supervisor scripts into `/usr/local/bin`.
  * **Protected Deny-List (`BOX_SCRIPTS_DENY`)**: Explicitly blocks remote updates from overwriting core hypervisor/init scripts (`start-sand-box`, `sand-exit-watch`, `box-cgroups.sh`, `box-xvfb`, `box-x11vnc`), preventing bad remote updates from bricking the microVM.

### 7. Remote Cloud Storage Mount via FUSE
* **File**: [`cursor-agent-store-fuse`](usr-local-bin/cursor-agent-store-fuse) (referenced in `cursor_agent_store_fuse_version`).
* Mounts a remote agent storage filesystem via FUSE (`agent-store-fuse` binary from `public-asphr-vm-daemon-bucket`), allowing massive multi-gigabyte project workspaces and checkpoints to be mounted on-demand without exhausting the microVM's local disk.

### 8. Developer Credential Persistence Across Hibernations
* **File**: [`persist-cli-auth`](usr-local-bin/persist-cli-auth)
* Solves credential loss when ephemeral containers stop or wake:
  * Mirrors `~/.ssh`, `~/.gnupg`, `~/.config/gh`, `~/.config/gcloud`, `~/.aws`, `~/.npmrc`, and `~/.gitconfig`.
  * Strips volatile cache folders (`cache/`, `logs/`) on the fly during copy to keep mirrors small.
  * Computes deterministic SHA-256 hashes (`content_sig`) to avoid unnecessary disk writes.
  * **Permission Hardening**: Enforces `0700` for directories and `0600` for private keys upon restoration so `ssh` does not reject loose permissions.

### 9. Anti-Bot Fingerprint Spoofing
* **Files**: [`sand-ua-governor.mjs`](usr-local-bin/sand-ua-governor.mjs) & [`sand-fingerprint-profiles.mjs`](usr-local-bin/sand-fingerprint-profiles.mjs)
* Anti-bot platforms (Cloudflare Turnstile, DataDome, Akamai) look for Linux Xvfb signatures.
* The governor injects `Page.addScriptToEvaluateOnNewDocument` scripts over CDP to spoof Windows/macOS hardware properties (screen color depth, hardware concurrency, WebGL renderer stubs, platform strings) so headless browser automation appears as real desktop users.

### 10. Compositor Synchronization & Collision Defenses
* **File**: [`box-plank`](usr-local-bin/box-plank)
  * Uses Python ctypes with `libX11.so.6` to query `XGetSelectionOwner(dpy, "_NET_WM_CM_S0")`. Delays starting Plank until the window compositor is verified active, eliminating the bug where Plank paints an opaque black box.
* **File**: [`box-picom`](usr-local-bin/box-picom)
  * Reaps stale compositor processes holding `_NET_WM_CM_S0` before launch to fix `SAND-161` (fleet-wide compositor crash-loops).
* **File**: [`box-bounded-log.mjs`](usr-local-bin/box-bounded-log.mjs)
  * High-performance circular in-memory buffer ring capped at 1 MB. Logs rotate in RAM, preventing long-running agent workflows from filling up the root overlayfs.

### 11. Cgroups v2 Dual-Slice Prioritization
* **File**: [`box-cgroups.sh`](usr-local-bin/box-cgroups.sh)
* Partitions processes into two cgroups:
  * `interactive`: Higher `cpu.weight` allocated to UI, Xvfb, window manager, compositor, and VNC daemons to ensure silky 60 FPS remote interaction.
  * `agent`: Lower priority slice where heavy compilers, LLM workers, test runners, and background subagents execute, preventing compute-heavy tasks from lagging the desktop stream.