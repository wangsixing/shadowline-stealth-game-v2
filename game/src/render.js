// SHADOWLINE — all drawing: the gallery floor, the darkness with pools of
// lamplight, the guards' vision cones, the actors, the HUD and the screens.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, PALETTE, DETECTION } from './config.js';
import { conePolygon } from './vision.js';

let lightCanvas = null;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawTiles(ctx, level) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const c = level.grid[ty][tx];
      const x = tx * TILE;
      const y = ty * TILE;
      // Floor under everything, checkered so distance reads at a glance.
      ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(x, y, TILE, TILE);
      if (c === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        // A lit top edge where the wall meets open floor.
        if (ty === 0 || level.grid[ty - 1][tx] !== '#') {
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(x, y, TILE, 4);
        }
      } else if (c === 'S') {
        ctx.fillStyle = PALETTE.floorDark;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.shadow;
        ctx.fillRect(x, y, TILE, TILE);
      } else if (c === 'L') {
        const cx = x + TILE / 2;
        const cy = y + TILE / 2;
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46);
        glow.addColorStop(0, 'rgba(255,190,90,0.35)');
        glow.addColorStop(1, 'rgba(255,190,90,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 16, y - 16, TILE + 32, TILE + 32);
        ctx.fillStyle = '#ffd27a';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (c === 'B') {
        // A bush: a cluster of dark green tufts.
        ctx.fillStyle = PALETTE.bush;
        for (const [ox, oy, r] of [[9, 20, 8], [16, 12, 9], [23, 21, 8]]) {
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = PALETTE.bushEdge;
        ctx.lineWidth = 1.5;
        for (const [ox, oy, r] of [[9, 20, 8], [16, 12, 9], [23, 21, 8]]) {
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, r, Math.PI, Math.PI * 1.7);
          ctx.stroke();
        }
      } else if (c === 'C') {
        ctx.fillStyle = PALETTE.crate;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = PALETTE.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.stroke();
      } else if (c === 'D') {
        ctx.fillStyle = PALETTE.caseGlass;
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = PALETTE.caseEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + TILE - 8);
        ctx.lineTo(x + TILE - 8, y + 8);
        ctx.stroke();
      }
    }
  }
}

// The artifact pedestal and the exit door, drawn over the floor.
function drawObjectives(ctx, game) {
  const { level } = game;
  // Exit door: a green doorway with a soft glow and a label.
  const e = level.exit;
  const glow = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, 54);
  glow.addColorStop(0, PALETTE.exitGlow);
  glow.addColorStop(1, 'rgba(74,222,128,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(e.x - 54, e.y - 54, 108, 108);
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(e.x - 11, e.y - 13, 22, 26);
  ctx.fillStyle = '#0e2b1a';
  ctx.fillRect(e.x - 7, e.y - 9, 14, 18);
  ctx.fillStyle = PALETTE.exit;
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x, e.y - 18);
  // Artifact: a gold diamond on a pedestal, gently pulsing.
  if (!game.hasArtifact) {
    const a = level.artifact;
    const pulse = 1 + Math.sin(game.time * 3) * 0.12;
    const aglow = ctx.createRadialGradient(a.x, a.y, 2, a.x, a.y, 40 * pulse);
    aglow.addColorStop(0, 'rgba(255,215,94,0.4)');
    aglow.addColorStop(1, 'rgba(255,215,94,0)');
    ctx.fillStyle = aglow;
    ctx.fillRect(a.x - 40, a.y - 40, 80, 80);
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(a.x - 10, a.y - 4, 20, 16);
    ctx.fillStyle = PALETTE.artifact;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 14 * pulse);
    ctx.lineTo(a.x + 8 * pulse, a.y - 4);
    ctx.lineTo(a.x, a.y + 6);
    ctx.lineTo(a.x - 8 * pulse, a.y - 4);
    ctx.closePath();
    ctx.fill();
  }
}

// Darkness over the whole scene, with light punched out around the player,
// the lamps and the exit.
function drawLights(ctx, game) {
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = VIEW_W;
    lightCanvas.height = VIEW_H;
  }
  const lctx = lightCanvas.getContext('2d');
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, VIEW_W, VIEW_H);
  lctx.fillStyle = PALETTE.darkness;
  lctx.fillRect(0, 0, VIEW_W, VIEW_H);
  lctx.globalCompositeOperation = 'destination-out';
  const punch = (x, y, r, a) => {
    const g = lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lctx.fillStyle = g;
    lctx.beginPath();
    lctx.arc(x, y, r, 0, Math.PI * 2);
    lctx.fill();
  };
  punch(game.player.x, game.player.y, 220, 0.95);
  for (const lamp of game.level.lamps) punch(lamp.x, lamp.y, 130, 0.85);
  punch(game.level.exit.x, game.level.exit.y, 100, 0.7);
  ctx.drawImage(lightCanvas, 0, 0);
}

function drawCones(ctx, game) {
  for (const guard of game.guards) {
    const alerted = guard.state === 'chase' || guard.state === 'search';
    const suspicious = !alerted && guard.meter > DETECTION.suspiciousAt;
    const points = conePolygon(guard, game.level);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fillStyle = alerted
      ? PALETTE.coneAlert
      : suspicious
        ? PALETTE.coneSuspicious
        : PALETTE.coneCalm;
    ctx.fill();
    ctx.strokeStyle = alerted ? PALETTE.coneAlertEdge : PALETTE.coneCalmEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawActors(ctx, game) {
  // Guards: red figures with a facing tick and a ? or ! when they suspect.
  for (const guard of game.guards) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 10, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guardDark;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#f5d0d0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 17, guard.y + Math.sin(guard.angle) * 17);
    ctx.stroke();
    const alerted = guard.state === 'chase' || guard.state === 'search';
    const suspicious = !alerted && guard.meter > 0.3;
    if (alerted || suspicious) {
      ctx.fillStyle = alerted ? PALETTE.danger : '#ffb04e';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(alerted ? '!' : '?', guard.x, guard.y - 20);
    }
  }
  // The player: a pale figure with a teal ring, smaller while crouching,
  // half-hidden while inside a bush.
  const p = game.player;
  const inBush = game.level.grid[Math.floor(p.y / TILE)][Math.floor(p.x / TILE)] === 'B';
  ctx.globalAlpha = inBush ? 0.6 : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 9, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerRing;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = '#3a3f47';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * (p.radius + 4), p.y + Math.sin(p.angle) * (p.radius + 4));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawHud(ctx, game) {
  const level = game.level.def;
  // Top bar: level name left, clock and alarms right.
  ctx.fillStyle = 'rgba(5,7,10,0.72)';
  ctx.fillRect(0, 0, VIEW_W, 36);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SHADOWLINE — LEVEL ${game.levelIndex + 1}: ${level.name.toUpperCase()}`, 14, 24);
  ctx.textAlign = 'right';
  ctx.fillText(`${formatTime(game.elapsed)}   ALARMS ${game.alarms}`, VIEW_W - 14, 24);
  // Bottom bar: detection meter, artifact status, hint.
  ctx.fillStyle = 'rgba(5,7,10,0.72)';
  ctx.fillRect(0, VIEW_H - 40, VIEW_W, 40);
  const meter = game.maxMeter;
  const meterLabel = meter >= 1 ? 'SPOTTED!' : meter > DETECTION.suspiciousAt ? 'SUSPICIOUS' : 'UNSEEN';
  ctx.textAlign = 'left';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('DETECTION', 14, VIEW_H - 22);
  ctx.fillStyle = '#11161c';
  ctx.fillRect(100, VIEW_H - 32, 220, 14);
  const meterColor = meter >= 1 ? PALETTE.danger : meter > DETECTION.suspiciousAt ? '#ffb04e' : PALETTE.playerRing;
  ctx.fillStyle = meterColor;
  ctx.fillRect(100, VIEW_H - 32, 220 * Math.min(1, meter), 14);
  ctx.fillStyle = meterColor;
  ctx.fillText(meterLabel, 330, VIEW_H - 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = game.hasArtifact ? PALETTE.artifact : PALETTE.hudDim;
  ctx.fillText(game.hasArtifact ? '◆ ARTIFACT STOLEN' : '◇ ARTIFACT: FIND IT', VIEW_W - 14, VIEW_H - 22);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(level.hint, VIEW_W / 2, VIEW_H - 8);
}

function overlayPanel(ctx, title, lines, titleColor) {
  ctx.fillStyle = 'rgba(3,5,9,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, 300);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, 350 + i * 30);
  });
}

function drawTitle(ctx, game) {
  overlayPanel(ctx, 'SHADOWLINE', [
    'a night at the Meridian Gallery',
    '',
    'Steal the Meridian Star. Reach the green exit. Don\'t get caught.',
    'WASD / arrows to move · Shift to sprint (loud!) · C to crouch',
    'Bushes hide you · shadows slow the guards\' eyes · R restarts a level',
    '',
    'Press ENTER to begin',
  ], PALETTE.hudText);
}

function drawCaught(ctx) {
  overlayPanel(ctx, 'CAUGHT!', [
    'A guard got their hands on you. The night is not over yet.',
    '',
    'Press R to retry the level',
  ], PALETTE.danger);
}

function drawLevelComplete(ctx, game) {
  overlayPanel(ctx, 'ARTIFACT SECURED', [
    `You slipped out of ${game.level.def.name} in ${formatTime(game.elapsed)}.`,
    '',
    'Press ENTER for the next level',
  ], PALETTE.artifact);
}

function drawWin(ctx, game) {
  overlayPanel(ctx, 'YOU VANISHED', [
    'Both artifacts are yours, and no guard ever laid a hand on you.',
    `Total time ${formatTime(game.totalTime)} · alarms raised ${game.totalAlarms}`,
    '',
    'Press R to play again',
  ], PALETTE.exit);
}

export function render(ctx, game) {
  drawTiles(ctx, game.level);
  drawObjectives(ctx, game);
  drawLights(ctx, game);
  drawCones(ctx, game);
  drawActors(ctx, game);
  drawHud(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  else if (game.state === 'caught') drawCaught(ctx);
  else if (game.state === 'levelComplete') drawLevelComplete(ctx, game);
  else if (game.state === 'win') drawWin(ctx, game);
}
