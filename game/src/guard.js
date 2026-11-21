// SHADOWLINE — guard AI. A guard patrols a waypoint loop, pausing at each
// waypoint to look around. Seeing the player fills its detection meter;
// a full meter raises the alarm and it chases. Lose it for long enough and
// it searches the last seen spot, then goes back to its patrol. A sprint's
// noise ping makes a patrolling guard walk over to investigate.
//
// States: patrol -> investigate -> chase -> search -> patrol.

import { GUARD, DETECTION, TILE } from './config.js';
import { findPath, inShadow } from './level.js';
import { guardSeesPlayer, angleDiff } from './vision.js';

export function createGuard(waypoints, pauseSeconds) {
  const start = waypoints[0];
  const next = waypoints[1] ?? waypoints[0];
  return {
    waypoints,
    pauseSeconds,
    x: start[0] * TILE + TILE / 2,
    y: start[1] * TILE + TILE / 2,
    angle: Math.atan2(next[1] - start[1], next[0] - start[0]),
    state: 'patrol',
    leg: 1, // the waypoint this guard is walking toward
    path: null, // the tile-centre path to the current target
    pathIndex: 0,
    pauseTimer: 0,
    scanDir: 1,
    meter: 0, // detection meter, 0..1
    lastSeen: null,
    seenTimer: 0, // seconds since the player was last seen, while chasing
    searchTimer: 0,
    investigateTarget: null,
    investigatePause: 0,
    repathTimer: 0,
    moving: false,
    stepTimer: 0,
    stepDue: false,
    justAlerted: false, // set for one frame when the alarm goes up
  };
}

// Turn toward an angle at most rate * dt radians.
function turnToward(guard, target, rate, dt) {
  const diff = angleDiff(target, guard.angle);
  const maxTurn = rate * dt;
  guard.angle += Math.abs(diff) <= maxTurn ? diff : Math.sign(diff) * maxTurn;
}

// Walk straight toward a point; returns true on arrival.
function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  guard.moving = true;
  turnToward(guard, Math.atan2(dy, dx), GUARD.chaseTurnSpeed, dt);
  if (dist <= step) {
    guard.x = tx;
    guard.y = ty;
    return true;
  }
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  return false;
}

// Walk the guard's current path; returns true when the path is done.
function followPath(guard, speed, dt) {
  if (!guard.path || guard.pathIndex >= guard.path.length) return true;
  const node = guard.path[guard.pathIndex];
  if (moveToward(guard, node.x, node.y, speed, dt)) guard.pathIndex++;
  return guard.pathIndex >= guard.path.length;
}

function pathToWaypoint(guard, level) {
  const wp = guard.waypoints[guard.leg];
  guard.path = findPath(level, guard.x, guard.y, wp[0] * TILE + TILE / 2, wp[1] * TILE + TILE / 2);
  guard.pathIndex = 0;
}

function pathTo(guard, level, x, y) {
  guard.path = findPath(level, guard.x, guard.y, x, y);
  guard.pathIndex = 0;
}

// A noise ping reaches this guard: a patrolling guard walks over to look.
export function guardHearsPing(guard, ping, level) {
  if (guard.state !== 'patrol') return;
  const dist = Math.hypot(ping.x - guard.x, ping.y - guard.y);
  if (dist > GUARD.noiseRadius) return;
  guard.state = 'investigate';
  guard.investigateTarget = { x: ping.x, y: ping.y };
  guard.investigatePause = 0;
  pathTo(guard, level, ping.x, ping.y);
}

export function updateGuard(guard, dt, player, level) {
  guard.justAlerted = false;
  guard.stepDue = false;
  guard.moving = false;

  const sees = guardSeesPlayer(guard, player, level);

  // The detection meter: fills while seen, decays while unseen. Sprinting
  // is easier to spot, crouching and shadows make you harder to spot.
  if (sees) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    let rate = dist <= DETECTION.pointBlankRange ? DETECTION.pointBlankRate : DETECTION.fillRate;
    if (player.mode === 'sprint') rate *= DETECTION.sprintMultiplier;
    if (player.mode === 'crouch') rate *= DETECTION.crouchMultiplier;
    if (inShadow(level, player.x, player.y)) rate *= DETECTION.shadowMultiplier;
    guard.meter = Math.min(1, guard.meter + rate * dt);
    if (guard.state === 'search') {
      // Spotted again while searching: straight back to the chase.
      guard.state = 'chase';
      guard.seenTimer = 0;
    }
    if (guard.meter >= 1 && guard.state !== 'chase' && guard.state !== 'search') {
      guard.state = 'chase';
      guard.justAlerted = true;
      guard.lastSeen = { x: player.x, y: player.y };
      guard.seenTimer = 0;
    }
  } else if (guard.state === 'patrol' || guard.state === 'investigate') {
    guard.meter = Math.max(0, guard.meter - DETECTION.decayRate * dt);
  }

  switch (guard.state) {
    case 'patrol': {
      if (guard.path === null) pathToWaypoint(guard, level);
      if (guard.pauseTimer > 0) {
        // Paused at a waypoint: sweep the cone back and forth.
        guard.pauseTimer -= dt;
        guard.angle += guard.scanDir * GUARD.turnSpeed * dt;
        if (guard.pauseTimer <= 0) {
          guard.scanDir *= -1;
          guard.leg = (guard.leg + 1) % guard.waypoints.length;
          pathToWaypoint(guard, level);
        }
      } else if (followPath(guard, GUARD.patrolSpeed, dt)) {
        guard.pauseTimer = guard.pauseSeconds;
      }
      break;
    }
    case 'investigate': {
      if (guard.investigatePause > 0) {
        guard.investigatePause -= dt;
        guard.angle += guard.scanDir * GUARD.turnSpeed * dt;
        if (guard.investigatePause <= 0) {
          guard.state = 'patrol';
          guard.path = null; // resume the patrol from the current leg
        }
      } else if (followPath(guard, GUARD.searchSpeed, dt)) {
        guard.investigatePause = 1.5;
      }
      break;
    }
    case 'chase': {
      if (sees) {
        guard.lastSeen = { x: player.x, y: player.y };
        guard.seenTimer = 0;
        moveToward(guard, player.x, player.y, GUARD.chaseSpeed, dt);
      } else {
        guard.seenTimer += dt;
        if (guard.seenTimer > GUARD.chaseMemory) {
          guard.state = 'search';
          guard.searchTimer = GUARD.searchTime;
          pathTo(guard, level, guard.lastSeen.x, guard.lastSeen.y);
        } else {
          // Head for the last seen spot, re-pathing as it shifts.
          guard.repathTimer -= dt;
          if (guard.repathTimer <= 0) {
            pathTo(guard, level, guard.lastSeen.x, guard.lastSeen.y);
            guard.repathTimer = 0.5;
          }
          followPath(guard, GUARD.chaseSpeed, dt);
        }
      }
      break;
    }
    case 'search': {
      guard.searchTimer -= dt;
      if (guard.searchTimer <= 0) {
        guard.state = 'patrol';
        guard.meter = 0;
        guard.path = null;
      } else if (followPath(guard, GUARD.searchSpeed, dt)) {
        // Reached the spot: look around in place.
        guard.angle += guard.scanDir * GUARD.turnSpeed * dt;
      }
      break;
    }
    default:
      break;
  }

  // Footsteps while moving, for the audio to play.
  if (guard.moving) {
    guard.stepTimer -= dt;
    if (guard.stepTimer <= 0) {
      guard.stepDue = true;
      guard.stepTimer = guard.state === 'chase' ? 0.3 : 0.45;
    }
  }
}
