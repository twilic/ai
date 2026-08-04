import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compareSessionSizes,
  convertSession,
  createAIPlayer,
  createAIRecorder,
  ensureTwilicInit,
  inspectSession,
  parseJsonlEvents,
  readSession,
} from "../dist/index.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../../../fixtures");

before(async () => {
  await ensureTwilicInit();
});

test("end-to-end: record fixture events, persist, replay, convert, compare sizes", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "twilic-ai-e2e-"));
  const twaiPath = path.join(tmp, "run.twai");

  try {
    const jsonl = await readFile(
      path.join(fixturesDir, "agent-tools.jsonl"),
      "utf8",
    );
    const events = parseJsonlEvents(jsonl);

    const recorder = createAIRecorder({
      sessionId: "e2e-agent",
      meta: { provider: "openai", model: "gpt-4.1", source: "e2e" },
      output: twaiPath,
    });
    recorder.append(events);
    const bytes = await recorder.close();
    assert.ok(bytes.byteLength > 32);

    const loaded = await readSession(twaiPath);
    assert.equal(loaded.meta.sessionId, "e2e-agent");
    assert.equal(loaded.events.length, events.length);

    const summary = inspectSession(loaded);
    assert.ok(summary.countsByType["tool.started"] >= 1);
    assert.ok(summary.tools.length >= 1);

    const replayed = [];
    await createAIPlayer(loaded).replay({
      speed: 1000,
      onEvent: (event) => {
        replayed.push(event.type);
      },
    });
    assert.equal(replayed.length, loaded.events.length);
    assert.equal(replayed[0], "session.start");

    const asJsonl = convertSession(loaded, { to: "jsonl" });
    assert.equal(parseJsonlEvents(asJsonl).length, loaded.events.length);

    const sizes = compareSessionSizes(loaded);
    const twai = sizes.find((row) => row.format === "twai");
    const json = sizes.find((row) => row.format === "json");
    assert.ok(twai);
    assert.ok(json);
    assert.ok(twai.bytes < json.bytes);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
