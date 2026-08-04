import {
  createAIRecorder,
  ensureTwilicInit,
  readSession,
  TWAI_MIME,
  type AIRecorder,
  type AIRecorderOptions,
} from "@twilic/ai";

export type AISDKRecorder = AIRecorder;

export function createAISDKRecorder(
  options: AIRecorderOptions = {},
): AIRecorder {
  return createAIRecorder({
    ...options,
    meta: {
      source: "ai-sdk",
      ...options.meta,
    },
  });
}

export { ensureTwilicInit, readSession, TWAI_MIME, type AIRecorderOptions };
