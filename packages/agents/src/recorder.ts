// Copyright (c) 2026 Twilic (maintained by Minagishl)

import {
  createAIRecorder,
  type AIRecorder,
  type AIRecorderOptions,
} from "@twilic/ai";
import {
  TwilicTracingProcessor,
  type TwilicTracingProcessorOptions,
} from "./processor.js";

export interface AgentsRecorder extends AIRecorder {
  processor: TwilicTracingProcessor;
}

export function createAgentsRecorder(
  options: AIRecorderOptions & {
    processor?: Partial<TwilicTracingProcessorOptions>;
  } = {},
): AgentsRecorder {
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const base = createAIRecorder({
    ...options,
    sessionId,
    meta: {
      source: "agents",
      ...options.meta,
    },
  });

  const processor = new TwilicTracingProcessor({
    sessionId,
    provider: options.processor?.provider,
    model: options.processor?.model,
    onEvent: (event) => {
      base.append(event);
      options.processor?.onEvent?.(event);
    },
  });

  return Object.assign(base, { processor });
}
