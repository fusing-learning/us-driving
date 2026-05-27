export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Returns the unit forward vector for a given heading (heading=0 → −Z / north)
export function headingForward(heading) {
  return { x: Math.sin(heading), z: -Math.cos(heading) };
}

// Returns the unit right vector perpendicular to heading
export function headingRight(heading) {
  return { x: Math.cos(heading), z: Math.sin(heading) };
}
