import { before, test } from "node:test";
import assert from "node:assert/strict";
import { ensureTwilicInit } from "@twilic/ai";
import { createAgentsRecorder } from "../dist/index.js";

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
