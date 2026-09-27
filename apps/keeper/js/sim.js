// Author: Alex Picon <alexnpc@me.com>
// Boat physics, beam-lighting logic and voyage progress. Pure functions over
// the shared state object; the authoritative page runs these every frame.

import { HARBOR, LH } from "./bus.js";

const HALF_ANGLE = 0.27;
const BEAM_RANGE = 66;
const START_DIST = Math.hypot(HARBOR.x - 0, HARBOR.z - 46);

function angleTo(from, to) {
  return Math.atan2(to.z - from.z, to.x - from.x);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function relDir(boat, obj) {
  const bearing = angleTo(boat, obj);
  const d = angleDiff(bearing, boat.heading);
  const ad = Math.abs(d);
  if (ad < 0.5) return { en: "dead ahead", es: "justo enfrente" };
  if (ad > 2.5) return { en: "behind you", es: "detrás de ti" };
  return d < 0 ? { en: "off your port bow", es: "a babor" } : { en: "off your starboard bow", es: "a estribor" };
}

function isLit(beamBearing, obj) {
  const d = angleTo(LH, obj);
  const within = Math.abs(angleDiff(beamBearing, d)) < HALF_ANGLE;
  return within && Math.hypot(obj.x - LH.x, obj.z - LH.z) < BEAM_RANGE;
}

/** Steer the boat toward the harbor, nudging only away from an imminent rock.
 * Used by the judge-demo autopilot so the voyage completes hands-free. */
export function autopilot(state) {
  const b = state.boat;
  let turn = angleDiff(angleTo(b, HARBOR), b.heading);
  for (const h of state.hazards) {
    if (!h.hit && Math.hypot(h.x - b.x, h.z - b.z) < 5.5) {
      turn += angleDiff(angleTo(b, h), b.heading) > 0 ? -0.5 : 0.5;
    }
  }
  return { turn: Math.max(-1, Math.min(1, turn * 1.8)), throttle: 1 };
}

/** Advance the boat and recompute what the keeper's beam is lighting. */
export function step(state, input, dt) {
  const b = state.boat;
  if (input.turn) b.heading += input.turn * 1.15 * dt;
  const target = input.throttle ? 11 : 5.2;
  b.speed += (target - b.speed) * Math.min(1, dt * 1.6);
  b.x += Math.cos(b.heading) * b.speed * dt;
  b.z += Math.sin(b.heading) * b.speed * dt;
  b.x = Math.max(-34, Math.min(34, b.x));

  let bump = false;
  for (const h of state.hazards) {
    if (Math.hypot(h.x - b.x, h.z - b.z) < 4.2) {
      if (!h.hit) bump = true;
      h.hit = true;
      const back = 3.2;
      b.x -= Math.cos(b.heading) * back * dt * 6;
      b.z -= Math.sin(b.heading) * back * dt * 6;
      b.speed *= 0.4;
    }
  }

  const beam = state.beam.bearing;
  if (isLit(beam, HARBOR)) {
    const r = relDir(b, HARBOR);
    state.lit = { kind: "good", en: `HARBOR mouth in the light — ${r.en}`, es: `la boca del PUERTO — ${r.es}` };
  } else {
    const rock = state.hazards.find((h) => !h.hit && isLit(beam, h));
    const bellLit = isLit(beam, state.bell);
    if (rock) {
      const r = relDir(b, rock);
      state.lit = { kind: "warn", en: `ROCK in the light — ${r.en}`, es: `una ROCA — ${r.es}` };
    } else if (bellLit) {
      const r = relDir(b, state.bell);
      state.lit = { kind: "", en: `the bell buoy, ${r.en}`, es: `la boya de campana, ${r.es}` };
    } else {
      state.lit = { kind: "", en: "dark water and fog", es: "agua oscura y niebla" };
    }
  }

  const dist = Math.hypot(HARBOR.x - b.x, HARBOR.z - b.z);
  const arrived = dist < HARBOR.r;
  return { bump, arrived, progress: Math.max(0, Math.min(1, 1 - dist / START_DIST)) };
}
