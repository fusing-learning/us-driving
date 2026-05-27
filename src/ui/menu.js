const LESSONS = [
  {
    label: 'Lesson 1 — Keep Right',
    sub:   'Traffic-light intersection · Drive on the right side of the road',
    accent: '#4488ff',
    startZ: 80,
  },
  {
    label: 'Lesson 2 — 4-Way Stop',
    sub:   'Full stop at the white line · First-to-arrive has right of way',
    accent: '#ffaa22',
    startZ: -230,
  },
  {
    label: 'Lesson 3 — Roundabout',
    sub:   'Counter-clockwise flow · Yield on entry · Turn right to join',
    accent: '#44dd88',
    startZ: -430,
  },
  {
    label: 'Free Drive',
    sub:   'Explore the full course at your own pace',
    accent: '#aaaaaa',
    startZ: 80,
  },
];

export class Menu {
  constructor(el, onSelect) {
    this._el = el;
    this._build(onSelect);
  }

  _build(onSelect) {
    this._el.innerHTML = `
      <div class="menu-wrapper">
        <div class="menu-header">
          <div class="menu-title">US Driving Trainer</div>
          <div class="menu-subtitle">Retrain your instincts for US roads</div>
          <div class="menu-desc">Singapore driver · Right-hand drive → Left-seat · Keep RIGHT</div>
        </div>

        <div class="menu-list">
          ${LESSONS.map((l, i) => `
            <button data-i="${i}" class="menu-item-btn" style="border-left-color: ${l.accent}">
              <span class="menu-item-label" style="color: ${l.accent}">${l.label}</span>
              <span class="menu-item-sub">${l.sub}</span>
            </button>
          `).join('')}
        </div>

        <div class="menu-footer">
          W / ↑ &nbsp;Accelerate &nbsp;&nbsp;·&nbsp;&nbsp; S / ↓ &nbsp;Brake
          &nbsp;&nbsp;·&nbsp;&nbsp; A / ← &nbsp;D / → &nbsp;Steer<br>
          Q &nbsp;Signal left &nbsp;&nbsp;·&nbsp;&nbsp; E &nbsp;Signal right
          &nbsp;&nbsp;·&nbsp;&nbsp; R &nbsp;Reset &nbsp;&nbsp;·&nbsp;&nbsp; P &nbsp;Pause
        </div>
      </div>
    `;

    this._el.querySelectorAll('button[data-i]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.i;
        this.hide();
        onSelect(LESSONS[i]);
      });
    });
  }

  show() { this._el.style.display = 'block'; }
  hide() { this._el.style.display = 'none'; }
}
