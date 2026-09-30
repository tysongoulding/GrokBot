#!/usr/bin/env bash
# ==============================================================================
# GrokBot Deep-Sweep VM Scraper & Forensic Diff Engine (v2.0)
# Reference: https://github.com/tysongoulding/GrokBot
# ==============================================================================
set -uo pipefail

TARGET_DIR="${1:-./grokbot-vm-dump-$(date +%Y%m%d-%H%M%S)}"
echo "===================================================================="
echo "==> Initiating Deep Scrape into: ${TARGET_DIR}"
echo "===================================================================="

# 0. Build Target Directory Hierarchy
mkdir -p "${TARGET_DIR}"/{system-info/tokens/{novnc,window},system-specs/{cron/cron.daily,custom-configs/{auth-sudo,desktop,dev-tools,agent-data},hardware,kernel,libraries/{node,python,system},network,systemd/definitions/system,systemd/definitions/user},diffs,usr-local-bin,usr-local-share,usr-local-lib,etc-system,etc-policies,custom-root-dirs}

# ------------------------------------------------------------------------------
# 1. FORENSIC FILESYSTEM DIFF & UNIQUE UNOWNED FILE SCANNER
# ------------------------------------------------------------------------------
echo "[1/7] Detecting unique filesystem modifications, diffs & unowned files..."

# A. OverlayFS CoW Upperdir (Captures 100% of delta in microVMs / sandboxes)
OVERLAY_UPPER=$(grep -E 'overlay.*lowerdir' /proc/mounts | grep -oP 'upperdir=\K[^,]+' | head -1 || true)
if [ -n "${OVERLAY_UPPER:-}" ] && [ -d "${OVERLAY_UPPER}" ]; then
    echo "  -> [OverlayFS] Upperdir detected at: ${OVERLAY_UPPER}"
    sudo find "${OVERLAY_UPPER}" > "${TARGET_DIR}/diffs/overlay-upperdir-manifest.txt" 2>/dev/null || true
    echo "  -> [OverlayFS] Archiving modified & added files from upperdir..."
    sudo rsync -a --exclude='/tmp' --exclude='/proc' --exclude='/sys' --exclude='/dev' --exclude='/run' \
        "${OVERLAY_UPPER}/" "${TARGET_DIR}/diffs/overlay-upperdir/" 2>/dev/null || true
fi

# B. Package Integrity Verification (Detect altered system files)
if command -v dpkg >/dev/null; then
    echo "  -> [dpkg] Verifying system package integrity (detecting modified distro files)..."
    sudo dpkg --verify > "${TARGET_DIR}/diffs/dpkg-verify.txt" 2>/dev/null || true
    
    # Identify UNOWNED unique files in system paths (/usr, /etc, /opt)
    echo "  -> [dpkg] Generating catalog of all package-managed files..."
    cat /var/lib/dpkg/info/*.list 2>/dev/null | sort -u > /tmp/dpkg_owned_files.txt || true
    
    echo "  -> [dpkg] Scanning /usr/local, /opt, /etc for unique unowned files..."
    sudo find /usr/local /opt /etc -type f 2>/dev/null | grep -Fvf /tmp/dpkg_owned_files.txt > "${TARGET_DIR}/diffs/unowned-custom-files.txt" || true
    rm -f /tmp/dpkg_owned_files.txt
elif command -v rpm >/dev/null; then
    echo "  -> [rpm] Verifying system package integrity..."
    sudo rpm -Va > "${TARGET_DIR}/diffs/rpm-verify.txt" 2>/dev/null || true
fi

# C. Files Modified Since Boot / Last 48 Hours
BOOT_TIME=$(date -d "@$(awk '{print int('$(date +%s)' - $1)}' /proc/uptime 2>/dev/null || echo 0)" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -d '2 days ago' '+%Y-%m-%d %H:%M:%S')
sudo find /etc /home /usr/local /opt /var -newermt "${BOOT_TIME}" -type f 2>/dev/null > "${TARGET_DIR}/diffs/modified-since-boot.txt" || true

# ------------------------------------------------------------------------------
# 2. COMPLETE NETWORK AUDIT & TOPOLOGY
# ------------------------------------------------------------------------------
echo "[2/7] Scraping complete network configuration, sockets & routing..."
NET_DIR="${TARGET_DIR}/system-specs/network"

sudo ss -a -e -p -n -u -t -x > "${NET_DIR}/all-sockets.txt" 2>/dev/null || netstat -anp > "${NET_DIR}/all-sockets.txt" 2>/dev/null || true
ss -s > "${NET_DIR}/socket-summary.txt" 2>/dev/null || true
ip neigh show > "${NET_DIR}/arp-neighbors.txt" 2>/dev/null || true
cat /etc/hosts > "${NET_DIR}/hosts" 2>/dev/null || true
ip -d addr show > "${NET_DIR}/ip-addresses.txt" 2>/dev/null || ifconfig -a > "${NET_DIR}/ip-addresses.txt" 2>/dev/null || true
ip -d link show > "${NET_DIR}/ip-links.txt" 2>/dev/null || true
ip rule show > "${NET_DIR}/ip-rules.txt" 2>/dev/null || true
ip route show table all > "${NET_DIR}/routing-table.txt" 2>/dev/null || route -n > "${NET_DIR}/routing-table.txt" 2>/dev/null || true
ip netns list > "${NET_DIR}/network-namespaces.txt" 2>/dev/null || true
cat /etc/networks > "${NET_DIR}/networks" 2>/dev/null || true
cat /etc/nsswitch.conf > "${NET_DIR}/nsswitch.conf" 2>/dev/null || true
cat /etc/resolv.conf > "${NET_DIR}/resolv.conf" 2>/dev/null || true
if command -v resolvectl >/dev/null; then
    resolvectl status > "${NET_DIR}/systemd-resolved-status.txt" 2>/dev/null || true
fi

# Firewall rules
sudo iptables-save -c > "${NET_DIR}/iptables.txt" 2>/dev/null || true
sudo ip6tables-save -c > "${NET_DIR}/ip6tables.txt" 2>/dev/null || true
sudo nft list ruleset > "${NET_DIR}/nftables.txt" 2>/dev/null || true
if command -v ufw >/dev/null; then
    sudo ufw status verbose > "${NET_DIR}/ufw-status.txt" 2>/dev/null || true
fi

# Tunnels / VPNs / VSOCK
if [ -e "/dev/vsock" ]; then
    echo "VSOCK device present (/dev/vsock)" > "${NET_DIR}/vsock-status.txt"
fi
if command -v wg >/dev/null; then
    sudo wg show > "${NET_DIR}/wireguard-status.txt" 2>/dev/null || true
fi
if command -v tailscale >/dev/null; then
    tailscale status > "${NET_DIR}/tailscale-status.txt" 2>/dev/null || true
fi
curl -s --max-time 3 https://ifconfig.me > "${NET_DIR}/public-egress-ip.txt" 2>/dev/null || true

# ------------------------------------------------------------------------------
# 3. SERVICES, SYSTEMD, PROCESSES & DAEMONS
# ------------------------------------------------------------------------------
echo "[3/7] Scraping systemd services, active processes, and background daemons..."
SYS_DIR="${TARGET_DIR}/system-specs/systemd"

# Full Process Tree with Command Line Arguments and PIDs
ps auxwwf > "${TARGET_DIR}/system-info/processes.txt" 2>/dev/null || true
sudo ss -tulpn > "${TARGET_DIR}/system-info/listening-ports.txt" 2>/dev/null || true

# Systemd unit listings
if command -v systemctl >/dev/null; then
    systemctl list-unit-files --all --no-pager > "${SYS_DIR}/unit-files.txt" 2>/dev/null || true
    systemctl list-units --all --no-pager > "${SYS_DIR}/active-units.txt" 2>/dev/null || true
    systemctl list-timers --all --no-pager > "${SYS_DIR}/timers.txt" 2>/dev/null || true
    systemctl list-sockets --all --no-pager > "${SYS_DIR}/sockets.txt" 2>/dev/null || true
    systemctl status --all --no-pager > "${SYS_DIR}/systemctl-status-all.txt" 2>/dev/null || true

    # Extract all custom systemd unit definitions
    echo "  -> Copying systemd unit files..."
    sudo cp -r /etc/systemd/system/* "${SYS_DIR}/definitions/system/" 2>/dev/null || true
    if [ -d "/etc/systemd/user" ]; then
        sudo cp -r /etc/systemd/user/* "${SYS_DIR}/definitions/user/" 2>/dev/null || true
    fi
fi

# Container runtimes (Docker, Podman, containerd)
if command -v docker >/dev/null; then
    sudo docker ps -a > "${TARGET_DIR}/system-info/docker-containers.txt" 2>/dev/null || true
    sudo docker images > "${TARGET_DIR}/system-info/docker-images.txt" 2>/dev/null || true
fi
if command -v podman >/dev/null; then
    podman ps -a > "${TARGET_DIR}/system-info/podman-containers.txt" 2>/dev/null || true
fi

# ------------------------------------------------------------------------------
# 4. LIBRARIES, RUNTIMES & LANGUAGE ENVIRONMENTS
# ------------------------------------------------------------------------------
echo "[4/7] Scraping libraries, shared objects, compilers & language runtimes..."
LIB_DIR="${TARGET_DIR}/system-specs/libraries"

# OS / Shared Libraries
cat /etc/environment > "${LIB_DIR}/environment" 2>/dev/null || true
printenv > "${LIB_DIR}/environment-variables.txt" 2>/dev/null || true
cat /etc/ld.so.conf > "${LIB_DIR}/ld.so.conf" 2>/dev/null || true
sudo ldconfig -p > "${LIB_DIR}/ldconfig-cache.txt" 2>/dev/null || true
cat /etc/profile > "${LIB_DIR}/profile" 2>/dev/null || true
cp -r /etc/ld.so.conf.d "${LIB_DIR}/" 2>/dev/null || true
cp -r /etc/profile.d "${LIB_DIR}/" 2>/dev/null || true

# Installed System Packages
if command -v dpkg-query >/dev/null; then
    dpkg-query -W -f='${Package}\t${Version}\t${Architecture}\t${Status}\n' > "${LIB_DIR}/dpkg-packages.txt" 2>/dev/null || true
    cp "${LIB_DIR}/dpkg-packages.txt" "${TARGET_DIR}/system-info/installed-packages.txt" 2>/dev/null || true
elif command -v rpm >/dev/null; then
    rpm -qa --qf '%{NAME}\t%{VERSION}-%{RELEASE}\t%{ARCH}\n' > "${LIB_DIR}/rpm-packages.txt" 2>/dev/null || true
    cp "${LIB_DIR}/rpm-packages.txt" "${TARGET_DIR}/system-info/installed-packages.txt" 2>/dev/null || true
fi

# Node.js / Bun / JavaScript ecosystem
if command -v node >/dev/null; then
    node -v > "${LIB_DIR}/node/node-version.txt" 2>/dev/null || true
    npm list -g --depth=0 > "${LIB_DIR}/node/npm-global-packages.txt" 2>/dev/null || true
fi
if command -v bun >/dev/null; then
    bun --version > "${LIB_DIR}/node/bun-version.txt" 2>/dev/null || true
    bun pm ls -g > "${LIB_DIR}/node/bun-global-packages.txt" 2>/dev/null || true
fi

# Python / Pip / UV
if command -v python3 >/dev/null; then
    python3 --version > "${LIB_DIR}/python/python3-version.txt" 2>/dev/null || true
    python3 -m pip list > "${LIB_DIR}/python/pip-packages.txt" 2>/dev/null || true
fi
if command -v uv >/dev/null; then
    uv --version > "${LIB_DIR}/python/uv-version.txt" 2>/dev/null || true
    uv tool list > "${LIB_DIR}/python/uv-tools.txt" 2>/dev/null || true
fi

# Go & Rust
if command -v go >/dev/null; then
    go version > "${LIB_DIR}/go-version.txt" 2>/dev/null || true
    go env > "${LIB_DIR}/go-env.txt" 2>/dev/null || true
fi
if command -v rustc >/dev/null; then
    rustc -vV > "${LIB_DIR}/rustc-version.txt" 2>/dev/null || true
fi

# Copy any custom shared libraries in /usr/local/lib
if [ -d "/usr/local/lib" ]; then
    sudo cp -r /usr/local/lib/* "${TARGET_DIR}/usr-local-lib/" 2>/dev/null || true
fi

# ------------------------------------------------------------------------------
# 5. KERNEL, HARDWARE, CRON & SYSTEM CONFIGS
# ------------------------------------------------------------------------------
echo "[5/7] Scraping kernel parameters, hardware specs, cron & security configs..."

# Kernel
uname -a > "${TARGET_DIR}/system-info/uname.txt"
cp "${TARGET_DIR}/system-info/uname.txt" "${TARGET_DIR}/system-specs/kernel/uname.txt"
cat /proc/version > "${TARGET_DIR}/system-specs/kernel/proc-version.txt" 2>/dev/null || true
cat /proc/cmdline > "${TARGET_DIR}/system-specs/kernel/cmdline.txt" 2>/dev/null || true
sudo dmesg > "${TARGET_DIR}/system-specs/kernel/dmesg.txt" 2>/dev/null || true
lsmod > "${TARGET_DIR}/system-specs/kernel/loaded-modules.txt" 2>/dev/null || true
sudo sysctl -a > "${TARGET_DIR}/system-specs/kernel/sysctl-all.txt" 2>/dev/null || true
if [ -f "/boot/config-$(uname -r)" ]; then
    cp "/boot/config-$(uname -r)" "${TARGET_DIR}/system-specs/kernel/kernel-config.txt" 2>/dev/null || true
fi

# Hardware
lscpu > "${TARGET_DIR}/system-specs/hardware/lscpu.txt" 2>/dev/null || true
cat /proc/cpuinfo > "${TARGET_DIR}/system-specs/hardware/cpuinfo.txt" 2>/dev/null || true
cat /proc/meminfo > "${TARGET_DIR}/system-specs/hardware/proc-meminfo.txt" 2>/dev/null || true
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
crontab -l > "${TARGET_DIR}/system-specs/cron/user-${USER}-crontab.txt" 2>/dev/null || true
sudo crontab -l > "${TARGET_DIR}/system-specs/cron/user-root-crontab.txt" 2>/dev/null || true
cp -r /etc/cron* "${TARGET_DIR}/system-specs/cron/" 2>/dev/null || true

# Sudo & PAM
sudo cp /etc/sudoers "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/sudoers" 2>/dev/null || true
sudo cp -r /etc/sudoers.d "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/" 2>/dev/null || true
sudo cp -r /etc/pam.d "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/" 2>/dev/null || true
sudo cp -r /etc/security "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/" 2>/dev/null || true

# ------------------------------------------------------------------------------
# 6. SCAN FOR UNIQUE ROOT DIRS, CUSTOM TOOLS & SCRIPTS
# ------------------------------------------------------------------------------
echo "[6/7] Scraping custom binaries, user configurations & non-standard directories..."

# Custom binaries in /usr/local/bin and /usr/local/share
sudo cp -r /usr/local/bin/* "${TARGET_DIR}/usr-local-bin/" 2>/dev/null || true
sudo cp -r /usr/local/share/* "${TARGET_DIR}/usr-local-share/" 2>/dev/null || true

# System policies and machine-id
if [ -d "/etc/opt" ]; then
    sudo cp -r /etc/opt/* "${TARGET_DIR}/etc-policies/" 2>/dev/null || true
fi
sudo cp /etc/machine-id "${TARGET_DIR}/etc-system/" 2>/dev/null || true

# Look for ANY non-standard directory at root /
FHS_STANDARD="bin boot dev etc home lib lib64 media mnt opt proc root run sbin srv sys tmp usr var"
for DIR in /*; do
    DIR_NAME=$(basename "$DIR")
    if ! echo "$FHS_STANDARD" | grep -qw "$DIR_NAME"; then
        if [ -d "$DIR" ]; then
            echo "  -> [UNIQUE ROOT DIR DETECTED]: $DIR"
            sudo rsync -a --exclude='node_modules' --exclude='.cache' "$DIR" "${TARGET_DIR}/custom-root-dirs/" 2>/dev/null || true
        fi
    fi
done

# Specifically check for GrokBot/agent common targets: /exec-daemon, /sand, /workspace, /opt
for TARGET in /exec-daemon /sand /workspace /agent /opt; do
    if [ -d "$TARGET" ] && [ ! -d "${TARGET_DIR}/custom-root-dirs/$(basename "$TARGET")" ]; then
        echo "  -> Copying agent directory: $TARGET"
        sudo rsync -a --exclude='node_modules' --exclude='.cache' "$TARGET" "${TARGET_DIR}/custom-root-dirs/" 2>/dev/null || true
    fi
done

# Ephemeral tokens in /tmp
if [ -d "/tmp/sand-novnc-tokens.d" ]; then
    cp -r /tmp/sand-novnc-tokens.d/* "${TARGET_DIR}/system-info/tokens/novnc/" 2>/dev/null || true
fi
if [ -d "/tmp/sand-window-tokens.d" ]; then
    cp -r /tmp/sand-window-tokens.d/* "${TARGET_DIR}/system-info/tokens/window/" 2>/dev/null || true
fi

# Scrape all users under /home and /root
for U_DIR in /home/* /root; do
    if [ -d "$U_DIR" ]; then
        U_NAME=$(basename "$U_DIR")
        DEST_U="${TARGET_DIR}/home-${U_NAME}"
        mkdir -p "$DEST_U"
        
        echo "  -> Scraping profile and configs for user: ${U_NAME}"
        sudo cp "$U_DIR"/.bashrc "$DEST_U/" 2>/dev/null || true
        sudo cp "$U_DIR"/.profile "$DEST_U/" 2>/dev/null || true
        sudo cp "$U_DIR"/.bash_profile "$DEST_U/" 2>/dev/null || true
        sudo cp "$U_DIR"/.tmux.conf "$DEST_U/" 2>/dev/null || true
        
        # .config (excluding heavy browser caches)
        if [ -d "$U_DIR/.config" ]; then
            sudo rsync -a --exclude='*/Cache' --exclude='*/Code Cache' --exclude='google-chrome/*/Cache' \
                "$U_DIR/.config/" "$DEST_U/.config/" 2>/dev/null || true
        fi
        
        # User local bin / local share
        if [ -d "$U_DIR/.local/bin" ]; then
            sudo cp -r "$U_DIR/.local/bin" "$DEST_U/.local-bin" 2>/dev/null || true
        fi
        
        # Check for agent host directories inside user home (e.g. sand-host, deps)
        for SUB in sand-host deps sand-data cursor-server; do
            if [ -d "$U_DIR/$SUB" ]; then
                echo "    -> Copying agent sub-directory: $U_DIR/$SUB"
                sudo rsync -a --exclude='node_modules' "$U_DIR/$SUB" "$DEST_U/" 2>/dev/null || true
            fi
        done
    fi
done

# ------------------------------------------------------------------------------
# 7. SPLIT LARGE BINARIES FOR GITHUB COMPLIANCE (>50MB)
# ------------------------------------------------------------------------------
echo "[7/7] Splitting any large binary files (>50MB) for GitHub compliance..."
sudo chown -R "$USER":"$USER" "${TARGET_DIR}" 2>/dev/null || true

find "${TARGET_DIR}" -type f -size +50M ! -name "*.tar.gz" | while read -r BIG_FILE; do
    echo "  -> Splitting file > 50MB: ${BIG_FILE}"
    split -b 50M "${BIG_FILE}" "${BIG_FILE}.part."
    echo "cat \"\$(basename \"${BIG_FILE}\").part.\"* > \"\$(basename \"${BIG_FILE}\")\" && chmod +x \"\$(basename \"${BIG_FILE}\")\"" > "$(dirname "${BIG_FILE}")/$(basename "${BIG_FILE}").recombine.sh"
    chmod +x "$(dirname "${BIG_FILE}")/$(basename "${BIG_FILE}").recombine.sh"
    rm -f "${BIG_FILE}"
done

echo "===================================================================="
echo "==> Deep scrape successfully finished!"
echo "==> Output directory: ${TARGET_DIR}"
echo "===================================================================="
