import * as THREE from 'three';

const CZ = -300;

export const STOP_SIGN_INTERSECTION = {
  z:             CZ,
  stopLineSouth: CZ + 6.5,   // -293.5 — player (northbound) stops here
  stopLineNorth: CZ - 6.5,   // -306.5 — cross-traffic (symmetry, no NPCs)
};

export function buildStopSignIntersection(scene) {
  const group      = new THREE.Group();
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
  const swMat      = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
  const curbMat    = new THREE.MeshLambertMaterial({ color: 0x999999 });
  const Y    = 0.025;
  const WING = 46;

  // Intersection box
  const box = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 8.2), asphaltMat);
  box.rotation.x = -Math.PI / 2;
  box.position.set(0, Y, CZ);
  group.add(box);

  // Cross-street wings + sidewalks
  [-(4 + WING / 2), (4 + WING / 2)].forEach(cx => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(WING, 8), asphaltMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(cx, Y, CZ);
    group.add(road);

    [-5.6, 5.6].forEach(sz => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(WING, 3.2), swMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(cx, 0.02, CZ + sz);
      group.add(sw);
    });
  });

  // Cross-street curbs
  [-4.2, 4.2].forEach(oz => {
    [-1, 1].forEach(side => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(WING, 0.15, 0.4), curbMat);
      c.position.set(side * (4 + WING / 2), 0.075, CZ + oz);
      group.add(c);
    });
  });

  // Cross-street lane markings (along X axis)
  const DY = 0.03;
  _xDashes(group, -50, -5, CZ,     DY, 0xffcc00, 5, 4);
  _xDashes(group,   5, 50, CZ,     DY, 0xffcc00, 5, 4);
  _xLine(group, -50, -4, CZ - 4,   DY, 0xffffff);
  _xLine(group, -50, -4, CZ + 4,   DY, 0xffffff);
  _xLine(group,   4, 50, CZ - 4,   DY, 0xffffff);
  _xLine(group,   4, 50, CZ + 4,   DY, 0xffffff);

  // Stop lines across the main road
  _stopLine(group,  0.1,  3.9,  STOP_SIGN_INTERSECTION.stopLineSouth, DY);
  _stopLine(group, -3.9, -0.1,  STOP_SIGN_INTERSECTION.stopLineNorth, DY);

  // Stop signs — all four corners
  _stopSign(group,  4.8, CZ + 7.2);   // SE, faces northbound player
  _stopSign(group, -4.8, CZ + 7.2);   // SW
  _stopSign(group,  4.8, CZ - 7.2);   // NE
  _stopSign(group, -4.8, CZ - 7.2);   // NW

  scene.add(group);
  return { group };
}

function _stopSign(group, x, z) {
  const poleMat  = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const redMat   = new THREE.MeshLambertMaterial({ color: 0xcc0000 });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 6), poleMat);
  pole.position.set(x, 1.6, z);
  group.add(pole);

  // White octagon border (slightly larger, behind the red face)
  const border = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 8), whiteMat);
  border.rotation.x = Math.PI / 2;
  border.position.set(x, 3.1, z + 0.02);
  group.add(border);

  // Red octagon face — rotation.x = PI/2 makes flat faces point north/south
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 0.05, 8), redMat);
  face.rotation.x = Math.PI / 2;
  face.position.set(x, 3.1, z);
  group.add(face);
}

function _xDashes(group, xStart, xEnd, z, y, color, dashLen, gapLen) {
  const mat   = new THREE.MeshBasicMaterial({ color });
  const total = dashLen + gapLen;
  for (let x = xStart + dashLen / 2; x < xEnd; x += total) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(dashLen, 0.13), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    group.add(m);
  }
}

function _xLine(group, xStart, xEnd, z, y, color) {
  const len = xEnd - xStart;
  const m   = new THREE.Mesh(
    new THREE.PlaneGeometry(len, 0.15),
    new THREE.MeshBasicMaterial({ color })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set((xStart + xEnd) / 2, y, z);
  group.add(m);
}

function _stopLine(group, xStart, xEnd, z, y) {
  const len = xEnd - xStart;
  const m   = new THREE.Mesh(
    new THREE.PlaneGeometry(len, 0.45),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set((xStart + xEnd) / 2, y, z);
  group.add(m);
}
