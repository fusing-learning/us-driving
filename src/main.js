import * as THREE from 'three';
import { Game } from './game.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('app').prepend(renderer.domElement);

const game = new Game(renderer);

let last = performance.now();
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 0.05); // cap at 50 ms to survive tab-hidden spikes
  last = ts;
  game.update(dt);
  game.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
