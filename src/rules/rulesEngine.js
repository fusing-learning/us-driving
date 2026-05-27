// Phase A: straight two-lane road along Z axis.
// Right lane (player, northbound/-Z): X = 0..4
// Left lane  (oncoming):              X = -4..0
// Centre line at X = 0.
//
// Phase B adds: RED_LIGHT_RUN, LIGHT_IS_RED, LIGHT_IS_YELLOW,
//               APPROACH_INTERSECTION, STOPPED_AT_RED
// Phase C adds: ROLLED_STOP, STOP_SIGN_APPROACH,
//               ROUNDABOUT_WRONG_WAY, ROUNDABOUT_ENTRY

export class RulesEngine {
  check(car, context = {}) {
    const violations = new Set();
    const { light, intersection, prevZ, prevSpeed, stopSign, stoppedAtStop, roundabout } = context;
    const x  = car.position.x;
    const cz = car.position.z;

    // Suppress keep-right while navigating the roundabout ring
    let inRoundabout = false;
    if (roundabout) {
      const dx = x - roundabout.cx;
      const dz = cz - roundabout.cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      inRoundabout = dist < roundabout.rOut + 3 && dist > roundabout.rIn - 3;
    }

    // ── Generalized Keep-right & Curb Collision ──────────────────────────
    const inIntersection1 = Math.abs(x) < 4.5 && Math.abs(cz) < 4.5;
    const inIntersection2 = Math.abs(x) < 4.5 && Math.abs(cz + 300) < 4.5;
    const inIntersection = inIntersection1 || inIntersection2;

    if (!inRoundabout && !inIntersection) {
      // Find closest road centerline (main road at X=0, cross-streets at Z=0 and Z=-300)
      const dMain = Math.abs(x);
      const dCross1 = Math.abs(cz);
      const dCross2 = Math.abs(cz + 300);
      const minDist = Math.min(dMain, dCross1, dCross2);

      let dx = 0, dz = 0;
      let offRoad = false;

      if (minDist === dMain) {
        dx = -x;
        dz = 0;
        if (dMain > 4.1) offRoad = true;
      } else if (minDist === dCross1) {
        dx = 0;
        dz = -cz;
        if (dCross1 > 4.1) offRoad = true;
      } else {
        dx = 0;
        dz = -300 - cz;
        if (dCross2 > 4.1) offRoad = true;
      }

      // Check wrong lane vs. lane warning using player heading right vector
      // rx and rz perpendicular to heading: headingRight(heading) gives (cos(H), sin(H))
      const heading = car.heading;
      const rx = Math.cos(heading);
      const rz = Math.sin(heading);
      const dot = dx * rx + dz * rz;

      if (offRoad) {
        violations.add('CURB_COLLISION');
      } else {
        if (dot > 0) {
          violations.add('WRONG_LANE');
        } else {
          const distToCenter = Math.sqrt(dx * dx + dz * dz);
          if (distToCenter < 1.2) {
            violations.add('LANE_WARNING');
          }
        }
      }
    } else if (inRoundabout) {
      // In roundabout, check if outside ring boundaries
      const dx = x - roundabout.cx;
      const dz = cz - roundabout.cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > roundabout.rOut + 0.15 || dist < roundabout.rIn - 0.15) {
        violations.add('CURB_COLLISION');
      }
    }

    // ── Intersection / traffic light rules (Phase B) ──────────────────────
    if (light && intersection) {
      const stop = intersection.stopLineSouth;

      // Red-light run: player crossed the stop line while light was not green
      if (prevZ !== undefined && prevZ > stop && cz <= stop && (prevSpeed ?? car.speed) > 0.5
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
      if (light.state === 'red' && car.speed < 0.4 && distToStop > 0 && distToStop < 5) {
        violations.add('STOPPED_AT_RED');
      }
    }

    // ── Stop sign rules (Phase C) ─────────────────────────────────────────
    if (stopSign) {
      const stop      = stopSign.stopLineSouth;
      const distToStop = cz - stop;

      if (distToStop > 0 && distToStop < 28 && car.speed > 0.8) {
        violations.add('STOP_SIGN_APPROACH');
      }

      // Rolled stop: crossed the line without a complete stop (speed < 0.4)
      if (prevZ !== undefined && prevZ > stop && cz <= stop
          && (prevSpeed ?? car.speed) > 0.5 && !stoppedAtStop) {
        violations.add('ROLLED_STOP');
      }
    }

    // ── Roundabout rules (Phase C) ────────────────────────────────────────
    if (roundabout) {
      const dx   = x - roundabout.cx;
      const dz   = cz - roundabout.cz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Entry coaching: approaching from the south
      const distToEntry = cz - (roundabout.cz + roundabout.rOut);
      if (distToEntry > 0 && distToEntry < 35 && car.speed > 0.5) {
        violations.add('ROUNDABOUT_ENTRY');
      }

      // Wrong-way detection when inside the ring
      if (dist > 0.1 && dist > roundabout.rIn && dist < roundabout.rOut) {
        // CCW tangent at player's position: rotate radial outward 90° CCW
        const ccwTx =  dz / dist;
        const ccwTz = -dx / dist;
        const hx = Math.sin(car.heading);
        const hz = -Math.cos(car.heading);
        if (hx * ccwTx + hz * ccwTz < -0.3) {
          violations.add('ROUNDABOUT_WRONG_WAY');
        }
      }
    }

    return violations;
  }
}
