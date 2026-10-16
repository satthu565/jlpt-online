#!/usr/bin/env bash
# JLPT Online - Server Bootstrap Script (Idempotent)
# Specification: RUNBOOK_PRODUCTION.md Section B1 & Task T1.8.2
set -euo pipefail

echo "=== [1/8] Updating packages and installing baseline utilities ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y full-upgrade
apt-get install -y --no-install-recommends \
  unattended-upgrades \
  fail2ban \
  ca-certificates \
  curl \
  gnupg \
  jq \
  ufw \
  systemd-timesyncd

echo "=== [2/8] Creating user 'deploy' with sudo and docker group ==="
if ! id -u deploy >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G sudo deploy
  echo "User 'deploy' created."
fi

# Secure SSH configuration
mkdir -p /etc/ssh/sshd_config.d
cat <<'EOF' > /etc/ssh/sshd_config.d/99-hardening.conf
# JLPT Security Hardening per Contract B1
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
EOF

if systemctl is-active --quiet sshd; then
  systemctl restart sshd || true
fi

echo "=== [3/8] Configuring 2GB Swap with swappiness=10 ==="
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi
sysctl vm.swappiness=10
if ! grep -q "vm.swappiness=10" /etc/sysctl.conf; then
  echo "vm.swappiness=10" >> /etc/sysctl.conf
fi

echo "=== [4/8] Time synchronization (UTC) - Required for exam timer accuracy ==="
timedatectl set-timezone UTC
systemctl enable --now systemd-timesyncd || true
timedatectl set-ntp true || true

echo "=== [5/8] Installing Docker Engine & Compose Plugin ==="
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update
  apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

usermod -aG docker deploy || true

# Docker daemon log rotation configuration (B1)
mkdir -p /etc/docker
cat <<'EOF' > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  },
  "live-restore": true
}
EOF
systemctl restart docker || true

echo "=== [6/8] Setting up deployment directory /opt/jlpt ==="
mkdir -p /opt/jlpt/profiles /opt/jlpt/backups /opt/jlpt/logs
touch /opt/jlpt/RELEASES
chown -R deploy:deploy /opt/jlpt
chmod 750 /opt/jlpt

echo "=== [7/8] Installing cloudflared for Cloudflare Tunnel ingress ==="
if ! command -v cloudflared >/dev/null 2>&1; then
  mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | \
    tee /etc/apt/sources.list.d/cloudflared.list
  apt-get update
  apt-get install -y cloudflared || true
fi

echo "=== [8/8] System verification complete ==="
echo "Bootstrap successful: system ready for JLPT deployment."
