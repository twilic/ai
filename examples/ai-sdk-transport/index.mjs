// Copyright (c) 2026 Twilic (maintained by Minagishl)

import http from "node:http";
import {
  ensureTwilicInit,
  inspectSession,
  sessionFromEvents,
} from "@twilic/ai";
import { TwilicChatTransport } from "@twilic/ai-sdk";

await ensureTwilicInit();

const sseBody = [
  'data: {"type":"text.delta","delta":"Hello "}',
  "",
  'data: {"type":"text.delta","delta":"from AI SDK transport."}',
  "",
  "data: [DONE]",
  "",
].join("\n");

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
    });
    res.end(sseBody);
    return;
  }

  res.writeHead(404).end("not found");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("failed to bind mock chat server");
}
const api = `http://127.0.0.1:${address.port}/api/chat`;

const transport = new TwilicChatTransport({
  api,
  record: true,
});

const result = await transport.sendMessages({
  id: "example-ai-sdk-transport",
  messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] }],
});

const reader = result.stream.getReader();
let bytes = 0;
while (true) {
  const { done, value } = await reader.read();
  if (done) {
    break;
  }
  bytes += value.byteLength;
}

const events = transport.recorder?.events ?? [];
const session = sessionFromEvents(events, {
  sessionId: "example-ai-sdk-transport",
  source: "examples/ai-sdk-transport",
});

console.log("TwilicChatTransport recorded mock SSE chat stream");
console.log("Upstream bytes:", bytes);
console.log("Recorded events:", events.map((event) => event.type).join(", "));
console.log("Summary:", inspectSession(session));

server.close();
