#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const manifestPath = path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts", "com.flight_price_assistant.agent_bridge.json");
if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
process.stdout.write(JSON.stringify({ uninstalled: true, manifestPath }) + "\n");
