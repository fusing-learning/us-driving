// Phase A: straight two-lane road along Z axis.
// Right lane (player, northbound/-Z): X = 0..4
// Left lane  (oncoming):              X = -4..0
// Centre line at X = 0.
//
// Phase B adds: RED_LIGHT_RUN, LIGHT_IS_RED, LIGHT_IS_YELLOW,
//               APPROACH_INTERSECTION, STOPPED_AT_RED

export class RulesEngine {
  check(car, context = {}) {
    const violations = new Set();
    const { light, intersection, prevZ } = context;
    const x = car.position.x;

    // ── Keep-right ────────────────────────────────────────────────────────
    if (x < 0) {
      violations.add('WRONG_LANE');
    } else if (x < 1.2) {
      violations.add('LANE_WARNING');
    }

    // ── Intersection / traffic light rules (Phase B) ──────────────────────
    if (light && intersection) {
      const cz   = car.position.z;
      const stop = intersection.stopLineSouth;

      // Red-light run: player crossed the stop line while light was not green
      if (prevZ !== undefined && prevZ > stop && cz <= stop && car.speed > 0.5
          && light.state !== 'green') {
        violations.add('RED_LIGHT_RUN');
      }

      // Approaching intersection coaching (only from the south / player side)
      const distToStop = cz - stop;
      if (distToStop > 0 && distToStop < 28 && car.speed > 0.8) {
        violations.add('APPROACH_INTERSECTION');
        if (light.state === 'red')    violations.add('LIGHT_IS_RED');
        if (light.state === 'yellow') violations.add('LIGHT_IS_YELLOW');
      }

      // Stopped at a red light near the stop line → right-turn-on-red tip
      if (light.state === 'red' && car.speed < 0.4 && Math.abs(cz - stop) < 5) {
        violations.add('STOPPED_AT_RED');
      }
    }

    return violations;
  }
}
