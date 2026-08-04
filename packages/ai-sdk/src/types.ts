export interface UIMessage {
  id?: string;
  role: string;
  content?: unknown;
  parts?: unknown[];
}

/** Minimal ChatTransport-compatible interface (Vercel AI SDK). */
export interface ChatTransportRequest {
  api?: string;
  id?: string;
  messages: UIMessage[];
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

export interface ChatTransportResult {
  stream: ReadableStream<Uint8Array>;
}

export interface ChatTransport {
  sendMessages(
    request: ChatTransportRequest,
    options?: { signal?: AbortSignal },
  ): Promise<ChatTransportResult>;
}
