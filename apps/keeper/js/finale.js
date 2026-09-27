// Author: Alex Picon <alexnpc@me.com>
// Arrival screen: a hand-painted-style postcard (stand-in for the AI postcard),
// the three connection numbers, the keeper's tool log, and the story album.

const KEY = "keeper.album";

function loadAlbum() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function saveMemory(memory) {
  if (!memory.answer) return;
  try {
    const a = loadAlbum();
    a.unshift({ date: new Date().toLocaleDateString(), en: memory.answer, es: memory.answer, teller: "Rosa, 74" });
    localStorage.setItem(KEY, JSON.stringify(a.slice(0, 12)));
  } catch {}
}

function paintPostcard(cv, memory) {
  // Draw in a fixed 440x270 logical space but back the canvas at devicePixel
  // resolution so the postcard stays crisp when CSS scales it down to fit a
  // narrow phone viewport (the finale is on the "open Grandma's phone" path).
  const W = 440, H = 270;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr;
  cv.height = H * dpr;
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1b2b52");
  sky.addColorStop(0.55, "#39406f");
  sky.addColorStop(1, "#0e1730");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#ffe9b0";
  g.beginPath();
  g.arc(W - 70, 60, 26, 0, 7);
  g.fill();
  for (let i = 0; i < 60; i++) {
    g.globalAlpha = Math.random() * 0.7;
    g.fillRect(Math.random() * W, Math.random() * H * 0.5, 1.5, 1.5);
  }
  g.globalAlpha = 1;
  // water
  g.fillStyle = "#12233f";
  g.fillRect(0, H * 0.62, W, H * 0.38);
  g.strokeStyle = "rgba(255,233,176,0.5)";
  for (let y = H * 0.66; y < H; y += 7) {
    g.beginPath();
    g.moveTo(W - 90, y);
    g.lineTo(W - 50, y);
    g.stroke();
  }
  // lighthouse
  g.fillStyle = "#0b1120";
  g.beginPath();
  g.moveTo(70, H * 0.62);
  g.lineTo(84, 70);
  g.lineTo(104, 70);
  g.lineTo(118, H * 0.62);
  g.fill();
  g.fillStyle = "#ffe08a";
  g.beginPath();
  g.arc(94, 66, 7, 0, 7);
  g.fill();
  // beam
  const beam = g.createLinearGradient(94, 66, W, 30);
  beam.addColorStop(0, "rgba(255,224,138,0.55)");
  beam.addColorStop(1, "rgba(255,224,138,0)");
  g.fillStyle = beam;
  g.beginPath();
  g.moveTo(94, 66);
  g.lineTo(W, 6);
  g.lineTo(W, 96);
  g.fill();
  // boat
  g.fillStyle = "#e9edf6";
  g.beginPath();
  g.moveTo(250, H * 0.7);
  g.lineTo(286, H * 0.7);
  g.lineTo(278, H * 0.75);
  g.lineTo(258, H * 0.75);
  g.fill();
  g.fillStyle = "#ffd27a";
  g.fillRect(266, H * 0.66, 3, 12);
  // text
  g.fillStyle = "#fff7e6";
  g.font = "700 20px Inter, sans-serif";
  g.fillText("Home before the fog lifted.", 22, 40);
  g.font = "italic 12px Inter, sans-serif";
  g.fillStyle = "#d9e2f5";
  const line = (memory.answer || "Two bells, one for storms.").slice(0, 52);
  g.fillText(`“${line}”`, 22, H - 20);
}

// Ask the server for the earlier memory most like this voyage's answer, so the
// keeper can "pick up where she left off". Real similarity math on the server,
// with a silent skip if the API is down.
async function recall(answer, memories, el) {
  if (!answer || !memories.length) return;
  try {
    const res = await fetch("/api/keeper/recall", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer, memories }),
      signal: AbortSignal.timeout(1500),
    });
    const data = await res.json();
    if (data.match) {
      el.innerHTML = `<b>Next call, the keeper opens with:</b> “Last time you told her about ${data.match.replace(/\.$/, "")}.” <small>matched by local semantic recall · similarity ${data.score}</small>`;
      el.style.display = "block";
    }
  } catch {
    /* recall is a nicety; the album still renders without it */
  }
}

function openAlbum(content, memory) {
  const stored = loadAlbum();
  const stories = [...stored, ...content.album];
  const wrap = document.createElement("div");
  wrap.className = "overlay";
  wrap.style.zIndex = 60;
  wrap.innerHTML = `<div class="panel finale"><span class="chip">Family story album · local semantic recall · Atlas Vector Search in the full build</span>
    <h2>Their <span>album</span></h2>
    <p>One memory saved each voyage. Next call, the keeper can pick up where she left off.</p>
    <div class="recall" id="recallLine" style="display:none"></div>
    <div class="log" style="max-height:240px">${stories
      .map((s) => `<div><b>${s.teller} · ${s.date}</b><br><span class="q">${s.en}</span><br><small style="color:#7fd6ff">“${s.es}”</small></div>`)
      .join("")}</div>
    <div class="cta"><button class="btn" id="closeAlbum">Close</button></div></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector("#closeAlbum").onclick = () => wrap.remove();
  const others = stories.map((s) => s.en).filter((t) => t && t !== memory.answer);
  recall(memory.answer, others, wrap.querySelector("#recallLine"));
}

export function showFinale(content, state) {
  saveMemory(state.memory);
  const el = document.getElementById("finale");
  document.getElementById("intro").style.display = "none";
  el.style.display = "flex";
  paintPostcard(document.getElementById("postcard"), state.memory);

  const secs = Math.max(1, Math.round(((state.stats.endedAt || Date.now()) - state.stats.startedAt) / 1000));
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const turns = state.stats.turns;
  const stories = Math.max(1, loadAlbum().length);
  document.getElementById("nums").innerHTML = `
    <div class="num"><b>${turns}</b><span>${turns === 1 ? "turn" : "turns"} exchanged</span></div>
    <div class="num"><b>${clock}</b><span>minutes talked</span></div>
    <div class="num"><b>${stories}</b><span>${stories === 1 ? "story" : "stories"} saved</span></div>`;

  const acts = state.log.filter((l) => l.actor === "keeper");
  document.getElementById("log").innerHTML = acts
    .slice(-8)
    .map((l) => `<div><b>${l.action}</b> — <span class="q">“${l.quote}”</span></div>`)
    .join("") || "<div>No keeper moves logged.</div>";

  document.getElementById("albumBtn").onclick = () => openAlbum(content, state.memory);
}
