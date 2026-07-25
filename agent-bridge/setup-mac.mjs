#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extensionIdFromManifest, installMacBridge, projectRoot, tomlString } from "./install-common.mjs";

const root = projectRoot();
const args = new Set(process.argv.slice(2));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

childProcess.execFileSync(npmCommand, ["run", "build"], { cwd: root, stdio: "inherit" });
const install = installMacBridge(extensionIdFromManifest());
const codex = args.has("--skip-codex") ? { status: "skipped" } : registerCodex(install.mcpServer);

process.stdout.write(`\n开发版 AI Agent 接入已完成\n扩展 ID: ${install.extensionId}\nNative Host: ${install.manifestPath}\nCodex MCP: ${codex.status}\n\n请在 chrome://extensions 重新加载本项目的 dist 目录一次。之后插件会自动拉起 Native Host，无需额外启动命令。\n`);

function registerCodex(mcpServer) {
  const configDir = path.join(os.homedir(), ".codex");
  const configPath = path.join(configDir, "config.toml");
  const section = "[mcp_servers.flight_price_assistant]";
  const block = `${section}\ncommand = ${tomlString(process.execPath)}\nargs = [${tomlString(mcpServer)}]\nstartup_timeout_sec = 20\n`;
  fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  if (existing.includes(section)) return { status: "already_configured", configPath };
  const suffix = existing && !existing.endsWith("\n") ? "\n\n" : "\n";
  fs.appendFileSync(configPath, `${suffix}${block}`, { mode: 0o600 });
  return { status: "configured", configPath };
}
