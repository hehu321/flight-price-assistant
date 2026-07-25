#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const appDir = path.join(os.homedir(), "Library", "Application Support", "FlightPriceAssistant");
const configPath = path.join(appDir, "bridge.json");
const socketPath = path.join(appDir, "agent-bridge.sock");
fs.mkdirSync(appDir, { recursive: true, mode: 0o700 });
try { fs.chmodSync(appDir, 0o700); } catch { /* permission is best-effort */ }
try { fs.unlinkSync(socketPath); } catch (error) { if (error.code !== "ENOENT") throw error; }

let config;
try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch {
  config = { socketPath, token: crypto.randomBytes(32).toString("hex"), protocolVersion: 1 };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
}
config.socketPath = socketPath;
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });

const pending = new Map();
let input = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
  input = Buffer.concat([input, chunk]);
  while (input.length >= 4) {
    const size = input.readUInt32LE(0);
    if (size > 1024 * 1024 || input.length < size + 4) break;
    const body = input.subarray(4, size + 4);
    input = input.subarray(size + 4);
    try { handleExtensionMessage(JSON.parse(body.toString("utf8"))); } catch { /* ignore malformed native messages */ }
  }
});

function sendToExtension(message) {
  const body = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
}

function handleExtensionMessage(message) {
  if (message?.type !== "response" || !message.id) return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  clearTimeout(entry.timer);
  entry.socket.end(`${JSON.stringify(message)}\n`);
}

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      handleMcpRequest(socket, line);
    }
  });
});

function handleMcpRequest(socket, line) {
  let request;
  try { request = JSON.parse(line); } catch { return socket.end(JSON.stringify(errorResponse("invalid", "INVALID_REQUEST", "桥接请求不是 JSON")) + "\n"); }
  if (request?.token !== config.token || request?.message?.protocolVersion !== 1 || request?.message?.type !== "request") {
    return socket.end(JSON.stringify(errorResponse(request?.message?.id || "invalid", "UNAUTHORIZED_BRIDGE_CLIENT", "本地桥接认证失败")) + "\n");
  }
  const id = request.message.id;
  const timer = setTimeout(() => {
    if (!pending.has(id)) return;
    pending.delete(id);
    socket.end(JSON.stringify(errorResponse(id, "EXTENSION_DISCONNECTED", "插件未在限定时间内响应")) + "\n");
  }, 10_000);
  pending.set(id, { socket, timer });
  sendToExtension(request.message);
}

function errorResponse(id, code, message) {
  return { protocolVersion: 1, id, type: "response", ok: false, error: { code, message, retryable: true } };
}

server.listen(socketPath, () => {
  try { fs.chmodSync(socketPath, 0o600); } catch { /* permission is best-effort */ }
});
server.on("error", (error) => process.stderr.write(`Native Host socket error: ${error.message}\n`));
process.on("exit", () => { try { fs.unlinkSync(socketPath); } catch { /* socket may already be removed */ } });
