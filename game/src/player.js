// SHADOWLINE — the player: movement, collision, stance (walk / crouch /
// sprint) and the noise a sprint makes. Movement is axis-separated so the
// player slides along walls instead of sticking to them.

import { PLAYER, NOISE } from './config.js';
import { circleHitsSolid } from './level.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    radius: PLAYER.radius,
    mode: 'walk', // 'walk' | 'crouch' | 'sprint'
    moving: false,
    angle: -Math.PI / 2, // facing up at spawn
    stepTimer: 0,
    stepDue: false, // set for one frame when a footstep lands
    noiseTimer: 0,
    pings: [], // noise events this frame: [{x, y}]
  };
}

// input: {mx, my} a (possibly zero) move vector, plus sprint / crouch flags.
export function updatePlayer(player, input, dt, level) {
  player.pings.length = 0;
  player.stepDue = false;
  const speed = input.crouch
    ? PLAYER.crouchSpeed
    : input.sprint
      ? PLAYER.sprintSpeed
      : PLAYER.walkSpeed;
  player.mode = input.crouch ? 'crouch' : input.sprint ? 'sprint' : 'walk';
  player.radius = input.crouch ? PLAYER.crouchRadius : PLAYER.radius;

  const len = Math.hypot(input.mx, input.my);
  player.moving = len > 0;
  if (!player.moving) return;
  const nx = input.mx / len;
  const ny = input.my / len;
  player.angle = Math.atan2(ny, nx);

  // Move one axis at a time so a blocked axis does not stop the other.
  const stepX = nx * speed * dt;
  if (!circleHitsSolid(level, player.x + stepX, player.y, player.radius)) {
    player.x += stepX;
  }
  const stepY = ny * speed * dt;
  if (!circleHitsSolid(level, player.x, player.y + stepY, player.radius)) {
    player.y += stepY;
  }

  // Footsteps: faster paces step more often.
  const stepInterval = player.mode === 'sprint' ? 0.28 : player.mode === 'crouch' ? 0.55 : 0.38;
  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepDue = true;
    player.stepTimer = stepInterval;
  }

  // Sprinting is loud: a noise ping every interval while moving.
  if (player.mode === 'sprint') {
    player.noiseTimer -= dt;
    if (player.noiseTimer <= 0) {
      player.pings.push({ x: player.x, y: player.y });
      player.noiseTimer = NOISE.sprintPingInterval;
    }
  }
}
