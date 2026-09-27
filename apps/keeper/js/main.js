// Author: Alex Picon <alexnpc@me.com>
// Role routing, the hero, the render loop and the hand-offs to the atlas, the
// demo and the finale. Default view is the split demo (world + phone); a
// popped-out ?role=keeper page is just the phone, paired by a buoy code over
// BroadcastChannel and the WebSocket relay.

import { announce, dispatch, initBus, sendSnapshot, state, subscribe } from "./bus.js";
import { makeCode } from "./net.js";
import { initCaptain } from "./captain.js";
import { initKeeper } from "./keeper.js";
import { initAtlas } from "./atlas.js";
import { showFinale } from "./finale.js";
import { autopilot, step } from "./sim.js";
import { runDemo } from "./demo.js";

const params = new URLSearchParams(location.search);
const role = params.get("role") || "both";
const authoritative = role !== "keeper";
const code = (params.get("code") || makeCode()).toUpperCase().slice(0, 6);

async function loadContent() {
  try {
    return await (await fetch("data/content.json")).json();
  } catch {
    return { headline: {}, stats: [], memoryPrompts: ["Abuela tells one memory:"], album: [], phrases: [], radio: [] };
  }
}

function fillHero(content) {
  const h = content.headline || {};
  document.getElementById("headline").innerHTML = h.big
    ? `<b>${h.big}</b><span>${h.unit}</span><a href="${h.url}" target="_blank" title="${h.source}">${h.source} ↗</a>`
    : "";
  document.getElementById("statrow").innerHTML = content.stats
    .map((s) => `<div class="statcard"><b>${s.value}</b><span>${s.label}. ${s.note}</span><a href="${s.url}" target="_blank" title="${s.source}">${s.source} ↗</a></div>`)
    .join("");
  const prompts = content.memoryPrompts;
  document.getElementById("memPrompt").textContent = prompts[(Math.random() * prompts.length) | 0];
  document.getElementById("pairbox").innerHTML =
    `<div class="pair"><div class="code">Buoy code <b>${code}</b></div>
     <button class="linkbtn" id="phoneBtn">Open Grandma's phone →</button>
     <span class="pairhint">or open that link on any phone to dial in</span></div>`;
  document.getElementById("phoneBtn").onclick = () =>
    window.open(`?role=keeper&code=${code}`, "_blank");
}

// Wire the 'Enter VR' button. WebXR needs a secure context, so on plain HTTP
// the button is honest about the fallback (a desktop 3D view) instead of the
// deck admitting there is no headset path at all.
async function setupVR(scene) {
  const btn = document.getElementById("vrBtn");
  const note = document.getElementById("vrNote");
  if (!btn) return;
  btn.hidden = false;
  const supported = scene && (await scene.constructor.vrSupported());
  if (supported) {
    btn.innerHTML = "Enter VR <small>headset ready</small>";
    btn.onclick = async () => {
      try {
        await scene.enterVR();
      } catch (e) {
        note.hidden = false;
        note.innerHTML = `Couldn't start the headset session (${e.message}). <b>Tap Cast off</b> for the desktop 3D view.`;
      }
    };
  } else {
    btn.classList.add("disabled");
    btn.innerHTML = "Enter VR <small>needs HTTPS</small>";
    btn.onclick = () => {
      note.hidden = false;
      note.innerHTML = "A headset session needs a secure origin — the full build runs on <b>callthelighthouse.tech</b> over HTTPS. This plain-HTTP demo can't open WebXR, so it runs as a <b>desktop 3D view</b>. Tap <b>Cast off ⚓</b> to steer it.";
    };
  }
}

function pairStatus(s) {
  const chip = document.getElementById("pairChip");
  if (!chip) return;
  const map = { waiting: "◌ waiting for the phone", paired: "● phone paired", offline: "○ relay offline (local sync on)" };
  chip.hidden = false;
  chip.textContent = `${code} · ${map[s] || ""}`;
  chip.dataset.state = s;
}

async function main() {
  initBus({ isAuthoritative: authoritative, room: code, role, onStatus: pairStatus });
  const content = await loadContent();
  const app = document.getElementById("app");

  if (role === "keeper") {
    app.className = "phoneonly";
    document.getElementById("stage").style.display = "none";
    const keeper = initKeeper(content, document.getElementById("keeperPane"), code);
    subscribe((s) => keeper.render(s));
    announce();
    setInterval(announce, 3000);
    return;
  }

  if (role === "captain") app.className = "solo";
  const captain = initCaptain(content, () => cancelDemo());
  if (role !== "captain") {
    const keeper = initKeeper(content, document.getElementById("keeperPane"), code);
    subscribe((s) => keeper.render(s));
  }
  fillHero(content);

  const atlas = initAtlas(document.getElementById("atlas"));
  document.getElementById("mapBtn").onclick = atlas.open;
  document.getElementById("mapBtn2").onclick = atlas.open;

  let scene = null;
  try {
    const { Scene } = await import("./scene.js");
    scene = new Scene(document.getElementById("scene"));
    window.__keeperQuality = scene.quality;
  } catch (e) {
    console.warn("3D unavailable", e);
    document.getElementById("stage").insertAdjacentHTML("beforeend",
      `<div class="noscene"></div>`);
  }
  setupVR(scene);

  let auto = false;
  let stopDemo = null;
  const setAuto = (v) => {
    auto = v;
    document.getElementById("topbar").classList.toggle("demoing", v);
  };
  function cancelDemo() {
    if (stopDemo) { stopDemo(); stopDemo = null; }
  }
  function startVoyage() {
    dispatch({ type: "memory", question: document.getElementById("memPrompt").textContent, answer: document.getElementById("memAnswer").value.trim() });
    dispatch({ type: "start" });
    document.getElementById("intro").style.display = "none";
    document.getElementById("stage").classList.add("playing");
    try { new AudioContext().resume(); } catch {}
  }

  document.getElementById("startBtn").onclick = startVoyage;
  document.getElementById("demoBtn").onclick = () => {
    document.getElementById("intro").style.display = "none";
    document.getElementById("stage").classList.add("playing");
    atlas.close();
    stopDemo = runDemo(content, setAuto);
  };
  document.getElementById("againBtn").onclick = () => {
    cancelDemo();
    dispatch({ type: "reset" });
    dispatch({ type: "start" });
    document.getElementById("finale").style.display = "none";
  };
  if (params.get("demo") === "1") {
    requestAnimationFrame(() => document.getElementById("demoBtn").click());
  } else if (location.hash === "#play") {
    requestAnimationFrame(startVoyage);
  }

  let last = performance.now();
  let snapAt = 0;
  let arrived = false;
  let acc = 0;
  let frozen = false;
  const STEP = 0.02;
  const fps = [];
  // Capture hook: hold the current frame so a headless snapshot of the live 3D
  // canvas is instant (no ongoing GPU work to contend with). Debug-only.
  window.__keeperFreeze = () => { frozen = true; };
  function frame(now) {
    if (frozen) { requestAnimationFrame(frame); return; }
    const raw = now - last;
    last = now;
    if (scene && !scene.lite && fps.length < 12) {
      fps.push(raw);
      if (fps.length === 12 && [...fps].sort((a, b) => a - b)[6] > 55) {
        scene._degrade(); // median frame slower than ~18fps → software GL
      }
    }
    if (state.phase === "voyage") {
      // Fixed-timestep physics: the cheap sim advances at wall-clock speed even
      // when a slow GPU drags the frame rate down, so the voyage never crawls.
      acc += Math.min(0.5, raw / 1000);
      let r = null;
      let bumped = false;
      while (acc >= STEP) {
        r = step(state, auto ? autopilot(state) : captain.input, STEP);
        bumped = bumped || r.bump;
        acc -= STEP;
        if (r.arrived) { acc = 0; break; }
      }
      if (r) {
        captain.render(state, r.progress);
        if (bumped) captain.toast("⚠️ Rock! Ease off and turn.");
        if (r.arrived && !arrived) {
          arrived = true;
          cancelDemo();
          dispatch({ type: "arrive" });
          showFinale(content, state);
        }
      }
    } else {
      captain.render(state, null);
      if (state.phase === "intro") { arrived = false; acc = 0; }
    }
    if (scene) scene.sync(state, now / 1000);
    if (authoritative && now - snapAt > 110) { snapAt = now; sendSnapshot(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
