// Copyright (c) 2026 Twilic (maintained by Minagishl)

import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ensureTwilicInit,
  inspectSession,
  sessionFromEvents,
  writeSession,
} from "@twilic/ai";
import { recordOpenAIResponses } from "@twilic/ai-openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(
  __dirname,
  "../../fixtures/openai/responses-basic.jsonl",
);
const output = path.resolve(__dirname, "openai-session.twai");

await ensureTwilicInit();

const lines = (await readFile(fixture, "utf8"))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const events = await recordOpenAIResponses(lines, {
  sessionId: "example-openai-normalize",
  model: "gpt-4.1",
});

const session = sessionFromEvents(events, {
  sessionId: "example-openai-normalize",
  provider: "openai",
  model: "gpt-4.1",
  source: "examples/openai-normalize",
});

await writeSession(output, session);

console.log("Normalized OpenAI Responses → .twai");
console.log("Wrote", output);
console.log("Event types:", events.map((event) => event.type).join(" → "));
console.log("Summary:", inspectSession(session));
