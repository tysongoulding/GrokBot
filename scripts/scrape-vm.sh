#!/usr/bin/env bash
# ==============================================================================
# GrokBot Deep Forensic VM Scraper (v2.1)
# Exhaustive capture of services, networking, libraries & all unique assets
# Reference: https://github.com/tysongoulding/GrokBot (branch: scrap-v2)
# ==============================================================================

# Do NOT use set -e or set -u so that individual command misses never abort the sweep
TARGET_DIR="${1:-.}"
echo "===================================================================="
echo "==> Starting Deep Forensic Scrape into: ${TARGET_DIR}"
echo "==> Capturing all services, networking, libraries & unique assets"
echo "===================================================================="

# Create the full GrokBot directory layout
mkdir -p "${TARGET_DIR}/system-info/tokens/novnc" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-info/tokens/window" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/cron/cron.daily" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/custom-configs/auth-sudo" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/custom-configs/cursor-server" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/custom-configs/dconf-desktop" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/custom-configs/dev-tools" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/custom-configs/sand-data" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/hardware" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/kernel" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/libraries/ld.so.conf.d" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/libraries/profile.d" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/libraries/node" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/libraries/python" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/network" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/systemd/definitions/system" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/systemd/definitions/user" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/diffs" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/usr-local-bin" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/usr-local-share" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/usr-local-lib" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/etc-system" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/etc-policies" 2>/dev/null || true

# ------------------------------------------------------------------------------
# 1. FORENSIC FILESYSTEM DIFF & UNIQUE ASSET DETECTION
# ------------------------------------------------------------------------------
echo "[1/6] Scanning for unique files, modifications & overlay diffs..."

# A. OverlayFS CoW Upperdir (if running inside container/microVM)
OVERLAY_UPPER=$(grep -E 'overlay' /proc/mounts 2>/dev/null | grep -oP 'upperdir=\K[^,]+' | head -1 || true)
if [ -n "$OVERLAY_UPPER" ] && [ -d "$OVERLAY_UPPER" ]; then
    echo "  [+] OverlayFS upperdir detected: ${OVERLAY_UPPER}"
    sudo find "${OVERLAY_UPPER}" > "${TARGET_DIR}/diffs/overlay-upperdir-manifest.txt" 2>/dev/null || true
    echo "  [+] Archiving OverlayFS modified files..."
    sudo rsync -a --exclude='/tmp' --exclude='/proc' --exclude='/sys' --exclude='/dev' --exclude='/run' \
        "${OVERLAY_UPPER}/" "${TARGET_DIR}/diffs/overlay-upperdir/" 2>/dev/null || true
fi

# B. Package Integrity Verification
if command -v dpkg >/dev/null 2>&1; then
    echo "  [+] Running dpkg integrity audit (modified package files)..."
    sudo dpkg --verify > "${TARGET_DIR}/diffs/dpkg-verify.txt" 2>/dev/null || true
    
    echo "  [+] Finding custom unowned files in /usr/local, /opt, /etc..."
    cat /var/lib/dpkg/info/*.list 2>/dev/null | sort -u > /tmp/dpkg_known_files.txt || true
    sudo find /usr/local /opt /etc -type f 2>/dev/null | grep -Fvf /tmp/dpkg_known_files.txt > "${TARGET_DIR}/diffs/unowned-custom-files.txt" 2>/dev/null || true
    rm -f /tmp/dpkg_known_files.txt
elif command -v rpm >/dev/null 2>&1; then
    echo "  [+] Running rpm integrity audit..."
    sudo rpm -Va > "${TARGET_DIR}/diffs/rpm-verify.txt" 2>/dev/null || true
fi

# C. Files modified since boot / last 48 hours
UPTIME_SECS=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 86400)
BOOT_TIMESTAMP=$(date -d "@$(( $(date +%s) - UPTIME_SECS ))" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -d '2 days ago' '+%Y-%m-%d %H:%M:%S')
sudo find /etc /home /usr/local /opt /var -newermt "${BOOT_TIMESTAMP}" -type f 2>/dev/null > "${TARGET_DIR}/diffs/modified-since-boot.txt" || true

# ------------------------------------------------------------------------------
# 2. COMPLETE SERVICES, SYSTEMD, PROCESSES & DAEMONS
# ------------------------------------------------------------------------------
echo "[2/6] Scraping ALL services, processes, timers & systemd unit definitions..."
SYS_DIR="${TARGET_DIR}/system-specs/systemd"

# Process tree and listening ports
ps auxwwf > "${TARGET_DIR}/system-info/processes.txt" 2>/dev/null || ps -ef > "${TARGET_DIR}/system-info/processes.txt" 2>/dev/null || true
sudo ss -tulpn > "${TARGET_DIR}/system-info/listening-ports.txt" 2>/dev/null || netstat -tlpn > "${TARGET_DIR}/system-info/listening-ports.txt" 2>/dev/null || true

# Systemd full state & unit definitions
if command -v systemctl >/dev/null 2>&1; then
    systemctl list-unit-files --all --no-pager > "${SYS_DIR}/unit-files.txt" 2>/dev/null || true
    systemctl list-units --all --no-pager > "${SYS_DIR}/active-units.txt" 2>/dev/null || true
    systemctl list-timers --all --no-pager > "${SYS_DIR}/timers.txt" 2>/dev/null || true
    systemctl list-sockets --all --no-pager > "${SYS_DIR}/sockets.txt" 2>/dev/null || true
    systemctl status --all --no-pager > "${SYS_DIR}/systemctl-status-all.txt" 2>/dev/null || true

    # Copy ALL custom and active systemd units
    echo "  [+] Copying systemd unit definition files..."
    sudo cp -r /etc/systemd/system/* "${SYS_DIR}/definitions/system/" 2>/dev/null || true
    if [ -d "/etc/systemd/user" ]; then
        sudo cp -r /etc/systemd/user/* "${SYS_DIR}/definitions/user/" 2>/dev/null || true
    fi
    # Also copy any custom units from /lib/systemd/system or /usr/lib/systemd/system
    for UNIT_PATH in /lib/systemd/system /usr/lib/systemd/system; do
        if [ -d "$UNIT_PATH" ]; then
            sudo find "$UNIT_PATH" -maxdepth 1 -name "*sand*" -o -name "*cursor*" -o -name "*grok*" -o -name "*agent*" 2>/dev/null | while read -r U; do
                sudo cp "$U" "${SYS_DIR}/definitions/system/" 2>/dev/null || true
            done
        fi
    done
fi

# SysV / Init.d scripts
if [ -d "/etc/init.d" ]; then
    mkdir -p "${TARGET_DIR}/system-specs/systemd/init.d"
    sudo cp -r /etc/init.d/* "${TARGET_DIR}/system-specs/systemd/init.d/" 2>/dev/null || true
fi

# Docker / Podman containers
if command -v docker >/dev/null 2>&1; then
    sudo docker ps -a > "${TARGET_DIR}/system-info/docker-containers.txt" 2>/dev/null || true
    sudo docker images > "${TARGET_DIR}/system-info/docker-images.txt" 2>/dev/null || true
fi
if command -v podman >/dev/null 2>&1; then
    podman ps -a > "${TARGET_DIR}/system-info/podman-containers.txt" 2>/dev/null || true
fi

# ------------------------------------------------------------------------------
# 3. COMPLETE NETWORKING AUDIT & TOPOLOGY
# ------------------------------------------------------------------------------
echo "[3/6] Scraping ALL networking rules, routes, sockets & firewalls..."
NET_DIR="${TARGET_DIR}/system-specs/network"

sudo ss -a -e -p -n -u -t -x > "${NET_DIR}/all-sockets.txt" 2>/dev/null || netstat -anp > "${NET_DIR}/all-sockets.txt" 2>/dev/null || true
ss -s > "${NET_DIR}/socket-summary.txt" 2>/dev/null || true
ip neigh show > "${NET_DIR}/arp-neighbors.txt" 2>/dev/null || arp -a > "${NET_DIR}/arp-neighbors.txt" 2>/dev/null || true
cat /etc/hosts > "${NET_DIR}/hosts" 2>/dev/null || true
ip -d addr show > "${NET_DIR}/ip-addresses.txt" 2>/dev/null || ifconfig -a > "${NET_DIR}/ip-addresses.txt" 2>/dev/null || true
ip -d link show > "${NET_DIR}/ip-links.txt" 2>/dev/null || true
ip rule show > "${NET_DIR}/ip-rules.txt" 2>/dev/null || true
ip route show table all > "${NET_DIR}/routing-table.txt" 2>/dev/null || route -n > "${NET_DIR}/routing-table.txt" 2>/dev/null || true
ip netns list > "${NET_DIR}/network-namespaces.txt" 2>/dev/null || true
cat /etc/networks > "${NET_DIR}/networks" 2>/dev/null || true
cat /etc/nsswitch.conf > "${NET_DIR}/nsswitch.conf" 2>/dev/null || true
cat /etc/resolv.conf > "${NET_DIR}/resolv.conf" 2>/dev/null || true
if command -v resolvectl >/dev/null 2>&1; then
    resolvectl status > "${NET_DIR}/systemd-resolved-status.txt" 2>/dev/null || true
fi

# Firewall rules
sudo iptables-save -c > "${NET_DIR}/iptables.txt" 2>/dev/null || true
sudo ip6tables-save -c > "${NET_DIR}/ip6tables.txt" 2>/dev/null || true
sudo nft list ruleset > "${NET_DIR}/nftables.txt" 2>/dev/null || true
if command -v ufw >/dev/null 2>&1; then
    sudo ufw status verbose > "${NET_DIR}/ufw-status.txt" 2>/dev/null || true
fi

# Tunnels, VPNs & VSOCK
if [ -e "/dev/vsock" ]; then
    echo "VSOCK device present (/dev/vsock)" > "${NET_DIR}/vsock-status.txt"
fi
if command -v wg >/dev/null 2>&1; then
    sudo wg show > "${NET_DIR}/wireguard-status.txt" 2>/dev/null || true
fi
if command -v tailscale >/dev/null 2>&1; then
    tailscale status > "${NET_DIR}/tailscale-status.txt" 2>/dev/null || true
fi
curl -s --max-time 4 https://ifconfig.me > "${NET_DIR}/public-egress-ip.txt" 2>/dev/null || true

# ------------------------------------------------------------------------------
# 4. LIBRARIES, RUNTIMES, DEPENDENCIES & PACKAGES
# ------------------------------------------------------------------------------
echo "[4/6] Scraping ALL shared libraries, ldconfig, packages & runtimes..."
LIB_DIR="${TARGET_DIR}/system-specs/libraries"

cat /etc/environment > "${LIB_DIR}/environment" 2>/dev/null || true
printenv > "${LIB_DIR}/environment-variables.txt" 2>/dev/null || true
cat /etc/ld.so.conf > "${LIB_DIR}/ld.so.conf" 2>/dev/null || true
sudo ldconfig -p > "${LIB_DIR}/ldconfig-cache.txt" 2>/dev/null || true
cat /etc/profile > "${LIB_DIR}/profile" 2>/dev/null || true
cp -r /etc/ld.so.conf.d/* "${LIB_DIR}/ld.so.conf.d/" 2>/dev/null || true
cp -r /etc/profile.d/* "${LIB_DIR}/profile.d/" 2>/dev/null || true

# Complete Package Lists
if command -v dpkg-query >/dev/null 2>&1; then
    dpkg-query -W -f='${Package}\t${Version}\t${Architecture}\t${Status}\n' > "${LIB_DIR}/dpkg-packages.txt" 2>/dev/null || true
    cp "${LIB_DIR}/dpkg-packages.txt" "${TARGET_DIR}/system-info/installed-packages.txt" 2>/dev/null || true
elif command -v rpm >/dev/null 2>&1; then
    rpm -qa --qf '%{NAME}\t%{VERSION}-%{RELEASE}\t%{ARCH}\n' > "${LIB_DIR}/rpm-packages.txt" 2>/dev/null || true
    cp "${LIB_DIR}/rpm-packages.txt" "${TARGET_DIR}/system-info/installed-packages.txt" 2>/dev/null || true
fi

# Node / Bun
if command -v node >/dev/null 2>&1; then
    node -v > "${LIB_DIR}/node/node-version.txt" 2>/dev/null || true
    npm list -g --depth=0 > "${LIB_DIR}/node/npm-global-packages.txt" 2>/dev/null || true
fi
if command -v bun >/dev/null 2>&1; then
    bun --version > "${LIB_DIR}/node/bun-version.txt" 2>/dev/null || true
    bun pm ls -g > "${LIB_DIR}/node/bun-global-packages.txt" 2>/dev/null || true
fi

# Python / Pip / UV
if command -v python3 >/dev/null 2>&1; then
    python3 --version > "${LIB_DIR}/python/python3-version.txt" 2>/dev/null || true
    python3 -m pip list > "${LIB_DIR}/python/pip-packages.txt" 2>/dev/null || true
fi
if command -v uv >/dev/null 2>&1; then
    uv --version > "${LIB_DIR}/python/uv-version.txt" 2>/dev/null || true
    uv tool list > "${LIB_DIR}/python/uv-tools.txt" 2>/dev/null || true
fi

# Go & Rust
if command -v go >/dev/null 2>&1; then
    go version > "${LIB_DIR}/go-version.txt" 2>/dev/null || true
    go env > "${LIB_DIR}/go-env.txt" 2>/dev/null || true
fi
if command -v rustc >/dev/null 2>&1; then
    rustc -vV > "${LIB_DIR}/rustc-version.txt" 2>/dev/null || true
fi

# Custom libraries from /usr/local/lib
if [ -d "/usr/local/lib" ]; then
    sudo cp -r /usr/local/lib/* "${TARGET_DIR}/usr-local-lib/" 2>/dev/null || true
fi

# ------------------------------------------------------------------------------
# 5. KERNEL, HARDWARE, CRON & SECURITY CONFIGS
# ------------------------------------------------------------------------------
echo "[5/6] Scraping kernel parameters, hardware topology & security specs..."

# Kernel
uname -a > "${TARGET_DIR}/system-info/uname.txt"
cp "${TARGET_DIR}/system-info/uname.txt" "${TARGET_DIR}/system-specs/kernel/uname.txt"
cat /proc/version > "${TARGET_DIR}/system-specs/kernel/proc-version.txt" 2>/dev/null || true
cat /proc/cmdline > "${TARGET_DIR}/system-specs/kernel/cmdline.txt" 2>/dev/null || true
cp "${TARGET_DIR}/system-specs/kernel/cmdline.txt" "${TARGET_DIR}/system-info/proc-cmdline.txt" 2>/dev/null || true
sudo dmesg > "${TARGET_DIR}/system-specs/kernel/dmesg.txt" 2>/dev/null || true
cp "${TARGET_DIR}/system-specs/kernel/dmesg.txt" "${TARGET_DIR}/system-info/dmesg.txt" 2>/dev/null || true
lsmod > "${TARGET_DIR}/system-specs/kernel/loaded-modules.txt" 2>/dev/null || true
sudo sysctl -a > "${TARGET_DIR}/system-specs/kernel/sysctl-all.txt" 2>/dev/null || true
cat /proc/cgroups > "${TARGET_DIR}/system-info/proc-cgroups.txt" 2>/dev/null || true
cat /proc/mounts > "${TARGET_DIR}/system-info/proc-mounts.txt" 2>/dev/null || true

# Hardware
lscpu > "${TARGET_DIR}/system-specs/hardware/lscpu.txt" 2>/dev/null || true
cp "${TARGET_DIR}/system-specs/hardware/lscpu.txt" "${TARGET_DIR}/system-info/lscpu.txt" 2>/dev/null || true
cat /proc/cpuinfo > "${TARGET_DIR}/system-specs/hardware/cpuinfo.txt" 2>/dev/null || true
cat /proc/meminfo > "${TARGET_DIR}/system-specs/hardware/proc-meminfo.txt" 2>/dev/null || true
cp "${TARGET_DIR}/system-specs/hardware/proc-meminfo.txt" "${TARGET_DIR}/system-info/meminfo.txt" 2>/dev/null || true
free -h > "${TARGET_DIR}/system-specs/hardware/memory-human.txt" 2>/dev/null || true
df -h > "${TARGET_DIR}/system-specs/hardware/df.txt" 2>/dev/null || true
lsblk -a > "${TARGET_DIR}/system-specs/hardware/lsblk.txt" 2>/dev/null || true
lspci > "${TARGET_DIR}/system-specs/hardware/lspci.txt" 2>/dev/null || true
systemd-detect-virt > "${TARGET_DIR}/system-specs/hardware/virt-detected.txt" 2>/dev/null || true
sudo dmidecode > "${TARGET_DIR}/system-specs/hardware/dmidecode.txt" 2>/dev/null || true
if [ -d "/sys/devices/virtual/dmi/id" ]; then
    grep -H '' /sys/devices/virtual/dmi/id/* > "${TARGET_DIR}/system-specs/hardware/dmi-ids.txt" 2>/dev/null || true
fi

# Cron
crontab -l > "${TARGET_DIR}/system-specs/cron/user-${USER:-box}-crontab.txt" 2>/dev/null || true
sudo crontab -l > "${TARGET_DIR}/system-specs/cron/user-root-crontab.txt" 2>/dev/null || true
cp -r /etc/cron* "${TARGET_DIR}/system-specs/cron/" 2>/dev/null || true

# Sudo & PAM
sudo cp /etc/sudoers "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/sudoers" 2>/dev/null || true
sudo cp -r /etc/sudoers.d "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/" 2>/dev/null || true
sudo cp -r /etc/pam.d "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/" 2>/dev/null || true
sudo cp -r /etc/security "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/" 2>/dev/null || true

# ------------------------------------------------------------------------------
# 6. SWEEP UNIQUE ROOT DIRS, CUSTOM SCRIPTS, USER HOMES & TOKENS
# ------------------------------------------------------------------------------
echo "[6/6] Sweeping custom scripts, unique root directories, user homes & policies..."

# /usr/local/bin and /usr/local/share
sudo cp -r /usr/local/bin/* "${TARGET_DIR}/usr-local-bin/" 2>/dev/null || true
sudo cp -r /usr/local/share/* "${TARGET_DIR}/usr-local-share/" 2>/dev/null || true

# System policies and machine-id
if [ -d "/etc/opt" ]; then
    sudo cp -r /etc/opt/* "${TARGET_DIR}/etc-policies/" 2>/dev/null || true
fi
sudo cp /etc/machine-id "${TARGET_DIR}/etc-system/" 2>/dev/null || true

# Non-FHS root directories (e.g. /exec-daemon, /sand, /workspace, /agent, /opt, /tools)
FHS_STANDARD="bin boot dev etc home lib lib64 media mnt proc root run sbin srv sys tmp usr var"
for DIR in /*; do
    DIR_NAME=$(basename "$DIR")
    if ! echo "$FHS_STANDARD" | grep -qw "$DIR_NAME"; then
        if [ -d "$DIR" ]; then
            echo "  [+] Unique root directory found: $DIR"
            DEST_ROOT="${TARGET_DIR}/$(basename "$DIR")"
            mkdir -p "$DEST_ROOT"
            sudo rsync -a --exclude='node_modules' --exclude='.cache' "$DIR/" "$DEST_ROOT/" 2>/dev/null || true
        fi
    fi
done

# Ephemeral tokens in /tmp
if [ -d "/tmp/sand-novnc-tokens.d" ]; then
    cp -r /tmp/sand-novnc-tokens.d/* "${TARGET_DIR}/system-info/tokens/novnc/" 2>/dev/null || true
fi
if [ -d "/tmp/sand-window-tokens.d" ]; then
    cp -r /tmp/sand-window-tokens.d/* "${TARGET_DIR}/system-info/tokens/window/" 2>/dev/null || true
fi

# Scrape all home directories and /root
for U_DIR in /home/* /root; do
    if [ -d "$U_DIR" ]; then
        U_NAME=$(basename "$U_DIR")
        DEST_U="${TARGET_DIR}/home-${U_NAME}"
        mkdir -p "$DEST_U"
        
        echo "  [+] Scraping home directory for: ${U_NAME}"
        sudo cp "$U_DIR"/.bashrc "$DEST_U/" 2>/dev/null || true
        sudo cp "$U_DIR"/.profile "$DEST_U/" 2>/dev/null || true
        sudo cp "$U_DIR"/.bash_profile "$DEST_U/" 2>/dev/null || true
        sudo cp "$U_DIR"/.tmux.conf "$DEST_U/" 2>/dev/null || true
        
        # User configurations (.config)
        if [ -d "$U_DIR/.config" ]; then
            sudo rsync -a --exclude='*/Cache' --exclude='*/Code Cache' --exclude='google-chrome/*/Cache' \
                "$U_DIR/.config/" "$DEST_U/.config/" 2>/dev/null || true
        fi
        
        # User local bin / local share
        if [ -d "$U_DIR/.local/bin" ]; then
            sudo cp -r "$U_DIR/.local/bin" "$DEST_U/.local-bin" 2>/dev/null || true
        fi
        
        # Agent host directories in home (sand-host, deps, sand-data, cursor-server)
        for SUB in sand-host deps sand-data cursor-server; do
            if [ -d "$U_DIR/$SUB" ]; then
                echo "    -> Archiving user agent directory: $U_DIR/$SUB"
                sudo rsync -a --exclude='node_modules' "$U_DIR/$SUB" "$DEST_U/" 2>/dev/null || true
            fi
        done
    fi
done

# Fix ownership so non-root git can stage everything
CURR_USER="${SUDO_USER:-$USER}"
sudo chown -R "$CURR_USER":"$CURR_USER" "${TARGET_DIR}" 2>/dev/null || true

echo "===================================================================="
echo "==> Deep scrape finished successfully!"
echo "===================================================================="
