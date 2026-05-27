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
| Q | Left turn signal |
| E | Right turn signal |
| R | Reset position |

## Architecture — file map
```
src/
  main.js            Three.js renderer bootstrap, game loop
  game.js            Scene setup, update/render orchestration
  car.js             Player car: arcade physics + left-seat FPV camera + cockpit meshes
  controls.js        Keyboard state (WASD + signals + reset)
  utils/math.js      clamp, lerp, headingForward, headingRight
  world/
    roadBuilder.js   Straight 2-lane road (yellow dashes, white edges, curbs, sidewalks)
    scenery.js       Ground, buildings, trees, street lamps
  rules/
    rulesEngine.js   Violation detection (keep-right, etc.) → returns Set of violation keys
  coaching/
    coach.js         Violation → message/colour/priority, mistake counter, cooldowns
  ui/
    hud.js           DOM overlay: speed, coaching msg, mistake count, signals, hints
  lessons/           (Phase B+) lesson definitions and scripted objectives
  traffic/           (Phase B+) NPC cars + traffic manager
```

## Build phases — what exists and what is next
| Phase | Status | Scope |
|-------|--------|-------|
| **A — Foundation** | ✅ Done | Drivable car, left-seat FPV, straight road, keep-right coaching |
| **B — Intersections + traffic** | ⬜ Next | NPC traffic, traffic lights, turn guidance/target-lane highlight, right-turn-on-red |
| **C — Stops / roundabout / highway** | ⬜ | 4-way stop right-of-way, counterclockwise roundabout, highway merge |
| **D — Shell / free drive** | ⬜ | Menu, lesson select, scoring, free-drive loop, rear-view mirror, polish |

## Key design decisions (context for future agents)
- **Coordinate system**: heading=0 → car faces −Z (north). heading increases clockwise viewed from above.
  - `position.x += sin(heading) * speed * dt`
  - `position.z -= cos(heading) * speed * dt`
- **Road layout (Phase A)**: Road runs along Z axis. Right lane (player) = X 0..4. Oncoming = X −4..0. Centre line X=0.
- **Camera layers**: Car body mesh is on **layer 1**; FPV camera uses default **layer 0** only. Dashboard/wheel/mirrors stay on layer 0 so they appear in-view.
- **Driver seat offset**: camera local position `(-0.44, 1.55, 0.28)` inside carGroup — this is the LEFT side, making the yellow centre line appear to the driver's LEFT, reinforcing keep-right instinct.
- **Keep-right rule (Phase A)**: Simple `car.position.x < 0` = WRONG_LANE, `x < 1.2` = LANE_WARNING. Must be generalised (dot-product against road direction) for Phase B curved/turning roads.
- **Steer rate**: `STEER_RATE / (1 + |speed| * STEER_DAMP)` — fast turning when slow, narrow at speed.

## Planned lessons (for Phase B+)
1. Keep right & lane position ← **Phase A delivers this**
2. Intersections & turns (left = cross oncoming, right = tight)
3. Traffic lights & right-turn-on-red
4. 4-way stop right-of-way
5. Counterclockwise roundabout
6. Highway on-ramp merge
7. Free drive (combines all)

## Notes for next agent starting Phase B
1. Add `src/world/intersection.js` — builds a 4-way intersection tile (stop-sign variant first,
   then traffic-light variant). Attach it midway along the current road Z=0.
2. Add `src/traffic/npcCar.js` — a box-car that follows a waypoint list in its lane.
3. Add `src/traffic/trafficManager.js` — spawns and manages NPCs.
4. Extend `rulesEngine.js` with: `RED_LIGHT_RUN`, `WRONG_TURN_LANE` violations.
5. Extend `coach.js` MESSAGES with turn-specific cues.
6. Add a "target lane highlight" after a turn — a green semi-transparent plane in the correct
   target lane that fades out after 3 seconds, teaching the player which lane to land in.
