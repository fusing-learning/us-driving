// Phase A: straight two-lane road along Z axis.
// Right lane (player, northbound/-Z): X = 0..4
// Left lane  (oncoming):              X = -4..0
// Centre line at X = 0.

export class RulesEngine {
  check(car) {
    const violations = new Set();
    const x = car.position.x;

    if (x < 0) {
      violations.add('WRONG_LANE');       // fully in oncoming lane
    } else if (x < 1.2) {
      violations.add('LANE_WARNING');     // drifting toward centre line
    }

    return violations;
  }
}
