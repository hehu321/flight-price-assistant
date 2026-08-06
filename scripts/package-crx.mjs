import { execFileSync } from "node:child_process";
import { createPrivateKey, createPublicKey } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const releaseDir = path.join(root, "release");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const defaultKey = path.join(root, ".keys", "flight-price-assistant.pem");
const keyPath = path.resolve(process.env.FLIGHT_EXTENSION_KEY_PATH || defaultKey);
const chromeBinary = resolveChromeBinary();

if (!fs.existsSync(keyPath)) {
  throw new Error(
    `Missing signing key: ${keyPath}\n` +
    "CRX packages must be signed with the original private PEM to preserve the extension ID. " +
    "Set FLIGHT_EXTENSION_KEY_PATH to that file; never add it to Git.",
  );
}
if (!manifest.key) throw new Error("manifest.json has no fixed public key; refusing to create a CRX with an unstable extension ID");

const signingKey = fs.readFileSync(keyPath, "utf8");
const publicKey = createPublicKey(createPrivateKey(signingKey)).export({ type: "spki", format: "der" }).toString("base64");
if (publicKey !== manifest.key) {
  throw new Error("The private PEM does not match manifest.json key. Refusing to generate a CRX with a different extension ID.");
}

console.log("\n[1/3] Building the production extension…");
run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
if (!fs.existsSync(path.join(distDir, "manifest.json"))) throw new Error("Build did not produce dist/manifest.json");

const generatedCrx = `${distDir}.crx`;
fs.rmSync(generatedCrx, { force: true });
fs.mkdirSync(releaseDir, { recursive: true });
const output = path.join(releaseDir, `${packageJson.name}-v${manifest.version}.crx`);
fs.rmSync(output, { force: true });

console.log("\n[2/3] Signing the CRX with the existing extension key…");
run(chromeBinary, [`--pack-extension=${distDir}`, `--pack-extension-key=${keyPath}`]);
if (!fs.existsSync(generatedCrx)) throw new Error("Chrome did not produce a CRX file");
fs.renameSync(generatedCrx, output);

console.log("\n[3/3] Verifying release package…");
if (!fs.statSync(output).size) throw new Error("Release CRX is empty");
console.log(`CRX package ready: ${output}`);
console.log("Use CRX for enterprise or controlled distribution. Upload the ZIP package to Chrome Web Store instead.");

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function resolveChromeBinary() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  if (process.platform === "darwin") {
    const candidate = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (fs.existsSync(candidate)) return candidate;
  }
  if (process.platform === "win32") return "chrome.exe";
  if (process.platform === "linux") return "google-chrome";
  throw new Error(`Unsupported operating system: ${os.platform()}. Set CHROME_BIN to the Chrome executable.`);
}
