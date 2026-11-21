// SHADOWLINE — screenshot staging. ?shot=1..4 opens a frozen, composed
// frame: shots 1-3 on level 1, shot 4 on level 2. The game loop is frozen
// and the HUD clock is set to a lived-in 47 seconds, so every screenshot
// shows the game at its best: cones, guards, cover, the artifact, the exit.

import { TILE } from './config.js';

function place(actor, tx, ty) {
  actor.x = tx * TILE + TILE / 2;
  actor.y = ty * TILE + TILE / 2;
}

// The level is already loaded by main.js; this only stages the actors.
export function stageShot(game, n) {
  game.frozen = true;
  game.state = 'playing';
  game.elapsed = 47;
  const [g0, g1, g2, g3, g4] = game.guards;
  if (n === 1) {
    // Crouched in a bush while a guard's cone sweeps past.
    place(game.player, 12, 11);
    game.player.mode = 'crouch';
    game.player.angle = Math.PI / 2;
    place(g0, 20, 11);
    g0.angle = Math.PI;
    g0.meter = 0.45;
    place(g1, 24, 4);
    g1.angle = 0;
    place(g2, 20, 20);
    g2.angle = Math.PI;
    game.maxMeter = 0.45;
  } else if (n === 2) {
    // Closing in on the Meridian Star, a guard turning toward you.
    place(game.player, 31, 3);
    game.player.angle = -Math.PI / 2;
    place(g1, 24, 4);
    g1.angle = 0;
    g1.meter = 0.3;
    place(g0, 14, 11);
    g0.angle = 0;
    place(g2, 20, 20);
    g2.angle = Math.PI;
    game.maxMeter = 0.3;
  } else if (n === 3) {
    // The alarm is up: artifact stolen, sprinting for the exit, chased.
    game.hasArtifact = true;
    game.alarms = 1;
    place(game.player, 18, 21);
    game.player.mode = 'sprint';
    game.player.angle = Math.PI / 2;
    place(g2, 14, 20);
    g2.angle = Math.atan2(game.player.y - g2.y, game.player.x - g2.x);
    g2.state = 'chase';
    g2.meter = 1;
    g2.lastSeen = { x: game.player.x, y: game.player.y };
    place(g0, 20, 11);
    g0.angle = Math.PI / 2;
    g0.meter = 0.6;
    place(g1, 16, 4);
    g1.angle = Math.PI / 2;
    game.maxMeter = 1;
  } else if (n === 4) {
    // The Vault: crouched behind cover as two cones cross the hall.
    place(game.player, 8, 10);
    game.player.mode = 'crouch';
    game.player.angle = 0;
    place(g2, 20, 11);
    g2.angle = Math.PI;
    g2.meter = 0.5;
    place(g0, 2, 4);
    g0.angle = Math.PI / 2;
    place(g1, 20, 4);
    g1.angle = Math.PI;
    place(g3, 34, 13);
    g3.angle = -Math.PI / 2;
    place(g4, 20, 20);
    g4.angle = 0;
    game.maxMeter = 0.5;
  }
}
