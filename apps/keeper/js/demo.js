// Author: Alex Picon <alexnpc@me.com>
// The judge demo: replays a whole voyage hands-free from baked content, with no
// network needed. Grandma's cues fire on a timeline, each a distinct utterance
// driving a distinct beam/foghorn/say tool call, the boat autopilots home, and
// the arrival screen paints itself. Any interaction cancels it.

import { dispatch } from "./bus.js";
import { KEEPER_VOICE, SOFIA_VOICE, preloadSpeech, speak } from "./voice.js";

// Each cue is one keeper utterance -> one function call, so the tool log reads
// like real distinct calls rather than the same quote repeated across actions.
const SCRIPT = [
  { at: 500, kind: "beam", delta: -0.5, en: "Swing the light left, toward the bell.", es: "Mueve la luz a la izquierda, hacia la campana." },
  { at: 2600, kind: "foghorn", en: "Let them hear us — sound the horn.", es: "Que nos oigan — toca la bocina." },
  { at: 4300, kind: "say", en: "Slow down, mija — there's rock off your bow.", es: "Más despacio, mija — hay roca a proa." },
  { at: 5900, kind: "beam", delta: 0.62, en: "Now sweep right — the harbor mouth is there.", es: "Ahora barre a la derecha — ahí está la boca del puerto." },
  { at: 7600, kind: "radio", en: "I see it!", es: "¡Ya lo veo!" },
  { at: 9200, kind: "say", en: "Steer for the green light. You're almost home.", es: "Ve hacia la luz verde. Ya casi llegas a casa." },
  { at: 11400, kind: "radio", en: "Made it home.", es: "Llegué a casa." },
];

// Abuela's Spanish lines (KEEPER_VOICE) and Sofia's English radio replies
// (SOFIA_VOICE) — two distinct voices, two languages, both warmed up front.
const SPOKEN = SCRIPT.filter((s) => s.kind !== "radio").map((s) => s.es);
const SOFIA_LINES = SCRIPT.filter((s) => s.kind === "radio").map((s) => s.en);

function foghornTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (const [f, d] of [[110, 0], [88, 140]]) {
      setTimeout(() => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = f;
        g.gain.value = 0.18;
        o.connect(g).connect(ctx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
        o.stop(ctx.currentTime + 1);
      }, d);
    }
  } catch {}
}

// Fire one cue: speak the keeper's Spanish line (or Sofia's radio reply) and
// dispatch the matching beam/foghorn/say tool call.
function fire(step) {
  if (step.kind === "beam") {
    speak(step.es, "es-MX");
    dispatch({ type: "beam", delta: step.delta, quote: step.en });
  } else if (step.kind === "foghorn") {
    foghornTone();
    speak(step.es, "es-MX");
    dispatch({ type: "foghorn", quote: step.en });
  } else if (step.kind === "say") {
    speak(step.es, "es-MX");
    dispatch({ type: "say", en: step.en, es: step.es });
  } else if (step.kind === "radio") {
    // Sofia answers from the boat in her own bright voice, not Abuela's.
    speak(step.en, "en-US", { voice: SOFIA_VOICE });
    dispatch({ type: "radio", en: step.en, es: step.es });
  }
}

// Start the scripted flow. Returns a stop() that cancels every pending cue.
export function runDemo(content, setAuto) {
  const timers = [];
  // Warm the ElevenLabs cache for both voices up front so every cue plays with
  // no proxy lag — Abuela's Spanish and Sofia's replies.
  preloadSpeech(SPOKEN, KEEPER_VOICE);
  preloadSpeech(SOFIA_LINES, SOFIA_VOICE);
  dispatch({ type: "reset" });
  dispatch({ type: "memory", question: content.memoryPrompts[0], answer: "The church in our town had two bells." });
  // Backdate the call so turns and minutes read like a real ~3.5-minute session.
  dispatch({ type: "start", backdateSec: 196 });
  setAuto(true);
  for (const step of SCRIPT) timers.push(setTimeout(() => fire(step), step.at));
  return () => {
    for (const t of timers) clearTimeout(t);
    setAuto(false);
  };
}
