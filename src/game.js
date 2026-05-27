import * as THREE from 'three';
import { Car } from './car.js';
import { Controls } from './controls.js';
import { buildRoad } from './world/roadBuilder.js';
import { buildScenery } from './world/scenery.js';
import { RulesEngine } from './rules/rulesEngine.js';
import { Coach } from './coaching/coach.js';
import { HUD } from './ui/hud.js';

const ROAD_WRAP_SOUTH = 170;   // teleport car back when it travels past this Z (south)
const ROAD_WRAP_NORTH = -160;  // teleport car back when it passes this Z (north)

export class Game {
  constructor(renderer) {
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 120, 300);

    this.controls    = new Controls();
    this.car         = new Car(this.scene);
    this.rulesEngine = new RulesEngine();
    this.coach       = new Coach();
    this.hud         = new HUD();

    buildScenery(this.scene);
    buildRoad(this.scene);
    this._setupLights();

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.car.resize(w, h);
  }

  _setupLights() {
    // Soft ambient fill
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    // Directional sun (slightly warm, from the south-west above)
    const sun = new THREE.DirectionalLight(0xfff0cc, 1.1);
    sun.position.set(40, 90, 60);
    this.scene.add(sun);

    // Subtle fill from the sky side
    const fill = new THREE.DirectionalLight(0xccddff, 0.3);
    fill.position.set(-20, 30, -60);
    this.scene.add(fill);
  }

  update(dt) {
    this.car.update(dt, this.controls.state);

    // Loop road: when car exits either end, wrap to the other end
    if (this.car.position.z < ROAD_WRAP_NORTH) this.car.position.z = ROAD_WRAP_SOUTH - 5;
    if (this.car.position.z > ROAD_WRAP_SOUTH) this.car.position.z = ROAD_WRAP_NORTH + 5;

    const violations = this.rulesEngine.check(this.car);
    this.coach.update(dt, violations);
    this.hud.update(this.car, this.coach, this.controls.state, dt);
  }

  render() {
    this.renderer.render(this.scene, this.car.camera);
  }
}
