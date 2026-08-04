import type { AIEvent, AISession, SessionDiff } from "./types.js";
import { inspectSession } from "./inspect.js";

function eventSignature(event: AIEvent): string {
  const data = event.data ?? {};
  const parts = [
    event.type,
    String(event.responseId ?? ""),
    String(event.itemId ?? ""),
    String(event.toolCallId ?? ""),
  ];

  if (event.type === "text.delta" || event.type === "reasoning.delta") {
    parts.push(String(data.text ?? data.delta ?? ""));
  }
  if (event.type === "tool.started") {
    parts.push(String(data.name ?? ""));
    parts.push(JSON.stringify(data.input ?? data.args ?? null));
  }
  if (event.type === "tool.output") {
    parts.push(JSON.stringify(data.output ?? data.result ?? null));
  }

  return parts.join("|");
}

function changedFields(before: AIEvent, after: AIEvent): string[] {
  const fields: string[] = [];
  const keys = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
    ...(before.data ? Object.keys(before.data) : []),
    ...(after.data ? Object.keys(after.data) : []),
  ]);

  for (const key of keys) {
    const left =
      key === "data"
        ? JSON.stringify(before.data ?? null)
        : JSON.stringify(
            (before as unknown as Record<string, unknown>)[key] ?? null,
          );
    const right =
      key === "data"
        ? JSON.stringify(after.data ?? null)
        : JSON.stringify(
            (after as unknown as Record<string, unknown>)[key] ?? null,
          );
    if (left !== right) {
      fields.push(key);
    }
  }

  return fields;
}

export function diffSessions(a: AISession, b: AISession): SessionDiff {
  const beforeMap = new Map<number, AIEvent>();
  const afterMap = new Map<number, AIEvent>();

  for (const event of a.events) {
    beforeMap.set(event.sequence, event);
  }
  for (const event of b.events) {
    afterMap.set(event.sequence, event);
  }

  const added: AIEvent[] = [];
  const removed: AIEvent[] = [];
  const changed: SessionDiff["changed"] = [];

  const beforeSigs = new Map<number, string>();
  const afterSigs = new Map<number, string>();

  for (const [sequence, event] of beforeMap) {
    beforeSigs.set(sequence, eventSignature(event));
  }
  for (const [sequence, event] of afterMap) {
    afterSigs.set(sequence, eventSignature(event));
  }

  for (const [sequence, event] of afterMap) {
    if (!beforeMap.has(sequence)) {
      added.push(event);
      continue;
    }
    const before = beforeMap.get(sequence)!;
    if (beforeSigs.get(sequence) !== afterSigs.get(sequence)) {
      changed.push({
        sequence,
        before,
        after: event,
        fields: changedFields(before, event),
      });
    }
  }

  for (const [sequence, event] of beforeMap) {
    if (!afterMap.has(sequence)) {
      removed.push(event);
    }
  }

  return {
    added,
    removed,
    changed,
    typeCounts: {
      before: inspectSession(a).countsByType,
      after: inspectSession(b).countsByType,
    },
  };
}
