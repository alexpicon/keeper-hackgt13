// Author: Alex Picon <alexnpc@me.com>
// Grandma's flip phone. She dials in, sees only what her beam lights, and works
// the keypad: 4/6 sweep the light, 8 sounds the horn, and spoken phrases become
// beam moves. The words-to-beam routing is a local fallback for the live server
// tool call; the tower speaks with a real ElevenLabs voice (browser fallback).

import { dispatch } from "./bus.js";
import { clank, foghorn, tick as spatialTick, voiceCue } from "./spatial.js";
import { KEEPER_VOICE, preloadSpeech, speak, ttsAvailable } from "./voice.js";

let audioCtx = null;
function tone(freq, dur, type = "sine", gain = 0.18) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  } catch {}
}

// Speak from the tower: a real generated voice, placed in space — a presence-cue
// rides the HRTF panner so her line arrives from the lighthouse behind the boat.
function sayFromTower(text, lang = "es-MX") {
  voiceCue();
  speak(text, lang);
}

function runPhrase(p) {
  clank();
  if (p.act === "beamLeft") dispatch({ type: "beam", delta: -0.22, quote: p.en });
  else if (p.act === "beamRight") dispatch({ type: "beam", delta: 0.22, quote: p.en });
  else if (p.act === "foghorn") { foghorn(); dispatch({ type: "foghorn", quote: p.en }); }
  else dispatch({ type: "say", en: p.en, es: p.es });
  sayFromTower(p.es, "es-MX");
}

// The server routes an utterance to a beam/foghorn/say function call; this is
// the local fallback used if the API is unreachable, so the phone still works.
function localCall(text) {
  const t = text.toLowerCase();
  if (/(left|izquierd|babor)/.test(t)) return { action: "beamLeft", delta: -0.22 };
  if (/(right|derech|estribor)/.test(t)) return { action: "beamRight", delta: 0.22 };
  if (/(horn|bocina|foghorn|niebla)/.test(t)) return { action: "foghorn" };
  return { action: "say" };
}

function applyCall(call, text) {
  speak(text, "es-MX");
  if (call.action === "beamLeft") dispatch({ type: "beam", delta: call.delta ?? -0.22, quote: text });
  else if (call.action === "beamRight") dispatch({ type: "beam", delta: call.delta ?? 0.22, quote: text });
  else if (call.action === "foghorn") { foghorn(); dispatch({ type: "foghorn", quote: text }); }
  else dispatch({ type: "say", en: text, es: text });
}

async function interpret(text) {
  let call;
  try {
    const res = await fetch("/api/keeper/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, lang: "es-MX" }),
      signal: AbortSignal.timeout(1500),
    });
    call = res.ok ? await res.json() : localCall(text);
  } catch {
    call = localCall(text);
  }
  applyCall(call, text);
}

export function initKeeper(content, pane, code = "") {
  const byKey = {};
  content.phrases.forEach((p) => (byKey[p.key] = p));
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

  pane.innerHTML = `
    <div class="phone">
      <div class="brandline">◊ KEEPER · CALL ACTIVE ◊</div>
      <div class="screen">
        <div class="callrow"><span>📶📶📶</span><span id="kTimer">00:00</span></div>
        <div class="lit" id="kLit">Dial in to light the tower…</div>
        <div class="radio" id="kRadio"></div>
      </div>
      <div class="keypad" id="keypad"></div>
      <div class="say"><input id="kSay" placeholder="Say something to Sofia…" /><button id="kSayBtn">Say</button></div>
    </div>
    <p class="keeper-hint">You are the keeper. You can only see what your beam lights. <b>4</b>/<b>6</b> sweep it, <b>8</b> the horn. Typed words route to a real beam move on the server <span class="chip">live tool call</span>; the tower's voice is <span class="chip" id="voiceChip">generated</span>.<br />On a phone? <a id="popKeeper" href="?role=keeper&code=${code}" target="_blank">open this as Grandma's phone →</a></p>`;

  // Warm the ElevenLabs cache for the keypad phrases, and label the voice
  // honestly: a real generated voice when the proxy is live, else the browser's.
  preloadSpeech(content.phrases.map((p) => p.es), KEEPER_VOICE);
  const voiceChip = pane.querySelector("#voiceChip");
  ttsAvailable().then((live) => {
    if (voiceChip) {
      voiceChip.textContent = live ? "ElevenLabs voice" : "browser voice (fallback)";
    }
  });

  const pad = pane.querySelector("#keypad");
  digits.forEach((d) => {
    const p = byKey[d];
    const key = document.createElement("div");
    key.className = "key" + (p ? " act" : "");
    key.innerHTML = `<b>${d}</b><span>${p ? p.en : "&nbsp;"}</span>`;
    key.onclick = () => { tone(Number.isNaN(+d) ? 700 : 520 + +d * 40, 0.08, "square", 0.08); if (p) runPhrase(p); };
    pad.appendChild(key);
  });

  const say = pane.querySelector("#kSay");
  const send = () => { if (say.value.trim()) { interpret(say.value.trim()); say.value = ""; } };
  pane.querySelector("#kSayBtn").onclick = send;
  say.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });

  const timer = pane.querySelector("#kTimer");
  const lit = pane.querySelector("#kLit");
  const radio = pane.querySelector("#kRadio");
  let lastRadio = 0;

  function render(state) {
    if (state.phase === "voyage" && state.stats.startedAt) {
      const s = Math.floor((Date.now() - state.stats.startedAt) / 1000);
      timer.textContent = `${String((s / 60) | 0).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }
    lit.className = "lit" + (state.lit.kind ? " " + state.lit.kind : "");
    lit.innerHTML = state.phase === "intro"
      ? "Dial in to light the tower…"
      : `${state.lit.en}<br><span style="font-size:12px;color:#6fbf87">“${state.lit.es}”</span>`;
    if (state.radio && state.radio.at !== lastRadio) {
      lastRadio = state.radio.at;
      radio.textContent = `📻 Sofia: “${state.radio.en}”`;
    }
  }

  return { render, foghorn };
}
