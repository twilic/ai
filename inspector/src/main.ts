import "./style.css";
import {
  compareSessionSizes,
  convertSession,
  createAIPlayer,
  decodeTwai,
  ensureTwilicInit,
  inspectSession,
  parseJsonlEvents,
  sessionFromEvents,
} from "@twilic/ai/browser";

const dropzone = document.querySelector<HTMLElement>("#dropzone")!;
const timeline = document.querySelector<HTMLElement>("#timeline")!;
const detail = document.querySelector<HTMLElement>("#detail")!;
const summary = document.querySelector<HTMLElement>("#summary")!;
const sizes = document.querySelector<HTMLElement>("#sizes")!;
const replayBtn = document.querySelector<HTMLButtonElement>("#replay")!;
const speedInput = document.querySelector<HTMLInputElement>("#speed")!;
const fileInput = document.querySelector<HTMLInputElement>("#file")!;

let currentSession: ReturnType<typeof sessionFromEvents> | null = null;

function renderSummary(session: NonNullable<typeof currentSession>) {
  const info = inspectSession(session);
  summary.innerHTML = `
    <dl>
      <dt>Session</dt><dd>${info.sessionId}</dd>
      <dt>Events</dt><dd>${info.eventCount}</dd>
      <dt>Duration</dt><dd>${info.durationMs} ms</dd>
      <dt>Models</dt><dd>${info.models.join(", ") || "—"}</dd>
      <dt>Tools</dt><dd>${info.tools.join(", ") || "—"}</dd>
    </dl>
  `;

  const rows = compareSessionSizes(session);
  sizes.innerHTML = `<table><thead><tr><th>Format</th><th>Bytes</th></tr></thead><tbody>${rows
    .map((row) => `<tr><td>${row.format}</td><td>${row.bytes}</td></tr>`)
    .join("")}</tbody></table>`;
}

function renderTimeline(session: NonNullable<typeof currentSession>) {
  timeline.innerHTML = "";
  for (const event of session.events) {
    const item = document.createElement("button");
    item.className = "event";
    item.type = "button";
    item.innerHTML = `<span class="type">${event.type}</span><span class="seq">#${event.sequence}</span>`;
    item.addEventListener("click", () => {
      detail.textContent = JSON.stringify(event, null, 2);
    });
    timeline.appendChild(item);
  }
}

async function loadBytes(name: string, bytes: Uint8Array) {
  await ensureTwilicInit();
  if (name.endsWith(".twai")) {
    currentSession = decodeTwai(bytes);
  } else {
    const text = new TextDecoder().decode(bytes);
    const events = parseJsonlEvents(text);
    currentSession = sessionFromEvents(events, {
      sessionId: name.replace(/\.[^.]+$/, ""),
    });
  }
  renderSummary(currentSession);
  renderTimeline(currentSession);
  detail.textContent = convertSession(currentSession, { to: "json" });
}

async function loadFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  await loadBytes(file.name, bytes);
}

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("active");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("active");
});

dropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropzone.classList.remove("active");
  const file = event.dataTransfer?.files.item(0);
  if (file) {
    await loadFile(file);
  }
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.item(0);
  if (file) {
    await loadFile(file);
  }
});

replayBtn.addEventListener("click", async () => {
  if (!currentSession) {
    return;
  }
  const speed = Number(speedInput.value) || 1;
  const player = createAIPlayer(currentSession);
  timeline
    .querySelectorAll(".event")
    .forEach((node) => node.classList.remove("playing"));
  await player.replay({
    speed,
    onEvent: (event) => {
      const node = timeline.querySelector(
        `.event:nth-child(${event.sequence + 1})`,
      );
      node?.classList.add("playing");
      detail.textContent = JSON.stringify(event, null, 2);
    },
  });
});

// Expose for optional programmatic loading in devtools.
declare global {
  interface Window {
    loadTwaiBytes: (bytes: Uint8Array) => Promise<void>;
  }
}

window.loadTwaiBytes = async (bytes: Uint8Array) => {
  await loadBytes("session.twai", bytes);
};
