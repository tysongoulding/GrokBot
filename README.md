# GrokBot Cloud MicroVM Architecture & Complete Asset Archive

Complete reverse-engineered replication archive for the autonomous cloud agent microVM (`box@cursor:/workspace`, internally codenamed `sand` / `@anysphere/exec-daemon-runtime`).

---

## 🖥️ Live MicroVM Filesystem Map (`box@cursor:/workspace`)

This map illustrates where every runtime daemon, IPC token, supervisor script, and profile lives on the actual microVM:

```text
/ (Root OverlayFS Mount on /dev/vda)
├── workspace/                               # Primary Agent Working Directory ($CWD)
│   └── [Active Git Workspaces & Projects]
│
├── exec-daemon/                             # Root-Owned Agent Execution Runtime
│   ├── exec-daemon                          # Shell launcher wrapper
│   ├── index.js                             # Core agent server bundle (14.3 MB)
│   ├── cursorsandbox                         # Sandbox execution binary (4.7 MB)
│   ├── node                                 # Standalone Node.js runtime (120 MB)
│   ├── pty.node                             # Native node-pty terminal binding
│   ├── polished-renderer.node               # Native WebP/frame compression addon
│   ├── agent-sdk/                           # Canvas UI SDK (React types, DAG layout, diffs)
│   ├── canvas-runtime/                      # Canvas execution runtime (canvas-runtime.esm.js)
│   ├── tools/                               # Pre-installed agent CLI tools
│   │   ├── origin                           # Origin CLI binary (104 MB)
│   │   ├── rg                               # Ripgrep search binary
│   │   ├── gh                               # GitHub CLI binary (41 MB)
│   │   └── tmux                             # Custom tmux binary & tmux.portal.conf
│   └── node_modules/                        # esbuild-wasm, tree-sitter, etc.
│
├── usr/
│   ├── local/
│   │   ├── bin/                             # Custom Process Supervisors & Launchers (40+ scripts)
│   │   │   ├── sand-exit-watch              # PID 53 root subreaper (crash logging & liveness)
│   │   │   ├── sand-window-router.mjs       # Port 1339 multi-screen HTTP/WS router
│   │   │   ├── start-desktop.sh             # Turnkey headless desktop bringup
│   │   │   ├── box-chrome                   # Managed Chrome launcher (CDP port, WebGL stubs)
│   │   │   ├── box-chrome-policy            # ExtensionSettings policy generator
│   │   │   ├── box-cgroups.sh               # Cgroups v2 scheduler (interactive vs agent)
│   │   │   ├── box-doctor                   # 10-point health, skew & fd check
│   │   │   ├── box-bounded-log / .mjs       # Circular in-memory RAM log ring (1MB limit)
│   │   │   ├── link-chrome-session          # Multi-screen SQLite cookie/session linker
│   │   │   ├── box-xvfb / box-x11vnc        # X11 virtual framebuffers with orphan reaping
│   │   │   ├── box-xfwm4 / box-picom        # WM & compositor crash-loop defenses
│   │   │   ├── box-plank                    # Dock launcher synchronized to _NET_WM_CM_S0
│   │   │   ├── sand-webauthn-proxy-host     # Native messaging bridge for remote WebAuthn
│   │   │   ├── sand-ua-governor.mjs         # User-Agent & fingerprint manager
│   │   │   ├── sand-web-bot-auth.mjs        # Bot authentication coordinator
│   │   │   └── sand-wallpaper               # Adaptive desktop wallpaper renderer
│   │   └── share/
│   │       ├── sand-webauthn-proxy/         # Inverted WebAuthn Chrome extension source
│   │       │   ├── manifest.json
│   │       │   └── background.js
│   │       ├── sand-webauthn-proxy.crx      # Packed extension archive
│   │       ├── sand-webauthn-proxy.id       # Extension ID (pkjakndclmokfbgfnpgjieoebnbghhgb)
│   │       └── sand-webauthn-proxy.pem      # Extension signing private key
│   └── share/
│       └── backgrounds/                     # cursor-box-wallpaper.jpg, sand-wallpaper-*.png
│
├── etc/
│   ├── machine-id                           # 32-char device ID (synced with chrome profile)
│   ├── opt/chrome/policies/managed/         # sand.json, sand-webauthn.json, sand-webrtc.json
│   └── opt/chrome/native-messaging-hosts/   # co.anysphere.sand.webauthn_proxy.json
│
├── home/box/                                # Non-Root User Workspace (UID 1000)
│   ├── chrome-profile/                      # Master Chrome Profile (Screen 1)
│   │   ├── Default/                         # Cookies, Login Data (Canonical SQLite stores)
│   │   └── machine-id                       # Persisted device ID copy
│   ├── chrome-profile-N/                    # Per-Screen Chrome Profiles (Screen :4, :6, :7)
│   │   └── Default/                         # Cookies -> symlinked to master Default/
│   ├── sand-data/                           # Persistent agent settings (settings.json)
│   └── .config/                             # plank/, xfce4/, dconf/
│
├── tmp/                                     # Volatile Inter-Process IPC & Token Routing
│   ├── .X11-unix/                           # X11 Display Sockets (X1, X4, X6, X7)
│   ├── sand-novnc-tokens.d/                 # noVNC dynamic tokens (4 -> 5904, 7 -> 5907)
│   ├── sand-window-tokens.d/                # Window router auth tokens per display
│   ├── xdg-runtime-box/                     # Primary XDG runtime dir & DBus session bus
│   ├── xdg-runtime-box-N/                   # Per-screen XDG runtime dirs
│   ├── *.log & *.lock                       # Bounded RAM logs (xvfb, x11vnc, novnc)
│   └── sand-box-telemetry.log               # Fault signal & crash telemetry ring
│
└── sys/fs/cgroup/                           # Cgroups v2 Dual Scheduling Slices
    ├── interactive/                         # High-priority slice: Xvfb, VNC, WM, Compositor
    └── agent/                               # Lower-priority slice: Compilers, agent workers
```

---

## 📂 GrokBot Replication Repository Layout

This map illustrates how the scraped assets are organized in this GitHub archive:

```text
GrokBot/
├── README.md
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
├── usr-local-bin/                        # All 40+ process supervisor & daemon scripts
├── usr-local-share/                      # Inverted WebAuthn proxy extension & signing keys
├── etc-policies/                         # Chrome managed policies & native messaging JSONs
├── home-box/                             # User configs, Plank dock setup, settings.json
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

## 🌐 Network & Port Topology

| Port | Protocol | Component | Purpose |
| :--- | :--- | :--- | :--- |
| `1337` | HTTP/WS | Primary Exec Daemon | Primary agent control endpoint (Display `:1`) |
| `1338` | WebSocket | Primary PTY | Primary terminal multiplexer stream (Display `:1`) |
| `1339` | HTTP/WS | `sand-window-router` | Multi-screen tokenized router (`x-sand-display` header) |
| `1340` | HTTP/RPC | Host Gateway | Inverted WebAuthn & credential broker endpoint |
| `5900` | RFB/TCP | `x11vnc` Display `:1` | Local virtual VNC server (Screen 1) |
| `5900 + N` | RFB/TCP | `x11vnc` Display `:N` | Forked virtual VNC servers (`5904`, `5906`, `5907`) |
| `6080` | HTTP/WS | `websockify` | Default noVNC direct proxy to port `5900` |
| `6081` | HTTP/WS | `websockify` | Token-multiplexed noVNC proxy (`/tmp/sand-novnc-tokens.d`) |
| `9222 + N` | HTTP/WS | Chrome CDP | Chrome DevTools Protocol debugging per display |
| `13600 + N`| WebSocket | Per-Screen PTY | Virtual terminal stream for agent fork screen `N` |
| `14000 + N`| HTTP/RPC | Per-Screen Daemon | Agent command executor for screen `N` (`--computer-use-enabled`) |

---

## 🔑 Key Architectural Findings

1. **Kernel & Hypervisor**: Linux 6.12 monolithic kernel running under KVM with `nomodule`, fast failover panic handling, and overlayfs root branching.
2. **Multi-Display Multiplexer**: Per-agent headless X11 virtual framebuffers (`1280x800x24`) mapped to dynamic WebSocket tokens via `websockify` on port `6081`.
3. **Inverted WebAuthn Proxy**: Headless Chrome extension forwards `navigator.credentials` ceremonies over native messaging back to the host broker on `1340` (and local laptop YubiKey/TouchID).
4. **Shared Session Model**: Per-display Chrome profiles symlink `Cookies` and `Login Data` SQLite databases to enable "One box, one session" across all screens.
5. **Crash-Loop & Collision Defense**: Tailored wrapper launchers (`box-xvfb`, `box-xfwm4`, `box-picom`, `box-plank`, `box-x11vnc`) reap orphan sockets, locks, and X11 selections.