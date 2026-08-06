import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const archiver = require("archiver");
const yauzl = require("yauzl");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const releaseDir = path.join(root, "release");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args) { execFileSync(command, args, { cwd: root, stdio: "inherit" }); }

console.log("\n[1/3] Building the production extension…");
run(npmCommand, ["run", "build"]);

const manifestPath = path.join(distDir, "manifest.json");
if (!fs.existsSync(manifestPath)) throw new Error("Build did not produce dist/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.manifest_version !== 3) throw new Error("Only Manifest V3 packages can be released");
if (!manifest.name || !manifest.version) throw new Error("Release manifest is missing name or version");
if (manifest.version !== packageJson.version) throw new Error(`Version mismatch: package.json=${packageJson.version}, manifest.json=${manifest.version}`);

// Development mocks must never be granted by a store package.
for (const key of ["host_permissions"]) manifest[key] = (manifest[key] || []).filter((value) => !/^http:\/\/(localhost|127\.0\.0\.1)\//.test(value));
for (const script of manifest.content_scripts || []) script.matches = (script.matches || []).filter((value) => !/^http:\/\/(localhost|127\.0\.0\.1)\//.test(value));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

fs.mkdirSync(releaseDir, { recursive: true });
const safeName = packageJson.name.replace(/[^a-z0-9._-]/gi, "-");
const archivePath = path.join(releaseDir, `${safeName}-v${manifest.version}.zip`);
fs.rmSync(archivePath, { force: true });

console.log("\n[2/3] Creating a Chrome Web Store archive…");
await createZip(distDir, archivePath);

console.log("\n[3/3] Verifying archive layout…");
const files = await zipEntries(archivePath);
if (!files.includes("manifest.json")) throw new Error("Archive manifest.json is not at the archive root");
if (files.some((file) => file.startsWith("dist/"))) throw new Error("Archive must not wrap files in a dist directory");
if (!fs.statSync(archivePath).size) throw new Error("Release archive is empty");
console.log(`\nRelease package ready: ${archivePath}`);
console.log("Upload this ZIP in Chrome Web Store Developer Dashboard, then submit it for review.");

function createZip(source, destination) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destination);
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
    output.on("close", resolve); output.on("error", reject); archive.on("error", reject);
    archive.pipe(output);
    archive.glob("**/*", { cwd: source, dot: true, ignore: ["**/.DS_Store"] });
    archive.finalize();
  });
}

function zipEntries(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, (openError, zip) => {
      if (openError || !zip) return reject(openError || new Error("Cannot open ZIP"));
      const entries = [];
      zip.readEntry();
      zip.on("entry", (entry) => { entries.push(entry.fileName); zip.readEntry(); });
      zip.on("end", () => resolve(entries)); zip.on("error", reject);
    });
  });
}
