// Copyright (c) 2026 Twilic (maintained by Minagishl)

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAIPlayer,
  createAIRecorder,
  ensureTwilicInit,
  inspectSession,
  parseJsonlEvents,
  sessionFromEvents,
  writeSession,
} from "@twilic/ai";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(__dirname, "../../fixtures/chat-long.jsonl");
const output = path.resolve(__dirname, "sample.twai");

await ensureTwilicInit();

const jsonl = await readFile(fixture, "utf8");
const events = parseJsonlEvents(jsonl);
const session = sessionFromEvents(events, {
  sessionId: "example-record-replay",
});

const recorder = createAIRecorder({
  sessionId: session.meta.sessionId,
  meta: session.meta,
});
recorder.append(session.events);
await writeSession(output, {
  meta: { ...session.meta, source: "examples/record-replay" },
  events: recorder.events,
});

const summary = inspectSession(session);
console.log("Wrote", output);
console.log("Summary:", summary);

const player = createAIPlayer(session);
let count = 0;
for await (const event of player) {
  count += 1;
  if (event.type === "text.delta") {
    process.stdout.write(String(event.data?.delta ?? ""));
  }
}
console.log(`\nReplayed ${count} events.`);
