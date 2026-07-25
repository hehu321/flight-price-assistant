#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const appDir = path.join(os.homedir(), "Library", "Application Support", "FlightPriceAssistant");
const manifestPath = path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts", "com.flight_price_assistant.agent_bridge.json");
const configPath = path.join(appDir, "bridge.json");
const status = {
  node: process.version,
  nativeManifestInstalled: fs.existsSync(manifestPath),
  bridgeConfigCreated: fs.existsSync(configPath),
  socketActive: fs.existsSync(path.join(appDir, "agent-bridge.sock")),
  manifestPath,
};
process.stdout.write(JSON.stringify(status, null, 2) + "\n");
