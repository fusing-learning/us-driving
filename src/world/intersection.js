import * as THREE from 'three';

// Published constants so rulesEngine and npcCar can import without circular deps
export const INTERSECTION = {
  z:              0,
  halfWidth:      4,
  stopLineSouth:  6.5,   // northbound (player) stop line Z
  stopLineNorth: -6.5,   // southbound (NPC)    stop line Z
};

// Shared emissive materials — one set for ALL poles on the main Z-axis road.
// Changing .emissive on one material updates every bulb of that colour at once.
const _mats = {
  red:    new THREE.MeshLambertMaterial({ color: 0x330000, emissive: new THREE.Color(0x1a0000) }),
  yellow: new THREE.MeshLambertMaterial({ color: 0x332200, emissive: new THREE.Color(0x1a0800) }),
  green:  new THREE.MeshLambertMaterial({ color: 0x003300, emissive: new THREE.Color(0x00ff55) }),
};

export function buildIntersection(scene) {
  const group      = new THREE.Group();
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });

  // ── Intersection box (covers the centre seam) ─────────────────────────
  const boxMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 8.2), asphaltMat);
  boxMesh.rotation.x = -Math.PI / 2;
  boxMesh.position.set(0, 0.025, 0);
  group.add(boxMesh);

  // ── Cross-street asphalt (east + west wings) ──────────────────────────
  const WING = 46;
  [-(4 + WING / 2), (4 + WING / 2)].forEach(cx => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(WING, 8), asphaltMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, 0.025, 0);
    group.add(m);
  });

  // ── Cross-street sidewalks ────────────────────────────────────────────
  const swMat = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
  [-(4 + WING / 2), (4 + WING / 2)].forEach(cx => {
    [-5.6, 5.6].forEach(sz => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(WING, 3.2), swMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(cx, 0.02, sz);
      group.add(s);
    });
  });

  // ── Cross-street curbs ────────────────────────────────────────────────
  const curbMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
  [-4.2, 4.2].forEach(cz => {
    [-1, 1].forEach(side => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(WING, 0.15, 0.4), curbMat);
      c.position.set(side * (4 + WING / 2), 0.075, cz);
      group.add(c);
    });
  });

  // ── Cross-street lane markings (yellow dashes + white edges, along X) ─
  const y = 0.03;
  _addXDashes(group, -50, -5, 0, y, 0xffcc00, 5, 4);
  _addXDashes(group,   5, 50, 0, y, 0xffcc00, 5, 4);
  _addXLine(group, -50, -4, -4, y, 0xffffff);
  _addXLine(group, -50, -4,  4, y, 0xffffff);
  _addXLine(group,   4, 50, -4, y, 0xffffff);
  _addXLine(group,   4, 50,  4, y, 0xffffff);

  // ── Stop lines ────────────────────────────────────────────────────────
  _addStopLine(group, 0.1, 3.9, INTERSECTION.stopLineSouth, y);  // player (right lane)
  _addStopLine(group, -3.9, -0.1, INTERSECTION.stopLineNorth, y); // NPC   (left lane)

  // ── Traffic light poles ───────────────────────────────────────────────
  // SE & SW poles face northbound (player) traffic; NE & NW face southbound (NPCs)
  _buildPole(group,  4.5, INTERSECTION.stopLineSouth + 0.3, -1);  // SE – arm left
  _buildPole(group, -4.5, INTERSECTION.stopLineSouth + 0.3,  1);  // SW – arm right
  _buildPole(group,  4.5, INTERSECTION.stopLineNorth - 0.3, -1);  // NE
  _buildPole(group, -4.5, INTERSECTION.stopLineNorth - 0.3,  1);  // NW

  scene.add(group);
  return { group, bulbMats: _mats };
}

// Call every frame with the current TrafficLight.state string
export function updateLightVisuals(bulbMats, state) {
  bulbMats.red.emissive.set(   state === 'red'    ? 0xff0000 : 0x1a0000);
  bulbMats.yellow.emissive.set(state === 'yellow' ? 0xff8800 : 0x1a0800);
  bulbMats.green.emissive.set( state === 'green'  ? 0x00ff55 : 0x001a08);
}

// ── Private helpers ─────────────────────────────────────────────────────

function _buildPole(group, x, z, dir) {
  const grayMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
  const hoodMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  // Vertical pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.2, 8), grayMat);
  pole.position.set(x, 3.1, z);
  group.add(pole);

  // Horizontal arm pointing toward road centre
  const ARM = 1.6;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, ARM, 6), grayMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(x + dir * ARM / 2, 6.05, z);
  group.add(arm);

  // Light housing
  const bx = x + dir * ARM;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.05, 0.38), hoodMat);
  hood.position.set(bx, 5.47, z);
  group.add(hood);

  // Bulbs (shared materials → single emissive update changes all poles)
  const bulbGeo = new THREE.SphereGeometry(0.11, 8, 8);
  [[_mats.red, 5.82], [_mats.yellow, 5.47], [_mats.green, 5.12]].forEach(([mat, by]) => {
    const b = new THREE.Mesh(bulbGeo, mat);
    b.position.set(bx, by, z);
    group.add(b);
  });
}

function _addXDashes(group, xStart, xEnd, z, y, color, dashLen, gapLen) {
  const mat   = new THREE.MeshBasicMaterial({ color });
  const total = dashLen + gapLen;
  for (let x = xStart + dashLen / 2; x < xEnd; x += total) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(dashLen, 0.13), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    group.add(m);
  }
}

function _addXLine(group, xStart, xEnd, z, y, color) {
  const len = xEnd - xStart;
  const m   = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.15), new THREE.MeshBasicMaterial({ color }));
  m.rotation.x = -Math.PI / 2;
  m.position.set((xStart + xEnd) / 2, y, z);
  group.add(m);
}

function _addStopLine(group, xStart, xEnd, z, y) {
  const len = xEnd - xStart;
  const m   = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.45), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  m.rotation.x = -Math.PI / 2;
  m.position.set((xStart + xEnd) / 2, y, z);
  group.add(m);
}
