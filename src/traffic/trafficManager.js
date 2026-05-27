import { NpcCar } from './npcCar.js';

const COLORS    = [0xcc3322, 0xccaa22, 0x22aa44, 0xcc22aa, 0x446688, 0x888899];
// Staggered start positions spread across the road so they arrive at the
// intersection at different times and don't all queue together on load.
const START_ZS  = [-152, -105, -58, -10, 42, 100];

export class TrafficManager {
  constructor(scene) {
    this.npcs = START_ZS.map((z, i) => new NpcCar(scene, z, COLORS[i % COLORS.length]));
  }

  update(dt, lightState) {
    // Pass each NPC the Z-positions snapshot and its own index for self-exclusion
    const zs = this.npcs.map(n => n.position.z);
    this.npcs.forEach((npc, i) => npc.update(dt, lightState, zs, i));
  }
}
