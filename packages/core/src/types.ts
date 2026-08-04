export const CANONICAL_EVENT_TYPES = [
  "session.start",
  "session.end",
  "request.created",
  "text.delta",
  "reasoning.delta",
  "tool.input.delta",
  "tool.started",
  "tool.output",
  "retrieval.result",
  "usage.updated",
  "trace.span",
  "checkpoint.updated",
  "response.completed",
  "custom",
] as const;

export type CanonicalEventType = (typeof CANONICAL_EVENT_TYPES)[number];

export interface AIEvent {
  type: string;
  sequence: number;
  timestamp: number;
  sessionId: string;
  responseId?: string;
  itemId?: string;
  toolCallId?: string;
  model?: string;
  provider?: string;
  outputIndex?: number;
  contentIndex?: number;
  data?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface SessionMeta {
  format: "twai";
  version: 1;
  sessionId: string;
  createdAt: number;
  completedAt?: number;
  provider?: string;
  model?: string;
  eventCount: number;
  source?: string;
}

export interface AISession {
  meta: SessionMeta;
  events: AIEvent[];
}

export type SessionInput = AISession | { meta: SessionMeta; events: AIEvent[] };

export interface SessionSummary {
  sessionId: string;
  durationMs: number;
  eventCount: number;
  countsByType: Record<string, number>;
  models: string[];
  providers: string[];
  tools: string[];
  textBytes: number;
  reasoningBytes: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

export interface SessionDiff {
  added: AIEvent[];
  removed: AIEvent[];
  changed: Array<{
    sequence: number;
    before: AIEvent;
    after: AIEvent;
    fields: string[];
  }>;
  typeCounts: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
}

export interface ConvertOptions {
  to: "jsonl" | "json";
}

export interface ReplayOptions {
  speed?: number;
  onEvent?: (event: AIEvent, index: number) => void | Promise<void>;
}
