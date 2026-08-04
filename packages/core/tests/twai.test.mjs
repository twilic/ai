import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureTwilicInit } from "../dist/init.js";
import {
  convertSession,
  createAIPlayer,
  createAIRecorder,
  decodeTwai,
  diffSessions,
  encodeTwai,
  inspectSession,
  parseJsonlEvents,
  readSession,
  sessionFromEvents,
  writeSession,
} from "../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../../../fixtures");

before(async () => {
  await ensureTwilicInit();
});

function loadFixture(name) {
  return readFile(path.join(fixturesDir, name), "utf8");
}

test("twai roundtrip encodes and decodes session", async () => {
  const jsonl = await loadFixture("chat-long.jsonl");
  const events = parseJsonlEvents(jsonl);
  const session = sessionFromEvents(events, { sessionId: "chat-long-001" });

  const bytes = encodeTwai(session);
  const decoded = decodeTwai(bytes);

  assert.equal(decoded.meta.sessionId, "chat-long-001");
  assert.equal(decoded.meta.format, "twai");
  assert.equal(decoded.events.length, events.length);
  assert.equal(decoded.events[2]?.type, "text.delta");
});

test("writeSession and readSession roundtrip via filesystem", async () => {
  const jsonl = await loadFixture("chat-deltas.jsonl");
  const events = parseJsonlEvents(jsonl);
  const session = sessionFromEvents(events, { sessionId: "chat-deltas-001" });
  const target = path.join(__dirname, ".tmp-chat-deltas.twai");

  await writeSession(target, session);
  const loaded = await readSession(target);

  assert.equal(loaded.meta.eventCount, session.events.length);
  assert.equal(loaded.events.at(-1)?.type, "session.end");
});

test("createAIRecorder append and close", async () => {
  const recorder = createAIRecorder({
    sessionId: "rec-test",
    meta: { provider: "test", model: "mock" },
  });

  recorder.append({
    type: "text.delta",
    sequence: 0,
    timestamp: Date.now(),
    sessionId: "rec-test",
    data: { delta: "hi" },
  });

  const result = await recorder.record(async () => "done");
  assert.equal(result, "done");
  assert.ok(recorder.events.length >= 3);

  const bytes = await recorder.close();
  assert.ok(bytes.byteLength > 16);
});

test("inspectSession summarizes counts and sizes", async () => {
  const jsonl = await loadFixture("agent-tools.jsonl");
  const session = sessionFromEvents(parseJsonlEvents(jsonl), {
    sessionId: "agent-tools-001",
  });
  const summary = inspectSession(session);

  assert.equal(summary.sessionId, "agent-tools-001");
  assert.ok(summary.eventCount >= 7);
  assert.ok(summary.countsByType["tool.started"] >= 1);
  assert.ok(summary.tools.length >= 1);
});

test("diffSessions detects changed text deltas", async () => {
  const jsonl = await loadFixture("chat-deltas.jsonl");
  const events = parseJsonlEvents(jsonl);
  const left = sessionFromEvents(events, { sessionId: "chat-deltas-001" });
  const rightEvents = events.map((event) =>
    event.type === "text.delta" && event.sequence === 4
      ? {
          ...event,
          data: { delta: "universe" },
        }
      : event,
  );
  const right = sessionFromEvents(rightEvents, {
    sessionId: "chat-deltas-001",
  });

  const diff = diffSessions(left, right);
  assert.equal(diff.changed.length, 1);
  assert.equal(diff.changed[0]?.sequence, 4);
});

test("convertSession outputs json and jsonl", async () => {
  const jsonl = await loadFixture("chat-long.jsonl");
  const session = sessionFromEvents(parseJsonlEvents(jsonl), {
    sessionId: "chat-long-001",
  });

  const asJsonl = convertSession(session, { to: "jsonl" });
  const asJson = convertSession(session, { to: "json" });

  assert.match(asJsonl, /session.start/);
  assert.doesNotThrow(() => JSON.parse(asJson));
});

test("createAIPlayer replays events in order", async () => {
  const jsonl = await loadFixture("chat-deltas.jsonl");
  const session = sessionFromEvents(parseJsonlEvents(jsonl), {
    sessionId: "chat-deltas-001",
  });
  const player = createAIPlayer(session);
  const replayed = [];

  for await (const event of player) {
    replayed.push(event.type);
  }

  assert.deepEqual(replayed.slice(0, 3), [
    "session.start",
    "text.delta",
    "text.delta",
  ]);
});
