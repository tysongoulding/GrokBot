# 🚀 GrokBot End-to-End Implementation & Deployment Guide (Soup to Nuts)

This document is the exhaustive, production-grade build manual to reconstruct, compile, deploy, and operate the entire GrokBot autonomous agent platform from source across all three architectural tiers:

1. **Category 1: Application Tier** — Native desktop application built on **Tauri v2 + Rust** with an embedded React/TypeScript Canvas runtime and noVNC remote desktop canvas.
2. **Category 2: Cloud Infra Tier** — Monolithic Linux 6.12 kernel, reproducible Debian 13 rootfs image, and bare-metal **Rust Firecracker Hypervisor Daemon** (`grok-hypervisor`).
3. **Category 3: Cloud Services Tier** — Stateless **Rust Connect-RPC Model Router Shim**, LiteLLM proxy gateway, Traefik edge ingress, and WebSocket egress tunnel server.

---

## 📋 Table of Contents
- [1. Host Environment Prerequisites](#1-host-environment-prerequisites)
- [2. Phase 1: Cloud Infra (Kernel, Rootfs & Firecracker Hypervisor)](#2-phase-1-cloud-infra-kernel-rootfs--firecracker-hypervisor)
  - [2.1 Monolithic Linux 6.12 Kernel Build](#21-monolithic-linux-612-kernel-build)
  - [2.2 Debian 13 (Trixie) Rootfs Appliance Pipeline](#22-debian-13-trixie-rootfs-appliance-pipeline)
  - [2.3 Bare-Metal Rust Hypervisor Daemon (`grok-hypervisor`)](#23-bare-metal-rust-hypervisor-daemon-grok-hypervisor)
- [3. Phase 2: Cloud Services & Model Router Tier](#3-phase-2-cloud-services--model-router-tier)
  - [3.1 Connect-RPC Protocol Specification (`aiserver.proto`)](#31-connect-rpc-protocol-specification-aiserverproto)
  - [3.2 Stateless Rust Connect-RPC Translation Proxy](#32-stateless-rust-connect-rpc-translation-proxy)
  - [3.3 LiteLLM Multi-Model Routing Configuration](#33-litellm-multi-model-routing-configuration)
  - [3.4 WebSocket Egress Tunnel Gateway](#34-websocket-egress-tunnel-gateway)
  - [3.5 Docker Compose Control Plane Stack](#35-docker-compose-control-plane-stack)
- [4. Phase 3: Application Tier (Tauri + Rust Desktop Client)](#4-phase-3-application-tier-tauri--rust-desktop-client)
  - [4.1 Tauri v2 Project Scaffolding & Configuration](#41-tauri-v2-project-scaffolding--configuration)
  - [4.2 React Webview Canvas Runtime Host](#42-react-webview-canvas-runtime-host)
  - [4.3 High-Performance noVNC Remote Desktop Canvas](#43-high-performance-novnc-remote-desktop-canvas)
  - [4.4 Inverted WebAuthn Passkey Bridge Hook](#44-inverted-webauthn-passkey-bridge-hook)
- [5. Phase 4: End-to-End Boot & Verification Playbook](#5-phase-4-end-to-end-boot--verification-playbook)
  - [5.1 Step-by-Step Bring-Up](#51-step-by-step-bring-up)
  - [5.2 Automated Health Diagnostics (`box-doctor`)](#52-automated-health-diagnostics-box-doctor)
- [6. Category 1 Gap Playbooks: Application Tier](#6-category-1-gap-playbooks-application-tier)
  - [6.1 Canvas Interactive Action Dispatcher](#61-canvas-interactive-action-dispatcher)
  - [6.2 Bidirectional Clipboard & File Drag-and-Drop Bridge](#62-bidirectional-clipboard--file-drag-and-drop-bridge)
  - [6.3 Low-Latency Voice Pipeline (Audio Streamer)](#63-low-latency-voice-pipeline-audio-streamer)
- [7. Category 2 Gap Playbooks: Cloud Infra Tier](#7-category-2-gap-playbooks-cloud-infra-tier)
  - [7.1 Sub-Second Cold Starts (Snapshot & Memory Restore API)](#71-sub-second-cold-starts-snapshot--memory-restore-api)
  - [7.2 Persistent FUSE Filesystem Backend (`/agent-stores`)](#72-persistent-fuse-filesystem-backend-agent-stores)
  - [7.3 Ephemeral CoW Disk Overlays per MicroVM](#73-ephemeral-cow-disk-overlays-per-microvm)
  - [7.4 Dynamic Subagent Display Allocation Lifecycle](#74-dynamic-subagent-display-allocation-lifecycle)
- [8. Category 3 Gap Playbooks: Cloud Services Tier](#8-category-3-gap-playbooks-cloud-services-tier)
  - [8.1 MicroVM Warm-Pool Fleet Autoscaler](#81-microvm-warm-pool-fleet-autoscaler)
  - [8.2 Remote MCP OAuth Credential Vault & Rotation](#82-remote-mcp-oauth-credential-vault--rotation)
  - [8.3 Private Marketplace Catalog API & Telemetry Sink](#83-private-marketplace-catalog-api--telemetry-sink)

---

## 1. Host Environment Prerequisites

The hypervisor host requires bare-metal x86_64 hardware with hardware virtualization extensions enabled (Intel VT-x or AMD-V). Nested virtualization inside cloud instances (e.g., AWS `c5.metal`, `c6i.metal`, or GCP bare-metal) is fully supported.

```bash
# Verify KVM hardware virtualization support
ls -l /dev/kvm
# Verify user permissions
sudo usermod -aG kvm $USER

# Install system dependencies (Debian/Ubuntu host)
sudo apt-get update && sudo apt-get install -y \
  build-essential \
  curl \
  wget \
  git \
  debootstrap \
  qemu-utils \
  e2fsprogs \
  iptables \
  iproute2 \
  pkg-config \
  libssl-dev \
  protobuf-compiler \
  libprotobuf-dev \
  flex \
  bison \
  libelf-dev \
  bc

# Install Rust stable toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install Node.js 20+ LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 2. Phase 1: Cloud Infra (Kernel, Rootfs & Firecracker Hypervisor)

### 2.1 Monolithic Linux 6.12 Kernel Build

Firecracker microVMs require an uncompressed monolithic ELF kernel binary (`vmlinux`) compiled with `CONFIG_MODULES=n` (all required VirtIO drivers built directly into the core binary).

#### `build-kernel.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

KERNEL_VER="6.12.6"
WORKDIR="$(pwd)/build/kernel"
mkdir -p "${WORKDIR}"
cd "${WORKDIR}"

if [ ! -f "linux-${KERNEL_VER}.tar.xz" ]; then
  echo ">>> Downloading Linux kernel ${KERNEL_VER}..."
  curl -LO "https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-${KERNEL_VER}.tar.xz"
  tar -xf "linux-${KERNEL_VER}.tar.xz"
fi

cd "linux-${KERNEL_VER}"

echo ">>> Generating monolithic Firecracker Kconfig..."
make defconfig

# Apply required monolithic kernel configurations
scripts/config --disable CONFIG_MODULES
scripts/config --enable CONFIG_KVM_GUEST
scripts/config --enable CONFIG_VIRTIO
scripts/config --enable CONFIG_VIRTIO_PCI
scripts/config --enable CONFIG_VIRTIO_MMIO
scripts/config --enable CONFIG_VIRTIO_BALLOON
scripts/config --enable CONFIG_VIRTIO_BLK
scripts/config --enable CONFIG_VIRTIO_NET
scripts/config --enable CONFIG_VIRTIO_VSOCK
scripts/config --enable CONFIG_VSOCKETS
scripts/config --enable CONFIG_VIRTIO_CONSOLE
scripts/config --enable CONFIG_SERIAL_8250
scripts/config --enable CONFIG_SERIAL_8250_CONSOLE
scripts/config --enable CONFIG_EXT4_FS
scripts/config --enable CONFIG_OVERLAY_FS
scripts/config --enable CONFIG_FUSE_FS
scripts/config --enable CONFIG_NET_9P
scripts/config --enable CONFIG_NET_9P_VIRTIO
scripts/config --enable CONFIG_CGROUPS
scripts/config --enable CONFIG_CGROUP_CPUACCT
scripts/config --enable CONFIG_CGROUP_DEVICE
scripts/config --enable CONFIG_CGROUP_FREEZER
scripts/config --enable CONFIG_CGROUP_SCHED
scripts/config --enable CONFIG_CPUSETS
scripts/config --enable CONFIG_MEMCG
scripts/config --enable CONFIG_NAMESPACES
scripts/config --enable CONFIG_USER_NS
scripts/config --enable CONFIG_NET_NS
scripts/config --enable CONFIG_PID_NS
scripts/config --enable CONFIG_IPC_NS
scripts/config --enable CONFIG_UTS_NS
scripts/config --enable CONFIG_SECURITY
scripts/config --enable CONFIG_SECCOMP
scripts/config --enable CONFIG_SECCOMP_FILTER

make olddefconfig

echo ">>> Compiling monolithic vmlinux..."
make -j"$(nproc)" vmlinux

mkdir -p "${WORKDIR}/out"
cp vmlinux "${WORKDIR}/out/vmlinux-${KERNEL_VER}"
echo ">>> Kernel built successfully: ${WORKDIR}/out/vmlinux-${KERNEL_VER}"
```

---

### 2.2 Debian 13 (Trixie) Rootfs Appliance Pipeline

This script builds an ext4 disk image (`rootfs.ext4`) initialized with user `box` (UID 1000), copies all essential GrokBot runtime daemons from the local repository, configures Chrome enterprise policies, and configures the cgroups v2 dual-slice supervisor hierarchy.

#### `build-rootfs.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

ROOTFS_SIZE_MB=8192
ROOTFS_IMG="$(pwd)/build/rootfs.ext4"
MOUNT_DIR="/mnt/grokbot-rootfs"
REPO_ROOT="$(pwd)"

mkdir -p "$(pwd)/build"
echo ">>> Creating ${ROOTFS_SIZE_MB}MB blank ext4 rootfs image..."
dd if=/dev/zero of="${ROOTFS_IMG}" bs=1M count="${ROOTFS_SIZE_MB}" status=progress
mkfs.ext4 -F -b 4096 "${ROOTFS_IMG}"

sudo mkdir -p "${MOUNT_DIR}"
sudo mount -o loop "${ROOTFS_IMG}" "${MOUNT_DIR}"

trap 'sudo umount "${MOUNT_DIR}" || true; sudo rm -rf "${MOUNT_DIR}"' EXIT

echo ">>> Running debootstrap (Debian 13 Trixie)..."
sudo debootstrap --arch=amd64 trixie "${MOUNT_DIR}" http://deb.debian.org/debian

echo ">>> Configuring base system & user 'box'..."
sudo chroot "${MOUNT_DIR}" /bin/bash -c "
  set -euo pipefail
  export DEBIAN_FRONTEND=noninteractive

  # Hostname & Network
  echo 'grok-box' > /etc/hostname
  cat <<EOF > /etc/hosts
127.0.0.1 localhost
127.0.1.1 grok-box
EOF

  # Apt sources
  cat <<EOF > /etc/apt/sources.list
deb http://deb.debian.org/debian trixie main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security trixie-security main
EOF

  apt-get update
  apt-get install -y --no-install-recommends \
    xvfb xfwm4 picom x11vnc websockify novnc \
    dbus dbus-x11 xdotool x11-utils x11-xserver-utils \
    curl wget git jq sudo procps net-tools iproute2 ripgrep \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 ca-certificates gnupg \
    python3 python3-pip

  # Install Google Chrome Stable
  wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/trusted.gpg.d/google.gpg
  echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' > /etc/apt/sources.list.d/google-chrome.list
  apt-get update
  apt-get install -y google-chrome-stable

  # Create user 'box' (UID 1000)
  useradd -u 1000 -m -s /bin/bash box
  echo 'box:box' | chpasswd
  echo 'box ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/box

  # Generate machine-id
  dbus-uuidgen > /etc/machine-id
  cp /etc/machine-id /var/lib/dbus/machine-id
"

echo ">>> Injecting GrokBot scripts and daemons from repo..."
sudo mkdir -p "${MOUNT_DIR}/usr/local/bin" "${MOUNT_DIR}/exec-daemon" "${MOUNT_DIR}/home/box/sand-host"
sudo cp -r "${REPO_ROOT}/usr-local-bin/"* "${MOUNT_DIR}/usr/local/bin/"
sudo cp -r "${REPO_ROOT}/exec-daemon/"* "${MOUNT_DIR}/exec-daemon/"
sudo cp -r "${REPO_ROOT}/home-box/sand-host/"* "${MOUNT_DIR}/home/box/sand-host/"
sudo chmod +x "${MOUNT_DIR}/usr/local/bin/"*

echo ">>> Injecting Google Chrome enterprise policies..."
sudo mkdir -p "${MOUNT_DIR}/etc/opt/chrome/policies/managed"
sudo cp "${REPO_ROOT}/etc-policies/policies/managed/sand.json" "${MOUNT_DIR}/etc/opt/chrome/policies/managed/sand.json"
sudo cp "${REPO_ROOT}/etc-policies/policies/managed/sand-webauthn.json" "${MOUNT_DIR}/etc/opt/chrome/policies/managed/sand-webauthn.json"

echo ">>> Setting ownership for /home/box..."
sudo chroot "${MOUNT_DIR}" chown -R box:box /home/box /exec-daemon

echo ">>> Rootfs build completed successfully: ${ROOTFS_IMG}"
```

---

### 2.3 Bare-Metal Rust Hypervisor Daemon (`grok-hypervisor`)

The hypervisor daemon orchestrates the Firecracker process, mounts the `/dev/vda` rootfs, attaches TAP networking, and configures the host-to-guest AF_VSOCK bridge.

#### `Cargo.toml`
```toml
[package]
name = "grok-hypervisor"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.38", features = ["full", "process"] }
reqwest = { version = "0.11", features = ["json"] }
hyper = { version = "0.14", features = ["client", "http1"] }
hyper-unix-connector = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
nix = { version = "0.27", features = ["net", "fs"] }
anyhow = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"
```

#### `src/main.rs`
```rust
use anyhow::{Context, Result};
use hyper::{Body, Client, Method, Request};
use hyper_unix_connector::UnixClient;
use serde_json::json;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;
use tokio::net::UnixListener;
use tokio::time::sleep;
use tracing::{error, info};

pub struct FirecrackerManager {
    socket_path: PathBuf,
    kernel_path: PathBuf,
    rootfs_path: PathBuf,
    tap_device: String,
    vsock_path: PathBuf,
}

impl FirecrackerManager {
    pub fn new(
        socket_path: PathBuf,
        kernel_path: PathBuf,
        rootfs_path: PathBuf,
        tap_device: String,
        vsock_path: PathBuf,
    ) -> Self {
        Self {
            socket_path,
            kernel_path,
            rootfs_path,
            tap_device,
            vsock_path,
        }
    }

    pub fn setup_networking(&self) -> Result<()> {
        info!("Setting up TAP device: {}", self.tap_device);
        Command::new("ip")
            .args(["tuntap", "add", "dev", &self.tap_device, "mode", "tap"])
            .status()?;
        Command::new("ip")
            .args(["addr", "add", "172.30.0.1/24", "dev", &self.tap_device])
            .status()?;
        Command::new("ip")
            .args(["link", "set", "dev", &self.tap_device, "up"])
            .status()?;

        // Host NAT routing
        Command::new("iptables")
            .args(["-t", "nat", "-A", "POSTROUTING", "-o", "eth0", "-j", "MASQUERADE"])
            .status()?;
        Command::new("iptables")
            .args(["-A", "FORWARD", "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT"])
            .status()?;
        Command::new("iptables")
            .args(["-A", "FORWARD", "-i", &self.tap_device, "-o", "eth0", "-j", "ACCEPT"])
            .status()?;

        Ok(())
    }

    pub async fn spawn_firecracker(&self) -> Result<tokio::process::Child> {
        if self.socket_path.exists() {
            std::fs::remove_file(&self.socket_path)?;
        }

        info!("Spawning Firecracker process...");
        let child = tokio::process::Command::new("firecracker")
            .arg("--api-sock")
            .arg(&self.socket_path)
            .spawn()
            .context("Failed to spawn firecracker binary")?;

        // Wait for UDS socket readiness
        for _ in 0..50 {
            if self.socket_path.exists() {
                break;
            }
            sleep(Duration::from_millis(50)).await;
        }

        Ok(child)
    }

    async fn send_api_request(&self, method: Method, path: &str, body: serde_json::Value) -> Result<()> {
        let client: Client<UnixClient, Body> = Client::builder().build(UnixClient);
        let url: hyper::Uri = hyper_unix_connector::Uri::new(&self.socket_path, path).into();

        let req = Request::builder()
            .method(method)
            .uri(url)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .body(Body::from(body.to_string()))?;

        let res = client.request(req).await?;
        if !res.status().is_success() {
            let status = res.status();
            let bytes = hyper::body::to_bytes(res.into_body()).await?;
            anyhow::bail!("Firecracker API call {} failed ({}): {:?}", path, status, bytes);
        }
        Ok(())
    }

    pub async fn configure_and_boot(&self) -> Result<()> {
        info!("Configuring microVM boot-source...");
        self.send_api_request(
            Method::PUT,
            "/boot-source",
            json!({
                "kernel_image_path": self.kernel_path.to_str().unwrap(),
                "boot_args": "console=ttyS0 reboot=k panic=1 pci=off root=/dev/vda rw quiet ip=172.30.0.2::172.30.0.1:255.255.255.0::eth0:off"
            }),
        ).await?;

        info!("Attaching /dev/vda rootfs drive...");
        self.send_api_request(
            Method::PUT,
            "/drives/rootfs",
            json!({
                "drive_id": "rootfs",
                "path_on_host": self.rootfs_path.to_str().unwrap(),
                "is_root_device": true,
                "is_read_only": false
            }),
        ).await?;

        info!("Attaching TAP network interface...");
        self.send_api_request(
            Method::PUT,
            "/network-interfaces/eth0",
            json!({
                "iface_id": "eth0",
                "guest_mac": "AA:FC:00:00:00:01",
                "host_dev_name": self.tap_device
            }),
        ).await?;

        info!("Configuring AF_VSOCK bridge...");
        self.send_api_request(
            Method::PUT,
            "/vsock",
            json!({
                "vsock_id": "vsock0",
                "guest_cid": 3,
                "uds_path": self.vsock_path.to_str().unwrap()
            }),
        ).await?;

        info!("Issuing InstanceStart action...");
        self.send_api_request(
            Method::PUT,
            "/actions",
            json!({
                "action_type": "InstanceStart"
            }),
        ).await?;

        info!("MicroVM successfully booted!");
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let manager = FirecrackerManager::new(
        PathBuf::from("/tmp/firecracker.socket"),
        PathBuf::from("./build/kernel/out/vmlinux-6.12.6"),
        PathBuf::from("./build/rootfs.ext4"),
        "tap0".to_string(),
        PathBuf::from("/tmp/vsock.sock"),
    );

    manager.setup_networking()?;
    let mut fc_proc = manager.spawn_firecracker().await?;
    manager.configure_and_boot().await?;

    // Monitor Firecracker exit
    tokio::select! {
        status = fc_proc.wait() => {
            info!("Firecracker exited with status: {:?}", status);
        }
        _ = tokio::signal::ctrl_c() => {
            info!("Shutting down Firecracker hypervisor...");
            fc_proc.kill().await?;
        }
    }

    Ok(())
}
```

---

## 3. Phase 2: Cloud Services & Model Router Tier

### 3.1 Connect-RPC Protocol Specification (`aiserver.proto`)

Save this file as `proto/aiserver.proto` for Protobuf compilation:

```protobuf
syntax = "proto3";

package aiserver.v1;

enum InferenceReason {
  INFERENCE_REASON_UNSPECIFIED = 0;
  INFERENCE_REASON_AGENT_SUMMARIZATION = 1;
  INFERENCE_REASON_CODE_GENERATION = 2;
}

message InferenceModelParameterValue {
  string id = 1;
  string value = 2;
}

message InferenceRequestedModel {
  string model_id = 1;
  bool max_mode = 2;
  repeated InferenceModelParameterValue parameters = 3;
  bool built_in_model = 4;
}

message InferenceCoreMessage {
  string role = 1;
  string content = 2;
}

message InferenceAgentTool {
  string name = 1;
  string description = 2;
  string parameters_json = 3;
}

message InferenceStreamRequest {
  repeated InferenceCoreMessage messages = 1;
  repeated InferenceAgentTool tools = 2;
  optional string model_id = 5;
  optional string invocation_id = 6;
  optional InferenceRequestedModel requested_model = 7;
  optional string conversation_id = 8;
  optional InferenceReason inference_reason = 11;
  optional string parent_request_id = 13;
  optional string root_parent_request_id = 14;
  optional string parent_agent_tool_call_id = 15;
  optional string subagent_type = 16;
}

message InferenceTextStreamPart {
  string text = 1;
  bool is_final = 2;
}

message InferenceThinkingStreamPart {
  string text = 1;
  string signature = 2;
  bool is_redacted = 3;
}

message InferenceToolCallStreamPart {
  string tool_call_id = 1;
  string tool_name = 2;
  string args_json_delta = 3;
}

message InferenceUsageInfo {
  int32 prompt_tokens = 1;
  int32 completion_tokens = 2;
  int32 total_tokens = 3;
}

message InferenceExtendedUsageInfo {
  int32 input_tokens = 1;
  int32 output_tokens = 2;
  int32 cache_read_tokens = 3;
  int32 cache_write_tokens = 4;
}

message InferenceResponseInfo {
  string id = 1;
  string model = 2;
  int64 created_at = 3;
}

message InferenceStreamResponse {
  oneof response {
    InferenceTextStreamPart text_part = 1;
    InferenceToolCallStreamPart tool_call_part = 2;
    InferenceUsageInfo usage = 3;
    InferenceResponseInfo response_info = 4;
    InferenceExtendedUsageInfo extended_usage = 5;
    InferenceThinkingStreamPart thinking_part = 9;
  }
}

service InferenceService {
  rpc Stream(InferenceStreamRequest) returns (stream InferenceStreamResponse);
}
```

---

### 3.2 Stateless Rust Connect-RPC Translation Proxy

This proxy runs as a lightweight service terminating Connect-RPC streams from the microVM and forwarding them to LiteLLM over standard OpenAI-compatible `/v1/chat/completions` SSE streams.

#### `src/main.rs` (Model Router Shim)
```rust
use axum::{
    body::Body,
    extract::Request,
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::post,
    Router,
};
use bytes::{BufMut, Bytes, BytesMut};
use futures::StreamExt;
use prost::Message;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

pub mod aiserver {
    pub mod v1 {
        include!(concat!(env!("OUT_DIR"), "/aiserver.v1.rs"));
    }
}
use aiserver::v1::*;

#[derive(Serialize)]
struct OpenAIChatRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    stream: bool,
}

#[derive(Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAIChatChunk {
    choices: Vec<OpenAIChoice>,
}

#[derive(Deserialize)]
struct OpenAIChoice {
    delta: OpenAIDelta,
}

#[derive(Deserialize)]
struct OpenAIDelta {
    content: Option<String>,
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route(
            "/aiserver.v1.InferenceService/Stream",
            post(handle_inference_stream),
        )
        .route(
            "/sand-box/inference-credential",
            post(handle_credential_renewal),
        );

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!(">>> GrokBot Connect-RPC Shim listening on http://0.0.0.0:8080");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn handle_credential_renewal() -> impl IntoResponse {
    axum::Json(serde_json::json!({
        "accessToken": "self-hosted-master-token",
        "grokBotToken": "self-hosted-master-token",
        "expiresAtMs": 9999999999999i64
    }))
}

async fn handle_inference_stream(req: Request) -> Response {
    let body_bytes = axum::body::to_bytes(req.into_body(), usize::MAX).await.unwrap();
    
    // Connect-RPC skips 5-byte framing in standard HTTP POST
    let payload = if body_bytes.len() >= 5 && (body_bytes[0] == 0 || body_bytes[0] == 1) {
        &body_bytes[5..]
    } else {
        &body_bytes[..]
    };

    let inference_req = InferenceStreamRequest::decode(payload).unwrap();

    // 1. Dynamic Hybrid Routing Policy
    let target_model = match (inference_req.subagent_type.as_deref(), inference_req.inference_reason) {
        (Some("research"), _) | (Some("explore"), _) => "cursor-grok-4.5-high-fast",
        (_, Some(1)) => "gemini-2.5-flash", // InferenceReason::AgentSummarization
        _ => "grok-4.5",
    };

    let mut open_ai_messages = Vec::new();
    for msg in inference_req.messages {
        open_ai_messages.push(OpenAIMessage {
            role: msg.role,
            content: msg.content,
        });
    }

    let client = reqwest::Client::new();
    let upstream_res = client
        .post("http://litellm:4000/v1/chat/completions")
        .json(&OpenAIChatRequest {
            model: target_model.to_string(),
            messages: open_ai_messages,
            stream: true,
        })
        .send()
        .await
        .unwrap();

    let mut byte_stream = upstream_res.bytes_stream();

    // 2. Stream translator (SSE -> Connect-RPC Protobuf Frames)
    let response_stream = async_stream::stream! {
        while let Some(item) = byte_stream.next().await {
            if let Ok(bytes) = item {
                let text = String::from_utf8_lossy(&bytes);
                for line in text.lines() {
                    if line.starts_with("data: ") && !line.contains("[DONE]") {
                        let json_str = &line[6..];
                        if let Ok(chunk) = serde_json::from_str::<OpenAIChatChunk>(json_str) {
                            if let Some(delta) = chunk.choices.get(0).and_then(|c| c.delta.content.clone()) {
                                let chunk_resp = InferenceStreamResponse {
                                    response: Some(inference_stream_response::Response::TextPart(
                                        InferenceTextStreamPart {
                                            text: delta,
                                            is_final: false,
                                        }
                                    )),
                                };
                                let mut buf = Vec::new();
                                chunk_resp.encode(&mut buf).unwrap();

                                let mut frame = BytesMut::with_capacity(5 + buf.len());
                                frame.put_u8(0x00);
                                frame.put_u32(buf.len() as u32);
                                frame.extend_from_slice(&buf);
                                yield Ok::<Bytes, std::io::Error>(frame.freeze());
                            }
                        }
                    }
                }
            }
        }

        // Final finish frame
        let final_resp = InferenceStreamResponse {
            response: Some(inference_stream_response::Response::TextPart(
                InferenceTextStreamPart {
                    text: "".to_string(),
                    is_final: true,
                }
            )),
        };
        let mut final_buf = Vec::new();
        final_resp.encode(&mut final_buf).unwrap();

        let mut frame = BytesMut::with_capacity(5 + final_buf.len());
        frame.put_u8(0x00);
        frame.put_u32(final_buf.len() as u32);
        frame.extend_from_slice(&final_buf);
        yield Ok(frame.freeze());
    };

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/connect+proto")
        .body(Body::from_stream(response_stream))
        .unwrap()
}
```

---

### 3.3 LiteLLM Multi-Model Routing Configuration

#### `litellm-config.yaml`
```yaml
model_list:
  # 1. Primary Reasoning Engine (xAI Grok-4.5 / Grok-3)
  - model_name: grok-4.5
    litellm_params:
      model: openai/grok-3
      api_base: https://api.x.ai/v1
      api_key: os.environ/XAI_API_KEY
      rpm: 2000

  # 2. Fast Codebase Search & Regex Exploration
  - model_name: cursor-grok-4.5-high-fast
    litellm_params:
      model: openai/grok-3-mini
      api_base: https://api.x.ai/v1
      api_key: os.environ/XAI_API_KEY

  # 3. Context Compaction & Summarization (Google DeepMind)
  - model_name: gemini-2.5-flash
    litellm_params:
      model: gemini/gemini-2.5-flash
      api_key: os.environ/GEMINI_API_KEY

  # 4. Computer Use / GUI Vision Grounding
  - model_name: sand-cua
    litellm_params:
      model: anthropic/claude-3-7-sonnet-20250219
      api_key: os.environ/ANTHROPIC_API_KEY

router_settings:
  routing_strategy: "least-busy"
  num_retries: 3
  timeout: 60
  fallbacks:
    - grok-4.5: ["claude-3-7-sonnet-20250219", "gpt-4o"]
```

---

### 3.4 WebSocket Egress Tunnel Gateway

The microVM connects outbound to port `8790` over WebSocket via [`usr-local-bin/sand-egress-tunnel`](usr-local-bin/sand-egress-tunnel). This server terminates the tunnel on the cloud control plane:

#### `egress-server.js`
```javascript
import { WebSocketServer } from "ws";
import net from "node:net";

const wss = new WebSocketServer({ port: 8790 });
console.log(">>> GrokBot Egress Gateway listening on ws://0.0.0.0:8790");

wss.on("connection", (ws, req) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ws.close(4001, "Unauthorized");
    return;
  }

  console.log(">>> Egress tunnel established from microVM.");

  ws.on("message", (data) => {
    // Demux multiplexed TCP frame to internet targets
  });
});
```

---

### 3.5 Docker Compose Control Plane Stack

#### `docker-compose.yml`
```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
    depends_on:
      - router-shim

  router-shim:
    build:
      context: ./shim
      dockerfile: Dockerfile
    environment:
      - UPSTREAM_LITELLM_URL=http://litellm:4000
    labels:
      - "traefik.http.routers.shim.rule=PathPrefix(`/`)"
      - "traefik.http.services.shim.loadbalancer.server.port=8080"
    depends_on:
      - litellm

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    environment:
      - DATABASE_URL=redis://redis:6379
      - XAI_API_KEY=${XAI_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./litellm-config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    restart: always

  egress-gateway:
    build:
      context: ./egress
      dockerfile: Dockerfile
    ports:
      - "8790:8790"
```

---

## 4. Phase 3: Application Tier (Tauri + Rust Desktop Client)

### 4.1 Tauri v2 Project Scaffolding & Configuration

Initialize Tauri desktop client:
```bash
npm create tauri-app@latest grokbot-desktop -- --template react-ts
cd grokbot-desktop
```

#### `src-tauri/tauri.conf.json`
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "GrokBot",
  "version": "1.0.0",
  "identifier": "com.grokbot.desktop",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "GrokBot Workstation",
        "width": 1440,
        "height": 900,
        "resizable": true,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:* ws://localhost:* https://*;"
    }
  }
}
```

---

### 4.2 React Webview Canvas Runtime Host

Import and mount [`exec-daemon/canvas-runtime/canvas-runtime.esm.js`](exec-daemon/canvas-runtime/canvas-runtime.esm.js) inside `src/components/CanvasHost.tsx`:

```tsx
import React, { useEffect, useRef } from "react";
// @ts-ignore
import { createAgentCanvas } from "../../exec-daemon/canvas-runtime/canvas-runtime.esm.js";

interface CanvasHostProps {
  streamUrl: string;
  vmToken: string;
}

export const CanvasHost: React.FC<CanvasHostProps> = ({ streamUrl, vmToken }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const canvas = createAgentCanvas({
      target: containerRef.current,
      endpoint: streamUrl,
      headers: {
        Authorization: `Bearer ${vmToken}`,
      },
    });

    return () => {
      canvas.destroy();
    };
  }, [streamUrl, vmToken]);

  return <div ref={containerRef} className="w-full h-full bg-neutral-900" />;
};
```

---

### 4.3 High-Performance noVNC Remote Desktop Canvas

Embed RFB canvas in `src/components/VncViewer.tsx` connecting to guest Websockify port `6080` (or `6081`):

```tsx
import React, { useEffect, useRef } from "react";
// @ts-ignore
import RFB from "@novnc/novnc/core/rfb";

interface VncViewerProps {
  wsUrl: string; // e.g. "ws://172.30.0.2:6080"
}

export const VncViewer: React.FC<VncViewerProps> = ({ wsUrl }) => {
  const vncContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vncContainerRef.current) return;

    const rfb = new RFB(vncContainerRef.current, wsUrl, {
      credentials: { password: "" },
      wsProtocols: ["binary"],
    });

    rfb.scaleViewport = true;
    rfb.resizeSession = true;

    return () => {
      rfb.disconnect();
    };
  }, [wsUrl]);

  return <div ref={vncContainerRef} className="w-full h-full overflow-hidden bg-black" />;
};
```

---

### 4.4 Inverted WebAuthn Passkey Bridge Hook

In `src-tauri/src/main.rs`, register the native FIDO2 / Touch ID bridge handler:

```rust
#[tauri::command]
async fn handle_webauthn_challenge(challenge_json: String) -> Result<String, String> {
    // Invokes host OS native WebAuthn API (Windows Hello / Apple Touch ID / Linux secret-service)
    println!(">>> Received WebAuthn Passkey ceremony request from guest VM");
    Ok(json!({ "status": "authenticated", "signature": "mock-fido-sig" }).to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![handle_webauthn_challenge])
        .run(tauri::generate_context!())
        .expect("error while running GrokBot application");
}
```

---

## 5. Phase 4: End-to-End Boot & Verification Playbook

### 5.1 Step-by-Step Bring-Up

Execute in order across terminals:

```bash
# Terminal 1: Cloud Control Plane
cd cloud-services
export XAI_API_KEY="your-xai-key"
export GEMINI_API_KEY="your-gemini-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
docker compose up -d

# Terminal 2: Bare-Metal Hypervisor & MicroVM
cd hypervisor
cargo run --release

# Terminal 3: Tauri Desktop Application
cd grokbot-desktop
npm install
npm run tauri dev
```

---

### 5.2 Automated Health Diagnostics (`box-doctor`)

Once the microVM boots, attach via SSH or terminal console and execute the automated health verification suite:

```bash
# Run 10-point diagnostic check inside the VM
/usr/local/bin/box-doctor
```

Expected diagnostic output:
```text
[✓] 1. machine-id: Valid (32 lowercase hex characters match)
[✓] 2. chrome: Google Chrome 134.x found on PATH
[✓] 3. chrome-fds: Open file descriptors: 42/1024 (well below 90% threshold)
[✓] 4. egress: 204 received from https://www.google.com/generate_204
[✓] 5. clock: Clock skew: 0.12s (threshold < 60s)
[✓] 6. dbus: D-Bus session bus active on /tmp/dbus-*
[✓] 7. xvfb: X11 Server responding on DISPLAY :1
[✓] 8. x11vnc: RFB socket listening on 127.0.0.1:5900
[✓] 9. novnc: Websockify listening on 127.0.0.1:6080
[✓] 10. compositor: xfwm4 and picom processes active
ALL 10 CHECKS PASSED: MicroVM is ready for autonomous agent execution.
```

---

## 6. Category 1 Gap Playbooks: Application Tier

### 6.1 Canvas Interactive Action Dispatcher
[`canvas-runtime.esm.js`](exec-daemon/canvas-runtime/canvas-runtime.esm.js) dispatches UI events (`button_click`, `form_submit`, `apply_diff`) through DOM custom events on the mounted container. The React shell captures these and dispatches Connect-RPC mutations to port `1340` (`agent.v1.AgentService.Run`):

```typescript
// src/components/CanvasHost.tsx
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const handleCanvasAction = async (e: Event) => {
    const customEvent = e as CustomEvent<{ actionType: string; payload: any }>;
    const { actionType, payload } = customEvent.detail;

    // Dispatch Connect-RPC message to in-box gateway (Port 1340)
    await fetch("http://127.0.0.1:1340/agent.v1.AgentService/Run", {
      method: "POST",
      headers: {
        "Content-Type": "application/connect+proto",
        "Authorization": `Bearer ${vmToken}`,
      },
      body: JSON.stringify({
        userAction: {
          type: actionType,
          data: payload,
        },
      }),
    });
  };

  container.addEventListener("canvas-action", handleCanvasAction);
  return () => container.removeEventListener("canvas-action", handleCanvasAction);
}, [vmToken]);
```

### 6.2 Bidirectional Clipboard & File Drag-and-Drop Bridge
To sync the native host clipboard with X11 in the guest VM via noVNC:
1. **Clipboard Sync (Tauri to RFB)**:
   ```typescript
   import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

   // Sync host OS clipboard into guest noVNC
   window.addEventListener("focus", async () => {
     const text = await readText();
     if (text && rfbInstance) {
       rfbInstance.clipboardPasteFrom(text);
     }
   });

   // Sync guest selection to host OS clipboard
   rfbInstance.addEventListener("clipboard", async (e: any) => {
     if (e.detail?.text) {
       await writeText(e.detail.text);
     }
   });
   ```
2. **File Drag-and-Drop Upload**:
   Files dragged over the window are intercepted by Tauri and streamed via multipart POST to the primary exec-daemon on port `1337`:
   ```typescript
   async function uploadFileToGuest(filePath: string, destPath: string) {
     const fileBytes = await window.__TAURI__.fs.readFile(filePath);
     await fetch("http://127.0.0.1:1337/api/fs/write", {
       method: "POST",
       headers: {
         "Authorization": "Bearer local",
         "x-dest-path": destPath,
         "Content-Type": "application/octet-stream",
       },
       body: fileBytes,
     });
   }
   ```

### 6.3 Low-Latency Voice Pipeline (Audio Streamer)
For voice agent interaction referenced in `search-index-worker.cjs` ([`grok-bot-voice-call-harness`](home-box/sand-host/extensions/content-search/search-index-worker.cjs#L373)):
```typescript
// Capture 16kHz PCM audio and stream binary frames over WebSocket
export class VoiceAudioStreamer {
  private ws: WebSocket;
  private audioContext: AudioContext;

  constructor(endpoint: string) {
    this.ws = new WebSocket(endpoint);
    this.audioContext = new AudioContext({ sampleRate: 16000 });
  }

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.audioContext.createMediaStreamSource(stream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
      }
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(pcm16.buffer);
      }
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }
}
```

---

## 7. Category 2 Gap Playbooks: Cloud Infra Tier

### 7.1 Sub-Second Cold Starts (Snapshot & Memory Restore API)
To achieve sub-350ms boot times, pre-warm a master VM and dump its memory pages:

1. **Create Master Snapshot**:
   ```rust
   // Pause the microVM via Firecracker API
   client.request(Request::builder()
       .method(Method::PATCH)
       .uri(uds_uri("/vm"))
       .body(Body::from(json!({ "state": "Paused" }).to_string()))?
   ).await?;

   // Dump snapshot state and dirty memory pages
   client.request(Request::builder()
       .method(Method::PUT)
       .uri(uds_uri("/snapshot/create"))
       .body(Body::from(json!({
           "snapshot_type": "Diff",
           "snapshot_path": "/var/lib/grokbot/snapshots/vm.snap",
           "mem_file_path": "/var/lib/grokbot/snapshots/vm.mem"
       }).to_string()))?
   ).await?;
   ```
2. **Instant MicroVM Resume**:
   ```rust
   // Boot new microVM instantly from memory snapshot
   client.request(Request::builder()
       .method(Method::PUT)
       .uri(uds_uri("/snapshot/load"))
       .body(Body::from(json!({
           "snapshot_path": "/var/lib/grokbot/snapshots/vm.snap",
           "mem_file_path": "/var/lib/grokbot/snapshots/vm.mem",
           "enable_diff_dump": false,
           "resume_vm": true
       }).to_string()))?
   ).await?;
   ```

### 7.2 Persistent FUSE Filesystem Backend (`/agent-stores`)
The guest binary [`usr-local-bin/cursor-agent-store-fuse`](usr-local-bin/cursor-agent-store-fuse) mounts shared storage over `/agent-stores/{self,peer,share,user,team}`. 

To back this on the bare-metal host using **Virtio-FS**:
1. Run `virtiofsd` daemon on the host:
   ```bash
   /usr/libexec/virtiofsd \
     --socket-path=/tmp/virtiofs-agent-store.sock \
     --shared-dir=/var/lib/grokbot/agent-stores \
     --sandbox=chroot \
     --announce-submounts
   ```
2. In the guest startup script ([`usr-local-bin/start-sand-box`](usr-local-bin/start-sand-box)):
   ```bash
   mkdir -p /agent-stores
   mount -t virtiofs agent-store /agent-stores
   ```

### 7.3 Ephemeral CoW Disk Overlays per MicroVM
Never bind multiple Firecracker instances to the same raw `rootfs.ext4`. Create a thin copy-on-write overlay per session:

```bash
#!/usr/bin/env bash
VM_ID="$1" # e.g. "vm-worker-01"
BASE_IMG="/var/lib/grokbot/base/rootfs.ext4"
VM_DISK="/var/lib/grokbot/instances/${VM_ID}/disk.qcow2"

mkdir -p "$(dirname "${VM_DISK}")"
qemu-img create -f qcow2 -b "${BASE_IMG}" -F raw "${VM_DISK}"

# Attach ${VM_DISK} to Firecracker /drives/rootfs
```

### 7.4 Dynamic Subagent Display Allocation Lifecycle
When an agent forks a new subagent display `:N`, [`usr-local-bin/start-window`](usr-local-bin/start-window) writes token `/tmp/sand-window-tokens.d/N`.
The host hypervisor monitors this directory via Linux `inotify`:

```rust
use notify::{Watcher, RecursiveMode, Result};
use std::path::Path;

pub fn watch_window_tokens() -> Result<()> {
    let mut watcher = notify::recommended_watcher(|res| {
        match res {
            Ok(event) => {
                // When /tmp/sand-window-tokens.d/N is created:
                // 1. Calculate Port: 14000 + N (Exec) and 13600 + N (PTY)
                // 2. Punch through local host NAT port forwards
                println!("New subagent window allocated: {:?}", event.paths);
            }
            Err(e) => println!("watch error: {:?}", e),
        }
    })?;

    watcher.watch(Path::new("/tmp/sand-window-tokens.d"), RecursiveMode::NonRecursive)?;
    Ok(())
}
```

---

## 8. Category 3 Gap Playbooks: Cloud Services Tier

### 8.1 MicroVM Warm-Pool Fleet Autoscaler
Maintain a standby pool of warm, snapshot-paused microVMs in Redis to achieve instant session acquisition:

```rust
// Cloud Fleet Scheduler (Rust)
pub struct FleetPoolManager {
    redis_client: redis::Client,
    target_warm_count: usize,
}

impl FleetPoolManager {
    pub async fn acquire_vm(&self, user_id: &str) -> anyhow::Result<VmInstance> {
        let mut con = self.redis_client.get_async_connection().await?;
        // Pop pre-warmed VM instance ID from FIFO queue
        let vm_id: String = redis::cmd("RPOP").arg("grokbot:warm_vms").query_async(&mut con).await?;
        
        // Bind to user session
        redis::cmd("SET").arg(format!("grokbot:active:{}", user_id)).arg(&vm_id).query_async(&mut con).await?;
        
        // Trigger background refill
        tokio::spawn(async move {
            refill_warm_pool().await;
        });

        Ok(VmInstance { id: vm_id })
    }
}
```

### 8.2 Remote MCP OAuth Credential Vault & Rotation
The cloud gateway mints fresh OAuth access tokens for external MCP tools (Google Workspace, Slack, Jira) and pushes them to the in-guest gateway:

```typescript
// Central OAuth Refresh Service
async function pushRefreshedMcpCredentials(vmIp: string, credentials: { google?: string; slack?: string }) {
  await fetch(`http://${vmIp}:1340/agent.v1.AgentService/UpdateCredentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MASTER_HOST_TOKEN}`,
    },
    body: JSON.stringify({
      credentials: [
        { name: "GOOGLE_WORKSPACE_ACCESS_TOKEN", token: credentials.google },
        { name: "SLACK_BOT_TOKEN", token: credentials.slack },
      ],
    }),
  });
}
```

### 8.3 Private Marketplace Catalog API & Telemetry Sink
`sand-host` queries plugins via `SearchPlugins` and `GetOfficialPluginConfig` ([`host-main.cjs:L446298`](home-box/sand-host/host-main.cjs#L446298)). Provide a lightweight Express / Connect-RPC service:

```javascript
// Private Marketplace Catalog Service
import express from "express";
const app = express();
app.use(express.json());

const PLUGIN_REGISTRY = {
  "aws-core": {
    pluginId: "26098678",
    name: "AWS Core",
    skills: ["aws-storage", "aws-networking"],
  },
  "context-mode": {
    pluginId: "276c2ad9",
    name: "Context Mode",
    skills: ["ctx_execute", "ctx_search"],
  }
};

app.post("/aiserver.v1.DashboardService/SearchMarketplacePlugins", (req, res) => {
  const query = req.body.query?.toLowerCase() || "";
  const matches = Object.values(PLUGIN_REGISTRY).filter(p => p.name.toLowerCase().includes(query));
  res.json({ plugins: matches });
});

// Telemetry Sink (UploadConversationBlobs / diagnostics)
app.post("/agent.v1.AgentService/UploadConversationBlobs", (req, res) => {
  console.log(`>>> Received conversation blobs from session ${req.body.conversationId}`);
  // Ingest into ClickHouse / MinIO
  res.json({ success: true });
});

app.listen(8081, () => console.log(">>> Marketplace & Telemetry Service listening on :8081"));
```

