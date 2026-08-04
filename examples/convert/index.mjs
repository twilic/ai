// Copyright (c) 2026 Twilic (maintained by Minagishl)

import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  convertSession,
  ensureTwilicInit,
  parseJsonlEvents,
  readSession,
  sessionFromEvents,
  writeSession,
} from "@twilic/ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(__dirname, "../../fixtures/agent-tools.jsonl");
const outDir = path.resolve(__dirname, "out");
const twaiPath = path.join(outDir, "agent-tools.twai");
const jsonlPath = path.join(outDir, "agent-tools.roundtrip.jsonl");
const jsonPath = path.join(outDir, "agent-tools.roundtrip.json");

await ensureTwilicInit();
await mkdir(outDir, { recursive: true });

const session = sessionFromEvents(
  parseJsonlEvents(await readFile(fixture, "utf8")),
  {
    sessionId: "example-convert",
    source: "examples/convert",
  },
);

await writeSession(twaiPath, session);
const loaded = await readSession(twaiPath);

await writeFile(jsonlPath, convertSession(loaded, { to: "jsonl" }));
await writeFile(jsonPath, convertSession(loaded, { to: "json" }));

console.log("Converted agent-tools fixture through .twai");
console.log("  .twai →", twaiPath);
console.log("  jsonl →", jsonlPath);
console.log("  json  →", jsonPath);
console.log("Events:", loaded.events.length);
