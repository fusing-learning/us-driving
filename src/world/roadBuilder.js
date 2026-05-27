import * as THREE from 'three';

export const ROAD_LENGTH = 380;
export const ROAD_HALF   = ROAD_LENGTH / 2;
export const LANE_WIDTH  = 4;
export const ROAD_WIDTH  = LANE_WIDTH * 2; // 8 — two lanes
// Right lane (player going north/−Z): X = 0..4, center at X = 2
// Left lane  (oncoming):              X = −4..0, center at X = −2
// Center line at X = 0

export function buildRoad(scene) {
  const group = new THREE.Group();

  // Asphalt surface
  const asphaltGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
  const asphalt = new THREE.Mesh(asphaltGeo, asphaltMat);
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(0, 0.01, 0);
  group.add(asphalt);

  // ── Center line: double yellow dashed (no-pass both directions) ─────────
  _addDashes(group, -0.1, 0.022, 0xffcc00, 6, 5); // left yellow
  _addDashes(group,  0.1, 0.022, 0xffcc00, 6, 5); // right yellow

  // ── Right edge: solid white ─────────────────────────────────────────────
  _addSolidLine(group,  4.0, 0.022, 0xffffff);
  // ── Left edge: solid white ──────────────────────────────────────────────
  _addSolidLine(group, -4.0, 0.022, 0xffffff);

  // ── Curbs ───────────────────────────────────────────────────────────────
  _addCurb(group,  4.2);
  _addCurb(group, -4.2);

  // ── Sidewalks ───────────────────────────────────────────────────────────
  _addSidewalk(group,  5.8);
  _addSidewalk(group, -5.8);

  scene.add(group);
  return group;
}

function _addDashes(group, x, y, color, dashLen, gapLen) {
  const mat = new THREE.MeshBasicMaterial({ color });
  const total = dashLen + gapLen;
  for (let z = ROAD_HALF - dashLen / 2; z > -ROAD_HALF; z -= total) {
    const geo = new THREE.PlaneGeometry(0.13, dashLen);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
  }
}

function _addSolidLine(group, x, y, color) {
  const geo = new THREE.PlaneGeometry(0.15, ROAD_LENGTH);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, 0);
  group.add(mesh);
}

// Gap left for the intersection (cross-street must fit through cleanly)
const INTER_GAP   = 8;
const SEG_LEN     = ROAD_HALF - INTER_GAP;               // 190 − 8 = 182
const SEG_CENTER  = (ROAD_HALF + INTER_GAP) / 2;         // (190 + 8) / 2 = 99

function _addCurb(group, x) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x999999 });
  [SEG_CENTER, -SEG_CENTER].forEach(cz => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, SEG_LEN), mat);
    curb.position.set(x, 0.075, cz);
    group.add(curb);
  });
}

function _addSidewalk(group, x) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
  [SEG_CENTER, -SEG_CENTER].forEach(cz => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, SEG_LEN), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, cz);
    group.add(mesh);
  });
}
