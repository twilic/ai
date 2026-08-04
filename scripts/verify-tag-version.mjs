import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLISHABLE_PACKAGES = [
  "packages/core",
  "packages/openai",
  "packages/ai-sdk",
  "packages/agents",
];

const tag = process.env.GITHUB_REF_NAME || process.argv[2];
if (!tag) {
  throw new Error("tag is required (set GITHUB_REF_NAME or pass tag as arg)");
}

const normalizedTag = tag.startsWith("v") ? tag.slice(1) : tag;
const versions = [];

for (const relativePath of PUBLISHABLE_PACKAGES) {
  const packageJsonPath = path.resolve(
    __dirname,
    "..",
    relativePath,
    "package.json",
  );
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  if (packageJson.private) {
    throw new Error(`${packageJson.name} is private and cannot be published`);
  }

  if (normalizedTag !== packageJson.version) {
    throw new Error(
      `tag/version mismatch: tag=${tag} ${packageJson.name} version=${packageJson.version}`,
    );
  }

  versions.push(`${packageJson.name}@${packageJson.version}`);
}

console.log(`release tag ${tag} matches ${versions.join(", ")}`);
