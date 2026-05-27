import * as THREE from 'three';
import { Car } from './car.js';
import { Controls } from './controls.js';
import { buildRoad } from './world/roadBuilder.js';
import { buildScenery } from './world/scenery.js';
import { buildIntersection, updateLightVisuals, INTERSECTION } from './world/intersection.js';
import { TrafficLight } from './rules/lights.js';
import { TrafficManager } from './traffic/trafficManager.js';
import { RulesEngine } from './rules/rulesEngine.js';
import { Coach } from './coaching/coach.js';
import { HUD } from './ui/hud.js';

const ROAD_WRAP_SOUTH =  170;
const ROAD_WRAP_NORTH = -160;

export class Game {
  constructor(renderer) {
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 120, 300);

    this.controls       = new Controls();
    this.car            = new Car(this.scene);
    this.light          = new TrafficLight();
    this.trafficManager = new TrafficManager(this.scene);
    this.rulesEngine    = new RulesEngine();
    this.coach          = new Coach();
    this.hud            = new HUD();

    buildScenery(this.scene);
    buildRoad(this.scene);
    const { bulbMats } = buildIntersection(this.scene);
    this._bulbMats = bulbMats;

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
    // Capture Z before car moves (needed for stop-line crossing detection)
    const prevZ = this.car.position.z;

    this.car.update(dt, this.controls.state);

    // Road loop
    if (this.car.position.z < ROAD_WRAP_NORTH) this.car.position.z = ROAD_WRAP_SOUTH - 5;
    if (this.car.position.z > ROAD_WRAP_SOUTH) this.car.position.z = ROAD_WRAP_NORTH + 5;

    // Traffic light tick + visual update
    this.light.update(dt);
    updateLightVisuals(this._bulbMats, this.light.state);

    // NPC cars
    this.trafficManager.update(dt, this.light.state);

    // Rules → coaching → HUD
    const context    = { light: this.light, intersection: INTERSECTION, prevZ };
    const violations = this.rulesEngine.check(this.car, context);
    this.coach.update(dt, violations);
    this.hud.update(this.car, this.coach, this.controls.state, dt);
  }

  render() {
    this.renderer.render(this.scene, this.car.camera);
  }
}
