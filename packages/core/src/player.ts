// Copyright (c) 2026 Twilic (maintained by Minagishl)

import type { AIEvent, AISession, ReplayOptions } from "./types.js";

export interface AIPlayer extends AsyncIterable<AIEvent> {
  replay(options?: ReplayOptions): Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAIPlayer(session: AISession): AIPlayer {
  const events = session.events;

  const player: AIPlayer = {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },

    async replay(options: ReplayOptions = {}): Promise<void> {
      const speed = options.speed && options.speed > 0 ? options.speed : 1;
      let previousTimestamp = events[0]?.timestamp ?? Date.now();

      for (let index = 0; index < events.length; index += 1) {
        const event = events[index]!;
        const delta = Math.max(0, event.timestamp - previousTimestamp);
        if (delta > 0) {
          await sleep(delta / speed);
        }
        previousTimestamp = event.timestamp;
        await options.onEvent?.(event, index);
      }
    },
  };

  return player;
}
