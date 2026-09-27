// Author: Alex Picon <alexnpc@me.com>
// The captain's controls and heads-up display: steering, the push-to-talk
// ship's radio, floating bilingual captions, compass needle and progress bar.

import { dispatch } from "./bus.js";
import { SOFIA_VOICE, preloadSpeech, speak } from "./voice.js";

export function initCaptain(content, onManual = () => {}) {
  const input = { turn: 0, throttle: 0 };
  const held = { left: false, right: false, up: false };

  function apply() {
    input.turn = (held.left ? -1 : 0) + (held.right ? 1 : 0);
    input.throttle = held.up ? 1 : 0;
  }

  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.key === "ArrowLeft" || e.key === "a") held.left = true;
    else if (e.key === "ArrowRight" || e.key === "d") held.right = true;
    else if (e.key === "ArrowUp" || e.key === "w") held.up = true;
    else return;
    onManual();
    apply();
  });
  addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") held.left = false;
    else if (e.key === "ArrowRight" || e.key === "d") held.right = false;
    else if (e.key === "ArrowUp" || e.key === "w") held.up = false;
    else return;
    apply();
  });

  const controls = document.getElementById("controls");
  const press = (el, on) => {
    const set = (v) => {
      const t = el.dataset.turn, th = el.dataset.throttle;
      if (t) held[t === "-1" ? "left" : "right"] = v;
      if (th) held.up = v;
      apply();
    };
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); onManual(); set(true); });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) el.addEventListener(ev, () => set(false));
  };
  controls.querySelectorAll("button").forEach((b) => press(b));

  // radio (push-to-talk stand-in): preset lines, spoken in Sofia's own voice.
  // Warm the cache so a tapped reply plays instantly.
  const bar = document.getElementById("radiobar");
  preloadSpeech(content.radio.map((r) => r.en), SOFIA_VOICE);
  content.radio.forEach((r) => {
    const btn = document.createElement("button");
    btn.className = "radiobtn";
    btn.textContent = `📻 ${r.en}`;
    btn.onclick = () => { speak(r.en, "en-US", { voice: SOFIA_VOICE }); dispatch({ type: "radio", en: r.en, es: r.es }); };
    bar.appendChild(btn);
  });

  const capsEl = document.getElementById("captions");
  const needle = document.getElementById("needle");
  const progressEl = document.getElementById("progress");
  const toastEl = document.getElementById("toast");
  let lastCap = 0, lastRadio = 0, toastTimer = 0;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
  }

  function render(state, progress) {
    const c = state.captions[0];
    if (c && c.at !== lastCap) {
      lastCap = c.at;
      capsEl.innerHTML = `<div class="cap"><b>Keeper</b> ${c.en}<small>“${c.es}”</small></div>`;
      setTimeout(() => { if (capsEl.firstChild) capsEl.firstChild.style.opacity = 0; }, 4200);
    }
    if (state.radio && state.radio.at !== lastRadio) {
      lastRadio = state.radio.at;
      toast(`📻 Sofia: “${state.radio.en}”`);
    }
    needle.style.transform = `rotate(${(state.boat.heading + Math.PI / 2) * 57.3}deg)`;
    if (progress != null) progressEl.style.width = `${Math.round(progress * 100)}%`;
  }

  return { input, render, toast };
}
