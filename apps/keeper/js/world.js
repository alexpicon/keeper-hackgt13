// Author: Alex Picon <alexnpc@me.com>
// Builds the harbor: a real reflective water surface (three's Water, planar
// reflections + sun glitter) on a GPU, a weathered PBR stone lighthouse with a
// glowing lantern, wet normal-mapped rocks, channel markers and drifting fog
// banks. Every material is physically based and lit by the sky environment from
// gfx.js. A software GL context falls back to a cheaper animated water plane.

import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { HARBOR, LH } from "./bus.js";
import { fogSprite, rockMaps, stoneMaps, waterNormal } from "./tex.js";

const noise = new ImprovedNoise();

function displace(geo, amp, freq) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const s = 1 + noise.noise(x * freq, y * freq, z * freq) * amp;
    p.setXYZ(i, x * s, y * s, z * s);
  }
  geo.computeVertexNormals();
  return geo;
}

function water(scene, quality, sun) {
  const normals = waterNormal();
  if (quality === "high") {
    const w = new Water(new THREE.PlaneGeometry(620, 620), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normals,
      sunDirection: sun.clone().normalize(),
      sunColor: 0xffd7a0,
      waterColor: 0x0a2536,
      distortionScale: 2.4,
      fog: true,
      alpha: 1,
    });
    w.rotation.x = -Math.PI / 2;
    w.material.uniforms.size.value = 5.5;
    scene.add(w);
    return { mesh: w, kind: "reflector" };
  }
  const geo = new THREE.PlaneGeometry(620, 620, 84, 84);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x0c2a44,
      metalness: 0.92,
      roughness: 0.13,
      normalMap: normals,
      normalScale: new THREE.Vector2(0.5, 0.5),
      envMapIntensity: 1.5,
    }),
  );
  mesh.receiveShadow = true;
  scene.add(mesh);
  return { mesh, base: geo.attributes.position.array.slice(), kind: "plane" };
}

function lighthouse(scene) {
  const g = new THREE.Group();
  const s = stoneMaps();
  const stone = new THREE.MeshStandardMaterial({ color: 0xe8e5db, roughness: 0.86, metalness: 0.02, normalMap: s.normalMap, roughnessMap: s.roughnessMap, normalScale: new THREE.Vector2(0.85, 0.85), envMapIntensity: 0.7 });
  const isle = new THREE.Mesh(displace(new THREE.IcosahedronGeometry(11, 4), 0.22, 0.12), new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.96, normalMap: rockMaps().normalMap, normalScale: new THREE.Vector2(1.1, 1.1) }));
  isle.position.y = -3.4;
  isle.scale.y = 0.5;
  isle.castShadow = isle.receiveShadow = true;
  g.add(isle);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.1, 12, 56, 8), stone);
  tower.position.y = 6.4;
  tower.castShadow = tower.receiveShadow = true;
  g.add(tower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.32, 2.62, 3.2, 56), new THREE.MeshStandardMaterial({ color: 0xac352a, roughness: 0.62, metalness: 0.03, normalMap: s.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.6 }));
  band.position.y = 7.6;
  band.castShadow = true;
  g.add(band);
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.92, roughness: 0.34, envMapIntensity: 1.0 });
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.5, 48), metal);
  gallery.position.y = 12.3;
  gallery.castShadow = true;
  g.add(gallery);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.08, 10, 48), new THREE.MeshStandardMaterial({ color: 0x14171d, metalness: 0.95, roughness: 0.3 }));
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 13.2;
  g.add(rail);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffcf7a, emissiveIntensity: 2.6, roughness: 0.12, metalness: 0.0, envMapIntensity: 1.2 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 2.8, 24), glassMat);
  glass.position.y = 14.2;
  g.add(glass);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.2, 32), new THREE.MeshStandardMaterial({ color: 0x171a20, metalness: 0.7, roughness: 0.42, envMapIntensity: 0.9 }));
  roof.position.y = 16.6;
  roof.castShadow = true;
  g.add(roof);
  g.position.set(LH.x, 0, LH.z);
  scene.add(g);

  const lamp = new THREE.PointLight(0xffdca0, 3.4, 110, 1.9);
  lamp.position.set(LH.x, 14.2, LH.z);
  lamp.castShadow = true;
  scene.add(lamp);
  const spot = new THREE.SpotLight(0xffe1a0, 150, 150, 0.3, 0.55, 1.2);
  spot.position.set(LH.x, 13.8, LH.z);
  const target = new THREE.Object3D();
  scene.add(target, spot);
  spot.target = target;

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(11, 72, 40, 1, true).translate(0, -36, 0),
    new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false }),
  );
  cone.position.set(LH.x, 13.8, LH.z);
  scene.add(cone);
  return { spot, target, cone, glassMat, lamp };
}

function rocks(scene) {
  const m = rockMaps();
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a232e, roughness: 0.5, metalness: 0.1, normalMap: m.normalMap, roughnessMap: m.roughnessMap, normalScale: new THREE.Vector2(1.3, 1.3), envMapIntensity: 0.95 });
  for (const r of [{ x: -6, z: 24, s: 2.7 }, { x: 9, z: 6, s: 3.0 }, { x: -11, z: -16, s: 2.4 }, { x: 6, z: -38, s: 3.2 }]) {
    const rock = new THREE.Mesh(displace(new THREE.DodecahedronGeometry(r.s, 3), 0.36, 0.25), mat);
    rock.position.set(r.x, 0.2, r.z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
  }
}

function bell(scene) {
  const g = new THREE.Group();
  const buoy = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 2.6, 20), new THREE.MeshStandardMaterial({ color: 0x1f8f57, roughness: 0.42, metalness: 0.4, envMapIntensity: 1.0 }));
  buoy.castShadow = true;
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.4, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x0c3a22, metalness: 0.8, roughness: 0.36, side: THREE.DoubleSide }));
  cage.position.y = 1.9;
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), new THREE.MeshStandardMaterial({ color: 0x9dffcb, emissive: 0x66ffa8, emissiveIntensity: 2 }));
  light.position.y = 2.7;
  g.add(buoy, cage, light, new THREE.PointLight(0x66ffb0, 0.8, 20, 2).translateY(2.7));
  g.position.set(17, 0.4, -2);
  scene.add(g);
  return g;
}

function harbor(scene) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 0.9, normalMap: stoneMaps().normalMap });
  for (const dx of [-1, 1]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 5), wall);
    pier.position.set(dx * (HARBOR.r + 5), 0.6, 0);
    pier.castShadow = pier.receiveShadow = true;
    g.add(pier);
  }
  for (const [dx, col] of [[-HARBOR.r, 0xff4d4d], [HARBOR.r, 0x57e6a5]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 7, 14), wall);
    post.position.set(dx, 3.5, 0);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.4 }));
    lamp.position.set(dx, 7.2, 0);
    g.add(post, lamp, new THREE.PointLight(col, 0.9, 26, 2).translateX(dx).translateY(7.2));
  }
  g.position.set(HARBOR.x, 0, HARBOR.z);
  scene.add(g);
  return g;
}

function atmosphere(scene, sun, quality) {
  const moon = new THREE.DirectionalLight(0xd9e6ff, 0.8);
  moon.position.copy(sun).multiplyScalar(60).setY(72);
  moon.castShadow = true;
  const res = quality === "high" ? 2048 : 1024;
  moon.shadow.mapSize.set(res, res);
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.02;
  const cam = moon.shadow.camera;
  cam.left = cam.bottom = -80;
  cam.right = cam.top = 80;
  cam.far = 300;
  scene.add(moon, new THREE.HemisphereLight(0x33507e, 0x05070c, 0.32));

  const tex = fogSprite();
  const banks = [];
  // Fog banks live in a ring around the play area so the chase camera never
  // ploughs through one and whites out the frame.
  for (let i = 0; i < 13; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.22, depthWrite: false, fog: false }));
    const sc = 34 + Math.random() * 30;
    sp.scale.set(sc, sc * 0.55, 1);
    const ang = (i / 13) * Math.PI * 2;
    const rad = 52 + Math.random() * 40;
    sp.position.set(Math.cos(ang) * rad, 3 + Math.random() * 5, Math.sin(ang) * rad - 10);
    sp.userData.ang = ang;
    sp.userData.rad = rad;
    scene.add(sp);
    banks.push(sp);
  }
  const starGeo = new THREE.BufferGeometry();
  const pts = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i++) {
    const v = new THREE.Vector3().setFromSphericalCoords(300, Math.random() * 1.2, Math.random() * Math.PI * 2);
    pts.set([v.x, Math.abs(v.y) + 30, v.z], i * 3);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.7, sizeAttenuation: true, fog: false })));
  return banks;
}

export function buildWorld(scene, sun, quality) {
  scene.fog = new THREE.FogExp2(0x0c1830, 0.017);
  const lh = lighthouse(scene);
  rocks(scene);
  return { ...lh, water: water(scene, quality, sun), bell: bell(scene), harbor: harbor(scene), fog: atmosphere(scene, sun, quality) };
}
