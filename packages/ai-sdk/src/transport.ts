// Copyright (c) 2026 Twilic (maintained by Minagishl)

import {
  createAIRecorder,
  decodeTwai,
  ensureTwilicInit,
  TWAI_MIME,
  type AIEvent,
  type AIRecorder,
} from "@twilic/ai";
import type {
  ChatTransport,
  ChatTransportRequest,
  ChatTransportResult,
} from "./types.js";

export interface TwilicChatTransportOptions {
  api?: string;
  fetch?: typeof fetch;
  recorder?: AIRecorder;
  record?: boolean;
  headers?: Record<string, string>;
}

function isTwaiContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }
  return contentType.includes(TWAI_MIME) || contentType.includes("twai");
}

function parseSseChunk(chunk: string, sessionId: string): AIEvent[] {
  const events: AIEvent[] = [];
  const lines = chunk.split(/\r?\n/);
  let sequence = 0;

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") {
      continue;
    }
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      events.push({
        type: String(parsed.type ?? "custom"),
        sequence,
        timestamp: Date.now(),
        sessionId,
        data: parsed,
      });
      sequence += 1;
    } catch {
      // ignore malformed chunks
    }
  }

  return events;
}

export class TwilicChatTransport implements ChatTransport {
  readonly #api: string;
  readonly #fetchImpl: typeof fetch;
  readonly #recorder: AIRecorder | undefined;
  readonly #record: boolean;
  readonly #headers: Record<string, string>;

  constructor(options: TwilicChatTransportOptions = {}) {
    this.#api = options.api ?? "/api/chat";
    this.#fetchImpl = options.fetch ?? fetch;
    this.#recorder =
      options.recorder ??
      (options.record
        ? createAIRecorder({ meta: { source: "ai-sdk" } })
        : undefined);
    this.#record = options.record ?? Boolean(options.recorder);
    this.#headers = options.headers ?? {};
  }

  get recorder(): AIRecorder | undefined {
    return this.#recorder;
  }

  async sendMessages(
    request: ChatTransportRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<ChatTransportResult> {
    await ensureTwilicInit();

    const response = await this.#fetchImpl(request.api ?? this.#api, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.#headers,
        ...request.headers,
      },
      body: JSON.stringify({
        id: request.id,
        messages: request.messages,
        ...request.body,
      }),
      credentials: request.credentials,
      signal: options.signal,
    });

    const contentType = response.headers.get("content-type");
    const sessionId = request.id ?? crypto.randomUUID();

    if (isTwaiContentType(contentType)) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const session = decodeTwai(bytes);
      if (this.#record && this.#recorder) {
        this.#recorder.append(session.events);
      }
      return {
        stream: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
      };
    }

    if (!response.body) {
      throw new Error("ai-sdk transport: empty response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    const recorder = this.#recorder;
    const record = this.#record;

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          if (record && recorder && pending) {
            recorder.append(parseSseChunk(pending, sessionId));
          }
          controller.close();
          return;
        }

        controller.enqueue(value);

        if (record && recorder) {
          pending += decoder.decode(value, { stream: true });
          const parts = pending.split("\n\n");
          pending = parts.pop() ?? "";
          for (const part of parts) {
            recorder.append(parseSseChunk(part, sessionId));
          }
        }
      },
    });

    return { stream };
  }
}

export type { ChatTransport, ChatTransportRequest, ChatTransportResult };
