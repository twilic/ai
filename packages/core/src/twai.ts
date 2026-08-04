// Copyright (c) 2026 Twilic (maintained by Minagishl)

import { decode, encode, type TwilicValue } from "@twilic/core";
import { assertTwilicInitialized } from "./init.js";
import { toTwilicValue } from "./twilic-value.js";
import type { AIEvent, AISession, SessionMeta } from "./types.js";

const MAGIC = new TextEncoder().encode("TWAI");
const FORMAT_VERSION = 1;
const HEADER_SIZE = 4 + 2 + 2 + 4;

export const TWAI_EXTENSION = ".twai";
export const TWAI_MIME = "application/vnd.twilic.ai+twai";

function readUint16LE(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32LE(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function asRecord(value: TwilicValue): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("twai: expected object payload");
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return undefined;
}

function asSessionMeta(value: TwilicValue): SessionMeta {
  const record = asRecord(value);
  if (record.format !== "twai") {
    throw new Error("twai: invalid session meta format");
  }
  return {
    format: "twai",
    version: 1,
    sessionId: String(record.sessionId),
    createdAt: asNumber(record.createdAt) ?? Date.now(),
    completedAt: asNumber(record.completedAt),
    provider: typeof record.provider === "string" ? record.provider : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
    eventCount: asNumber(record.eventCount) ?? 0,
    source: typeof record.source === "string" ? record.source : undefined,
  };
}

function asEvent(value: unknown): AIEvent {
  const record = asRecord(value as TwilicValue);
  return {
    type: String(record.type),
    sequence: asNumber(record.sequence) ?? 0,
    timestamp: asNumber(record.timestamp) ?? Date.now(),
    sessionId: String(record.sessionId),
    responseId:
      typeof record.responseId === "string" ? record.responseId : undefined,
    itemId: typeof record.itemId === "string" ? record.itemId : undefined,
    toolCallId:
      typeof record.toolCallId === "string" ? record.toolCallId : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
    provider: typeof record.provider === "string" ? record.provider : undefined,
    outputIndex: asNumber(record.outputIndex),
    contentIndex: asNumber(record.contentIndex),
    data: record.data
      ? (asRecord(record.data as TwilicValue) as Record<string, unknown>)
      : undefined,
    extensions: record.extensions
      ? (asRecord(record.extensions as TwilicValue) as Record<string, unknown>)
      : undefined,
  };
}

function asEvents(value: TwilicValue): AIEvent[] {
  const record = asRecord(value);
  const events = record.events;
  if (!Array.isArray(events)) {
    throw new Error("twai: body must contain events array");
  }
  return events.map((event) => asEvent(event));
}

export function encodeTwai(session: AISession): Uint8Array {
  assertTwilicInitialized();

  const headerBytes = encode(toTwilicValue(session.meta));
  const bodyBytes = encode(
    toTwilicValue({
      events: session.events,
    }),
  );

  const totalLen = HEADER_SIZE + headerBytes.length + 4 + bodyBytes.length;
  const buffer = new Uint8Array(totalLen);
  const view = new DataView(buffer.buffer);

  let offset = 0;
  buffer.set(MAGIC, offset);
  offset += 4;
  view.setUint16(offset, FORMAT_VERSION, true);
  offset += 2;
  view.setUint16(offset, 0, true);
  offset += 2;
  view.setUint32(offset, headerBytes.length, true);
  offset += 4;
  buffer.set(headerBytes, offset);
  offset += headerBytes.length;
  view.setUint32(offset, bodyBytes.length, true);
  offset += 4;
  buffer.set(bodyBytes, offset);

  return buffer;
}

export function decodeTwai(bytes: Uint8Array): AISession {
  assertTwilicInitialized();

  if (bytes.length < HEADER_SIZE + 4) {
    throw new Error("twai: file too small");
  }

  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC[i]) {
      throw new Error("twai: invalid magic bytes");
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = readUint16LE(view, 4);
  if (version !== FORMAT_VERSION) {
    throw new Error(`twai: unsupported version ${version}`);
  }

  const headerLen = readUint32LE(view, 8);
  const headerStart = HEADER_SIZE;
  const headerEnd = headerStart + headerLen;
  if (headerEnd + 4 > bytes.length) {
    throw new Error("twai: truncated header");
  }

  const headerBytes = bytes.subarray(headerStart, headerEnd);
  const bodyLen = readUint32LE(view, headerEnd);
  const bodyStart = headerEnd + 4;
  const bodyEnd = bodyStart + bodyLen;
  if (bodyEnd !== bytes.length) {
    throw new Error("twai: body length mismatch");
  }

  const meta = asSessionMeta(decode(headerBytes));
  const events = asEvents(decode(bytes.subarray(bodyStart, bodyEnd)));

  return { meta, events };
}
