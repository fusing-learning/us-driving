import * as THREE from 'three';
import { Game } from './game.js';
import { Menu } from './ui/menu.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('app').prepend(renderer.domElement);

let game  = null;
let rafId = null;

const menu = new Menu(document.getElementById('menu'), (lesson) => {
  startGame(lesson.startZ);
});
menu.show();

// Three.js scene objects are constructed once per game session. During Vite HMR,
// code changes to camera or mesh setup can otherwise leave the live scene in a
// stale half-updated state, so dev updates should rebuild the page from scratch.
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.location.reload();
  });
}

function startGame(startZ) {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  if (game) game.controls.dispose();

  game = new Game(renderer, startZ, showMenu);

  let last = performance.now();
  function loop(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05); // cap at 50 ms to survive tab-hidden spikes
    last = ts;
    game.update(dt);
    game.render();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

function showMenu() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  if (game) game.controls.dispose();
  game = null;
  // Clear HUD so old content doesn't bleed through
  document.getElementById('hud').innerHTML = '';
  menu.show();
}
