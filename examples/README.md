# Examples

Runnable demos for Twilic AI Sessions. No API keys required — fixtures are synthetic.

| Example | Package | What it shows |
| --- | --- | --- |
| [`record-replay`](./record-replay) | `@twilic/ai` | Record events → `.twai` → inspect → replay |
| [`openai-normalize`](./openai-normalize) | `@twilic/ai-openai` | OpenAI Responses events → canonical AI events |
| [`diff-sessions`](./diff-sessions) | `@twilic/ai` | Compare two agent runs |
| [`size-compare`](./size-compare) | `@twilic/ai` | JSON / NDJSON / SSE vs `.twai` sizes |
| [`convert`](./convert) | `@twilic/ai` | `.twai` ↔ JSON / JSONL round-trip |
| [`agents-trace`](./agents-trace) | `@twilic/ai-agents` | Agents tracing processor → session |
| [`ai-sdk-transport`](./ai-sdk-transport) | `@twilic/ai-sdk` | Chat transport with mock SSE backend |

## Run

From the repository root:

```bash
pnpm install
pnpm --filter @twilic/ai build

pnpm --filter @twilic/ai-example-record-replay start
pnpm --filter @twilic/ai-example-openai-normalize start
pnpm --filter @twilic/ai-example-diff-sessions start
pnpm --filter @twilic/ai-example-size-compare start
pnpm --filter @twilic/ai-example-convert start
pnpm --filter @twilic/ai-example-agents-trace start
pnpm --filter @twilic/ai-example-ai-sdk-transport start
```

Or from an example directory:

```bash
cd examples/size-compare
pnpm start
```
