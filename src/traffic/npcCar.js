import * as THREE from 'three';
import { headingToSceneYaw } from '../utils/math.js';
import { INTERSECTION } from '../world/intersection.js';

const NPC_SPEED     = 7.5;  // m/s (~17 mph)
const BRAKE_DIST    = 22;   // start braking this many units before stop line
const FOLLOW_GAP    = 7;    // minimum gap to NPC ahead (units)

export class NpcCar {
  constructor(scene, startZOrX, color, mode = 'main-road', startTheta = 0) {
    this.mode = mode;
    this.theta = startTheta;
    this.hasStoppedAtStopSign = false;
    this.stopTimer = 0;

    if (this.mode === 'roundabout') {
      this.position = new THREE.Vector3(
        Math.sin(this.theta) * 16.5,
        0,
        -500 + Math.cos(this.theta) * 16.5
      );
      this.heading = Math.PI / 2 - this.theta;
    } else if (this.mode === 'cross-street') {
      this.position = new THREE.Vector3(startZOrX, 0, -302);
      this.heading = 3 * Math.PI / 2; // facing West
    } else {
      this.position = new THREE.Vector3(-2, 0, startZOrX);
      this.heading = Math.PI; // facing south (+Z)
    }

    this.speed = NPC_SPEED;

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
    this.group.rotation.y = headingToSceneYaw(this.heading);
  }

  update(dt, lightState, npcs, selfIndex = -1) {
    // ── Following distance: check for NPC directly ahead in travel direction ──
    let tooClose = false;
    const hx = Math.sin(this.heading);
    const hz = -Math.cos(this.heading);
    for (let k = 0; k < npcs.length; k++) {
      if (k === selfIndex) continue;
      const other = npcs[k];
      const dx = other.position.x - this.position.x;
      const dz = other.position.z - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const dot = dx * hx + dz * hz;
      if (dist < FOLLOW_GAP && dot > 0) {
        tooClose = true;
        break;
      }
    }

    let targetSpeed = NPC_SPEED;

    if (this.mode === 'main-road') {
      const distToLight = INTERSECTION.stopLineNorth - this.position.z;
      const approachingRed = distToLight > 0 && distToLight < BRAKE_DIST && lightState !== 'green';
      const atLight        = distToLight >= 0 && distToLight < 0.8;

      const distToStopSign = -306.5 - this.position.z;
      const approachingStop = distToStopSign > 0 && distToStopSign < BRAKE_DIST && !this.hasStoppedAtStopSign;
      const atStopSign      = distToStopSign >= 0 && distToStopSign < 0.8 && !this.hasStoppedAtStopSign;

      if (approachingRed) {
        targetSpeed = NPC_SPEED * (distToLight / BRAKE_DIST);
      } else if (approachingStop) {
        targetSpeed = NPC_SPEED * (distToStopSign / BRAKE_DIST);
      }

      if (tooClose) {
        targetSpeed = 0;
      }

      if (atLight && lightState !== 'green') {
        this.speed = 0;
        this.position.z = INTERSECTION.stopLineNorth - 0.3;
        targetSpeed = 0;
      } else if (atStopSign) {
        this.speed = 0;
        this.position.z = -306.8;
        targetSpeed = 0;
        this.stopTimer += dt;
        if (this.stopTimer >= 2.0) {
          this.hasStoppedAtStopSign = true;
          this.stopTimer = 0;
        }
      }

      const accel = targetSpeed > this.speed ? 3 : 10;
      this.speed += (targetSpeed - this.speed) * accel * dt;
      this.speed  = Math.max(0, Math.min(NPC_SPEED, this.speed));

      this.position.x += Math.sin(this.heading) * this.speed * dt;
      this.position.z -= Math.cos(this.heading) * this.speed * dt;

      if (this.position.z > 175) {
        this.position.z = -155;
        this.speed      = NPC_SPEED;
      }

      if (this.position.z > -290 && this.position.z < -200) {
        this.hasStoppedAtStopSign = false;
        this.stopTimer = 0;
      }
    } else if (this.mode === 'cross-street') {
      const distToStop = this.position.x - 6.5; // stop sign line is at X = 6.5
      const approachingStop = distToStop > 0 && distToStop < BRAKE_DIST && !this.hasStoppedAtStopSign;
      const atStopLine      = distToStop >= 0 && distToStop < 0.8 && !this.hasStoppedAtStopSign;

      if (approachingStop) {
        targetSpeed = NPC_SPEED * (distToStop / BRAKE_DIST);
      }
      if (tooClose) {
        targetSpeed = 0;
      }
      if (atStopLine) {
        this.speed = 0;
        this.position.x = 6.5;
        targetSpeed = 0;
        this.stopTimer += dt;
        if (this.stopTimer >= 2.0) {
          this.hasStoppedAtStopSign = true;
          this.stopTimer = 0;
        }
      }

      const accel = targetSpeed > this.speed ? 3 : 10;
      this.speed += (targetSpeed - this.speed) * accel * dt;
      this.speed  = Math.max(0, Math.min(NPC_SPEED, this.speed));

      this.position.x += Math.sin(this.heading) * this.speed * dt;
      this.position.z -= Math.cos(this.heading) * this.speed * dt;

      if (this.position.x < -50) {
        this.position.x = 50;
        this.speed      = NPC_SPEED;
        this.hasStoppedAtStopSign = false;
        this.stopTimer = 0;
      }
    } else if (this.mode === 'roundabout') {
      if (tooClose) {
        targetSpeed = 0;
      }

      const accel = targetSpeed > this.speed ? 3 : 10;
      this.speed += (targetSpeed - this.speed) * accel * dt;
      this.speed  = Math.max(0, Math.min(NPC_SPEED, this.speed));

      this.theta += (this.speed / 16.5) * dt;
      this.position.x = Math.sin(this.theta) * 16.5;
      this.position.z = -500 + Math.cos(this.theta) * 16.5;
      this.heading = Math.PI / 2 - this.theta;
    }

    this._sync();
  }
}
