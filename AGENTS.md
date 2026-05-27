# US Driving Trainer — Agent Handoff

## What this project is
A first-person 3D driving simulator (Vite + Three.js, browser) that helps a Singapore driver
(right-hand-drive, keep-LEFT) retrain instincts for US driving (left-seat, keep-RIGHT).

No external 3D assets — everything is built from Three.js primitives.

## How to run
```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build to dist/
```

## Controls (in-game)
| Key | Action |
|-----|--------|
| W / ↑ | Accelerate |
| S / ↓ | Brake / Reverse |
| A / ← | Steer left |
| D / → | Steer right |
| Q | Toggle left signal |
| E | Toggle right signal |
| R | Reset position |

## Architecture — file map
```
src/
  main.js              Three.js renderer bootstrap, game loop
  game.js              Scene setup, update/render orchestration; wires all subsystems
  car.js               Player car: arcade physics + left-seat FPV camera + cockpit meshes
  controls.js          Keyboard state — signals are toggle (Q/E), driving keys are held
  utils/math.js        clamp, lerp, headingForward, headingRight
  world/
    roadBuilder.js     Straight 2-lane road; curbs/sidewalks split with 16-unit gap at Z=0
    scenery.js         Ground, buildings, trees, street lamps
    intersection.js    4-way intersection at Z=0: cross-street, stop lines, traffic light poles
  rules/
    lights.js          TrafficLight state machine  green→yellow→red→green (9s/2.5s/9s)
    rulesEngine.js     Violation detection → Set of violation keys; accepts context {light, intersection, prevZ}
  coaching/
    coach.js           Violation → message/colour/priority, mistake counter, cooldowns
  traffic/
    npcCar.js          Oncoming NPC car (heading=π, lane X=−2); light-aware stop logic + following distance
    trafficManager.js  Spawns 6 NPCs, updates them, passes allNpcZs for following distance
  ui/
    hud.js             DOM overlay: speed (mph + km/h), coaching msg, mistake count, signals, hints
  lessons/             (Phase C+) scripted lesson definitions
```

## Build phases
| Phase | Status | Scope |
|-------|--------|-------|
| **A — Foundation** | ✅ Done | Drivable car, left-seat FPV, straight road, keep-right coaching, mph + km/h HUD |
| **B — Intersections + traffic** | ✅ Done | Traffic-light intersection at Z=0, 6 oncoming NPC cars, red-light run detection, approach/stop coaching, right-turn-on-red tip |
| **C — Stops / roundabout / highway** | ⬜ Next | 4-way stop right-of-way, counterclockwise roundabout, highway on-ramp merge |
| **D — Shell / free drive** | ⬜ | Menu, lesson select, scoring, free-drive loop, rear-view mirror, polish |

## RESOLVED — Retina/DPR viewport crop made the FPV look mirrored/undrivable (2026-05-27)
**Symptom (reported):** On the default Lesson 1 spawn the forward view looked horizontally
mirrored (centre line + oncoming NPCs on the wrong side, left A-pillar on the right) and the
road ahead was blocked.

**Root cause:** `Game.render()` used `renderer.domElement.width/height` for
`setViewport()`/`setScissor()`. Those values are the WebGL backing-store size. Three.js expects
CSS-pixel viewport/scissor dimensions and applies `renderer.setPixelRatio()` internally, so on
Retina/high-DPI displays (`devicePixelRatio=2`) the main FPV and rear-view mirror were
effectively double-scaled/cropped. Headless screenshots at DPR=1 looked correct, while the
user's real browser was shifted/zoomed enough to make the center line and A-pillar dominate the
view.

**The actual fix applied:** `game.js` now uses `renderer.domElement.clientWidth/clientHeight`
for viewport/scissor sizing. The seated FPV camera was also restored to `(-0.44, 1.5, 0.3)` in
`car.js`; an earlier uncommitted edit had pushed it too high/forward, which made the dash and
pillars more intrusive.

**To verify rendering yourself without pestering the user:** `node shot.mjs 0 1024 578 2`
(Playwright devDependency) launches headless Chromium against the running dev server, clicks
Lesson 1, writes `shot_<w>x<h>_dpr<dpr>.png`, and exits non-zero if the road visibility metrics
fail. Always test a 1x and 2x viewport after render/camera changes, for example:
`node shot.mjs 0 1667 1049 1` and `node shot.mjs 0 1024 578 2`.

## Key design decisions
- **Coordinate system**: heading=0 → car faces −Z (north). Increases clockwise from above.
  - `position.x += sin(heading) * speed * dt`
  - `position.z -= cos(heading) * speed * dt`
- **Road layout**: Road along Z axis. Right lane (player) = X 0..4. Oncoming = X −4..0. Centre X=0.
- **Intersection** at Z=0. `INTERSECTION` constant exported from `intersection.js`:
  - `stopLineSouth = 6.5` (player stop line), `stopLineNorth = −6.5` (NPC stop line)
- **Traffic lights**: `TrafficLight` in `rules/lights.js`. `game.js` calls `updateLightVisuals(bulbMats, state)` every frame. Bulb materials are shared across all 4 poles so one `.emissive.set()` updates them all.
- **NPC cars**: heading=π, lane X=−2, wrap at Z=175→−155. Stop at `stopLineNorth` when not green. `trafficManager` passes array of all NPC Z values for following-distance checks.
- **Camera layers**: Car body on layer 1 (invisible to FPV camera layer 0). Cockpit interior on layer 0.
- **Driver seat**: camera at local `(-0.44, 1.5, 0.3)` → centre line appears to driver's LEFT = reinforces keep-right. Eye height 1.5 clears the dash panel (top ≈1.39) so the road stays visible; sitting at z=+0.3 keeps the hood/dash ahead as a reference. Do NOT raise above the A-pillar tops (~1.6) or push forward onto the dash — that floats the camera and hides the road.
- **rulesEngine context**: `check(car, { light, intersection, prevZ })` — `prevZ` is the car's Z from the previous frame, used to detect the exact frame when the player crosses the stop line.

## Violation keys (rulesEngine → coach)
| Key | Meaning | Mistake? |
|-----|---------|---------|
| `WRONG_LANE` | Crossed centre line into oncoming | ✅ |
| `LANE_WARNING` | Drifting close to centre | ✗ |
| `RED_LIGHT_RUN` | Crossed stop line while light not green | ✅ |
| `LIGHT_IS_RED` | Approaching intersection, light is red | ✗ |
| `LIGHT_IS_YELLOW` | Approaching, light is yellow | ✗ |
| `APPROACH_INTERSECTION` | Within 28 units of stop line | ✗ |
| `STOPPED_AT_RED` | Stopped at red near stop line | ✗ (tip) |

## Notes for next agent starting Phase C
1. **4-way stop sign**: Add a stop-sign variant of the intersection (or a second intersection further north).
   - Add `ROLLED_STOP` violation: player crossed stop line at speed > 1 without stopping (speed < 0.5) first.
   - Add right-of-way coaching: first-to-arrive goes first; tie = yield to the right.
2. **Counterclockwise roundabout**: Add `src/world/roundabout.js`. Circular road, radius ≈20 units.
   - Entry from the south; circle flows counter-clockwise (enter right, exit right).
   - Add `ROUNDABOUT_WRONG_WAY` violation if heading is clockwise.
   - SG roundabouts go clockwise — explicitly warn the player about this difference.
3. **Highway on-ramp**: Add `src/world/highway.js`. Multi-lane road + on-ramp acceleration lane.
   - Coach: "Match speed before merging. Check left mirror. Merge when gap is clear."
4. For all Phase C road tiles: place them at distinct Z offsets far enough from the Phase B intersection (e.g. Z=−200 for roundabout, Z=+300 for highway) so they don't overlap.
5. Generalise `rulesEngine.check()` keep-right to use a road-direction dot-product instead of the Phase A hardcoded `x < 0` check — needed for curved/rotated road segments.
