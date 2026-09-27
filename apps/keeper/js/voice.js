// Author: Alex Picon <alexnpc@me.com>
// Voice for the tower. Real, natural ElevenLabs audio via the server proxy
// (/api/tts), with the browser's speechSynthesis as an automatic fallback when
// the proxy is unavailable (no key, offline, or ?demo without network). The
// keeper (Abuela Rosa) and Sofia get distinct voices so the two carry apart.

import {
  cancelSpeech,
  preloadSpeech,
  speak as ttsSpeak,
  ttsAvailable,
} from "../../shared/tts.js";

// ElevenLabs voice ids. The Spanish lines ride eleven_multilingual_v2, so the
// same warm keeper voice speaks Spanish naturally — no separate model needed.
export const KEEPER_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah — warm, reassuring: Abuela
export const SOFIA_VOICE = "FGY2WhTYpPnrIDTdsKH5"; // Laura — bright, quirky: the grandkid

/**
 * Speak a line, picking a voice for the language and returning when it ends.
 * @param {string} text words to speak
 * @param {string} lang BCP-47 tag, e.g. "es-MX" or "en-US"
 * @param {{voice?: string, rate?: number, onend?: () => void}} [opts] overrides
 * @returns {Promise<void>} resolves when playback finishes
 */
export function speak(text, lang = "en-US", opts = {}) {
  return ttsSpeak(text, {
    voice: opts.voice || KEEPER_VOICE,
    lang,
    rate: opts.rate ?? 0.98,
    onend: opts.onend,
  });
}

export { cancelSpeech, preloadSpeech, ttsAvailable };
