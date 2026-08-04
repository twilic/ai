import type { AISession } from "./types.js";

export function sessionFromEvents(
  events: AISession["events"],
  meta: Partial<AISession["meta"]> & Pick<AISession["meta"], "sessionId">,
): AISession {
  const createdAt = meta.createdAt ?? events[0]?.timestamp ?? Date.now();
  const completedAt = meta.completedAt ?? events.at(-1)?.timestamp ?? undefined;

  return {
    meta: {
      format: "twai",
      version: 1,
      sessionId: meta.sessionId,
      createdAt,
      completedAt,
      provider: meta.provider ?? events.find((e) => e.provider)?.provider,
      model: meta.model ?? events.find((e) => e.model)?.model,
      eventCount: events.length,
      source: meta.source,
    },
    events,
  };
}
