// Copyright (c) 2026 Twilic (maintained by Minagishl)

import { gzipSync, gunzipSync } from "node:zlib";
import { decode } from "@twilic/core";
import { assertTwilicInitialized } from "./init.js";
import type { AISession } from "./types.js";
export type { FormatSizeRow } from "./compare-sizes.js";
export {
  compareSessionSizes,
  encodeSessionTwai,
  encodeSessionTwilic,
  sessionPayload,
} from "./compare-sizes.js";

export function decodeSessionTwilic(bytes: Uint8Array): AISession {
  assertTwilicInitialized();
  const value = decode(bytes) as Record<string, unknown>;
  return {
    meta: value.meta as AISession["meta"],
    events: value.events as AISession["events"],
  };
}

export function gunzipJsonSession(bytes: Uint8Array): AISession {
  const json = gunzipSync(bytes).toString("utf8");
  return JSON.parse(json) as AISession;
}

export function gzipJsonSession(session: AISession): Uint8Array {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(session));
  return gzipSync(jsonBytes);
}
