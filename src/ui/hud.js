export class HUD {
  constructor({ onMenu = null, onResume = null } = {}) {
    const el = document.getElementById('hud');
    el.innerHTML = `
      <!-- Speed display (bottom-right) -->
      <div class="hud-panel hud-speed">
        <span id="hud-mph" class="hud-speed-mph">0</span> <span class="hud-speed-unit">mph</span><br>
        <span id="hud-kmh" class="hud-speed-kmh">0</span> <span class="hud-speed-unit-kmh">km/h</span>
      </div>

      <!-- Coaching message (below mirror, top-center) -->
      <div id="hud-coach" class="hud-coach"></div>

      <!-- Session stats (top-right) -->
      <div class="hud-panel hud-stats">
        <span id="hud-timer">0:00</span><br>
        <span id="hud-mistakes">Mistakes: 0</span>
      </div>

      <!-- Lesson objective (top-left) -->
      <div id="hud-obj" class="hud-panel hud-objective"></div>

      <!-- Rear-view mirror frame (decorative border over the WebGL mirror render) -->
      <div class="hud-mirror-frame">
        <div class="hud-mirror-label">REAR VIEW</div>
      </div>

      <!-- Turn-signal indicators (bottom-center) -->
      <div class="hud-signals">
        <div id="hud-sig-l" class="hud-sig-arrow">&#9664; &#9664;</div>
        <div id="hud-sig-r" class="hud-sig-arrow">&#9654; &#9654;</div>
      </div>

      <!-- Controls hint (bottom-left) -->
      <div class="hud-panel hud-controls-hint">
        W / &#8593;  Accelerate<br>
        S / &#8595;  Brake / Reverse<br>
        A / &#8592;  Steer left&nbsp;&nbsp; D / &#8594;  Steer right<br>
        Q  Signal left&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;E  Signal right<br>
        R  Reset position&nbsp;&nbsp;&nbsp;P  Pause
      </div>

      <!-- Pause overlay -->
      <div id="hud-pause" class="hud-overlay">
        <div class="hud-overlay-title">PAUSED</div>
        <div id="hud-pause-stats" class="hud-overlay-stats"></div>
        <div class="hud-btn-container">
          <button id="hud-resume" class="btn btn-primary">Resume (P)</button>
          <button id="hud-menu-btn" class="btn btn-secondary">Menu</button>
        </div>
      </div>
    `;

    this._mph        = document.getElementById('hud-mph');
    this._kmh        = document.getElementById('hud-kmh');
    this._coach      = document.getElementById('hud-coach');
    this._mistakes   = document.getElementById('hud-mistakes');
    this._timer      = document.getElementById('hud-timer');
    this._sigL       = document.getElementById('hud-sig-l');
    this._sigR       = document.getElementById('hud-sig-r');
    this._obj        = document.getElementById('hud-obj');
    this._pauseEl    = document.getElementById('hud-pause');
    this._pauseStats = document.getElementById('hud-pause-stats');
    this._blinkTimer = 0;
    this._blinkOn    = false;
    this._lastObjKey = null;

    document.getElementById('hud-resume').addEventListener('click', () => { if (onResume) onResume(); });
    document.getElementById('hud-menu-btn').addEventListener('click', () => { if (onMenu) onMenu(); });

    this._updateObjective(0);
  }

  update(car, coach, controls, dt, sessionTime = 0) {
    this._mph.textContent = Math.round(car.speedMph);
    this._kmh.textContent = Math.round(car.speedMph * 1.60934);

    if (coach.currentMessage) {
      this._coach.textContent = coach.currentMessage.text;
      this._coach.style.color   = coach.currentMessage.color;
      this._coach.style.opacity = '1';
    } else {
      this._coach.style.opacity = '0';
    }

    this._mistakes.textContent = `Mistakes: ${coach.mistakeCount}`;
    this._timer.textContent    = _fmtTime(sessionTime);

    this._updateObjective(car.position.z);

    if (dt && controls) {
      this._blinkTimer += dt;
      if (this._blinkTimer >= 0.5) { this._blinkOn = !this._blinkOn; this._blinkTimer = 0; }
      const blink = this._blinkOn ? '1' : '.2';
      this._sigL.style.opacity = controls.signalLeft  ? blink : '.15';
      this._sigR.style.opacity = controls.signalRight ? blink : '.15';
    }
  }

  setPaused(paused, sessionTime = 0, mistakeCount = 0) {
    this._pauseEl.style.display = paused ? 'flex' : 'none';
    if (paused) {
      this._pauseStats.innerHTML =
        `Time: &nbsp;<b>${_fmtTime(sessionTime)}</b><br>Mistakes: &nbsp;<b>${mistakeCount}</b>`;
    }
  }

  _updateObjective(z) {
    let key, html;
    if (z < -460) {
      key  = 'roundabout';
      html = `<b style="color:#ffdd88">Lesson 3 — Roundabout</b><br>
US roundabouts go <b>counter-clockwise</b>.<br>
Yield at entry, then <b>turn RIGHT</b> to join the flow.<br>
<span style="color:#ff9988">SG = clockwise &nbsp;|&nbsp; US = counter-clockwise!</span>`;
    } else if (z < -270) {
      key  = 'stop';
      html = `<b style="color:#ffdd88">Lesson 2 — 4-Way Stop</b><br>
Come to a <b>complete stop</b> at the white line.<br>
First to arrive = first to go.<br>
<span style="color:#aaddff">Tie → yield to the car on your RIGHT.</span>`;
    } else {
      key  = 'keepright';
      html = `<b style="color:#ffdd88">Lesson 1 — Keep Right</b><br>
Drive on the <b>right</b> side of the road.<br>
Yellow dashes = centre line.<br>
<span style="color:#aaddff">You sit on the LEFT. &nbsp;Car stays RIGHT.</span>`;
    }
    if (key !== this._lastObjKey) {
      this._obj.innerHTML  = html;
      this._lastObjKey = key;
    }
  }
}

function _fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
