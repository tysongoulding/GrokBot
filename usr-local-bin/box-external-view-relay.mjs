import http from "node:http";
import net from "node:net";
import tls from "node:tls";

export const MAX_RELAY_CONNECTIONS = 8;
export const MAX_RESPONSE_HEAD_BYTES = 16 * 1024;
export const RELAY_BROWSER_PATH = "/devtools/browser/external";

const FORWARDED_UPGRADE_HEADERS = [
  "sec-websocket-key",
  "sec-websocket-version",
  "sec-websocket-protocol",
  "sec-websocket-extensions",
];
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]); // pragma: allowlist secret
const HEAD_TERMINATOR = Buffer.from("\r\n\r\n");

function ok(value) {
  return { ok: true, value };
}

function err(error) {
  return { ok: false, error };
}

export function isLoopbackHostname(hostname) {
  return LOOPBACK_HOSTNAMES.has(hostname);
}

export function relayVersionBody(port) {
  return {
    Browser: "sand-external-view-relay",
    "Protocol-Version": "1.3",
    webSocketDebuggerUrl: `ws://127.0.0.1:${port}${RELAY_BROWSER_PATH}`,
  };
}

// Chrome's DevTools server refuses a non-loopback Host and any Origin, which blocks DNS rebinding and cross-site sockets (https://chromium.googlesource.com/chromium/src/+/refs/tags/154.0.8037.57/content/browser/devtools/devtools_http_handler.cc).
export function isAllowedRelayRequest(headers, port) {
  if (headers.origin !== undefined) return false;
  const suffix = `:${port}`;
  const host = headers.host ?? "";
  return host.endsWith(suffix) && LOOPBACK_HOSTNAMES.has(host.slice(0, -suffix.length));
}

export function upstreamRoute(connectUrl, proxyAddr) {
  const secure = connectUrl.protocol === "wss:";
  const port = Number(connectUrl.port || (secure ? 443 : 80));
  const target = { secure, host: connectUrl.hostname, port };
  if (proxyAddr === null || isLoopbackHostname(connectUrl.hostname)) {
    return { ...target, proxy: null };
  }
  return { ...target, proxy: proxyAddr };
}

export function upstreamUpgradeHead(connectUrl, clientHeaders) {
  const lines = [
    `GET ${connectUrl.pathname}${connectUrl.search} HTTP/1.1`,
    `Host: ${connectUrl.host}`,
    "Upgrade: websocket",
    "Connection: Upgrade",
  ];
  for (const name of FORWARDED_UPGRADE_HEADERS) {
    const value = clientHeaders[name];
    if (typeof value === "string") lines.push(`${name}: ${value}`);
  }
  return `${lines.join("\r\n")}\r\n\r\n`;
}

export function readResponseHead(buffer) {
  const headEnd = buffer.indexOf(HEAD_TERMINATOR);
  if (headEnd === -1) {
    return buffer.length > MAX_RESPONSE_HEAD_BYTES ? { kind: "too_large" } : { kind: "incomplete" };
  }
  if (headEnd > MAX_RESPONSE_HEAD_BYTES) return { kind: "too_large" };
  const statusLine = buffer.subarray(0, buffer.indexOf("\r\n")).toString("latin1");
  const match = /^HTTP\/1\.[01] (\d{3})(?: |$)/.exec(statusLine);
  if (match === null) return { kind: "malformed" };
  return { kind: "complete", status: Number(match[1]), headEnd: headEnd + HEAD_TERMINATOR.length };
}

export function createResponseHeadReader() {
  const chunks = [];
  const carry = { bytes: Buffer.alloc(0) };
  let bytes = 0;
  return (chunk) => {
    const seen = Buffer.concat([carry.bytes, chunk]);
    carry.bytes = seen.subarray(-(HEAD_TERMINATOR.length - 1));
    chunks.push(chunk);
    bytes += chunk.length;
    if (!seen.includes(HEAD_TERMINATOR) && bytes <= MAX_RESPONSE_HEAD_BYTES) {
      return { kind: "incomplete" };
    }
    const buffered = Buffer.concat(chunks, bytes);
    const head = readResponseHead(buffered);
    if (head.kind !== "complete") return head;
    return {
      kind: "complete",
      status: head.status,
      head: buffered.subarray(0, head.headEnd),
      rest: buffered.subarray(head.headEnd),
    };
  };
}

function awaitResponseHead(socket) {
  return new Promise((resolve) => {
    const read = createResponseHeadReader();
    const finish = (result) => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
      resolve(result);
    };
    const onData = (chunk) => {
      const head = read(chunk);
      if (head.kind === "incomplete") return;
      if (head.kind !== "complete") {
        finish(err(`response head ${head.kind}`));
        return;
      }
      socket.pause();
      finish(ok({ status: head.status, head: head.head, rest: head.rest }));
    };
    const onError = (error) => {
      socket.destroy();
      finish(err(error.code ?? "response error"));
    };
    const onClose = () => finish(err("closed before response head"));
    socket.on("data", onData);
    socket.once("error", onError);
    socket.on("close", onClose);
  });
}

function connectSocket(open, readyEvent) {
  return new Promise((resolve) => {
    const socket = open();
    const settle = (result) => {
      socket.off(readyEvent, onReady);
      socket.off("error", onError);
      socket.off("close", onClose);
      resolve(result);
    };
    const onReady = () => settle(ok(socket));
    const onError = (error) => {
      socket.destroy();
      settle(err(error.code ?? "connect error"));
    };
    const onClose = () => settle(err("closed while connecting"));
    socket.once(readyEvent, onReady);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

async function tunnelThroughProxy(route, signal) {
  const [proxyHost, proxyPort] = splitHostPort(route.proxy);
  const opened = await connectSocket(
    () => net.connect({ host: proxyHost, port: proxyPort, signal }),
    "connect",
  );
  if (!opened.ok) return opened;
  const authority = `${route.host.includes(":") ? `[${route.host}]` : route.host}:${route.port}`;
  opened.value.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`);
  const reply = await awaitResponseHead(opened.value);
  if (!reply.ok || reply.value.status !== 200) {
    opened.value.destroy();
    return err(reply.ok ? `proxy status ${reply.value.status}` : reply.error);
  }
  opened.value.resume();
  return ok(opened.value);
}

async function openUpstreamSocket(route, signal) {
  const base =
    route.proxy === null
      ? await connectSocket(
          () => net.connect({ host: route.host, port: route.port, signal }),
          "connect",
        )
      : await tunnelThroughProxy(route, signal);
  if (!base.ok || !route.secure) return base;
  return connectSocket(
    () => tls.connect({ socket: base.value, servername: route.host, ALPNProtocols: ["http/1.1"] }),
    "secureConnect",
  );
}

function splitHostPort(addr) {
  const index = addr.lastIndexOf(":");
  return [addr.slice(0, index).replace(/^\[(.*)\]$/, "$1"), Number(addr.slice(index + 1))];
}

export function startRelay({ port, connectUrl, proxyAddr, log }) {
  const route = upstreamRoute(connectUrl, proxyAddr);
  const clients = new Set();
  const upstreams = new Set();
  const track = (set, socket) => {
    set.add(socket);
    socket.once("close", () => set.delete(socket));
  };

  const server = http.createServer((req, res) => {
    if (!isAllowedRelayRequest(req.headers, port)) {
      res.writeHead(403).end();
      return;
    }
    if (req.method === "GET" && (req.url === "/json/version" || req.url === "/json/version/")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(relayVersionBody(port)));
      return;
    }
    res.writeHead(404).end();
  });

  server.on("upgrade", async (req, client, head) => {
    if (!isAllowedRelayRequest(req.headers, port)) {
      client.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      return;
    }
    if (clients.size >= MAX_RELAY_CONNECTIONS) {
      log(`relay: refusing connection, ${MAX_RELAY_CONNECTIONS} already open`);
      client.end("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      return;
    }
    track(clients, client);
    client.on("error", () => client.destroy());
    client.once("end", () => client.destroy());
    const clientGone = new AbortController();
    client.once("close", () => clientGone.abort());
    const early = [];
    const holdEarly = (chunk) => early.push(chunk);
    client.on("data", holdEarly);
    const opened = await openUpstreamSocket(route, clientGone.signal);
    if (!opened.ok) {
      log(`relay: upstream connect failed (${opened.error})`);
      client.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
      return;
    }
    const upstream = opened.value;
    if (client.destroyed) {
      upstream.destroy();
      return;
    }
    track(upstreams, upstream);
    upstream.on("error", () => upstream.destroy());
    upstream.write(upstreamUpgradeHead(connectUrl, req.headers));
    if (head.length > 0) upstream.write(head);
    const reply = await awaitResponseHead(upstream);
    if (!reply.ok || reply.value.status !== 101) {
      log(
        `relay: upstream refused upgrade (${reply.ok ? `status ${reply.value.status}` : reply.error})`,
      );
      upstream.destroy();
      client.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
      return;
    }
    client.write(reply.value.head);
    if (reply.value.rest.length > 0) client.write(reply.value.rest);
    client.off("data", holdEarly);
    for (const chunk of early) upstream.write(chunk);
    upstream.pipe(client);
    client.pipe(upstream);
    upstream.resume();
    upstream.once("close", () => client.destroy());
    client.once("close", () => upstream.destroy());
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port }, () => {
      server.off("error", reject);
      resolve({
        close: () =>
          new Promise((done) => {
            for (const socket of [...clients, ...upstreams]) socket.destroy();
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}
