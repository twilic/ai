// Copyright (c) 2026 Twilic (maintained by Minagishl)

import { createWriteStream, type WriteStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { ensureTwilicInit } from "./init.js";
import { encodeTwai } from "./twai.js";
import { sessionFromEvents } from "./session.js";
import type { AIEvent, AISession, SessionMeta } from "./types.js";

export interface AIRecorderOptions {
  output?: string | WritableStream<Uint8Array>;
  sessionId?: string;
  meta?: Partial<Omit<SessionMeta, "format" | "version" | "sessionId">>;
}

export interface AIRecorder {
  readonly events: AIEvent[];
  append(event: AIEvent | AIEvent[]): void;
  record<T>(fn: () => Promise<T> | T): Promise<T>;
  flush(): Promise<Uint8Array>;
  close(): Promise<Uint8Array>;
}

function normalizeAppend(
  events: AIEvent[],
  incoming: AIEvent | AIEvent[],
  sessionId: string,
): AIEvent[] {
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const next = [...events];

  for (const event of list) {
    const sequence = event.sequence ?? next.length;
    next.push({
      ...event,
      sequence,
      sessionId: event.sessionId ?? sessionId,
      timestamp: event.timestamp ?? Date.now(),
    });
  }

  return next;
}

function createSessionMeta(
  events: AIEvent[],
  sessionId: string,
  meta: AIRecorderOptions["meta"],
): SessionMeta {
  const session = sessionFromEvents(events, {
    sessionId,
    ...meta,
  });
  return session.meta;
}

export function createAIRecorder(options: AIRecorderOptions = {}): AIRecorder {
  const sessionId = options.sessionId ?? randomUUID();
  let events: AIEvent[] = [];
  let closed = false;
  let fileStream: WriteStream | null = null;

  const getStream = (): WriteStream | null => {
    if (typeof options.output !== "string") {
      return null;
    }
    if (!fileStream) {
      fileStream = createWriteStream(options.output);
    }
    return fileStream;
  };

  const recorder: AIRecorder = {
    get events() {
      return events;
    },

    append(event: AIEvent | AIEvent[]) {
      if (closed) {
        throw new Error("recorder is closed");
      }
      events = normalizeAppend(events, event, sessionId);
    },

    async record<T>(fn: () => Promise<T> | T): Promise<T> {
      const startedAt = Date.now();
      recorder.append({
        type: "session.start",
        sequence: events.length,
        timestamp: startedAt,
        sessionId,
        data: { source: options.meta?.source },
      });

      try {
        const result = await fn();
        recorder.append({
          type: "session.end",
          sequence: events.length,
          timestamp: Date.now(),
          sessionId,
          data: { status: "ok" },
        });
        return result;
      } catch (error) {
        recorder.append({
          type: "session.end",
          sequence: events.length,
          timestamp: Date.now(),
          sessionId,
          data: {
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          },
        });
        throw error;
      }
    },

    async flush(): Promise<Uint8Array> {
      await ensureTwilicInit();
      const session: AISession = {
        meta: createSessionMeta(events, sessionId, options.meta),
        events,
      };
      const bytes = encodeTwai(session);

      if (typeof options.output === "string") {
        getStream()?.write(bytes);
      } else if (options.output) {
        const writer = options.output.getWriter();
        try {
          await writer.write(bytes);
        } finally {
          writer.releaseLock();
        }
      }

      return bytes;
    },

    async close(): Promise<Uint8Array> {
      if (closed) {
        throw new Error("recorder already closed");
      }
      closed = true;
      const bytes = await recorder.flush();

      if (fileStream) {
        await new Promise<void>((resolve, reject) => {
          fileStream!.end((error: NodeJS.ErrnoException | null | undefined) =>
            error ? reject(error) : resolve(),
          );
        });
      }

      return bytes;
    },
  };

  return recorder;
}
