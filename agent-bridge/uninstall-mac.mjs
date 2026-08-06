#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

if (process.platform !== "darwin") {
  process.stderr.write("本地 AI Agent 接入当前仅支持 macOS；Windows 无需卸载 Native Host。\n");
  process.exit(1);
}

const manifestPath = path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts", "com.flight_price_assistant.agent_bridge.json");
if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
process.stdout.write(JSON.stringify({ uninstalled: true, manifestPath }) + "\n");
