// Copyright (c) 2026 Twilic (maintained by Minagishl)

import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  diffSessions,
  ensureTwilicInit,
  parseJsonlEvents,
  sessionFromEvents,
} from "@twilic/ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const beforePath = path.resolve(__dirname, "../../fixtures/chat-deltas.jsonl");
const afterPath = path.resolve(__dirname, "../../fixtures/agent-tools.jsonl");

await ensureTwilicInit();

const before = sessionFromEvents(
  parseJsonlEvents(await readFile(beforePath, "utf8")),
  { sessionId: "before-run", source: "chat-deltas" },
);
const after = sessionFromEvents(
  parseJsonlEvents(await readFile(afterPath, "utf8")),
  { sessionId: "after-run", source: "agent-tools" },
);

const diff = diffSessions(before, after);

console.log("Diff chat-deltas.jsonl vs agent-tools.jsonl");
console.log(
  JSON.stringify(
    {
      added: diff.added.length,
      removed: diff.removed.length,
      changed: diff.changed.length,
      typeCounts: diff.typeCounts,
      sampleAdded: diff.added.slice(0, 3).map((event) => ({
        type: event.type,
        data: event.data,
      })),
      sampleChanged: diff.changed.slice(0, 3).map((row) => ({
        fields: row.fields,
        beforeType: row.before.type,
        afterType: row.after.type,
      })),
    },
    null,
    2,
  ),
);
