# Twilic AI

AI session recording, replay, and transport helpers for Twilic binary streams.

**Record once. Replay anywhere. Send less.**

## Install

```bash
pnpm add @twilic/ai @twilic/core
```

Optional adapters:

```bash
pnpm add @twilic/ai-openai @twilic/ai-sdk @twilic/ai-agents
```

## Packages

| Package | Description |
| --- | --- |
| `@twilic/ai` | Core recorder, `.twai` codec, replay, inspect, diff |
| `@twilic/ai-openai` | OpenAI Responses API event normalization |
| `@twilic/ai-sdk` | Vercel AI SDK transport + recorder helpers |
| `@twilic/ai-agents` | Agents SDK tracing processor |
| `@twilic/ai-inspector` | Local web inspector (private workspace package) |
| `@twilic/ai-benchmarks` | Encoding size/throughput benchmarks (private) |

## Usage

```ts
import { createAIRecorder, ensureTwilicInit, writeSession } from "@twilic/ai";

await ensureTwilicInit();

const recorder = createAIRecorder({
  sessionId: "demo-session",
  meta: { provider: "openai", model: "gpt-4.1" },
});

await recorder.record(async () => {
  recorder.append({
    type: "text.delta",
    sequence: recorder.events.length,
    timestamp: Date.now(),
    sessionId: "demo-session",
    data: { delta: "Hello from Twilic AI." },
  });
});

await writeSession("session.twai", {
  meta: {
    format: "twai",
    version: 1,
    sessionId: "demo-session",
    createdAt: Date.now(),
    eventCount: recorder.events.length,
  },
  events: recorder.events,
});
```

## CLI

Use [`@twilic/cli`](https://github.com/twilic/cli) for session tooling:

```bash
twilic ai inspect session.twai
twilic ai replay session.twai --speed 10
twilic ai record --input events.jsonl -o session.twai
```

See the CLI README for `inspect`, `replay`, `diff`, `convert`, `record`, and `benchmark` subcommands.

## .twai

The `.twai` container stores Twilic-encoded session metadata and canonical AI events. See [spec/twai.md](spec/twai.md).

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm bench
pnpm inspector
```

## Changelog

See [docs/CHANGELOG.md](docs/CHANGELOG.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
