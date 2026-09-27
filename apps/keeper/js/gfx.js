// Author: Alex Picon <alexnpc@me.com>
// Renderer, image-based lighting and the post chain. Filmic (ACES) tone
// mapping, a physically-modelled dusk sky prefiltered through PMREM into an
// environment map for real PBR reflections, soft (PCFSoft) shadows, screen-
// space ambient occlusion for contact shadows, and a bloom pass for the lantern
// and beam glow. A software GL context (headless capture, no GPU) drops the
// heaviest passes so a frame never stalls; a real GPU gets the full look.

import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Build the renderer with filmic tone mapping and soft shadow maps.
export function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    // Keep the last frame readable so a headless snapshot of the live canvas is
    // reliable; negligible cost on a real GPU.
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.72;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Allow an immersive session over HTTPS on a headset; inert on desktop.
  renderer.xr.enabled = true;
  return renderer;
}

// Classify the GL backend. A software rasteriser (SwiftShader, llvmpipe, ANGLE
// software) can't afford the reflective water + SSAO, so those callers take the
// cheaper path; a discrete/integrated GPU renders the full pipeline.
export function rendererQuality(renderer) {
  // `?gfx=high|lite` forces the path — handy to preview reflective water on a
  // software-GL laptop, or to hold the cheap path on a flaky one.
  try {
    const forced = new URLSearchParams(location.search).get("gfx");
    if (forced === "high" || forced === "lite") return forced;
  } catch {
    /* no search params; fall through to auto-detect */
  }
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
    if (/swiftshader|llvmpipe|software|basic render|microsoft/i.test(name)) {
      return "lite";
    }
  } catch {
    /* fall through to high; the runtime bench still degrades if needed */
  }
  return "high";
}

// Add a physical dusk sky and return the sun direction plus the environment map
// generated from it, so PBR materials pick up real sky colour in reflections.
export function addSkyEnvironment(scene, renderer) {
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 3.2;
  u.rayleigh.value = 2.4;
  u.mieCoefficient.value = 0.006;
  u.mieDirectionalG.value = 0.86;
  // Sun sits low behind the boat's travel (+z), so the camera sails into the
  // deep blue dusk toward the harbor with warm light raking the lighthouse and
  // laying a specular path across the water.
  const phi = THREE.MathUtils.degToRad(90 - 5.5);
  const theta = THREE.MathUtils.degToRad(38);
  const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  u.sunPosition.value.copy(sun);
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  scene.environment = pmrem.fromScene(sky, 0.02).texture;
  scene.environmentIntensity = 0.68;
  pmrem.dispose();
  return sun;
}

// Compose the post chain: SSAO (high only) → bloom → filmic output. Falls back
// to a plain render if the composer cannot initialise on a limited GL context.
export function makeComposer(renderer, scene, camera, quality) {
  try {
    const composer = new EffectComposer(renderer);
    if (quality === "high") {
      const ssao = new SSAOPass(scene, camera, 1, 1);
      ssao.kernelRadius = 6;
      ssao.minDistance = 0.004;
      ssao.maxDistance = 0.08;
      composer.addPass(ssao);
    } else {
      composer.addPass(new RenderPass(scene, camera));
    }
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.72, 0.74);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    return { composer, bloom, render: () => composer.render() };
  } catch {
    return { composer: null, bloom: null, render: () => renderer.render(scene, camera) };
  }
}
