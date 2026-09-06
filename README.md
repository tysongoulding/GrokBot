# GrokBot Cloud MicroVM Architecture & Complete Asset Archive

Complete reverse-engineered replication archive for the autonomous cloud agent microVM (`box@cursor:/workspace`, internally codenamed `sand` / `@anysphere/exec-daemon-runtime`).

---

## Repository Directory Layout

```text
GrokBot/
├── README.md
│
├── exec-daemon/                          # Core Agent Runtime (@anysphere/exec-daemon-runtime)
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
├── usr-local-bin/                        # Process Supervisors & Custom Scripts (40+ scripts)
│   ├── sand-exit-watch                   # Root subreaper (PID 53): crash logging & liveness
│   ├── sand-window-router.mjs            # Port 1339 HTTP/WS multi-screen token router
│   ├── start-desktop.sh                  # Turnkey headless desktop supervisor (Xvfb + VNC)
│   ├── box-chrome                        # Managed Chrome launcher (CDP port, WebGL fallbacks)
│   ├── box-chrome-policy                 # Inverted WebAuthn ExtensionSettings policy generator
│   ├── box-cgroups.sh                    # Cgroup v2 scheduler (interactive vs agent slices)
│   ├── box-doctor                        # 10-point health, skew, and open file-descriptor check
│   ├── box-bounded-log.mjs               # Circular in-memory RAM log ring (1MB capped)
│   ├── link-chrome-session               # Multi-monitor shared SQLite cookie/session linker
│   ├── box-xvfb                          # Xvfb launcher with stale socket/lock orphan reaping
│   ├── box-x11vnc                        # x11vnc launcher with port squatter reaping
│   ├── box-xfwm4                         # Window manager launcher with duplicate process reaping
│   ├── box-picom                         # Compositor launcher clearing _NET_WM_CM_S0 selection
│   ├── box-plank                         # Dock launcher synchronized with compositor availability
│   ├── sand-webauthn-proxy-host          # Native messaging bridge for remote WebAuthn
│   ├── sand-ua-governor.mjs              # Browser User-Agent and fingerprint manager
│   ├── sand-web-bot-auth.mjs             # Bot authentication coordinator
│   └── sand-wallpaper                    # Adaptive desktop background manager
│
├── usr-local-share/                      # Inverted WebAuthn Proxy Chrome Extension
│   ├── sand-webauthn-proxy/              # MV3 Extension source (intercepts navigator.credentials)
│   │   ├── manifest.json
│   │   └── background.js
│   ├── sand-webauthn-proxy.crx           # Packed extension binary
│   ├── sand-webauthn-proxy.id            # App ID (pkjakndclmokfbgfnpgjieoebnbghhgb)
│   └── sand-webauthn-proxy.pem           # Extension signing key
│
├── etc-policies/                         # Chrome Managed Policies & Native Messaging
│   ├── native-messaging-hosts/           # co.anysphere.sand.webauthn_proxy.json
│   └── policies/managed/                 # Managed policy JSONs (sand.json, sand-webrtc.json)
│
├── home-box/                             # User Space Configuration & State
│   ├── .config/                          # Plank dock items, XFCE XML channels, dconf DB
│   ├── .local/                           # Custom .desktop launchers (box-chrome.desktop)
│   ├── .bashrc / .profile                # User shell initialization
│   └── sand-data/                        # Persistent agent settings (settings.json)
│
└── system-specs/                         # Hardware, Kernel & OS Architecture Audit
    ├── hardware/                         # lscpu, /proc/meminfo, lsblk, dmidecode, virt
    ├── kernel/                           # Linux 6.12 monolithic /proc/cmdline, sysctl, dmesg
    ├── systemd/                          # Active units, timers, and service definitions
    ├── cron/                             # System and user crontabs
    ├── libraries/                        # ldconfig shared library cache, dpkg manifest
    ├── network/                          # IP interfaces, routing tables, firewall rules (iptables/nft)
    └── custom-configs/                   # dconf dump, hypervisor boot envs (PID 1/53), sudoers
```

---

## Network & Port Topology

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

## Key Architectural Findings

1. **Kernel & Hypervisor**: Linux 6.12 monolithic kernel running under KVM with `nomodule`, fast failover panic handling, and overlayfs root branching.
2. **Multi-Display Multiplexer**: Per-agent headless X11 virtual framebuffers (`1280x800x24`) mapped to dynamic WebSocket tokens via `websockify` on port `6081`.
3. **Inverted WebAuthn Proxy**: Headless Chrome extension forwards `navigator.credentials` ceremonies over native messaging back to the host broker on `1340` (and local laptop YubiKey/TouchID).
4. **Shared Session Model**: Per-display Chrome profiles symlink `Cookies` and `Login Data` SQLite databases to enable "One box, one session" across all screens.
5. **Crash-Loop & Collision Defense**: Tailored wrapper launchers (`box-xvfb`, `box-xfwm4`, `box-picom`, `box-plank`, `box-x11vnc`) reap orphan sockets, locks, and X11 selections.