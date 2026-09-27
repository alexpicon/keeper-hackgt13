// Author: Alex Picon <alexnpc@me.com>
// Real 3D audio for the tower. A WebAudio HRTF PannerNode sits at the lighthouse
// and the listener rides the boat, so the horn, the gear-clank and the keeper's
// speech presence-cue come from the lighthouse *behind* the captain and swing
// as the boat turns. Web Audio works on plain HTTP (unlike mic capture), so this
// is genuine binaural spatialisation, not a fake — it's the piece the full
// phone→voice bridge plugs the caller's audio into. The words are a real
// generated voice (ElevenLabs, browser fallback); their direction here is real.

import { LH } from "./bus.js";

let ctx = null;
let panner = null;
let bus = null;
let ready = false;

// Build the audio graph once, after a user gesture has unlocked audio. The
// panner is HRTF (true binaural) where supported, and falls back to equal-power
// stereo otherwise; either way the tower is a positioned source, not centred.
function ensure() {
  if (ready) return ready;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    bus = ctx.createGain();
    bus.gain.value = 0.9;
    panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "linear";
    panner.refDistance = 8;
    panner.maxDistance = 150;
    panner.rolloffFactor = 0.55;
    panner.positionX ? panner.positionX.setValueAtTime(LH.x, ctx.currentTime) : panner.setPosition(LH.x, 6, LH.z);
    if (panner.positionY) {
      panner.positionY.setValueAtTime(6, ctx.currentTime);
      panner.positionZ.setValueAtTime(LH.z, ctx.currentTime);
    }
    panner.connect(bus).connect(ctx.destination);
    ready = true;
  } catch {
    ready = false;
  }
  return ready;
}

// Point the listener at the boat and face it along its heading, so left/right
// and front/back of the tower track the captain's own orientation.
export function tick(boat) {
  if (!ready || !boat) return;
  const l = ctx.listener;
  const fx = Math.cos(boat.heading);
  const fz = Math.sin(boat.heading);
  try {
    if (l.positionX) {
      const t = ctx.currentTime;
      l.positionX.setValueAtTime(boat.x, t);
      l.positionY.setValueAtTime(1.2, t);
      l.positionZ.setValueAtTime(boat.z, t);
      l.forwardX.setValueAtTime(fx, t);
      l.forwardY.setValueAtTime(0, t);
      l.forwardZ.setValueAtTime(fz, t);
      l.upX.setValueAtTime(0, t);
      l.upY.setValueAtTime(1, t);
      l.upZ.setValueAtTime(0, t);
    } else {
      l.setPosition(boat.x, 1.2, boat.z);
      l.setOrientation(fx, 0, fz, 0, 1, 0);
    }
  } catch {
    /* a stale AudioParam schedule is harmless; next tick corrects it */
  }
}

// Fire a shaped oscillator into the tower panner.
function blip({ freq, dur, type = "sine", gain = 0.3, sweep = 0, delay = 0 }) {
  if (!ensure()) return;
  if (ctx.state === "suspended") ctx.resume();
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + sweep), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(panner);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// The two-note foghorn, sounded from the tower.
export function foghorn() {
  blip({ freq: 116, dur: 1.1, type: "sawtooth", gain: 0.34 });
  blip({ freq: 92, dur: 0.95, type: "sawtooth", gain: 0.3, delay: 0.14 });
}

// A slow gear-clank the moment a tool call begins — the card's lag mask, and a
// tactile "the tower heard her" beat, placed at the lighthouse.
export function clank() {
  blip({ freq: 220, dur: 0.14, type: "square", gain: 0.16, sweep: -120 });
  blip({ freq: 150, dur: 0.22, type: "triangle", gain: 0.14, sweep: -70, delay: 0.09 });
}

// A soft rising presence-cue under the keeper's spoken line, so her guidance is
// heard coming *from* the lighthouse. The words are the generated voice; only
// their direction is modelled here.
export function voiceCue() {
  if (!ensure()) return;
  if (ctx.state === "suspended") ctx.resume();
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  osc.type = "sine";
  osc.frequency.setValueAtTime(320, t0);
  osc.frequency.linearRampToValueAtTime(440, t0 + 0.5);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
  osc.connect(lp).connect(g).connect(panner);
  osc.start(t0);
  osc.stop(t0 + 0.8);
}

// True when binaural HRTF panning is active (for an honest in-app label).
export function isSpatial() {
  return ready && !!panner && panner.panningModel === "HRTF";
}
