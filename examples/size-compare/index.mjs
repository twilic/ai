// Copyright (c) 2026 Twilic (maintained by Minagishl)

import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import {
  compareSessionSizes,
  ensureTwilicInit,
  parseJsonlEvents,
  sessionFromEvents,
  sessionPayload,
} from "@twilic/ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../../fixtures");
const fixtures = ["chat-long.jsonl", "chat-deltas.jsonl", "agent-tools.jsonl"];

await ensureTwilicInit();

console.log("Same agent run.\n");

for (const name of fixtures) {
  const jsonl = await readFile(path.join(fixturesDir, name), "utf8");
  const session = sessionFromEvents(parseJsonlEvents(jsonl), {
    sessionId: name,
    source: name,
  });

  const payload = sessionPayload(session);
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  const gzipBytes = gzipSync(jsonBytes);

  const rows = compareSessionSizes(session, [
    { format: "json+gzip", bytes: gzipBytes.byteLength },
  ]);

  console.log(`## ${name} (${session.events.length} events)`);
  for (const row of rows) {
    const label = `${row.format}:`.padEnd(14);
    console.log(`  ${label}${String(row.bytes).padStart(6)} bytes`);
  }
  console.log("");
}

console.log("Replayable without calling the model again.");
