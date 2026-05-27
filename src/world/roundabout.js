import * as THREE from 'three';

// US roundabout centered at (CX, CZ).
// Traffic flows COUNTER-CLOCKWISE (from above).
// Entering from the south: yield, then turn RIGHT (east) to join CCW flow.
// Singapore roundabouts are CLOCKWISE — the opposite — which is the key skill here.

const CX   = 0;
const CZ   = -500;
const R_IN  = 11;   // inner radius (island edge)
const R_OUT = 22;   // outer radius (road edge)

export const ROUNDABOUT = { cx: CX, cz: CZ, rIn: R_IN, rOut: R_OUT };

export function buildRoundabout(scene) {
  const group = new THREE.Group();

  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
  const grassMat   = new THREE.MeshLambertMaterial({ color: 0x3a6b30 });
  const curbMat    = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const whiteMat   = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const yellowMat  = new THREE.MeshBasicMaterial({ color: 0xffcc00 });

  // ── Ring road surface ─────────────────────────────────────────────────
  const ring = new THREE.Mesh(new THREE.RingGeometry(R_IN, R_OUT, 48), asphaltMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(CX, 0.02, CZ);
  group.add(ring);

  // ── Center island (grass) ──────────────────────────────────────────────
  const island = new THREE.Mesh(new THREE.CircleGeometry(R_IN - 0.4, 32), grassMat);
  island.rotation.x = -Math.PI / 2;
  island.position.set(CX, 0.04, CZ);
  group.add(island);

  // Island curb ring
  const curb = new THREE.Mesh(new THREE.TorusGeometry(R_IN - 0.2, 0.25, 6, 48), curbMat);
  curb.rotation.x = Math.PI / 2;
  curb.position.set(CX, 0.25, CZ);
  group.add(curb);

  // ── Outer edge line (white) ────────────────────────────────────────────
  const outerEdge = new THREE.Mesh(
    new THREE.RingGeometry(R_OUT - 0.18, R_OUT, 48),
    whiteMat
  );
  outerEdge.rotation.x = -Math.PI / 2;
  outerEdge.position.set(CX, 0.03, CZ);
  group.add(outerEdge);

  // ── Dashed yellow lane-centre circle ──────────────────────────────────
  // rotation.y = angle makes the PlaneGeometry(dashArcLen, 0.13) width point
  // along the CCW tangent direction at each dash position (proven in design doc).
  const R_LANE    = (R_IN + R_OUT) / 2;   // 16.5
  const NDASH     = 24;
  const dashArcLen = 2 * Math.PI * R_LANE / NDASH * 0.55;

  for (let i = 0; i < NDASH; i++) {
    const angle = (i / NDASH) * Math.PI * 2;
    const px    = CX + Math.sin(angle) * R_LANE;
    const pz    = CZ + Math.cos(angle) * R_LANE;
    const dash  = new THREE.Mesh(new THREE.PlaneGeometry(dashArcLen, 0.13), yellowMat);
    dash.rotation.x = -Math.PI / 2;
    dash.rotation.y = angle;
    dash.position.set(px, 0.035, pz);
    group.add(dash);
  }

  // ── CCW direction chevrons at N/E/S/W ──────────────────────────────────
  [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].forEach(angle => {
    _chevron(group, angle, R_LANE, whiteMat);
  });

  // ── Yield line at south entry ──────────────────────────────────────────
  _yieldLine(group);

  // ── Yield signs flanking the south entry ──────────────────────────────
  _yieldSign(group,  5.2, CZ + R_OUT + 3);
  _yieldSign(group, -5.2, CZ + R_OUT + 3);

  scene.add(group);
  return { group };
}

// Chevron arrow pointing in CCW tangential direction at circle angle `angle`.
// angle=0 = south side of circle; CCW flow goes east there.
function _chevron(group, angle, r, mat) {
  const px = CX + Math.sin(angle) * r;
  const pz = CZ + Math.cos(angle) * r;
  // Radial direction (outward): (sin(angle), 0, cos(angle))
  const rx = Math.sin(angle), rz = Math.cos(angle);
  // CCW tangent direction: (cos(angle), 0, -sin(angle))
  const tx = Math.cos(angle), tz = -Math.sin(angle);

  const WING = 0.6;  // half-angle of V in radians
  [-1, 1].forEach(sign => {
    const arm = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.14), mat);
    arm.rotation.x = -Math.PI / 2;
    arm.rotation.y = angle + sign * WING;
    arm.position.set(
      px + tx * 0.2 + rx * sign * 0.45,
      0.04,
      pz + tz * 0.2 + rz * sign * 0.45
    );
    group.add(arm);
  });
}

function _yieldLine(group) {
  // Dashed white transverse line at the south entry of the ring
  const Z_LINE = CZ + R_OUT - 0.5;
  const whtMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let x = -3.6; x <= 3.6; x += 1.4) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), whtMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.04, Z_LINE);
    group.add(m);
  }
}

function _yieldSign(group, x, z) {
  const poleMat  = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const redMat   = new THREE.MeshLambertMaterial({ color: 0xcc0000 });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), poleMat);
  pole.position.set(x, 1.4, z);
  group.add(pole);

  // Red equilateral-triangle border (ConeGeometry, 3 sides)
  const border = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.56, 3), redMat);
  border.rotation.y = Math.PI;
  border.position.set(x, 2.9, z);
  group.add(border);

  // White inner triangle
  const face = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.56, 3), whiteMat);
  face.rotation.y = Math.PI;
  face.position.set(x, 2.9, z - 0.01);
  group.add(face);
}
