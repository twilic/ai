import type { AISession, ConvertOptions } from "./types.js";

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return value;
}

export function convertSession(
  session: AISession,
  options: ConvertOptions,
): string {
  if (options.to === "json") {
    return JSON.stringify(session, jsonReplacer, 2);
  }

  return session.events
    .map((event) => JSON.stringify(event, jsonReplacer))
    .join("\n");
}

export function parseJsonlEvents(text: string): AISession["events"] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => JSON.parse(line));
}
