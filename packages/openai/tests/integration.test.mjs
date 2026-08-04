import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  convertSession,
  ensureTwilicInit,
  inspectSession,
  readSession,
  sessionFromEvents,
  writeSession,
} from "@twilic/ai";
import { recordOpenAIResponses } from "../dist/index.js";

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

test("openai normalize → .twai → inspect → convert roundtrip", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "twilic-ai-openai-"));
  const twaiPath = path.join(tmp, "openai.twai");

  try {
    const lines = await loadFixtureLines();
    const events = await recordOpenAIResponses(lines, {
      sessionId: "openai-e2e",
      model: "gpt-4.1",
    });

    const session = sessionFromEvents(events, {
      sessionId: "openai-e2e",
      provider: "openai",
      model: "gpt-4.1",
      source: "openai-integration",
    });

    await writeSession(twaiPath, session);
    const loaded = await readSession(twaiPath);

    assert.equal(loaded.events.length, events.length);
    assert.equal(loaded.events[0]?.type, "request.created");
    assert.ok(loaded.events.some((event) => event.type === "tool.started"));
    assert.ok(
      loaded.events.some((event) => event.type === "response.completed"),
    );

    const summary = inspectSession(loaded);
    assert.equal(summary.sessionId, "openai-e2e");
    assert.deepEqual(summary.providers, ["openai"]);
    assert.ok(summary.tools.includes("search") || summary.tools.length >= 1);

    const jsonl = convertSession(loaded, { to: "jsonl" });
    assert.match(jsonl, /text\.delta/);
    assert.match(jsonl, /tool\.started/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
