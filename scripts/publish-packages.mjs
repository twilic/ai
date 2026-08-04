#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const PACKAGES = [
  "packages/core",
  "packages/openai",
  "packages/ai-sdk",
  "packages/agents",
];

const withProvenance = process.argv.includes("--provenance");

function packageExists(name, version) {
  const result = spawnSync(
    "npm",
    ["view", `${name}@${version}`, "version", "--silent"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return result.status === 0 && result.stdout.trim() === version;
}

function publishPackage(relativePath) {
  const packageJson = JSON.parse(
    readFileSync(path.join(root, relativePath, "package.json"), "utf8"),
  );
  const { name, version } = packageJson;

  if (packageExists(name, version)) {
    console.log(`skip ${name}@${version} (already published)`);
    return;
  }

  const args = ["publish", "--access", "public", "--prefix", relativePath];
  if (withProvenance) {
    args.push("--provenance");
  }

  console.log(
    `publish ${name}@${version}${withProvenance ? " (provenance)" : ""}`,
  );
  const result = spawnSync("npm", args, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const relativePath of PACKAGES) {
  publishPackage(relativePath);
}
