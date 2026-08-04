// Copyright (c) 2026 Twilic (maintained by Minagishl)

import type { AIEvent, AISession, SessionSummary } from "./types.js";

function textLength(value: unknown): number {
  if (typeof value !== "string") {
    return 0;
  }
  return new TextEncoder().encode(value).byteLength;
}

export function inspectSession(session: AISession): SessionSummary {
  const countsByType: Record<string, number> = {};
  const models = new Set<string>();
  const providers = new Set<string>();
  const tools = new Set<string>();
  let textBytes = 0;
  let reasoningBytes = 0;

  for (const event of session.events) {
    countsByType[event.type] = (countsByType[event.type] ?? 0) + 1;
    if (event.model) {
      models.add(event.model);
    }
    if (event.provider) {
      providers.add(event.provider);
    }
    if (event.toolCallId) {
      tools.add(event.toolCallId);
    }

    const payload = event.data ?? {};
    if (event.type === "text.delta") {
      textBytes += textLength(payload.text ?? payload.delta);
    }
    if (event.type === "reasoning.delta") {
      reasoningBytes += textLength(payload.text ?? payload.delta);
    }
    if (event.type === "tool.started" && typeof payload.name === "string") {
      tools.add(payload.name);
    }
  }

  const firstTimestamp = session.events[0]?.timestamp ?? session.meta.createdAt;
  const lastTimestamp =
    session.events.at(-1)?.timestamp ??
    session.meta.completedAt ??
    firstTimestamp;

  return {
    sessionId: session.meta.sessionId,
    durationMs: Math.max(0, lastTimestamp - firstTimestamp),
    eventCount: session.events.length,
    countsByType,
    models: [...models],
    providers: [...providers],
    tools: [...tools],
    textBytes,
    reasoningBytes,
    firstTimestamp,
    lastTimestamp,
  };
}

export function summarizeEvent(event: AIEvent): string {
  const data = event.data ?? {};
  switch (event.type) {
    case "text.delta":
    case "reasoning.delta":
      return String(data.text ?? data.delta ?? "").slice(0, 120);
    case "tool.started":
      return String(data.name ?? event.toolCallId ?? "tool");
    case "tool.output":
      return String(data.output ?? data.result ?? "").slice(0, 120);
    default:
      return event.type;
  }
}
