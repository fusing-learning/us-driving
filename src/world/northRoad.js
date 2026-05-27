import * as THREE from 'three';

// Road extension from Z=-190 northward to Z=-700.
// Two gaps are left open for the Phase C intersections:
//   Z=-290 to Z=-310  (4-way stop at Z=-300)
//   Z=-480 to Z=-520  (roundabout ring at Z=-500, outer radius 22)

const SEGMENTS = [
  { zStart: -190, zEnd: -290 },   // south approach to stop sign
  { zStart: -310, zEnd: -480 },   // between stop sign and roundabout
  { zStart: -520, zEnd: -700 },   // north of roundabout
];

export function buildNorthRoad(scene) {
  const group      = new THREE.Group();
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
  const curbMat    = new THREE.MeshLambertMaterial({ color: 0x999999 });
  const swMat      = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
  const ylwMat     = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const whtMat     = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (const { zStart, zEnd } of SEGMENTS) {
    const len = zStart - zEnd;
    const cz  = (zStart + zEnd) / 2;

    const road = new THREE.Mesh(new THREE.PlaneGeometry(8, len), asphaltMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, cz);
    group.add(road);

    _dashes(group, -0.1, ylwMat, cz, len);
    _dashes(group,  0.1, ylwMat, cz, len);
    _solidLine(group, -4.0, whtMat, cz, len);
    _solidLine(group,  4.0, whtMat, cz, len);
    _curb(group, -4.2, curbMat, cz, len);
    _curb(group,  4.2, curbMat, cz, len);
    _sidewalk(group, -5.8, swMat, cz, len);
    _sidewalk(group,  5.8, swMat, cz, len);
  }

  scene.add(group);
  return group;
}

function _dashes(group, x, mat, cz, len) {
  const DASH = 6, TOTAL = 11;
  for (let z = cz + len / 2 - DASH / 2; z > cz - len / 2; z -= TOTAL) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, DASH), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.022, z);
    group.add(m);
  }
}

function _solidLine(group, x, mat, cz, len) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, len), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.022, cz);
  group.add(m);
}

function _curb(group, x, mat, cz, len) {
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, len), mat);
  c.position.set(x, 0.075, cz);
  group.add(c);
}

function _sidewalk(group, x, mat, cz, len) {
  const s = new THREE.Mesh(new THREE.PlaneGeometry(3.2, len), mat);
  s.rotation.x = -Math.PI / 2;
  s.position.set(x, 0.02, cz);
  group.add(s);
}
