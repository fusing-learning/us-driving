import { NpcCar } from './npcCar.js';

const COLORS = [0xcc3322, 0xccaa22, 0x22aa44, 0xcc22aa, 0x446688, 0x888899];

export class TrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.npcs = [];
    this.currentZone = null;
  }

  update(dt, lightState, playerPos) {
    if (!playerPos) return;

    const pz = playerPos.z;
    let zone = 'south';
    if (pz < -400) {
      zone = 'roundabout';
    } else if (pz < -150) {
      zone = 'stopsign';
    }

    if (zone !== this.currentZone) {
      this._changeZone(zone);
    }

    this.npcs.forEach((npc, i) => npc.update(dt, lightState, this.npcs, i));
  }

  _changeZone(zone) {
    // Clear old NPCs from scene and dispose memory
    this.npcs.forEach(npc => {
      this.scene.remove(npc.group);
      npc.group.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.npcs = [];
    this.currentZone = zone;

    if (zone === 'south') {
      // Spawn 6 South NPCs
      const START_ZS = [-152, -105, -58, -10, 42, 100];
      this.npcs = START_ZS.map((z, i) => new NpcCar(this.scene, z, COLORS[i % COLORS.length], 'main-road'));
    } else if (zone === 'stopsign') {
      // Spawn 2 Stop Sign NPCs:
      // 1 Westbound cross-street NPC starting at X = 45, Z = -302
      // 1 Southbound main-road NPC starting at Z = -350
      this.npcs = [
        new NpcCar(this.scene, 45, COLORS[0], 'cross-street'),
        new NpcCar(this.scene, -350, COLORS[1], 'main-road')
      ];
    } else if (zone === 'roundabout') {
      // Spawn 2 Roundabout NPCs in CCW flow
      this.npcs = [
        new NpcCar(this.scene, 0, COLORS[2], 'roundabout', 0),
        new NpcCar(this.scene, 0, COLORS[3], 'roundabout', Math.PI)
      ];
    }
  }
}
