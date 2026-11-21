// SHADOWLINE — vision: what a guard can see, and the cone polygon the
// renderer draws. Sight is a raycast against solid tiles: walls, crates
// and display cases block it, bushes do not (they hide the player instead).

import { GUARD } from './config.js';
import { isSolidAt, inBush } from './level.js';

// The signed difference between two angles, wrapped to [-PI, PI].
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the straight line between two points crosses no solid tile.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidAt(level, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

// Cast one ray from (x, y) at an angle: the distance until it hits a solid
// tile, or maxDist when nothing is in the way.
export function raycast(level, x, y, angle, maxDist) {
  const step = 4;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let d = step; d < maxDist; d += step) {
    if (isSolidAt(level, x + cos * d, y + sin * d)) return d;
  }
  return maxDist;
}

// The full detection test: range, cone angle, line of sight, and the bush
// rule (a bush hides you unless the guard is right on top of you).
export function guardSeesPlayer(guard, player, level) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.coneRange) return false;
  if (inBush(level, player.x, player.y) && dist > GUARD.bushHideRange) return false;
  const toPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toPlayer, guard.angle)) > GUARD.coneHalfAngle) return false;
  return hasLineOfSight(level, guard.x, guard.y, player.x, player.y);
}

// The cone as a polygon: the guard's position plus the raycast endpoints
// across the cone's spread, for the renderer to fill.
export function conePolygon(guard, level) {
  const rays = 24;
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i++) {
    const a = guard.angle - GUARD.coneHalfAngle + (2 * GUARD.coneHalfAngle * i) / rays;
    const d = raycast(level, guard.x, guard.y, a, GUARD.coneRange);
    points.push({ x: guard.x + Math.cos(a) * d, y: guard.y + Math.sin(a) * d });
  }
  return points;
}
