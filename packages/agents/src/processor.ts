// Copyright (c) 2026 Twilic (maintained by Minagishl)

import type { AIEvent } from "@twilic/ai";

export interface AgentsTrace {
  traceId: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentsSpan {
  spanId: string;
  traceId: string;
  parentId?: string;
  name?: string;
  startedAt?: number;
  endedAt?: number;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
}

export interface AgentsTracingProcessor {
  onTraceStart?(trace: AgentsTrace): void;
  onTraceEnd?(trace: AgentsTrace): void;
  onSpanStart?(span: AgentsSpan): void;
  onSpanEnd?(span: AgentsSpan): void;
}

export interface TwilicTracingProcessorOptions {
  sessionId: string;
  provider?: string;
  model?: string;
  onEvent?: (event: AIEvent) => void;
}

export class TwilicTracingProcessor implements AgentsTracingProcessor {
  readonly #sessionId: string;
  readonly #provider: string;
  readonly #model?: string;
  readonly #onEvent?: (event: AIEvent) => void;
  #sequence = 0;

  constructor(options: TwilicTracingProcessorOptions) {
    this.#sessionId = options.sessionId;
    this.#provider = options.provider ?? "openai-agents";
    this.#model = options.model;
    this.#onEvent = options.onEvent;
  }

  get sequence(): number {
    return this.#sequence;
  }

  #emit(
    partial: Omit<AIEvent, "sequence" | "timestamp" | "sessionId">,
  ): AIEvent {
    const event: AIEvent = {
      ...partial,
      sequence: this.#sequence,
      timestamp: Date.now(),
      sessionId: this.#sessionId,
      provider: partial.provider ?? this.#provider,
      model: partial.model ?? this.#model,
    };
    this.#sequence += 1;
    this.#onEvent?.(event);
    return event;
  }

  onTraceStart(trace: AgentsTrace): void {
    this.#emit({
      type: "session.start",
      data: {
        traceId: trace.traceId,
        name: trace.name,
        metadata: trace.metadata,
      },
    });
  }

  onTraceEnd(trace: AgentsTrace): void {
    this.#emit({
      type: "session.end",
      data: {
        traceId: trace.traceId,
        name: trace.name,
        metadata: trace.metadata,
      },
    });
  }

  onSpanStart(span: AgentsSpan): void {
    this.#emit({
      type: "trace.span",
      data: {
        phase: "start",
        spanId: span.spanId,
        traceId: span.traceId,
        parentId: span.parentId,
        name: span.name,
        input: span.input,
        metadata: span.metadata,
      },
    });
  }

  onSpanEnd(span: AgentsSpan): void {
    this.#emit({
      type: "trace.span",
      data: {
        phase: "end",
        spanId: span.spanId,
        traceId: span.traceId,
        parentId: span.parentId,
        name: span.name,
        output: span.output,
        metadata: span.metadata,
        durationMs:
          span.startedAt && span.endedAt
            ? span.endedAt - span.startedAt
            : undefined,
      },
    });
  }
}
