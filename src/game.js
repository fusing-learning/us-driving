import * as THREE from 'three';
import { Car, MIRROR_W, MIRROR_H } from './car.js';
import { Controls } from './controls.js';
import { buildRoad } from './world/roadBuilder.js';
import { buildScenery } from './world/scenery.js';
import { buildIntersection, updateLightVisuals, INTERSECTION } from './world/intersection.js';
import { buildNorthRoad } from './world/northRoad.js';
import { buildStopSignIntersection, STOP_SIGN_INTERSECTION } from './world/stopSignIntersection.js';
import { buildRoundabout, ROUNDABOUT } from './world/roundabout.js';
import { TrafficLight } from './rules/lights.js';
import { TrafficManager } from './traffic/trafficManager.js';
import { RulesEngine } from './rules/rulesEngine.js';
import { Coach } from './coaching/coach.js';
import { HUD } from './ui/hud.js';

const ROAD_WRAP_SOUTH =  170;
const ROAD_WRAP_NORTH = -740;

const MIRROR_TOP_PAD = 14;  // px from top of canvas

export class Game {
  constructor(renderer, startZ = 80, onMenu = null) {
    this.renderer     = renderer;
    this._onMenu      = onMenu;
    this.paused       = false;
    this._sessionTime = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 120, 300);

    this.controls       = new Controls();
    this.car            = new Car(this.scene, startZ);
    this.light          = new TrafficLight();
    this.trafficManager = new TrafficManager(this.scene);
    this.rulesEngine    = new RulesEngine();
    this.coach          = new Coach();
    this.hud            = new HUD({
      onMenu,
      onResume: () => { this.paused = false; this.hud.setPaused(false); },
    });

    this._stoppedAtStop = false;
    this._onCurb        = false;

    buildScenery(this.scene);
    buildRoad(this.scene);
    const { bulbMats, crossBulbMats } = buildIntersection(this.scene);
    this._bulbMats      = bulbMats;
    this._crossBulbMats = crossBulbMats;
    buildNorthRoad(this.scene);
    buildStopSignIntersection(this.scene);
    buildRoundabout(this.scene);

    this._setupLights();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.car.resize(w, h);
  }

  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const sun = new THREE.DirectionalLight(0xfff0cc, 1.1);
    sun.position.set(40, 90, 60);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xccddff, 0.3);
    fill.position.set(-20, 30, -60);
    this.scene.add(fill);
  }

  update(dt) {
    if (this.controls.consumePause()) {
      this.paused = !this.paused;
      this.hud.setPaused(this.paused, this._sessionTime, this.coach.mistakeCount);
    }
    if (this.paused) return;

    this._sessionTime += dt;

    const prevZ     = this.car.position.z;
    const prevSpeed = this.car.speed;

    this.car.update(dt, this.controls.state, this._onCurb);

    // Road loop — track teleport so crossing detection isn't triggered by the wrap
    let wrapped = false;
    if (this.car.position.z < ROAD_WRAP_NORTH) { this.car.position.z = ROAD_WRAP_SOUTH - 5; wrapped = true; }
    if (this.car.position.z > ROAD_WRAP_SOUTH) { this.car.position.z = ROAD_WRAP_NORTH + 5; wrapped = true; }
    if (wrapped) this._stoppedAtStop = false;

    // Traffic light tick + visual update (main road and cross-street poles separately)
    this.light.update(dt);
    updateLightVisuals(this._bulbMats,      this.light.state);
    updateLightVisuals(this._crossBulbMats, this.light.crossState);

    // NPC cars
    this.trafficManager.update(dt, this.light.state, this.car.position);

    // Stop-sign state: track whether player came to a complete stop before the line
    const cz = this.car.position.z;
    const distToStopLine = cz - STOP_SIGN_INTERSECTION.stopLineSouth;
    if (distToStopLine > 0 && distToStopLine < 10 && this.car.speed < 0.4) {
      this._stoppedAtStop = true;
    }
    if (distToStopLine > 50 || distToStopLine < -25) {
      this._stoppedAtStop = false;
    }

    // Rules → coaching → HUD
    const context = {
      light:        this.light,
      intersection: INTERSECTION,
      prevZ:        wrapped ? undefined : prevZ,
      prevSpeed,
      stopSign:     STOP_SIGN_INTERSECTION,
      stoppedAtStop: this._stoppedAtStop,
      roundabout:   ROUNDABOUT,
    };
    const violations = this.rulesEngine.check(this.car, context);
    this._onCurb = violations.has('CURB_COLLISION');
    this.coach.update(dt, violations);
    this.hud.update(this.car, this.coach, this.controls.state, dt, this._sessionTime);
  }

  render() {
    const w = this.renderer.domElement.width;
    const h = this.renderer.domElement.height;

    // Main FPV — full screen
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.renderer.render(this.scene, this.car.camera);

    // Rear-view mirror — top-center strip (WebGL y=0 is bottom of canvas)
    const mx = Math.floor((w - MIRROR_W) / 2);
    const my = h - MIRROR_H - MIRROR_TOP_PAD;
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(mx, my, MIRROR_W, MIRROR_H);
    this.renderer.setViewport(mx, my, MIRROR_W, MIRROR_H);
    this.renderer.render(this.scene, this.car.mirrorCamera);
    this.renderer.setScissorTest(false);
  }
}
