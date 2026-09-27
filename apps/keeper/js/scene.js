// Author: Alex Picon <alexnpc@me.com>
// Assembles the harbor and drives it each frame: animated swell, the sweeping
// beam, the boat and a cinematic chase/orbit camera, rendered through the
// bloom + tone-mapping composer.

import * as THREE from "three";
import { HARBOR, LH } from "./bus.js";
import { addSkyEnvironment, makeComposer, makeRenderer, rendererQuality } from "./gfx.js";
import { buildWorld } from "./world.js";
import { buildBoat } from "./boat.js";

export class Scene {
  constructor(canvas) {
    this.renderer = makeRenderer(canvas);
    this.quality = rendererQuality(this.renderer);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(58, 1, 0.1, 5000);
    this.cam.position.set(40, 26, 70);
    const sun = addSkyEnvironment(this.scene, this.renderer);
    this.w = buildWorld(this.scene, sun, this.quality);
    this.boat = buildBoat(this.scene);
    this.post = makeComposer(this.renderer, this.scene, this.cam, this.quality);
    this.render = this.post.render;
    // A software GL context renders (and reads back) far fewer pixels at dpr 1,
    // which keeps the frame loop and headless capture responsive.
    this.dprCap = this.quality === "high" ? 1.5 : 1;
    this.samples = [];
    this.lite = false;
    this.xr = false;
    this._state = null;
    this.resize();
    addEventListener("resize", () => this.resize());
  }

  // Is an immersive headset session available? Needs a secure context (HTTPS),
  // so on plain HTTP this resolves false and the caller shows the desktop path.
  static async vrSupported() {
    try {
      return !!(navigator.xr && (await navigator.xr.isSessionSupported("immersive-vr")));
    } catch {
      return false;
    }
  }

  // Enter an immersive-vr session. Rendering moves to the XR animation loop
  // (required for headset frame timing); the harbor, beam and swell keep
  // animating so the viewer stands inside the scene with the light sweeping
  // overhead. Restores the desktop loop when the session ends.
  async enterVR() {
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor"],
    });
    await this.renderer.xr.setSession(session);
    this.xr = true;
    this.renderer.setAnimationLoop(() => {
      const t = performance.now() / 1000;
      this._water(t);
      if (this._state) this._beam(this._state);
      this.renderer.render(this.scene, this.cam);
    });
    session.addEventListener("end", () => {
      this.xr = false;
      this.renderer.setAnimationLoop(null);
    });
    return session;
  }

  resize() {
    const c = this.renderer.domElement;
    const w = c.clientWidth || c.parentElement.clientWidth;
    const h = c.clientHeight || c.parentElement.clientHeight;
    const dpr = Math.min(this.dprCap, devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.post.composer?.setSize(w, h);
    this.cam.aspect = w / h || 1.6;
    this.cam.updateProjectionMatrix();
  }

  // On a weak/software GL context, drop the expensive passes so a screenshot
  // (and the frame loop) never stalls. Real GPUs keep the full look.
  _degrade() {
    if (this.lite) return;
    this.lite = true;
    this.dprCap = 1;
    this.renderer.shadowMap.enabled = false;
    this.render = () => this.renderer.render(this.scene, this.cam);
    this.resize();
  }

  _bench(ms) {
    if (this.lite || this.samples.length >= 8) return;
    this.samples.push(ms);
    if (this.samples.length === 8) {
      const slow = this.samples.filter((v) => v > 55).length;
      if (slow >= 3) this._degrade();
    }
  }

  _water(t) {
    const w = this.w.water;
    // Reflective water animates through its own shader time; the lite fallback
    // plane displaces vertices and scrolls its normal map by hand.
    if (w.kind === "reflector") {
      w.mesh.material.uniforms.time.value = t * 0.6;
      return;
    }
    const p = w.mesh.geometry.attributes.position;
    const base = w.base;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      p.array[i * 3 + 1] =
        Math.sin(x * 0.08 + t * 0.9) * 0.55 +
        Math.cos(z * 0.11 + t * 0.7) * 0.45 +
        Math.sin((x + z) * 0.05 + t * 1.3) * 0.25;
    }
    p.needsUpdate = true;
    w.mesh.material.normalMap.offset.set(t * 0.01, t * 0.014);
  }

  _beam(state) {
    const b = state.beam.bearing;
    const dir = new THREE.Vector3(Math.cos(b), 0, Math.sin(b));
    this.w.target.position.set(LH.x + dir.x * 46, -1, LH.z + dir.z * 46);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
    this.w.cone.quaternion.copy(q);
    const horn = Date.now() - (state.foghornAt || 0) < 1400;
    this.w.cone.material.opacity = horn ? 0.24 : 0.13;
    this.w.glassMat.emissiveIntensity = horn ? 3.4 : 2.4;
  }

  _camera(state, t) {
    const bt = state.boat;
    if (state.phase === "voyage") {
      const fwd = new THREE.Vector3(Math.cos(bt.heading), 0, Math.sin(bt.heading));
      const want = new THREE.Vector3(bt.x - fwd.x * 15, 8.6, bt.z - fwd.z * 15);
      this.cam.position.lerp(want, 0.055);
      this.cam.lookAt(bt.x + fwd.x * 12, 1.6, bt.z + fwd.z * 12);
    } else {
      const a = t * 0.12;
      this.cam.position.lerp(new THREE.Vector3(Math.cos(a) * 52, 22, 40 + Math.sin(a) * 52), 0.02);
      this.cam.lookAt(LH.x * 0.4, 6, LH.z * 0.4);
    }
  }

  sync(state, t) {
    this._state = state;
    if (this.xr) return; // the XR animation loop owns rendering while immersed
    this._water(t);
    this._beam(state);
    const bt = state.boat;
    this.boat.group.position.set(bt.x, 0.35 + Math.sin(t * 1.5) * 0.16, bt.z);
    this.boat.group.rotation.set(Math.sin(t * 1.1) * 0.04, -bt.heading + Math.PI / 2, Math.sin(t * 0.9) * 0.05);
    this.boat.wake.material.opacity = Math.min(0.5, (bt.speed || 0) * 0.05);
    this.w.bell.position.y = 0.4 + Math.sin(t * 1.8) * 0.28;
    this.w.bell.rotation.z = Math.sin(t * 1.8) * 0.12;
    for (const s of this.w.fog) {
      s.userData.ang += 0.0009;
      s.position.x = Math.cos(s.userData.ang) * s.userData.rad;
      s.position.z = Math.sin(s.userData.ang) * s.userData.rad - 10;
    }
    this._camera(state, t);
    const t0 = performance.now();
    this.render();
    this._bench(performance.now() - t0);
  }
}
