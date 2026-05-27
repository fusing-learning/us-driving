import * as THREE from 'three';
import { clamp } from './utils/math.js';

const MAX_SPEED    = 15;   // m/s (~33 mph)
const ACCEL        = 9;    // m/s²
const BRAKE        = 16;   // m/s²
const DRAG         = 2.5;  // m/s² coast friction
const STEER_RATE   = 1.6;  // rad/s at low speed
const STEER_DAMP   = 0.25; // reduces steer rate as speed increases

export class Car {
  constructor(scene) {
    this.position = new THREE.Vector3(2, 0, 120);
    this.heading  = 0; // 0 = facing −Z (north). Increases clockwise from above.
    this.speed    = 0;
    this._bobPhase = 0;

    this.group = new THREE.Group();
    scene.add(this.group);

    this._buildMeshes();
    this._buildCamera();
  }

  _buildMeshes() {
    // ── Car body (layer 1 → invisible to FPV camera layer 0) ──────────────
    const bodyGeo = new THREE.BoxGeometry(2, 1.35, 4.2);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2255cc });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.set(0, 0.68, 0);
    this.bodyMesh.layers.set(1);
    this.group.add(this.bodyMesh);

    // Wheels (layer 1, visual only from outside view later)
    const wheelPositions = [
      [-1.1, 0.3, -1.4], [1.1, 0.3, -1.4],
      [-1.1, 0.3,  1.4], [1.1, 0.3,  1.4],
    ];
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 12);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    wheelPositions.forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      w.layers.set(1);
      this.group.add(w);
    });

    // ── Interior / cockpit (layer 0 → visible to FPV camera) ─────────────

    // Dashboard – dark shelf spanning the cabin width
    const dashGeo = new THREE.BoxGeometry(1.85, 0.13, 0.52);
    const dashMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(0.05, 1.02, -0.52);
    this.group.add(dash);

    // Dashboard face (instrument cluster panel, slightly lighter)
    const panelGeo = new THREE.BoxGeometry(1.82, 0.34, 0.05);
    const panelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0.05, 1.22, -0.78);
    this.group.add(panel);

    // Steering wheel column (pillar)
    const colGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8);
    const colMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const column = new THREE.Mesh(colGeo, colMat);
    column.position.set(-0.29, 0.87, -0.68);
    column.rotation.x = 0.45;
    this.group.add(column);

    // Steering wheel rim (torus on the LEFT side – US left-seat car)
    const torusGeo = new THREE.TorusGeometry(0.175, 0.027, 8, 28);
    const wheelMat2 = new THREE.MeshLambertMaterial({ color: 0x0d0d0d });
    this.steeringWheel = new THREE.Mesh(torusGeo, wheelMat2);
    this.steeringWheel.position.set(-0.29, 1.09, -0.74);
    this.steeringWheel.rotation.x = Math.PI / 2 - 0.45;
    this.group.add(this.steeringWheel);

    // Steering wheel center hub
    const hubGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8);
    const hub = new THREE.Mesh(hubGeo, colMat);
    hub.position.copy(this.steeringWheel.position);
    hub.rotation.copy(this.steeringWheel.rotation);
    this.group.add(hub);

    // Hood edge – thin strip at far end of dash (gives perspective depth)
    const hoodGeo = new THREE.BoxGeometry(1.8, 0.05, 0.12);
    const hoodMat = new THREE.MeshLambertMaterial({ color: 0x2255cc });
    const hoodEdge = new THREE.Mesh(hoodGeo, hoodMat);
    hoodEdge.position.set(0.05, 0.99, -1.08);
    this.group.add(hoodEdge);

    // Left A-pillar (door frame left side)
    const pillarGeo = new THREE.BoxGeometry(0.07, 0.55, 0.07);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-0.9, 1.35, -0.68);
    leftPillar.rotation.z = 0.15;
    this.group.add(leftPillar);

    // Right A-pillar
    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(0.9, 1.35, -0.68);
    rightPillar.rotation.z = -0.15;
    this.group.add(rightPillar);

    // Left wing mirror (sticks out to the LEFT – driver side for US cars)
    const mirrorBodyGeo = new THREE.BoxGeometry(0.09, 0.14, 0.22);
    const mirrorMat = new THREE.MeshLambertMaterial({ color: 0x2255cc });
    const mirrorBody = new THREE.Mesh(mirrorBodyGeo, mirrorMat);
    mirrorBody.position.set(-1.08, 1.38, 0.45);
    mirrorBody.layers.set(1);
    this.group.add(mirrorBody);

    // Left mirror glass (visible from inside as a small rectangle)
    const mirrorGlassGeo = new THREE.BoxGeometry(0.01, 0.1, 0.18);
    const mirrorGlassMat = new THREE.MeshLambertMaterial({ color: 0x334455 });
    const mirrorGlass = new THREE.Mesh(mirrorGlassGeo, mirrorGlassMat);
    mirrorGlass.position.set(-1.07, 1.38, 0.45);
    this.group.add(mirrorGlass);
  }

  _buildCamera() {
    // Driver's eye: left side (−X), eye height, slightly back of car center
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 600);
    this.camera.position.set(-0.44, 1.55, 0.28);
    this.group.add(this.camera);
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(dt, controls) {
    // ── Throttle / brake ─────────────────────────────────────────────────
    if (controls.forward) {
      this.speed = Math.min(this.speed + ACCEL * dt, MAX_SPEED);
    } else if (controls.back) {
      if (this.speed > 0.2) {
        this.speed = Math.max(this.speed - BRAKE * dt, 0);
      } else {
        this.speed = Math.max(this.speed - ACCEL * 0.4 * dt, -MAX_SPEED * 0.3);
      }
    } else {
      const drag = DRAG * dt * Math.sign(this.speed);
      if (Math.abs(this.speed) > Math.abs(drag)) this.speed -= drag;
      else this.speed = 0;
    }

    // ── Steering (speed-dependent rate) ──────────────────────────────────
    const steerNow = STEER_RATE / (1 + Math.abs(this.speed) * STEER_DAMP);
    if (controls.left)  this.heading -= steerNow * dt;
    if (controls.right) this.heading += steerNow * dt;

    // Heading auto-straightening removed as it forces alignment to world North (0 heading).

    // ── Move ─────────────────────────────────────────────────────────────
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z -= Math.cos(this.heading) * this.speed * dt;

    // ── Camera bob (road feel) ────────────────────────────────────────────
    this._bobPhase += Math.abs(this.speed) * dt * 3.5;
    const bobAmt = Math.min(Math.abs(this.speed) / 8, 1) * 0.018;
    this.camera.position.y = 1.55 + Math.sin(this._bobPhase) * bobAmt;

    // ── Steering wheel rotation ───────────────────────────────────────────
    const steerVis = clamp((controls.left ? -1 : controls.right ? 1 : 0) * 1.4, -1.4, 1.4);
    if (this.steeringWheel) this.steeringWheel.rotation.z += (steerVis - this.steeringWheel.rotation.z) * 0.2;

    // ── Reset ─────────────────────────────────────────────────────────────
    if (controls.reset) {
      this.position.set(2, 0, 120);
      this.heading = 0;
      this.speed   = 0;
    }

    // ── Apply to scene group ──────────────────────────────────────────────
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
  }

  get speedMph() {
    return Math.abs(this.speed) * 2.237;
  }
}
