const DURATIONS = { green: 9, yellow: 2.5, red: 9 };

export class TrafficLight {
  constructor() {
    this.state  = 'green';
    this._timer = DURATIONS.green;
  }

  update(dt) {
    this._timer -= dt;
    if (this._timer <= 0) {
      const next = { green: 'yellow', yellow: 'red', red: 'green' };
      this.state  = next[this.state];
      this._timer = DURATIONS[this.state];
    }
  }

  // State seen by the perpendicular (cross-street) traffic
  get crossState() {
    return this.state === 'red' ? 'green' : 'red';
  }
}
