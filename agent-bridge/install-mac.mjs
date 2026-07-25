#!/usr/bin/env node
import { extensionIdFromManifest, installMacBridge } from "./install-common.mjs";

const args = process.argv.slice(2);
const extensionIdIndex = args.indexOf("--extension-id");
const extensionId = extensionIdIndex >= 0 ? args[extensionIdIndex + 1] : undefined;
if (!extensionId || !/^[a-p]{32}$/.test(extensionId)) {
  process.stderr.write("用法: npm run bridge:install:mac -- --extension-id <32位 Chrome 扩展ID>\n");
  process.exit(1);
}
const expectedId = extensionIdFromManifest();
if (extensionId !== expectedId) {
  process.stderr.write(`当前开发版固定扩展 ID 为 ${expectedId}，无需手动填写其他 ID。\n`);
  process.exit(1);
}
const install = installMacBridge();
process.stdout.write(JSON.stringify({ installed: true, ...install, codexMcp: { command: process.execPath, args: [install.mcpServer] } }, null, 2) + "\n");
