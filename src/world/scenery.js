import * as THREE from 'three';

export function buildScenery(scene) {
  // ── Ground plane — covers full road range (south +220 to north -760) ──
  const groundGeo = new THREE.PlaneGeometry(600, 1100);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a7c3f });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -270);
  scene.add(ground);

  // ── Phase A/B scenery (Z = -190 to +190) ─────────────────────────────
  _spawnBuildings(scene,  14, 50, -190, 380);
  _spawnBuildings(scene, -14, 50, -190, 380);
  _spawnTrees(scene,  7.5, 42, -190, 380);
  _spawnTrees(scene, -7.5, 42, -190, 380);
  _spawnLamps(scene,  5.2, 20, -185, 370);
  _spawnLamps(scene, -5.2, 20, -185, 370);

  // ── Phase C north extension ───────────────────────────────────────────
  // Segment 1: between stop-sign and main intersection (Z=-310 to -480)
  _spawnBuildings(scene,  14, 22, -310, 170);
  _spawnBuildings(scene, -14, 22, -310, 170);
  _spawnTrees(scene,  7.5, 18, -310, 170);
  _spawnTrees(scene, -7.5, 18, -310, 170);
  _spawnLamps(scene,  5.2, 10, -315, 165);
  _spawnLamps(scene, -5.2, 10, -315, 165);

  // Segment 2: north of roundabout (Z=-520 to -700)
  _spawnBuildings(scene,  14, 23, -520, 180);
  _spawnBuildings(scene, -14, 23, -520, 180);
  _spawnTrees(scene,  7.5, 19, -520, 180);
  _spawnTrees(scene, -7.5, 19, -520, 180);
  _spawnLamps(scene,  5.2, 10, -525, 175);
  _spawnLamps(scene, -5.2, 10, -525, 175);
}

// zStart = southernmost Z (largest Z value), zLen = extent northward
function _spawnBuildings(scene, sideX, count, zStart, zLen) {
  const palette = [0x7a8fa0, 0xb09070, 0x90a060, 0xa07858, 0xc0b0a0, 0x8090a8];
  const sign = sideX > 0 ? 1 : -1;

  for (let i = 0; i < count; i++) {
    const w = 6 + Math.random() * 10;
    const h = 4 + Math.random() * 14;
    const d = 5 + Math.random() * 8;

    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({ color: palette[Math.floor(Math.random() * palette.length)] });
    const b = new THREE.Mesh(geo, mat);
    b.position.set(
      sideX + sign * (w / 2 + Math.random() * 8),
      h / 2,
      zStart - i * (zLen / count) + (Math.random() - 0.5) * 4
    );
    scene.add(b);
  }
}

function _spawnTrees(scene, sideX, count, zStart, zLen) {
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b3a1f });
  const leafColors = [0x2d7a2d, 0x3a8a3a, 0x4a6a30, 0x2a6a28];

  for (let i = 0; i < count; i++) {
    const x = sideX + (Math.random() - 0.5) * 1.5;
    const z = zStart - i * (zLen / count) + (Math.random() - 0.5) * 3;
    const scale = 0.8 + Math.random() * 0.6;

    const trunkGeo = new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, 1.6 * scale, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 0.8 * scale, z);
    scene.add(trunk);

    const leafMat = new THREE.MeshLambertMaterial({ color: leafColors[Math.floor(Math.random() * leafColors.length)] });
    const leafGeo = new THREE.ConeGeometry((0.7 + Math.random() * 0.4) * scale, (2.2 + Math.random() * 0.8) * scale, 7);
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.set(x, (2.5 + Math.random() * 0.3) * scale, z);
    scene.add(leaves);
  }
}

function _spawnLamps(scene, sideX, count, zStart, zLen) {
  const poleMat  = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xffffdd, emissive: 0xffffdd, emissiveIntensity: 0.5 });

  for (let i = 0; i < count; i++) {
    const x = sideX;
    const z = zStart - i * (zLen / count);

    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 6, 6);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 3, z);
    scene.add(pole);

    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.rotation.z = Math.PI / 2;
    const armX = sideX > 0 ? x - 0.5 : x + 0.5;
    arm.position.set(armX, 6.1, z);
    scene.add(arm);

    const headGeo = new THREE.BoxGeometry(0.4, 0.2, 0.5);
    const head = new THREE.Mesh(headGeo, lightMat);
    head.position.set(armX - (sideX > 0 ? 0.6 : -0.6), 6.15, z);
    scene.add(head);
  }
}
