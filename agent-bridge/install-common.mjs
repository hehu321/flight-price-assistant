import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const NATIVE_HOST_NAME = "com.flight_price_assistant.agent_bridge";

export function projectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export function readExtensionManifest() {
  return JSON.parse(fs.readFileSync(path.join(projectRoot(), "manifest.json"), "utf8"));
}

export function extensionIdFromManifest() {
  const key = readExtensionManifest().key;
  if (!key) throw new Error("manifest.json 缺少固定 key，无法自动推导扩展 ID");
  const digest = crypto.createHash("sha256").update(Buffer.from(key, "base64")).digest("hex");
  return digest.slice(0, 32).split("").map((char) => String.fromCharCode("a".charCodeAt(0) + Number.parseInt(char, 16))).join("");
}

export function installMacBridge(extensionId = extensionIdFromManifest()) {
  if (process.platform !== "darwin") throw new Error("本地 AI Agent 接入当前仅支持 macOS；Windows 可使用插件与自动票价监控。");
  if (!/^[a-p]{32}$/.test(extensionId)) throw new Error("Chrome 扩展 ID 格式不正确");
  const root = projectRoot();
  const host = path.join(root, "agent-bridge", "native-host.mjs");
  const installDir = path.join(os.homedir(), "Library", "Application Support", "FlightPriceAssistant");
  const chromeDir = path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts");
  fs.mkdirSync(installDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(chromeDir, { recursive: true, mode: 0o700 });
  const wrapper = path.join(installDir, "flight-agent-native-host");
  fs.writeFileSync(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${host}"\n`, { mode: 0o700 });
  const manifest = {
    name: NATIVE_HOST_NAME,
    description: "Flight Price Assistant MCP bridge",
    path: wrapper,
    type: "stdio",
    allowed_origins: [`chrome-extension://${extensionId}/`],
  };
  const manifestPath = path.join(chromeDir, `${NATIVE_HOST_NAME}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return { extensionId, manifestPath, host: wrapper, mcpServer: path.join(root, "agent-bridge", "mcp-server.mjs") };
}

export function tomlString(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}
