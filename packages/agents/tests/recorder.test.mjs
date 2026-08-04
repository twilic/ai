import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ensureTwilicInit,
  inspectSession,
  readSession,
  sessionFromEvents,
  writeSession,
} from "@twilic/ai";
import { createAgentsRecorder, TwilicTracingProcessor } from "../dist/index.js";

before(async () => {
  await ensureTwilicInit();
});

test("createAgentsRecorder maps tracing callbacks to events", async () => {
  const recorder = createAgentsRecorder({ sessionId: "agents-1" });

  recorder.processor.onTraceStart({ traceId: "trace-1", name: "demo" });
  recorder.processor.onSpanStart({
    spanId: "span-1",
    traceId: "trace-1",
    name: "lookup",
  });
  recorder.processor.onSpanEnd({
    spanId: "span-1",
    traceId: "trace-1",
    name: "lookup",
    startedAt: 100,
    endedAt: 250,
    output: { ok: true },
  });
  recorder.processor.onTraceEnd({ traceId: "trace-1" });

  assert.ok(recorder.events.some((event) => event.type === "trace.span"));
  assert.ok(recorder.events.some((event) => event.type === "session.start"));

  const bytes = await recorder.close();
  assert.ok(bytes.byteLength > 0);
});

test("TwilicTracingProcessor → .twai persists nested span payloads", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "twilic-ai-agents-"));
  const twaiPath = path.join(tmp, "agents.twai");
  const collected = [];

  try {
    const processor = new TwilicTracingProcessor({
      sessionId: "agents-e2e",
      provider: "openai-agents",
      model: "gpt-4.1",
      onEvent: (event) => collected.push(event),
    });

    processor.onTraceStart({
      traceId: "trace_e2e",
      name: "research",
      metadata: { suite: "integration" },
    });
    processor.onSpanStart({
      spanId: "span_tool",
      traceId: "trace_e2e",
      name: "tool.search",
      input: { query: "twilic" },
    });
    processor.onSpanEnd({
      spanId: "span_tool",
      traceId: "trace_e2e",
      name: "tool.search",
      startedAt: 10,
      endedAt: 40,
      output: { hits: 2 },
    });
    processor.onTraceEnd({ traceId: "trace_e2e", name: "research" });

    const session = sessionFromEvents(collected, {
      sessionId: "agents-e2e",
      provider: "openai-agents",
      model: "gpt-4.1",
      source: "agents-integration",
    });
    await writeSession(twaiPath, session);
    const loaded = await readSession(twaiPath);

    assert.equal(loaded.events.length, 4);
    const endSpan = loaded.events.find(
      (event) => event.type === "trace.span" && event.data?.phase === "end",
    );
    assert.ok(endSpan);
    assert.equal(endSpan.data?.durationMs, 30);
    assert.deepEqual(endSpan.data?.output, { hits: 2 });

    const summary = inspectSession(loaded);
    assert.equal(summary.countsByType["trace.span"], 2);
    assert.equal(summary.countsByType["session.start"], 1);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
