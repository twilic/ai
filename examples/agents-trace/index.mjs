import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureTwilicInit,
  inspectSession,
  sessionFromEvents,
  writeSession,
} from "@twilic/ai";
import { createAgentsRecorder } from "@twilic/ai-agents";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(__dirname, "agents-session.twai");
const sessionId = "example-agents-trace";

await ensureTwilicInit();

const recorder = createAgentsRecorder({
  sessionId,
  meta: {
    provider: "openai-agents",
    model: "gpt-4.1",
    source: "examples/agents-trace",
  },
});

const { processor } = recorder;
const startedAt = Date.now();

processor.onTraceStart({
  traceId: "trace_demo",
  name: "research-agent",
  metadata: { workflow: "docs-search" },
});

processor.onSpanStart({
  spanId: "span_llm_1",
  traceId: "trace_demo",
  name: "llm.generate",
  startedAt,
  input: { prompt: "Summarize Twilic AI Sessions." },
});

processor.onSpanEnd({
  spanId: "span_llm_1",
  traceId: "trace_demo",
  name: "llm.generate",
  startedAt,
  endedAt: startedAt + 42,
  output: { text: "Compact replayable agent runs." },
});

processor.onSpanStart({
  spanId: "span_tool_1",
  traceId: "trace_demo",
  parentId: "span_llm_1",
  name: "tool.search",
  startedAt: startedAt + 43,
  input: { query: "twilic ai sessions" },
});

processor.onSpanEnd({
  spanId: "span_tool_1",
  traceId: "trace_demo",
  parentId: "span_llm_1",
  name: "tool.search",
  startedAt: startedAt + 43,
  endedAt: startedAt + 58,
  output: { hits: 3 },
});

processor.onTraceEnd({
  traceId: "trace_demo",
  name: "research-agent",
});

const session = sessionFromEvents(recorder.events, {
  sessionId,
  provider: "openai-agents",
  model: "gpt-4.1",
  source: "examples/agents-trace",
});

await writeSession(output, session);

console.log("Recorded Agents SDK-style tracing → .twai");
console.log("Wrote", output);
console.log(
  "Event types:",
  recorder.events.map((event) => event.type).join(" → "),
);
console.log("Summary:", inspectSession(session));
