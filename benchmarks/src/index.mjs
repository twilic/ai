// Copyright (c) 2026 Twilic (maintained by Minagishl)

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import {
  decode as decodeMsgpack,
  encode as encodeMsgpack,
} from "@msgpack/msgpack";
import { decode as decodeCbor, encode as encodeCbor } from "cbor-x";
import Table from "cli-table3";
import { Bench } from "tinybench";
import {
  ensureTwilicInit,
  parseJsonlEvents,
  sessionFromEvents,
} from "@twilic/ai";
import { compareSessionSizes, decodeTwai, encodeTwai } from "@twilic/ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../fixtures/chat-long.jsonl");

await ensureTwilicInit();

const jsonl = readFileSync(fixturePath, "utf8");
const events = parseJsonlEvents(jsonl);
const session = sessionFromEvents(events, { sessionId: "bench-chat-long" });
const payload = { meta: session.meta, events: session.events };
const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
const msgpackBytes = encodeMsgpack(payload);
const cborBytes = encodeCbor(payload);
const twaiBytes = encodeTwai(session);

const sizeRows = compareSessionSizes(session, [
  { format: "msgpack", bytes: msgpackBytes.byteLength },
  { format: "cbor", bytes: cborBytes.byteLength },
]);

const sizeTable = new Table({
  head: ["format", "bytes", "vs twai"],
  style: { head: [], border: [] },
});

for (const row of sizeRows) {
  const twaiSize = twaiBytes.byteLength;
  const vsTwai =
    row.format === "twai"
      ? "—"
      : `${((1 - twaiSize / row.bytes) * 100).toFixed(2)}%`;
  sizeTable.push([row.format, row.bytes, vsTwai]);
}

const bench = new Bench({ time: 500, warmupTime: 100 });

bench
  .add("twai encode", () => encodeTwai(session))
  .add("twai decode", () => decodeTwai(twaiBytes))
  .add("json stringify", () => JSON.stringify(payload))
  .add("json parse", () => JSON.parse(new TextDecoder().decode(jsonBytes)))
  .add("msgpack encode", () => encodeMsgpack(payload))
  .add("msgpack decode", () => decodeMsgpack(msgpackBytes))
  .add("cbor encode", () => encodeCbor(payload))
  .add("cbor decode", () => decodeCbor(cborBytes))
  .add("json+gzip encode", () => gzipSync(jsonBytes));

await bench.run();

const fastestHz = bench.tasks.reduce(
  (max, task) => Math.max(max, task.result?.hz ?? 0),
  0,
);

const resultTable = new Table({
  head: ["task", "ops/s", "ns/op", "relative"],
  style: { head: [], border: [] },
});

for (const task of [...bench.tasks].sort(
  (a, b) => (b.result?.hz ?? 0) - (a.result?.hz ?? 0),
)) {
  const hz = task.result?.hz ?? 0;
  resultTable.push([
    task.name,
    Math.round(hz).toLocaleString(),
    hz > 0 ? Math.round(1e9 / hz).toLocaleString() : "n/a",
    fastestHz > 0 ? `${(hz / fastestHz).toFixed(2)}x` : "n/a",
  ]);
}

console.log("@twilic/ai-benchmarks");
console.log(`fixture: ${path.basename(fixturePath)} (${events.length} events)`);
console.log("");
console.log("encoded size comparison");
console.log(sizeTable.toString());
console.log("");
console.log("throughput");
console.log(resultTable.toString());
