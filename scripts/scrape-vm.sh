#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-./grokbot-vm-dump-$(date +%Y%m%d-%H%M%S)}"
echo "==> Scraping Linux VM state into: ${TARGET_DIR}"

# 1. Scaffold directory hierarchy
mkdir -p "${TARGET_DIR}/system-info/tokens/novnc"
mkdir -p "${TARGET_DIR}/system-info/tokens/window"
mkdir -p "${TARGET_DIR}/system-specs/"{cron/cron.daily,custom-configs,hardware,kernel,libraries,network,systemd/definitions}
mkdir -p "${TARGET_DIR}/diffs"
mkdir -p "${TARGET_DIR}/usr-local-bin"
mkdir -p "${TARGET_DIR}/usr-local-share"
mkdir -p "${TARGET_DIR}/etc-system"
mkdir -p "${TARGET_DIR}/etc-policies"
mkdir -p "${TARGET_DIR}/home-${USER}"

# 2. Extract Filesystem Diffs
echo "[+] Capturing filesystem diffs..."
OVERLAY_UPPER=$(grep -E 'overlay.*lowerdir' /proc/mounts | grep -oP 'upperdir=\K[^,]+' | head -1 || true)
if [ -n "${OVERLAY_UPPER:-}" ] && [ -d "${OVERLAY_UPPER}" ]; then
    echo "    -> OverlayFS upperdir found: ${OVERLAY_UPPER}"
    sudo find "${OVERLAY_UPPER}" -maxdepth 5 > "${TARGET_DIR}/diffs/overlay-upperdir-manifest.txt" || true
    sudo rsync -a --exclude='/tmp' --exclude='/proc' --exclude='/sys' "${OVERLAY_UPPER}/" "${TARGET_DIR}/diffs/overlay-upperdir/" || true
fi

if command -v dpkg >/dev/null; then
    sudo dpkg --verify > "${TARGET_DIR}/diffs/dpkg-verify.txt" 2>/dev/null || true
fi

# 3. Scrape system-info
echo "[+] Scraping system-info..."
uname -a > "${TARGET_DIR}/system-info/uname.txt"
cat /proc/version > "${TARGET_DIR}/system-info/proc-version.txt" 2>/dev/null || true
cat /proc/cmdline > "${TARGET_DIR}/system-info/proc-cmdline.txt" 2>/dev/null || true
lscpu > "${TARGET_DIR}/system-info/lscpu.txt" 2>/dev/null || true
cat /proc/meminfo > "${TARGET_DIR}/system-info/meminfo.txt" 2>/dev/null || true
cat /proc/mounts > "${TARGET_DIR}/system-info/proc-mounts.txt" 2>/dev/null || true
cat /proc/cgroups > "${TARGET_DIR}/system-info/proc-cgroups.txt" 2>/dev/null || true
sudo dmesg > "${TARGET_DIR}/system-info/dmesg.txt" 2>/dev/null || true
ps auxwwf > "${TARGET_DIR}/system-info/processes.txt" 2>/dev/null || true
sudo ss -tulpn > "${TARGET_DIR}/system-info/listening-ports.txt" 2>/dev/null || netstat -tlpn > "${TARGET_DIR}/system-info/listening-ports.txt" 2>/dev/null || true
if command -v dpkg-query >/dev/null; then
    dpkg-query -W -f='${Package}\t${Version}\t${Architecture}\n' > "${TARGET_DIR}/system-info/installed-packages.txt" 2>/dev/null || true
elif command -v rpm >/dev/null; then
    rpm -qa > "${TARGET_DIR}/system-info/installed-packages.txt" 2>/dev/null || true
fi

# Scrape tokens if sand / novnc directory exists in /tmp
if [ -d "/tmp/sand-novnc-tokens.d" ]; then
    cp -r /tmp/sand-novnc-tokens.d/* "${TARGET_DIR}/system-info/tokens/novnc/" 2>/dev/null || true
fi
if [ -d "/tmp/sand-window-tokens.d" ]; then
    cp -r /tmp/sand-window-tokens.d/* "${TARGET_DIR}/system-info/tokens/window/" 2>/dev/null || true
fi

# 4. Scrape system-specs/hardware
echo "[+] Scraping hardware specs..."
cat /proc/cpuinfo > "${TARGET_DIR}/system-specs/hardware/cpuinfo.txt" 2>/dev/null || true
df -h > "${TARGET_DIR}/system-specs/hardware/df.txt" 2>/dev/null || true
lsblk -a > "${TARGET_DIR}/system-specs/hardware/lsblk.txt" 2>/dev/null || true
lscpu > "${TARGET_DIR}/system-specs/hardware/lscpu.txt" 2>/dev/null || true
free -h > "${TARGET_DIR}/system-specs/hardware/memory-human.txt" 2>/dev/null || true
cat /proc/meminfo > "${TARGET_DIR}/system-specs/hardware/proc-meminfo.txt" 2>/dev/null || true
lspci > "${TARGET_DIR}/system-specs/hardware/lspci.txt" 2>/dev/null || true
systemd-detect-virt > "${TARGET_DIR}/system-specs/hardware/virt-detected.txt" 2>/dev/null || true
sudo dmidecode > "${TARGET_DIR}/system-specs/hardware/dmidecode.txt" 2>/dev/null || true
if [ -d "/sys/devices/virtual/dmi/id" ]; then
    grep -H '' /sys/devices/virtual/dmi/id/* > "${TARGET_DIR}/system-specs/hardware/dmi-ids.txt" 2>/dev/null || true
fi

# 5. Scrape system-specs/kernel
echo "[+] Scraping kernel specs..."
cp "${TARGET_DIR}/system-info/proc-cmdline.txt" "${TARGET_DIR}/system-specs/kernel/cmdline.txt" 2>/dev/null || true
cp "${TARGET_DIR}/system-info/dmesg.txt" "${TARGET_DIR}/system-specs/kernel/dmesg.txt" 2>/dev/null || true
cp "${TARGET_DIR}/system-info/proc-version.txt" "${TARGET_DIR}/system-specs/kernel/proc-version.txt" 2>/dev/null || true
cp "${TARGET_DIR}/system-info/uname.txt" "${TARGET_DIR}/system-specs/kernel/uname.txt" 2>/dev/null || true
lsmod > "${TARGET_DIR}/system-specs/kernel/loaded-modules.txt" 2>/dev/null || true
sudo sysctl -a > "${TARGET_DIR}/system-specs/kernel/sysctl-all.txt" 2>/dev/null || true

# 6. Scrape system-specs/network
echo "[+] Scraping network specs..."
sudo ss -a > "${TARGET_DIR}/system-specs/network/all-sockets.txt" 2>/dev/null || true
ip neigh > "${TARGET_DIR}/system-specs/network/arp-neighbors.txt" 2>/dev/null || true
cat /etc/hosts > "${TARGET_DIR}/system-specs/network/hosts" 2>/dev/null || true
ip a > "${TARGET_DIR}/system-specs/network/ip-addresses.txt" 2>/dev/null || true
ip link > "${TARGET_DIR}/system-specs/network/ip-links.txt" 2>/dev/null || true
ip rule > "${TARGET_DIR}/system-specs/network/ip-rules.txt" 2>/dev/null || true
sudo iptables-save > "${TARGET_DIR}/system-specs/network/iptables.txt" 2>/dev/null || true
sudo ip6tables-save > "${TARGET_DIR}/system-specs/network/ip6tables.txt" 2>/dev/null || true
sudo nft list ruleset > "${TARGET_DIR}/system-specs/network/nftables.txt" 2>/dev/null || true
cat /etc/nsswitch.conf > "${TARGET_DIR}/system-specs/network/nsswitch.conf" 2>/dev/null || true
curl -s --max-time 3 https://ifconfig.me > "${TARGET_DIR}/system-specs/network/public-egress-ip.txt" 2>/dev/null || true
cat /etc/resolv.conf > "${TARGET_DIR}/system-specs/network/resolv.conf" 2>/dev/null || true
ip route > "${TARGET_DIR}/system-specs/network/routing-table.txt" 2>/dev/null || true
ss -s > "${TARGET_DIR}/system-specs/network/socket-summary.txt" 2>/dev/null || true

# 7. Scrape system-specs/libraries & systemd
echo "[+] Scraping libraries & services..."
cat /etc/environment > "${TARGET_DIR}/system-specs/libraries/environment" 2>/dev/null || true
printenv > "${TARGET_DIR}/system-specs/libraries/environment-variables.txt" 2>/dev/null || true
cat /etc/ld.so.conf > "${TARGET_DIR}/system-specs/libraries/ld.so.conf" 2>/dev/null || true
sudo ldconfig -p > "${TARGET_DIR}/system-specs/libraries/ldconfig-cache.txt" 2>/dev/null || true
cat /etc/profile > "${TARGET_DIR}/system-specs/libraries/profile" 2>/dev/null || true
cp -r /etc/ld.so.conf.d "${TARGET_DIR}/system-specs/libraries/" 2>/dev/null || true
cp -r /etc/profile.d "${TARGET_DIR}/system-specs/libraries/" 2>/dev/null || true
systemctl list-unit-files > "${TARGET_DIR}/system-specs/systemd/unit-files.txt" 2>/dev/null || true
sudo cp -r /etc/systemd/system/* "${TARGET_DIR}/system-specs/systemd/definitions/" 2>/dev/null || true

# 8. Scrape Cron & Auth/Sudo
echo "[+] Scraping cron & custom configs..."
crontab -l > "${TARGET_DIR}/system-specs/cron/user-${USER}-crontab.txt" 2>/dev/null || true
sudo crontab -l > "${TARGET_DIR}/system-specs/cron/user-root-crontab.txt" 2>/dev/null || true
cp -r /etc/cron.daily/* "${TARGET_DIR}/system-specs/cron/cron.daily/" 2>/dev/null || true
mkdir -p "${TARGET_DIR}/system-specs/custom-configs/auth-sudo"
sudo cp /etc/sudoers "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/sudoers" 2>/dev/null || true
sudo cp -r /etc/sudoers.d "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/" 2>/dev/null || true
sudo cp -r /etc/pam.d "${TARGET_DIR}/system-specs/custom-configs/auth-sudo/" 2>/dev/null || true

# 9. Scrape Custom Binaries, Scripts & Policies
echo "[+] Scraping binaries and application configs..."
sudo cp -r /usr/local/bin/* "${TARGET_DIR}/usr-local-bin/" 2>/dev/null || true
sudo cp -r /usr/local/share/* "${TARGET_DIR}/usr-local-share/" 2>/dev/null || true

if [ -d "/etc/opt/chrome" ]; then
    sudo cp -r /etc/opt/chrome "${TARGET_DIR}/etc-policies/" 2>/dev/null || true
fi
sudo cp -r /etc/machine-id "${TARGET_DIR}/etc-system/" 2>/dev/null || true

for DIR in /exec-daemon /sand /opt; do
    if [ -d "$DIR" ]; then
        DEST_NAME=$(basename "$DIR")
        echo "    -> Copying custom directory: $DIR"
        sudo rsync -a --exclude='node_modules' "$DIR" "${TARGET_DIR}/${DEST_NAME}" 2>/dev/null || true
    fi
done

# User dotfiles and .config
echo "[+] Scraping user configuration (~/.config, ~/.bashrc, dotfiles)..."
cp "$HOME/.bashrc" "${TARGET_DIR}/home-${USER}/" 2>/dev/null || true
cp "$HOME/.profile" "${TARGET_DIR}/home-${USER}/" 2>/dev/null || true
if [ -d "$HOME/.config" ]; then
    rsync -a --exclude='google-chrome/Default/Cache' \
             --exclude='google-chrome/Default/Code Cache' \
             "$HOME/.config/" "${TARGET_DIR}/home-${USER}/.config/" 2>/dev/null || true
fi

echo "==> Scraping complete! Output located at: ${TARGET_DIR}"
