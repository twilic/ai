// Copyright (c) 2026 Twilic (maintained by Minagishl)

import type { AISession, ConvertOptions } from "./types.js";

export function convertSession(
  session: AISession,
  options: ConvertOptions,
): string {
  if (options.to === "json") {
    return JSON.stringify(session, null, 2);
  }

  return session.events.map((event) => JSON.stringify(event)).join("\n");
}

export function parseJsonlEvents(text: string): AISession["events"] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => JSON.parse(line));
}
