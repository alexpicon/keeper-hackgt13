// Author: Alex Picon <alexnpc@me.com>
// Keeper pitch deck: keyboard + click navigation, fullscreen, speaker notes,
// a live iframe of the app and an inline SVG architecture diagram.

(function () {
  "use strict";
  const slides = Array.from(document.querySelectorAll(".slide"));
  const cur = document.getElementById("cur");
  const tot = document.getElementById("tot");
  let i = 0;
  tot.textContent = slides.length;

  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, k) => s.classList.toggle("active", k === i));
    cur.textContent = i + 1;
    location.hash = `s${i + 1}`;
  }
  const next = () => show(i + 1);
  const prev = () => show(i - 1);

  addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
    else if (e.key === "Home") show(0);
    else if (e.key === "End") show(slides.length - 1);
    else if (e.key.toLowerCase() === "f") toggleFull();
    else if (e.key.toLowerCase() === "n") document.body.classList.toggle("shownotes");
  });

  addEventListener("click", (e) => {
    if (e.target.closest("a, iframe, button, .notes, .allapps")) return;
    const x = e.clientX / innerWidth;
    if (x < 0.32) prev();
    else next();
  });

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }

  // live demo wiring — use the viewing host so it works on localhost or a public IP
  const base = `http://${location.hostname}:8888/keeper/`;
  const frame = document.getElementById("demoFrame");
  if (frame) frame.src = base;
  const dl = document.getElementById("demoLink");
  if (dl) dl.href = base;
  const pl = document.getElementById("phoneLink");
  if (pl) pl.href = base + "?role=keeper";

  // architecture diagram
  const arch = document.getElementById("arch");
  if (arch) arch.innerHTML = diagram();

  const start = parseInt((location.hash.match(/^#s(\d+)$/) || [])[1], 10);
  show(Number.isFinite(start) ? start - 1 : 0);

  function box(x, y, w, h, title, sub, accent) {
    return `<rect x="${x}" y="${y}" rx="12" width="${w}" height="${h}" fill="#101a30" stroke="${accent}" stroke-width="1.5"/>
      <text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" fill="#eaf0ff" font-size="17" font-weight="700">${title}</text>
      ${sub.map((s, k) => `<text x="${x + w / 2}" y="${y + 48 + k * 19}" text-anchor="middle" fill="#93a2ca" font-size="13">${s}</text>`).join("")}`;
  }
  function arrow(x1, y1, x2, y2, label) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffd27a" stroke-width="2" marker-end="url(#ah)"/>
      ${label ? `<text x="${(x1 + x2) / 2}" y="${y1 - 9}" text-anchor="middle" fill="#8fa2cf" font-size="12">${label}</text>` : ""}`;
  }
  function diagram() {
    return `<svg viewBox="0 0 1000 400" role="img" aria-label="Keeper architecture">
      <defs><marker id="ah" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L9,3 L0,6 Z" fill="#ffd27a"/></marker></defs>
      <rect x="18" y="70" width="964" height="150" rx="16" fill="none" stroke="rgba(150,170,220,.22)" stroke-dasharray="6 6"/>
      <text x="34" y="95" fill="#8fa2cf" font-size="13" font-weight="600">FULL BUILD · phone → realtime voice → WebXR</text>
      ${box(30, 110, 190, 92, "Any phone", ["dials one number", "flip phone, no app"], "#57e6a5")}
      ${box(280, 110, 200, 92, "FastAPI bridge", ["Twilio Media Streams", "μ-law audio, both ways"], "#ffd27a")}
      ${box(540, 110, 210, 92, "Realtime voice + tools", ["rotate_beam · foghorn", "say_to_captain"], "#ffd27a")}
      ${box(800, 110, 172, 92, "WebXR harbor", ["Quest / desktop 3D", "beam · fog · captions"], "#57e6a5")}
      ${arrow(220, 156, 278, 156, "dials")}
      ${arrow(480, 156, 538, 156, "audio")}
      ${arrow(750, 156, 798, 156, "tool calls")}
      ${box(540, 250, 210, 74, "Scene state (server)", ["pushes salient events only"], "#8fa2cf")}
      ${arrow(645, 250, 645, 204, "")}
      ${box(30, 250, 190, 74, "Vector memory", ["a saved story per voyage"], "#8fa2cf")}
      ${box(800, 250, 172, 74, "Postcard", ["painted at journey's end"], "#8fa2cf")}
      <line x1="220" y1="287" x2="538" y2="287" stroke="#3a496e" stroke-width="1.5" stroke-dasharray="4 4"/>
      <line x1="886" y1="250" x2="886" y2="204" stroke="#3a496e" stroke-width="1.5" stroke-dasharray="4 4"/>
      <text x="500" y="372" text-anchor="middle" fill="#93a2ca" font-size="14">This browser demo replaces the dashed box with a keypad + speech synthesis — two devices pair with a buoy code over BroadcastChannel + a same-origin WebSocket relay.</text>
    </svg>`;
  }
})();
