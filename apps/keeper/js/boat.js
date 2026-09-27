// Author: Alex Picon <alexnpc@me.com>
// The captain's little cabin cruiser: a PBR hull, a warm-lit cabin, red/green
// running lights and a soft wake that stretches with speed.

import * as THREE from "three";

export function buildBoat(scene) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.CapsuleGeometry(1.05, 3.4, 6, 16),
    new THREE.MeshStandardMaterial({ color: 0xeef2f8, roughness: 0.28, metalness: 0.25, envMapIntensity: 1.1 }),
  );
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 1, 0.62);
  hull.castShadow = true;
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.3, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.7 }),
  );
  deck.position.y = 0.55;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.1, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x274a6e, roughness: 0.4, metalness: 0.25, envMapIntensity: 1.0 }),
  );
  cabin.position.set(-0.4, 1.15, 0);
  cabin.castShadow = true;
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.6, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xffdca0, emissive: 0xffcf8a, emissiveIntensity: 1.6 }),
  );
  glow.position.set(-0.4, 1.2, 0);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0xcfd6e2, metalness: 0.6, roughness: 0.4 }),
  );
  mast.position.set(0.4, 2, 0);
  g.add(hull, deck, cabin, glow, mast);

  const port = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0xff2d2d, emissiveIntensity: 3 }));
  port.position.set(0.3, 0.9, -0.85);
  const stbd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), new THREE.MeshStandardMaterial({ color: 0x57e6a5, emissive: 0x2dff9a, emissiveIntensity: 3 }));
  stbd.position.set(0.3, 0.9, 0.85);
  const bow = new THREE.PointLight(0xffe6b0, 1.4, 20, 2);
  bow.position.set(1.8, 1, 0);
  g.add(port, stbd, bow);

  const wakeGeo = new THREE.PlaneGeometry(3.2, 9);
  wakeGeo.rotateX(-Math.PI / 2);
  wakeGeo.translate(0, 0, -5.5);
  const wake = new THREE.Mesh(
    wakeGeo,
    new THREE.MeshBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
  );
  wake.position.y = 0.05;
  g.add(wake);

  scene.add(g);
  return { group: g, wake };
}
