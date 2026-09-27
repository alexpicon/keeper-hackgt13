// Author: Alex Picon <alexnpc@me.com>
// Procedural PBR textures generated on a canvas, so the scene needs no external
// image assets (which plain-HTTP hosting and offline demo mode can't rely on).
// Each surface gets a tiling normal + roughness map derived from value-noise
// fbm, so materials react to the image-based lighting like real weathered
// stone, wet rock and brushed metal rather than reading as flat plastic.

import * as THREE from "three";

function canvas(size) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  return cv;
}

function texture(cv, { repeat = 1, srgb = false } = {}) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A seeded value-noise sampler with smooth interpolation; wraps so the maps
// tile cleanly. Returns a function noise(x, y) in [0, 1].
function valueNoise(seed, grid) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const g = new Float32Array(grid * grid);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (x, y) => {
    const wx = ((x % grid) + grid) % grid;
    const wy = ((y % grid) + grid) % grid;
    const x0 = Math.floor(wx), y0 = Math.floor(wy);
    const x1 = (x0 + 1) % grid, y1 = (y0 + 1) % grid;
    const fx = wx - x0, fy = wy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a00 = g[y0 * grid + x0], a10 = g[y0 * grid + x1];
    const a01 = g[y1 * grid + x0], a11 = g[y1 * grid + x1];
    return (
      a00 * (1 - sx) * (1 - sy) + a10 * sx * (1 - sy) +
      a01 * (1 - sx) * sy + a11 * sx * sy
    );
  };
}

// Fractal Brownian motion over a set of octaves, mapped to texture space.
function fbm(octaves, size) {
  return (x, y) => {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (const n of octaves) {
      sum += amp * n((x / size) * 8 * freq, (y / size) * 8 * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };
}

// Build a tangent-space normal map from a height function via central
// differences. `strength` scales the bump; higher reads as coarser relief.
function normalMap(size, height, strength, repeat) {
  const cv = canvas(size), g = cv.getContext("2d");
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (height(x + 1, y) - height(x - 1, y)) * strength;
      const dy = (height(x, y + 1) - height(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = (-dx / len * 0.5 + 0.5) * 255;
      img.data[i + 1] = (-dy / len * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return texture(cv, { repeat });
}

// Build a grayscale map (roughness / ao) from a [0,1] function.
function grayMap(size, fn, repeat) {
  const cv = canvas(size), g = cv.getContext("2d");
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = Math.max(0, Math.min(1, fn(x, y))) * 255;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return texture(cv, { repeat });
}

// Weathered painted-concrete tower: fine grain, faint vertical rain streaks and
// horizontal casting seams, wetter (glossier) in the low spots.
export function stoneMaps() {
  const size = 256;
  const grain = fbm([valueNoise(21, 64), valueNoise(83, 128)], size);
  const streak = valueNoise(140, 96);
  const height = (x, y) => {
    const seam = 0.5 - 0.5 * Math.cos((y / size) * Math.PI * 12);
    const rain = streak(x / size * 5, y / size * 40) * 0.5;
    return grain(x, y) * 0.7 + seam * 0.12 + rain * 0.3;
  };
  return {
    normalMap: normalMap(size, height, 2.4, 2),
    roughnessMap: grayMap(size, (x, y) => 0.62 + 0.3 * height(x, y), 2),
  };
}

// Wet sea rock: sharp ridged facets with slick, low-roughness crevices.
export function rockMaps() {
  const octaves = [valueNoise(7, 48), valueNoise(311, 96), valueNoise(59, 160)];
  const base = fbm(octaves, 256);
  const ridged = (x, y) => 1 - Math.abs(base(x, y) * 2 - 1);
  return {
    normalMap: normalMap(256, (x, y) => ridged(x, y) * 1.1, 3.4, 2),
    roughnessMap: grayMap(256, (x, y) => 0.34 + 0.44 * ridged(x, y), 2),
  };
}

// A tiling normal map of layered ripples for the water's micro-detail, sampled
// by the reflective water shader and the lite-mode fallback plane alike.
export function waterNormal() {
  const s = 256;
  const cv = canvas(s), g = cv.getContext("2d");
  const img = g.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      let h = 0;
      for (const [f, a] of [[0.09, 1], [0.19, 0.5], [0.37, 0.25]]) {
        h += a * Math.sin(x * f + Math.cos(y * f * 0.7) * 2);
        h += a * Math.cos(y * f * 1.1 + Math.sin(x * f * 0.5) * 2);
      }
      const i = (y * s + x) * 4;
      img.data[i] = (Math.cos(h) * 0.5 + 0.5) * 255;
      img.data[i + 1] = (Math.sin(h * 0.8) * 0.5 + 0.5) * 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return texture(cv, { repeat: 6 });
}

// A soft radial puff used as a billboarded fog-bank sprite.
export function fogSprite() {
  const s = 128;
  const cv = canvas(s), g = cv.getContext("2d");
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "rgba(210,222,245,0.5)");
  grd.addColorStop(0.55, "rgba(180,196,226,0.16)");
  grd.addColorStop(1, "rgba(180,196,226,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}
