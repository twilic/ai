import { before, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  decodeTwai,
  encodeTwai,
  ensureTwilicInit,
  sessionFromEvents,
  TWAI_MIME,
} from "@twilic/ai";
import { TwilicChatTransport } from "../dist/index.js";

before(async () => {
  await ensureTwilicInit();
});

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to bind test server");
  }
  return {
    server,
    url: `http://127.0.0.1:${address.port}/api/chat`,
  };
}

async function drainStream(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

test("TwilicChatTransport records SSE text deltas from mock backend", async () => {
  const sseBody = [
    'data: {"type":"text.delta","delta":"Hello "}',
    "",
    'data: {"type":"text.delta","delta":"world"}',
    "",
    "data: [DONE]",
    "",
  ].join("\n");

  const { server, url } = await listen((req, res) => {
    assert.equal(req.method, "POST");
    assert.equal(req.url, "/api/chat");
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
    });
    res.end(sseBody);
  });

  try {
    const transport = new TwilicChatTransport({ api: url, record: true });
    const result = await transport.sendMessages({
      id: "transport-sse",
      messages: [
        { id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] },
      ],
    });

    const bytes = await drainStream(result.stream);
    assert.ok(bytes.byteLength > 0);
    assert.equal(transport.recorder?.events.length, 2);
    assert.deepEqual(
      transport.recorder?.events.map((event) => event.type),
      ["text.delta", "text.delta"],
    );
  } finally {
    server.close();
  }
});

test("TwilicChatTransport decodes and records .twai responses", async () => {
  const session = sessionFromEvents(
    [
      {
        type: "session.start",
        sequence: 0,
        timestamp: 1,
        sessionId: "transport-twai",
      },
      {
        type: "text.delta",
        sequence: 1,
        timestamp: 2,
        sessionId: "transport-twai",
        data: { delta: "from twai" },
      },
      {
        type: "session.end",
        sequence: 2,
        timestamp: 3,
        sessionId: "transport-twai",
      },
    ],
    { sessionId: "transport-twai", source: "transport-test" },
  );
  const twaiBytes = encodeTwai(session);

  const { server, url } = await listen((_req, res) => {
    res.writeHead(200, { "content-type": TWAI_MIME });
    res.end(Buffer.from(twaiBytes));
  });

  try {
    const transport = new TwilicChatTransport({ api: url, record: true });
    const result = await transport.sendMessages({
      id: "transport-twai",
      messages: [{ id: "m1", role: "user", content: "hi" }],
    });

    const bytes = await drainStream(result.stream);
    const decoded = decodeTwai(bytes);
    assert.equal(decoded.events.length, 3);
    assert.equal(transport.recorder?.events.length, 3);
    assert.equal(transport.recorder?.events[1]?.type, "text.delta");
    assert.equal(transport.recorder?.events[1]?.data?.delta, "from twai");
  } finally {
    server.close();
  }
});
