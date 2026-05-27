const MESSAGES = {
  WRONG_LANE:   { text: '⚠ WRONG LANE — Keep RIGHT!',          color: '#ff3333', priority: 10, cooldown: 2.5, isMistake: true  },
  LANE_WARNING: { text: 'Drifting — stay right of centre line', color: '#ffaa00', priority:  5, cooldown: 4.0, isMistake: false },
};

export class Coach {
  constructor() {
    this.currentMessage  = null;
    this._displayTimer   = 0;
    this._cooldowns      = {};
    this._prevViolations = new Set();
    this.mistakeCount    = 0;
  }

  update(dt, violations) {
    // Tick cooldowns
    for (const key in this._cooldowns) {
      this._cooldowns[key] = Math.max(0, this._cooldowns[key] - dt);
    }

    // Pick highest-priority uncooled violation
    let best = null;
    for (const key of violations) {
      const def = MESSAGES[key];
      if (!def) continue;
      if (this._cooldowns[key] > 0) continue;
      if (!best || def.priority > best.def.priority) best = { key, def };
    }

    if (best) {
      const isNew = !this._prevViolations.has(best.key);
      if (best.def.isMistake && isNew) this.mistakeCount++;
      this._cooldowns[best.key] = best.def.cooldown;
      this.currentMessage = best.def;
      this._displayTimer  = 3.5;
    }

    this._prevViolations = new Set(violations);

    if (this._displayTimer > 0) {
      this._displayTimer -= dt;
      if (this._displayTimer <= 0) this.currentMessage = null;
    }
  }
}
