import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureTwilicInit } from "@twilic/ai";
import {
  normalizeOpenAIResponseEvent,
  normalizeOpenAIResponseStream,
  recordOpenAIResponses,
} from "../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
  __dirname,
  "../../../fixtures/openai/responses-basic.jsonl",
);

before(async () => {
  await ensureTwilicInit();
});

async function loadFixtureLines() {
  const text = await readFile(fixturePath, "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("normalizeOpenAIResponseEvent maps response types", () => {
  const event = normalizeOpenAIResponseEvent(
    {
      type: "response.output_text.delta",
      data: { delta: "hello" },
    },
    { sessionId: "s1", sequence: 1 },
  );

  assert.equal(event.type, "text.delta");
  assert.equal(event.data?.text, "hello");
  assert.equal(event.provider, "openai");
});

test("normalizeOpenAIResponseStream reads fixture jsonl", async () => {
  const lines = await loadFixtureLines();
  const events = await normalizeOpenAIResponseStream(lines, {
    sessionId: "openai-fixture",
  });

  assert.ok(events.length >= 5);
  assert.equal(events[0]?.type, "request.created");
  assert.ok(events.some((event) => event.type === "tool.started"));
  assert.ok(events.some((event) => event.type === "response.completed"));
});

test("recordOpenAIResponses returns normalized events", async () => {
  const lines = await loadFixtureLines();
  const events = await recordOpenAIResponses(lines, {
    sessionId: "record-openai",
    model: "gpt-4.1",
  });

  assert.equal(events[0]?.sessionId, "record-openai");
  assert.equal(events[0]?.model, "gpt-4.1");
});
