import * as THREE from 'three';
import { INTERSECTION } from '../world/intersection.js';

const NPC_SPEED     = 7.5;  // m/s (~17 mph)
const BRAKE_DIST    = 22;   // start braking this many units before stop line
const FOLLOW_GAP    = 7;    // minimum gap to NPC ahead (units)

export class NpcCar {
  constructor(scene, startZ, color) {
    this.position = new THREE.Vector3(-2, 0, startZ);
    this.heading  = Math.PI; // facing south (+Z)
    this.speed    = NPC_SPEED;

    this.group = new THREE.Group();
    scene.add(this.group);
    this._buildMeshes(color);
    this._sync();
  }

  _buildMeshes(color) {
    // Body
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body    = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 3.8), bodyMat);
    body.position.set(0, 0.65, 0);
    this.group.add(body);

    // Roof (slightly darker)
    const roofMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.7) });
    const roof    = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), roofMat);
    roof.position.set(0, 1.575, -0.1);
    this.group.add(roof);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 10);
    const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    [[-0.98, 0.28, -1.3], [0.98, 0.28, -1.3], [-0.98, 0.28, 1.3], [0.98, 0.28, 1.3]]
      .forEach(([x, y, z]) => {
        const w = new THREE.Mesh(wGeo, wMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, y, z);
        this.group.add(w);
      });

    // Headlights (front = local −Z, which is world +Z when heading=PI)
    const hlMat = new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: new THREE.Color(0xffffaa) });
    const hlGeo = new THREE.SphereGeometry(0.1, 6, 6);
    [-0.55, 0.55].forEach(hx => {
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(hx, 0.6, -1.85);
      this.group.add(hl);
    });

    // Taillights (back = local +Z = world −Z when heading=PI)
    const tlMat = new THREE.MeshLambertMaterial({ color: 0xff2200, emissive: new THREE.Color(0x660000) });
    [-0.55, 0.55].forEach(tx => {
      const tl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), tlMat);
      tl.position.set(tx, 0.6, 1.85);
      this.group.add(tl);
    });
  }

  _sync() {
    this.group.position.copy(this.position);
    this.group.position.y = 0;
    this.group.rotation.y = this.heading;
  }

  update(dt, lightState, allNpcZs) {
    // ── Following distance: check for NPC directly ahead (higher Z = south = ahead) ──
    let tooClose = false;
    for (const oz of allNpcZs) {
      if (oz === this.position.z) continue;
      const gap = oz - this.position.z; // positive = that NPC is ahead (south of us)
      if (gap > 0 && gap < FOLLOW_GAP) { tooClose = true; break; }
    }

    // ── Stop-line approach logic ──────────────────────────────────────────
    // distToStop > 0 → NPC hasn't reached stop line yet (approaching from north)
    const distToStop = INTERSECTION.stopLineNorth - this.position.z;
    const approachingRed = distToStop > 0 && distToStop < BRAKE_DIST && lightState !== 'green';
    const atStopLine     = distToStop > -0.5 && distToStop < 0.8;

    let targetSpeed = NPC_SPEED;
    if (tooClose) {
      targetSpeed = 0;
    } else if (approachingRed) {
      // Ramp speed down linearly as we near stop line
      targetSpeed = NPC_SPEED * (distToStop / BRAKE_DIST);
    }

    // Hard clamp at stop line when red/yellow
    if (atStopLine && lightState !== 'green') {
      this.speed = 0;
      this.position.z = INTERSECTION.stopLineNorth - 0.3;
      targetSpeed = 0;
    }

    // Smooth to target speed
    const accel = targetSpeed > this.speed ? 3 : 10;
    this.speed += (targetSpeed - this.speed) * accel * dt;
    this.speed  = Math.max(0, Math.min(NPC_SPEED, this.speed));

    // ── Move (heading = π  →  sin(π)≈0, −cos(π)=+1, so z increases) ────
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z -= Math.cos(this.heading) * this.speed * dt;

    // ── Wrap to north end of road ─────────────────────────────────────────
    if (this.position.z > 175) {
      this.position.z = -155;
      this.speed      = NPC_SPEED;
    }

    this._sync();
  }
}
