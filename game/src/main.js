// SHADOWLINE — the game loop and state machine: title -> playing ->
// caught / levelComplete -> win. Wires input, player, guards, audio and
// the renderer together, and honours ?shot=1..4 for screenshot staging.

import { GUARD, DETECTION } from './config.js';
import { LEVELS, parseLevel } from './level.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuard, updateGuard, guardHearsPing } from './guard.js';
import { createInput } from './input.js';
import * as audio from './audio.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export function loadLevel(game, index) {
  const def = LEVELS[index];
  const level = parseLevel(def);
  game.levelIndex = index;
  game.level = level;
  game.player = createPlayer(level.playerStart.x, level.playerStart.y);
  game.guards = def.guards.map((g) => createGuard(g.waypoints, g.pause));
  game.hasArtifact = false;
  game.elapsed = 0;
  game.maxMeter = 0;
  game.alarms = 0;
}

const game = {
  state: 'title',
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  hasArtifact: false,
  alarms: 0,
  totalAlarms: 0,
  elapsed: 0,
  totalTime: 0,
  time: 0,
  frozen: false,
  maxMeter: 0,
  pingTimer: 0,
};
loadLevel(game, 0);

const input = createInput();

// Screenshot staging: ?shot=1..4 freezes a composed frame.
const shotParam = new URLSearchParams(location.search).get('shot');
if (shotParam) {
  const n = parseInt(shotParam, 10);
  if (n >= 1 && n <= 4) {
    loadLevel(game, n === 4 ? 1 : 0);
    stageShot(game, n);
  }
}

function update(dt) {
  game.time += dt;
  if (input.wasPressed('KeyM')) audio.setMuted(!audio.isMuted());

  if (game.state === 'title') {
    if (input.wasPressed('Enter')) {
      audio.unlockAudio();
      game.state = 'playing';
    }
    return;
  }

  if (game.state === 'playing') {
    game.elapsed += dt;
    const mv = input.moveVector();
    updatePlayer(
      game.player,
      { mx: mv.x, my: mv.y, sprint: input.sprint(), crouch: input.crouch() },
      dt,
      game.level,
    );
    if (game.player.stepDue) audio.playFootstep(game.player.mode);
    for (const ping of game.player.pings) {
      for (const guard of game.guards) guardHearsPing(guard, ping, game.level);
    }

    let maxMeter = 0;
    for (const guard of game.guards) {
      updateGuard(guard, dt, game.player, game.level);
      if (guard.justAlerted) {
        game.alarms++;
        audio.playAlarm();
      }
      if (guard.stepDue) {
        audio.playGuardStep(Math.hypot(guard.x - game.player.x, guard.y - game.player.y));
      }
      maxMeter = Math.max(maxMeter, guard.meter);
      // An alerted guard that closes within catch range ends the level.
      if (
        (guard.state === 'chase' || guard.state === 'search') &&
        Math.hypot(guard.x - game.player.x, guard.y - game.player.y) < GUARD.catchRange
      ) {
        game.state = 'caught';
        audio.playCaught();
      }
    }
    game.maxMeter = maxMeter;
    if (maxMeter > DETECTION.suspiciousAt && game.state === 'playing') {
      game.pingTimer -= dt;
      if (game.pingTimer <= 0) {
        audio.playPing(maxMeter);
        game.pingTimer = 0.6 - 0.4 * maxMeter;
      }
    }

    if (game.state !== 'playing') return;
    // Touch the artifact to steal it.
    if (
      !game.hasArtifact &&
      Math.hypot(game.player.x - game.level.artifact.x, game.player.y - game.level.artifact.y) < 26
    ) {
      game.hasArtifact = true;
      audio.playPickup();
    }
    // Reach the exit carrying it to finish the level.
    if (
      game.hasArtifact &&
      Math.hypot(game.player.x - game.level.exit.x, game.player.y - game.level.exit.y) < 30
    ) {
      game.totalTime += game.elapsed;
      game.totalAlarms += game.alarms;
      if (game.levelIndex + 1 < LEVELS.length) {
        game.state = 'levelComplete';
      } else {
        game.state = 'win';
        audio.playWin();
      }
    }
    if (input.wasPressed('KeyR')) loadLevel(game, game.levelIndex);
    return;
  }

  if (game.state === 'caught') {
    if (input.wasPressed('KeyR')) {
      loadLevel(game, game.levelIndex);
      game.state = 'playing';
    }
    return;
  }

  if (game.state === 'levelComplete') {
    if (input.wasPressed('Enter')) {
      loadLevel(game, game.levelIndex + 1);
      game.state = 'playing';
    }
    return;
  }

  if (game.state === 'win') {
    if (input.wasPressed('KeyR')) {
      game.totalTime = 0;
      game.totalAlarms = 0;
      loadLevel(game, 0);
      game.state = 'playing';
    }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.frozen) update(dt);
  render(ctx, game);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposed for playtesting: the live game object, and a ready flag.
window.__shadowline = game;
window.__shadowlineReady = true;
