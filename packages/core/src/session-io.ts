// Copyright (c) 2026 Twilic (maintained by Minagishl)

import { readFile, writeFile } from "node:fs/promises";
import { ensureTwilicInit } from "./init.js";
import { decodeTwai, encodeTwai } from "./twai.js";
import type { AISession } from "./types.js";

export async function readSession(
  input: string | Uint8Array,
): Promise<AISession> {
  await ensureTwilicInit();
  const bytes =
    typeof input === "string" ? await readFile(input) : Uint8Array.from(input);
  return decodeTwai(bytes);
}

export async function writeSession(
  path: string,
  session: AISession,
): Promise<void> {
  await ensureTwilicInit();
  const bytes = encodeTwai(session);
  await writeFile(path, bytes);
}
