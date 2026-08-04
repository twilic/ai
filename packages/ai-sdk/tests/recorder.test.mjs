import { before, test } from "node:test";
import assert from "node:assert/strict";
import { ensureTwilicInit } from "@twilic/ai";
import { createAISDKRecorder } from "../dist/index.js";

before(async () => {
  await ensureTwilicInit();
});

test("createAISDKRecorder tags source as ai-sdk", async () => {
  const recorder = createAISDKRecorder({ sessionId: "sdk-1" });
  recorder.append({
    type: "custom",
    sequence: 0,
    timestamp: Date.now(),
    sessionId: "sdk-1",
    data: { ok: true },
  });

  const bytes = await recorder.close();
  assert.ok(bytes.byteLength > 0);
});
