export class HUD {
  constructor() {
    const el = document.getElementById('hud');
    el.innerHTML = `
      <!-- Speed display (bottom-right) -->
      <div id="hud-speed" style="
        position:absolute; bottom:22px; right:22px;
        color:#fff; font:bold 30px/1 monospace;
        background:rgba(0,0,0,.45); padding:8px 18px; border-radius:10px;
        text-shadow:0 1px 4px #000; text-align:right; line-height:1.3;
      ">
        <span id="hud-mph">0</span> <span style="font-size:14px">mph</span><br>
        <span id="hud-kmh" style="font-size:17px; color:#aaddff;">0</span>
        <span style="font-size:11px; color:#aaddff;">km/h</span>
      </div>

      <!-- Coaching message (top-center) -->
      <div id="hud-coach" style="
        position:absolute; top:40px; left:50%; transform:translateX(-50%);
        font:bold 22px/1.3 sans-serif; color:#ff3333;
        background:rgba(0,0,0,.55); padding:10px 26px; border-radius:12px;
        text-shadow:0 2px 6px #000; text-align:center;
        opacity:0; transition:opacity .25s; white-space:nowrap;
      "></div>

      <!-- Mistake counter (top-right) -->
      <div id="hud-mistakes" style="
        position:absolute; top:20px; right:22px;
        color:#fff; font:14px/1 monospace;
        background:rgba(0,0,0,.45); padding:5px 14px; border-radius:7px;
        text-shadow:0 1px 4px #000;
      ">Mistakes: 0</div>

      <!-- Lesson objective (top-left) -->
      <div id="hud-obj" style="
        position:absolute; top:20px; left:22px;
        color:#fff; font:15px/1.55 sans-serif;
        background:rgba(0,0,0,.5); padding:10px 16px; border-radius:10px;
        max-width:290px; text-shadow:0 1px 3px #000;
      ">
        <b style="color:#ffdd88">Lesson 1 — Keep Right</b><br>
        Drive on the <b>right</b> side of the road.<br>
        Yellow dashes = centre line.<br>
        <span style="color:#aaddff">You sit on the LEFT.  Car stays RIGHT.</span>
      </div>

      <!-- Turn-signal indicators (bottom-center) -->
      <div style="position:absolute; bottom:22px; left:50%; transform:translateX(-50%); display:flex; gap:20px;">
        <div id="hud-sig-l" style="
          color:#00bb00; font:bold 22px/1 monospace;
          opacity:.2; transition:opacity .1s; text-shadow:0 1px 4px #000;
        ">◀ ◀</div>
        <div id="hud-sig-r" style="
          color:#00bb00; font:bold 22px/1 monospace;
          opacity:.2; transition:opacity .1s; text-shadow:0 1px 4px #000;
        ">▶ ▶</div>
      </div>

      <!-- Controls hint (bottom-left) -->
      <div style="
        position:absolute; bottom:22px; left:22px;
        color:rgba(255,255,255,.65); font:12px/1.65 monospace;
        background:rgba(0,0,0,.4); padding:8px 14px; border-radius:8px;
      ">
        W / ↑  Accelerate<br>
        S / ↓  Brake / Reverse<br>
        A / ←  Steer left&nbsp;&nbsp; D / →  Steer right<br>
        Q  Signal left&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;E  Signal right<br>
        R  Reset position
      </div>
    `;

    this._speed    = document.getElementById('hud-speed');
    this._mph      = document.getElementById('hud-mph');
    this._kmh      = document.getElementById('hud-kmh');
    this._coach    = document.getElementById('hud-coach');
    this._mistakes = document.getElementById('hud-mistakes');
    this._sigL     = document.getElementById('hud-sig-l');
    this._sigR     = document.getElementById('hud-sig-r');
    this._blinkTimer = 0;
    this._blinkOn    = false;
  }

  update(car, coach, controls, dt) {
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

    // Turn signal blink
    if (dt && controls) {
      this._blinkTimer += dt;
      if (this._blinkTimer >= 0.5) { this._blinkOn = !this._blinkOn; this._blinkTimer = 0; }
      const blink = this._blinkOn ? '1' : '.2';
      this._sigL.style.opacity = controls.signalLeft  ? blink : '.15';
      this._sigR.style.opacity = controls.signalRight ? blink : '.15';
    }
  }
}
