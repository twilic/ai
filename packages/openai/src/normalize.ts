import { randomUUID } from "node:crypto";
import type { AIEvent } from "@twilic/ai";

export interface OpenAIRawEvent {
  type?: string;
  event?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

const OPENAI_TYPE_MAP: Record<string, string> = {
  "response.created": "request.created",
  "response.output_text.delta": "text.delta",
  "response.reasoning_summary_text.delta": "reasoning.delta",
  "response.function_call_arguments.delta": "tool.input.delta",
  "response.output_item.added": "tool.started",
  "response.function_call_arguments.done": "tool.output",
  "response.file_search_call.completed": "retrieval.result",
  "response.completed": "response.completed",
  "response.done": "response.completed",
};

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mapOpenAIType(rawType: string): string {
  return OPENAI_TYPE_MAP[rawType] ?? "custom";
}

export interface NormalizeContext {
  sessionId: string;
  sequence?: number;
  provider?: string;
  model?: string;
}

export function normalizeOpenAIResponseEvent(
  raw: OpenAIRawEvent,
  context: NormalizeContext,
): AIEvent {
  const payload = (raw.data ?? raw) as Record<string, unknown>;
  const rawType = pickString(raw.type) ?? pickString(raw.event) ?? "custom";
  const type = mapOpenAIType(rawType);
  const sequence = context.sequence ?? 0;

  const response = payload.response as Record<string, unknown> | undefined;
  const item = payload.item as Record<string, unknown> | undefined;
  const delta = pickString(payload.delta);

  const event: AIEvent = {
    type,
    sequence,
    timestamp: Date.now(),
    sessionId: context.sessionId,
    provider: context.provider ?? "openai",
    model:
      context.model ?? pickString(response?.model) ?? pickString(payload.model),
    responseId:
      pickString(response?.id) ??
      pickString(payload.response_id) ??
      pickString(payload.responseId),
    itemId: pickString(item?.id) ?? pickString(payload.item_id),
    toolCallId:
      pickString(item?.call_id) ??
      pickString(payload.call_id) ??
      pickString(payload.tool_call_id),
    data: {},
    extensions: { openai: { rawType } },
  };

  if (type === "text.delta" || type === "reasoning.delta") {
    event.data = { delta, text: delta };
  } else if (type === "tool.input.delta") {
    event.data = { delta, arguments: delta };
  } else if (type === "tool.started") {
    event.data = {
      name: pickString(item?.name) ?? pickString(payload.name),
      input: item?.arguments ?? payload.arguments,
    };
  } else if (type === "tool.output") {
    event.data = {
      output: item?.output ?? payload.output ?? payload.result,
    };
  } else if (type === "retrieval.result") {
    event.data = { results: payload.results ?? payload.output };
  } else if (type === "usage.updated") {
    event.data = { usage: response?.usage ?? payload.usage };
  } else if (type === "response.completed") {
    event.data = { response };
  } else {
    event.data = payload;
  }

  return event;
}

export async function normalizeOpenAIResponseStream(
  events: AsyncIterable<OpenAIRawEvent> | Iterable<OpenAIRawEvent>,
  context: Partial<NormalizeContext> = {},
): Promise<AIEvent[]> {
  const sessionId = context.sessionId ?? randomUUID();
  const normalized: AIEvent[] = [];
  let sequence = 0;

  for await (const raw of events as AsyncIterable<OpenAIRawEvent>) {
    normalized.push(
      normalizeOpenAIResponseEvent(raw, {
        sessionId,
        sequence,
        provider: context.provider,
        model: context.model,
      }),
    );
    sequence += 1;
  }

  return normalized;
}

export interface RecordOpenAIResponsesOptions {
  sessionId?: string;
  provider?: string;
  model?: string;
}

export async function recordOpenAIResponses(
  events: AsyncIterable<OpenAIRawEvent> | Iterable<OpenAIRawEvent>,
  options: RecordOpenAIResponsesOptions = {},
): Promise<AIEvent[]> {
  return normalizeOpenAIResponseStream(events, options);
}
