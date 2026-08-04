import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const PUBLISH_ORDER = [
  "packages/core",
  "packages/openai",
  "packages/ai-sdk",
  "packages/agents",
];

function readPackage(relativePath) {
  const packageJsonPath = path.join(root, relativePath, "package.json");
  return {
    packageJsonPath,
    packageJson: JSON.parse(readFileSync(packageJsonPath, "utf8")),
  };
}

const versions = new Map();
for (const relativePath of PUBLISH_ORDER) {
  const { packageJson } = readPackage(relativePath);
  versions.set(packageJson.name, packageJson.version);
}

for (const relativePath of PUBLISH_ORDER) {
  const { packageJsonPath, packageJson } = readPackage(relativePath);
  let changed = false;

  for (const field of [
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    const deps = packageJson[field];
    if (!deps) {
      continue;
    }
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range === "string" && range.startsWith("workspace:")) {
        const version = versions.get(name);
        if (!version) {
          throw new Error(
            `cannot resolve ${range} for ${name} in ${packageJson.name}`,
          );
        }
        deps[name] = version;
        changed = true;
      }
    }
  }

  if (changed) {
    writeFileSync(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      "utf8",
    );
    console.log(`rewrote workspace deps in ${packageJson.name}`);
  }
}

console.log("npm publish preparation complete");
