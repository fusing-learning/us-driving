const MESSAGES = {
  // Phase A
  WRONG_LANE:           { text: '⚠ WRONG LANE — Keep RIGHT!',                              color: '#ff3333', priority: 10, cooldown: 2.5, isMistake: true  },
  LANE_WARNING:         { text: 'Drifting — stay right of centre line',                     color: '#ffaa00', priority:  5, cooldown: 4.0, isMistake: false },
  CURB_COLLISION:       { text: '💥 CURB COLLISION — Stay on the road!',                   color: '#ff2200', priority: 11, cooldown: 1.5, isMistake: true  },
  // Phase B
  RED_LIGHT_RUN:        { text: '🚨 RED LIGHT VIOLATION!',                                  color: '#ff2222', priority: 15, cooldown: 3.0, isMistake: true  },
  LIGHT_IS_RED:         { text: 'Red light — stop before the line',                         color: '#ff6644', priority:  8, cooldown: 5.0, isMistake: false },
  LIGHT_IS_YELLOW:      { text: 'Yellow — slow down and prepare to stop',                   color: '#ffcc00', priority:  6, cooldown: 4.0, isMistake: false },
  APPROACH_INTERSECTION:{ text: 'Intersection ahead — check signal',                        color: '#aaddff', priority:  2, cooldown: 9.0, isMistake: false },
  STOPPED_AT_RED:       { text: 'Right turn on red ✓ — stop first, yield, then turn right', color: '#88ffbb', priority:  3, cooldown: 7.0, isMistake: false },
  // Phase C
  ROLLED_STOP:          { text: 'ROLLED STOP — Come to a complete stop!',                   color: '#ff3333', priority: 12, cooldown: 3.0, isMistake: true  },
  STOP_SIGN_APPROACH:   { text: 'Stop sign — slow down, stop completely at the line',        color: '#ffaa00', priority:  5, cooldown: 6.0, isMistake: false },
  ROUNDABOUT_WRONG_WAY: { text: 'WRONG WAY — US roundabouts are counter-clockwise!',         color: '#ff2200', priority: 14, cooldown: 2.5, isMistake: true  },
  ROUNDABOUT_ENTRY:     { text: 'Roundabout — yield, turn RIGHT to enter (CCW flow)',        color: '#aaddff', priority:  3, cooldown: 8.0, isMistake: false },
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
