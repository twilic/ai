import { encode } from "@twilic/core";
import { assertTwilicInitialized } from "./init.js";
import { encodeTwai } from "./twai.js";
import { toTwilicValue } from "./twilic-value.js";
import type { AISession } from "./types.js";

export interface FormatSizeRow {
  format: string;
  bytes: number;
}

export function encodeSessionTwilic(session: AISession): Uint8Array {
  assertTwilicInitialized();
  return encode(
    toTwilicValue({
      meta: session.meta,
      events: session.events,
    }),
  );
}

export function encodeSessionTwai(session: AISession): Uint8Array {
  return encodeTwai(session);
}

export function sessionPayload(session: AISession): Record<string, unknown> {
  return {
    meta: session.meta,
    events: session.events,
  };
}

export function compareSessionSizes(
  session: AISession,
  extra?: FormatSizeRow[],
): FormatSizeRow[] {
  const payload = sessionPayload(session);
  const jsonText = JSON.stringify(payload);
  const jsonBytes = new TextEncoder().encode(jsonText);
  const ndjsonText = session.events
    .map((event) => JSON.stringify(event))
    .join("\n");
  const ndjsonBytes = new TextEncoder().encode(ndjsonText);
  const sseText = session.events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join("");
  const sseBytes = new TextEncoder().encode(sseText);

  assertTwilicInitialized();

  const rows: FormatSizeRow[] = [
    { format: "twai", bytes: encodeTwai(session).byteLength },
    { format: "twilic-json", bytes: encodeSessionTwilic(session).byteLength },
    { format: "json", bytes: jsonBytes.byteLength },
    { format: "ndjson", bytes: ndjsonBytes.byteLength },
    { format: "sse+json", bytes: sseBytes.byteLength },
  ];

  if (extra) {
    rows.push(...extra);
  }

  return rows.sort((a, b) => a.bytes - b.bytes);
}
