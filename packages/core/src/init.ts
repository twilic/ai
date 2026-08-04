// Copyright (c) 2026 Twilic (maintained by Minagishl)

import { init } from "@twilic/core";

let initPromise: Promise<unknown> | null = null;
let initialized = false;

function isBrowserRuntime(): boolean {
  return (
    typeof process === "undefined" || typeof process.versions?.node !== "string"
  );
}

export async function ensureTwilicInit(): Promise<void> {
  if (initialized) {
    return;
  }
  if (!initPromise) {
    initPromise = init(isBrowserRuntime() ? { prefer: "wasm" } : {}).then(
      () => {
        initialized = true;
      },
    );
  }
  await initPromise;
}

export function isTwilicInitialized(): boolean {
  return initialized;
}

export function assertTwilicInitialized(): void {
  if (!initialized) {
    throw new Error(
      "twilic is not initialized; call ensureTwilicInit() before encode/decode",
    );
  }
}
