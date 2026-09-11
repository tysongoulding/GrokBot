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
🏗️ *For the deep microVM agent execution architecture, IPC protocols, and conversation storage schemas, see [**ARCHITECTURE.md**](ARCHITECTURE.md).*

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
* **Core Engine**: Running as PID 608 on port `1340` via [`host-main.cjs`](home-box/sand-host/host-main.cjs) (28.8 MB bundle).
* **Connect-RPC & Protobuf Transport**: Implements Connect-RPC and Protobuf for in-box agent service routing, collective management (`createGroup`, `setGroupMembers`), and prompt execution.
* **Worker Offloading & Memory Isolation**:
  * [`agent-isolation/agent-store-worker.cjs`](home-box/sand-host/agent-isolation/agent-store-worker.cjs): Dedicated pool of up to 64 V8 worker threads bound 1:1 to agent `conversation-blobs.db` SQLite stores, executing binary blob transfers via zero-copy `postMessage([buf.buffer])` and containing SQLite faults to individual workers.
  * [`agent-isolation/transcript-mirror-worker.cjs`](home-box/sand-host/agent-isolation/transcript-mirror-worker.cjs): 2-thread pool streaming conversation turns to append-only JSONL files using strict read-only SQLite handles (`DatabaseSync(dbPath, { readOnly: true })`) without locking the database.
  * [`diff-worker.js`](home-box/sand-host/diff-worker.js) & [`unified-diff-worker.js`](home-box/sand-host/unified-diff-worker.js): Multi-threaded diff generation and patch validation.
  * [`extensions/content-search/search-index-worker.cjs`](home-box/sand-host/extensions/content-search/search-index-worker.cjs): Background full-text code indexer feeding SQLite WAL search databases (`search-index.db`).

### 2. Multi-Display Virtualization, Port Formulas & Anti-Usurpation
* **Deterministic Arithmetic Port Offsets** ([`usr-local-bin/box-contract.generated.mjs`](usr-local-bin/box-contract.generated.mjs)):
  $$\text{Exec-Daemon} = 14000 + N, \quad \text{PTY} = 13600 + N, \quad \text{VNC} = 5900 + N, \quad \text{CDP} = 9222 + N$$
* **Token-Authenticated Routing Proxy** ([`usr-local-bin/sand-window-router.mjs`](usr-local-bin/sand-window-router.mjs)):
  Listens on port `1339` fronting all exec daemons. Routes requests using header `x-sand-display: N` and validates session token `x-sand-window-owner` via `crypto.timingSafeEqual` against `/tmp/sand-window-tokens.d/N`.
* **Anti-Usurpation & Ungraceful Crash Reaping** ([`usr-local-bin/start-window`](usr-local-bin/start-window) & [`box-xvfb`](usr-local-bin/box-xvfb)):
  * Detects collisions when an agent attempts to claim an active display bound to another session token, exiting with **Exit Code 75** (`WINDOW_UNAVAILABLE`).
  * `host-main.cjs` catches 75, calls `forgetForeignFork()`, leaves the running display intact, and allocates the next available index.
  * `box-xvfb` unlinks stale `/tmp/.X${N}-lock` files and probes abstract sockets via `ss -lpxH "src = @/tmp/.X11-unix/X${N}"` with progressive SIGTERM/SIGKILL escalation.

### 3. Dual-Tier Session Sync: Cold SQLite Linker + Live CDP Sync
* **Cold Disk Symlinker** ([`usr-local-bin/link-chrome-session`](usr-local-bin/link-chrome-session)): Hardlinks and symlinks `Cookies` and `Login Data` SQLite stores from `/home/box/chrome-profile/Default` into forked monitor profiles (`chrome-profile-N/Default`).
* **Live In-Memory CDP Sync** ([`usr-local-bin/sand-session-sync.mjs`](usr-local-bin/sand-session-sync.mjs)): Background daemon polling Chrome DevTools Protocol ports (`9222 + N`) every 1,500ms via [`usr-local-bin/cdp-cookies.mjs`](usr-local-bin/cdp-cookies.mjs), mirroring cookies and `localStorage` across memory heaps.
* **Google DICE Account Wipe Suppression**: Enterprise policy `BrowserSignin: 0` in [`etc-policies/policies/managed/sand.json`](etc-policies/policies/managed/sand.json) prevents Google's Device and Identity Consistency Engine from triggering global session logout when multi-monitor cookies coexist.
* **Fill-Gap Rotation Safety**: Avoids race conditions on rotating auth cookies (`__Secure-1PSIDTS`, `SIDCC`) by only seeding missing keys (`selectCookieSeed`), allowing each display's browser to advance its own rotation token with Google servers.

### 4. SPA Nonce Dampening & OAuth Circuit Breaker (`ReloadBreaker`)
* **Sliding Window Dampening** ([`usr-local-bin/sand-session-sync.mjs`](usr-local-bin/sand-session-sync.mjs)):
  Prevents infinite reload loops when SPAs (Okta, Auth0, Ashby) mint fresh anti-CSRF nonces on page load. Enforces a 60-second rolling window with a maximum of 3 reloads per `(port, host)`.
* **Decoupled Seeding**: When the breaker trips (`state.open = true`), cookie and storage replication continues uninterrupted while page reloads are suppressed.
* **Single Deferred Reload**: Once quiet for 20 seconds (`RELOAD_QUIET_MS`), flushes exactly one consolidated page reload to apply changes safely without crashing OAuth handshakes.

### 5. Inverted WebAuthn / Hardware Passkey Bridge
* Chrome enterprise policy ([`etc-policies/policies/managed/sand-webauthn.json`](etc-policies/policies/managed/sand-webauthn.json)) forces installation of the proxy extension `pkjakndclmokfbgfnpgjieoebnbghhgb`.
* Intercepts `navigator.credentials.get` / `create` calls via `chrome.webAuthenticationProxy`.
* Uses Chrome Native Messaging ([`usr-local-bin/sand-webauthn-proxy-host`](usr-local-bin/sand-webauthn-proxy-host)) with 4-byte little-endian framing to relay FIDO2 challenges to port `1340`, reverse-tunneling the ceremony to the user's local YubiKey or Touch ID.

### 6. Cgroups v2 Dual-Slice Prioritization
* Configured by [`usr-local-bin/box-cgroups.sh`](usr-local-bin/box-cgroups.sh):
  * `/sys/fs/cgroup/interactive`: Higher `cpu.weight` allocated to UI processes (`Xvfb`, `xfwm4`, `picom`, `x11vnc`, `websockify`, Chrome) to guarantee 60 FPS remote desktop responsiveness.
  * `/sys/fs/cgroup/agent`: Low-priority batch slice housing compilers, test runners, and tool daemons (`exec-daemon`), ensuring heavy compute workloads cannot lag the interactive desktop stream.
* Supervised by [`usr-local-bin/sand-supervisor.mjs`](usr-local-bin/sand-supervisor.mjs) sampling Pressure Stall Information (PSI) metrics.

### 7. Declarative Environment Convergence & Receipts
* [`usr-local-bin/sand-team-converge.mjs`](usr-local-bin/sand-team-converge.mjs) executes declarative team provisioning against `/opt/sand-managed/manifests/`.
* Mutual exclusion enforced by atomic POSIX `/run/sand/managed-setup-converge.lock` directory creation with PID liveness validation.
* Verifies environment state via SHA-256 content hashes, executing `check` scripts and storing deterministic execution receipts in `/opt/sand-managed/receipts/`.

### 8. Native Code Intelligence & Process Inspection
* **Rust Semantic Chunker**: [`home-box/deps/@anysphere/tree-chunk-napi`](home-box/deps/@anysphere/tree-chunk-napi) compiles a custom native Rust N-API addon (`tree-chunk-napi.linux-x64-gnu.node`) for sub-millisecond AST semantic code chunking.
* **Kernel Process Inspector**: [`home-box/deps/cursor-proclist`](home-box/deps/cursor-proclist) uses a native C++ addon (`cursor_proclist.node`) to inspect process trees without spawning expensive shell forks (`ps`/`pgrep`).
* **Wasm AST Parser**: Ships `web-tree-sitter` for cross-language syntax parsing.

### 9. Ephemeral-to-Durable Storage & FUSE Mounting
* **FUSE Filesystem**: [`usr-local-bin/cursor-agent-store-fuse`](usr-local-bin/cursor-agent-store-fuse) (8.9 MB ELF) exposes virtual partition `/agent-stores/{self,peer,share,user,team}`.
* **CLI Credential Vault** ([`usr-local-bin/persist-cli-auth`](usr-local-bin/persist-cli-auth)): Mirrors `~/.ssh`, `~/.gnupg`, `~/.config/gh`, `~/.config/gcloud`, and `~/.aws` with strict permission sanitization (`0700` dirs, `0600` keys) and SHA-256 signature hashing (`content_sig`).
* **Database Cloaking**: Direct file access to `.db`, `.db-wal`, and `.db-shm` is blocked for models via `isModelReadableStorePath()`.

### 10. Anti-Bot Stealth & Memory Logging
* **Fingerprint Spoofing** ([`usr-local-bin/sand-ua-governor.mjs`](usr-local-bin/sand-ua-governor.mjs) & [`sand-fingerprint-profiles.mjs`](usr-local-bin/sand-fingerprint-profiles.mjs)): Spoofs hardware concurrency, WebGL renderer stubs, platform strings, and audio properties over CDP to defeat Cloudflare Turnstile and DataDome.
* **Bounded RAM Ring Buffer** ([`usr-local-bin/box-bounded-log.mjs`](usr-local-bin/box-bounded-log.mjs)): Circular in-memory logging capped at 1 MB per daemon, preventing runaway processes from filling rootfs OverlayFS.

### 11. 10-Point Operational Diagnostic Health Suite (`box-doctor`)
* [`usr-local-bin/box-doctor`](usr-local-bin/box-doctor) gates microVM readiness across 10 critical operational health checks:
  1. `machine-id`: Validates 32 lowercase hex characters in `/etc/machine-id` matching `/var/lib/dbus/machine-id`.
  2. `chrome`: Verifies `google-chrome-stable` availability on PATH.
  3. `chrome-fds`: Ensures Chrome open file descriptors remain below 90% of soft limits (`EMFILE` protection).
  4. `egress`: Validates HTTP reachability to `https://www.google.com/generate_204`.
  5. `clock`: Enforces system clock skew < 60s against remote HTTP date headers.
  6. `dbus`: Verifies D-Bus session bus connectivity.
  7. `xvfb`: Probes X11 server responsiveness via `xdpyinfo -display :1`.
  8. `x11vnc`: Probes loopback RFB socket on port 5900.
  9. `novnc`: Probes Websockify daemon on port 6080 (and port 6081 if subagents are active).
  10. `compositor`: Verifies both `xfwm4` and `picom` are running.

### 12. Multi-Model Routing Topology & Hybrid Execution Matrix
* **Primary Agent & Reasoning**: Dispatches `grok-4.5` ([`home-box/sand-host/host-main.cjs:L333239`](home-box/sand-host/host-main.cjs#L333239)) with `maxMode: true` and parameters `[{ "id": "effort", "value": "high" }, { "id": "fast", "value": "true" }]`. Internal Anysphere development codenames alias this model family as `vega`, `v9`, and `XAIEXTERNAL--...` ([`host-main.cjs:L733671`](home-box/sand-host/host-main.cjs#L733671)).
* **Codebase Exploration Subagent (`explore-subagent`)**: Spawns `cursor-grok-4.5-high-fast` ([`host-main.cjs:L586924`](home-box/sand-host/host-main.cjs#L586924)) to perform rapid regex grep, glob matching, and multi-file code exploration without consuming the main chat turn budget.
* **Context Compaction & Summarization**: Evaluates `shouldUseSandSelfSummary(modelId)` ([`host-main.cjs:L733667-733672`](home-box/sand-host/host-main.cjs#L733667-L733672)). If true (Grok models), the model summarizes itself. If false (external/fallback models), context compaction is delegated to `gemini-2.5-flash` ([`host-main.cjs:L333264`](home-box/sand-host/host-main.cjs#L333264)) with a 2,800,000 character prompt limit (`SAND_SUMMARIZATION_MAX_PROMPT_CHARS = 28e5`) and 32,000 max output tokens via [`createSandSummarizationHandler`](home-box/sand-host/host-main.cjs#L733674-L733681).
* **Virtual Desktop Interaction (`computer-use`)**: Routes GUI interactions on Xvfb `:1` (mouse clicks, typing, coordinate selection via `xdotool`, and WebP screenshots via `polished-renderer`) to the dedicated `sand-cua` model profile ([`host-main.cjs:L333265`](home-box/sand-host/host-main.cjs#L333265)).
* **Upstream Ingress & Lineage**: Streams through `DEFAULT_CURSOR_BACKEND_URL = "https://api2.cursor.sh"` ([`host-main.cjs:L302037`](home-box/sand-host/host-main.cjs#L302037)) using Connect-RPC (`aiserver.v1.InferenceService/Stream`), injecting hierarchical lineage headers `x-parent-request-id`, `x-root-parent-request-id`, and `x-parent-agent-tool-call-id` ([`host-main.cjs:L333298-333311`](home-box/sand-host/host-main.cjs#L333298-L333311)). Authenticated with user JWTs with 5-minute renewal leeway (`TOKEN_REFRESH_LEEWAY_MS = 300000`).

---

## 🧭 Self-Hosted Deployment Inventory: Knowns vs. Unknowns

To deploy this autonomous agent microVM platform independently, the components are partitioned into three distinct tiers:

### 1. Category 1: Application (Desktop & Mobile Applications)

| Subsystem | Status | Details & Repo Evidence | Deployment Requirement / Gap |
| :--- | :--- | :--- | :--- |
| **Canvas UI Runtime** | **KNOWN** | [`exec-daemon/canvas-runtime/canvas-runtime.esm.js`](exec-daemon/canvas-runtime/canvas-runtime.esm.js) (2.1 MB ESM bundle) | Ready to embed in webview; renders dynamic agent cards and DAGs |
| **Canvas TypeScript Types** | **KNOWN** | [`exec-daemon/agent-sdk/cursor/canvas/ui-primitives.d.ts`](exec-daemon/agent-sdk/cursor/canvas/ui-primitives.d.ts) | UI contracts for callouts, buttons, forms, diffs |
| **UI Screen Specifications** | **KNOWN** | [`screenshots/*.png`](screenshots/) (17 reference captures) | Reference design for chat feed, canvas, VNC viewer, and settings |
| **Client-to-VM API Contracts** | **KNOWN** | [`usr-local-bin/box-contract.generated.mjs`](usr-local-bin/box-contract.generated.mjs) | Exact port table, auth headers, and socket addresses |
| **WebAuthn Passkey Protocol** | **KNOWN** | [`usr-local-share/sand-webauthn-proxy/`](usr-local-share/sand-webauthn-proxy) | Native messaging extension & bridge specification |
| **Tauri Application Shell** | **UNKNOWN** | None | **Must Build**: Desktop application wrapper in Tauri + Rust |
| **Client Frontend App** | **UNKNOWN** | None | **Must Build**: React/TypeScript frontend hosting the Canvas runtime |
| **Embedded noVNC Player** | **UNKNOWN** | None | **Must Build**: RFB canvas player with mouse, keyboard, and clipboard sync |
| **Client Auth & Session Store** | **UNKNOWN** | None | **Must Build**: Local secure storage for user tokens and VM endpoints |
| **Client Voice & Audio Layer** | **UNKNOWN** | None | **Must Build**: Audio capture/playback for `nudge_voice_agent` |

### 2. Category 2: Cloud Infra (User MicroVMs & Virtualization)

| Subsystem | Status | Details & Repo Evidence | Deployment Requirement / Gap |
| :--- | :--- | :--- | :--- |
| **Hypervisor Contract & Boot** | **KNOWN** | [`system-specs/kernel/cmdline.txt`](system-specs/kernel/cmdline.txt) & [`dmesg.txt`](system-specs/kernel/dmesg.txt) | Firecracker KVM; monolithic Linux 6.12 (`nomodule`, `rw`, `vda`) |
| **OS Packages & Filesystem** | **KNOWN** | [`system-info/installed-packages.txt`](system-info/installed-packages.txt) | Complete Debian 13 package list (1,000+ deb packages) |
| **Supervisor Hierarchy** | **KNOWN** | [`system-info/processes.txt`](system-info/processes.txt), [`start-sand-box`](usr-local-bin/start-sand-box) | `/pod-daemon` (PID 1/7), `sand-exit-watch` (PID 53), `sand-supervisor` |
| **Multi-Display Virtualization**| **KNOWN** | [`usr-local-bin/start-desktop.sh`](usr-local-bin/start-desktop.sh), [`box-xvfb`](usr-local-bin/box-xvfb), [`box-x11vnc`](usr-local-bin/box-x11vnc) | Virtual X11 display stacks (:1 to :32) and websockify (6080/6081) |
| **Window Router Reverse Proxy** | **KNOWN** | [`usr-local-bin/sand-window-router.mjs`](usr-local-bin/sand-window-router.mjs) | Port 1339 reverse proxy with timing-safe header validation |
| **CDP Session Synchronizer** | **KNOWN** | [`usr-local-bin/sand-session-sync.mjs`](usr-local-bin/sand-session-sync.mjs), [`cdp-cookies.mjs`](usr-local-bin/cdp-cookies.mjs) | Live cookie/storage mirroring, DICE bypass, ReloadBreaker |
| **Agent Daemons & Runtimes** | **KNOWN** | [`exec-daemon/index.js`](exec-daemon/index.js), [`home-box/sand-host/host-main.cjs`](home-box/sand-host/host-main.cjs) | Exec-daemon (1337) and Sand Host (1340 Connect-RPC gateway) |
| **Dual-Tier SQLite Workers** | **KNOWN** | [`home-box/sand-host/agent-isolation/`](home-box/sand-host/agent-isolation) | `agent-store-worker.cjs` (64 threads) and `transcript-mirror-worker.cjs` |
| **Native FUSE Driver** | **KNOWN** | [`usr-local-bin/cursor-agent-store-fuse`](usr-local-bin/cursor-agent-store-fuse) (8.9 MB ELF) | ELF FUSE filesystem driver mounting `/agent-stores` |
| **System Diagnostics** | **KNOWN** | [`usr-local-bin/box-doctor`](usr-local-bin/box-doctor) | 10-point test suite for machine-id, display, VNC, and egress |
| **Rust Host VM Manager (AWS)** | **UNKNOWN** | None | **Must Build**: Host daemon in Rust managing Firecracker (POC on `c6i.xlarge` Spot @ ~$4.98/mo or Prod on `c6a.metal` Fleet) |
| **Host-to-Guest VSOCK Bridge** | **UNKNOWN** | None | **Must Build**: Host-side VSOCK port 52 listener and SSH auth bridge |
| **Kernel .config Build File** | **UNKNOWN** | Empty `system-specs/kernel/kernel-config.txt` | **Must Configure**: Linux 6.12 Kconfig with VirtIO/VSOCK built in |
| **Rootfs Build Pipeline** | **UNKNOWN** | None | **Must Build**: Debootstrap/Packer script creating `/dev/vda` ext4 image |
| **Host FUSE Server Backend** | **UNKNOWN** | None | **Must Build**: Host service backing `cursor-agent-store-fuse` |
| **MicroVM Snapshot Engine** | **UNKNOWN** | None | **Must Build**: Firecracker dirty-page snapshot and resume automation |

### 3. Category 3: Cloud Services (Outside Application & MicroVM)

| Subsystem | Status | Details & Repo Evidence | Deployment Requirement / Gap |
| :--- | :--- | :--- | :--- |
| **Model Routing Topology** | **KNOWN** | [`home-box/sand-host/host-main.cjs`](home-box/sand-host/host-main.cjs) | Exact Connect-RPC proto contract, parameter maps (`effort: high`, `fast: true`), `sand-cua`, `cursor-grok-4.5-high-fast`, and `gemini-2.5-flash` fallback |
| **Remote MCP Matrix** | **KNOWN** | [`OAUTH_AND_APIS.md`](OAUTH_AND_APIS.md) | Protocols and endpoints for Google Workspace, Slack, Jira, AWS |
| **Egress Tunnel Client** | **KNOWN** | [`usr-local-bin/sand-egress-tunnel`](usr-local-bin/sand-egress-tunnel) (2.3 MB ELF) | Outbound WebSocket tunnel client on port 8790 via bearer auth |
| **Egress Supervisor** | **KNOWN** | [`usr-local-bin/supervise-egress-tunnel`](usr-local-bin/supervise-egress-tunnel) | Process supervisor with port reaping and backoff |
| **Persistent Data Schema** | **KNOWN** | [`system-specs/custom-configs/sand-data/`](system-specs/custom-configs/sand-data) | Layout for agents, memory, workflows, plugins, transcripts |
| **Telemetry Event Schema** | **KNOWN** | Captured in `sand-box-telemetry.log` references | Structured JSON telemetry for boot stages and failures |
| **Cloud Ingress & Auth Proxy** | **UNKNOWN** | None | **Must Build**: Envoy/Traefik reverse proxy routing to VM ports 1339/6080 |
| **Multi-Tenant Fleet Scheduler**| **UNKNOWN** | None | **Must Build**: Fleet orchestrator allocating microVMs per user demand |
| **Self-Hosted LLM Model Router**| **UNKNOWN** | None | **Must Build**: Stateless Rust/Axum translation shim + LiteLLM/vLLM backend to supply provider API keys & stream Protobuf frames |
| **Egress Server Gateway** | **UNKNOWN** | None | **Must Build**: Server daemon terminating port 8790 WebSocket tunnel |
| **Marketplace Catalog API** | **UNKNOWN** | None | **Must Build**: Registry API for SearchPlugins and GetPlugin |
| **Cloud Object Storage Sync** | **UNKNOWN** | None | **Must Build**: S3/GCS sync daemon backing up `/home/box/sand-data` |

---

## 🏗️ Self-Hosted Replication Blueprint (Rust & Tauri)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CATEGORY 1: APPLICATION (TAURI + RUST)                          │
│                                                                                        │
│   Tauri Desktop Shell (Rust)                                                           │
│   ├── Native Window, Tray, Keyboard/Mouse capture, Secure Token Storage                │
│   └── Webview Frontend (React / TypeScript)                                            │
│       ├── Canvas UI Runtime (bundled exec-daemon/canvas-runtime/canvas-runtime.esm.js) │
│       ├── Streaming Chat & Action Timeline (Connect-RPC to Port 1340)                  │
│       └── noVNC Remote Desktop Canvas (WebSocket to Ports 6080 / 6081)                 │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │ HTTPS / WSS / gRPC (TLS)
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CATEGORY 3: CLOUD SERVICES (CONTROL PLANE)                      │
│                                                                                        │
│   Cloud Ingress & Auth Proxy (Envoy / Traefik)                                         │
│   ├── Validates user session tokens                                                    │
│   ├── Routes API calls -> User MicroVM Port 1339 (sand-window-router)                  │
│   └── Proxies RFB WebSockets -> User MicroVM Ports 6080 / 6081 (websockify)            │
│                                                                                        │
│   Self-Hosted LLM Model Router (Stateless Rust Shim + LiteLLM/vLLM)                    │
│   ├── Primary Agent: grok-4.5 (effort: high, fast: true) / xAI Grok                    │
│   ├── Exploration Subagent: cursor-grok-4.5-high-fast                                  │
│   ├── Context Compaction: grok-4.5 self-summary (fallback: gemini-2.5-flash)           │
│   └── Computer Use: sand-cua (Vision/Coordinate grounding on Xvfb :1)                  │
│                                                                                        │
│   Egress Proxy Gateway Server (Terminating WebSocket from Guest Port 8790)             │
│                                                                                        │
│   Cloud Storage Sync Engine (S3 / GCS)                                                 │
│   └── Hydrates and backs up /home/box/sand-data across VM lifecycles                   │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │ Internal Cloud Network / WireGuard
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CATEGORY 2: CLOUD INFRA (AWS FIRECRACKER HOST)                  │
│   Host Hypervisor Daemon (grok-hypervisor):                                            │
│   ├── POC Profile: AWS EC2 c6i.xlarge Spot with Nested KVM (~$4.98/mo personal target) │
│   └── Prod Profile: AWS EC2 c6a.metal Bare-Metal Fleet (Multi-AZ Spot Failover)        │
│   ├── Firecracker Process & Jailer chroot (/dev/kvm)                                   │
│   ├── TAP Network Interface (172.30.0.1/24) + Host NAT masquerade                      │
│   ├── AF_VSOCK Listener (Port 52 SSH Auth -> /run/host-services/ssh-auth.sock)         │
│   └── Rootfs Block Device (/dev/vda ext4 with OverlayFS)                               │
│         │                                                                              │
│         │ Boots vmlinux-6.12 monolithic kernel                                         │
│         ▼                                                                              │
│   Guest MicroVM (Debian 13 Trixie, UID 1000 'box')                                     │
│   ├── Supervisor Stack: /pod-daemon (PID 1/7) -> sand-exit-watch (PID 53) -> /tini     │
│   ├── Resource Slices: /sys/fs/cgroup/interactive (High) vs agent (Batch)              │
│   ├── Gateway: sand-host (PID 608, Port 1340 Connect-RPC)                              │
│   ├── Router: sand-window-router.mjs (Port 1339 Reverse Proxy)                         │
│   ├── Headless Displays: Displays :1..:32 (Xvfb + xfwm4 + picom + x11vnc + websockify) │
│   ├── Browser Engine: Chrome profiles + sand-session-sync.mjs (CDP + DICE bypass)      │
│   ├── Storage Engine: SQLite store.db + conversation-blobs.db via Worker Isolates      │
│   └── Diagnostics: box-doctor (10-point automated pass/fail verification)              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Step-by-Step Implementation & Build Manual
For the complete, copy-pasteable build instructions covering all three tiers (kernel compilation, rootfs debootstrap, Rust hypervisor, Connect-RPC model router shim, Docker Compose control plane, and Tauri desktop client), see **[`INSTRUCTIONS.md`](INSTRUCTIONS.md)**.