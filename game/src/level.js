// SHADOWLINE — level maps, the map parser, collision helpers and the
// grid pathfinder the guards use to walk their patrols around walls.
//
// Map legend (each row exactly 40 chars, 25 rows):
//   # wall (solid, blocks movement and sight)
//   . floor
//   C crate (solid cover, blocks sight)
//   D display case (solid cover)
//   B bush (soft cover: walk through; guards cannot see you inside it)
//   L lamp (floor with a pool of warm light)
//   S shadow (dark floor: spotted half as fast)
//   A artifact pedestal
//   E exit door
//   P player start

import { TILE, COLS, ROWS } from './config.js';

export const LEVELS = [
  {
    name: 'The Gallery',
    subtitle: 'Steal the Meridian Star, then slip out the south door.',
    hint: 'WASD to move · Shift to sprint (loud!) · C to crouch · bushes hide you',
    map: [
      '########################################',
      '#......B................B......A.......#',
      '#......................................#',
      '#..C..........D...........C..........B.#',
      '#......................................#',
      '#......B.....................B.........#',
      '#......................................#',
      '#..C..........L...........L..........C.#',
      '######.############..############.######',
      '#......................................#',
      '#....C......B..........C......B........#',
      '#......................................#',
      '#.........D................D...........#',
      '#....B.....SSS...........B.....SSS.....#',
      '#......................................#',
      '#..C...........L......L...........C....#',
      '#......................................#',
      '######.############..############.######',
      '#......................................#',
      '#....B......C..........B......C........#',
      '#......................................#',
      '#..P......................B............#',
      '#......................................#',
      '#..................E...................#',
      '########################################',
    ],
    guards: [
      { waypoints: [[8, 11], [20, 11], [32, 11], [20, 11]], pause: 1.4 },
      { waypoints: [[10, 4], [24, 4], [31, 4], [16, 4]], pause: 1.2 },
      { waypoints: [[8, 20], [20, 20], [32, 20], [20, 20]], pause: 1.0 },
    ],
  },
  {
    name: 'The Vault',
    subtitle: 'Five guards, tighter halls. Patience pays.',
    hint: 'Watch the cones. Sprint only when no guard can hear you.',
    map: [
      '########################################',
      '#....#..........#..........#....A......#',
      '#....#....C.....#....B.....#...........#',
      '#....#..........#..........#...........#',
      '#..........B..........C.........B......#',
      '#....#..........#..........#...........#',
      '#....#....L.....#....L.....#....C......#',
      '#....#..........#..........#...........#',
      // The wall rows' gaps sit one tile beside the vertical walls above
      // them, so each section of the Vault actually connects to the next.
      '######.##########.##########.###########',
      '#......................................#',
      '#..C.....B........D.......B.....C......#',
      '#......................................#',
      '#.......#..........#..........#........#',
      '#..B....#....C....#....B....#....D.....#',
      '#.......#..........#..........#........#',
      '#.......#....L....#....L....#..........#',
      '#.......#..........#..........#....B...#',
      '#######.##########.##########.##########',
      '#......................................#',
      '#....C......B..........C......B........#',
      '#......................................#',
      '#..E......................B.........P..#',
      '#......................................#',
      '#......B.....................C.........#',
      '########################################',
    ],
    guards: [
      { waypoints: [[2, 2], [2, 6], [8, 6], [8, 2]], pause: 1.2 },
      { waypoints: [[18, 2], [18, 6], [24, 6], [24, 2]], pause: 1.0 },
      { waypoints: [[6, 11], [20, 11], [34, 11], [20, 11]], pause: 1.4 },
      { waypoints: [[34, 10], [34, 16], [34, 10]], pause: 1.2 },
      { waypoints: [[10, 20], [25, 20], [33, 20], [25, 20]], pause: 1.0 },
    ],
  },
];

// The centre of a tile, in pixels.
export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

// Parse one level definition into a grid plus the named spots.
export function parseLevel(def) {
  if (def.map.length !== ROWS) {
    throw new Error(`map has ${def.map.length} rows, expected ${ROWS}`);
  }
  const grid = [];
  const level = { def, grid, lamps: [], playerStart: null, artifact: null, exit: null };
  for (let y = 0; y < ROWS; y++) {
    const row = def.map[y];
    if (row.length !== COLS) {
      throw new Error(`map row ${y} has ${row.length} chars, expected ${COLS}`);
    }
    const cells = row.split('');
    grid.push(cells);
    for (let x = 0; x < COLS; x++) {
      const c = tileCenter(x, y);
      if (cells[x] === 'P') level.playerStart = c;
      if (cells[x] === 'A') level.artifact = c;
      if (cells[x] === 'E') level.exit = c;
      if (cells[x] === 'L') level.lamps.push(c);
    }
  }
  if (!level.playerStart || !level.artifact || !level.exit) {
    throw new Error('map is missing its player start, artifact or exit');
  }
  return level;
}

// The map character at a pixel position ('#' outside the map).
export function tileAt(level, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.grid[ty][tx];
}

// Solid tiles block movement and sight: walls, crates, display cases.
export function isSolidTile(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const c = level.grid[ty][tx];
  return c === '#' || c === 'C' || c === 'D';
}

export function isSolidAt(level, x, y) {
  return isSolidTile(level, Math.floor(x / TILE), Math.floor(y / TILE));
}

// True when a circle of radius r at (x, y) overlaps any solid tile.
export function circleHitsSolid(level, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolidTile(level, tx, ty)) continue;
      const closestX = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const closestY = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

export function inBush(level, x, y) {
  return tileAt(level, x, y) === 'B';
}

export function inShadow(level, x, y) {
  return tileAt(level, x, y) === 'S';
}

// Breadth-first path over walkable tiles, from one pixel point to another.
// Returns the list of tile centres to walk through (goal included, start
// excluded), or [] when the goal cannot be reached.
export function findPath(level, fromX, fromY, toX, toY) {
  const sx = Math.floor(fromX / TILE);
  const sy = Math.floor(fromY / TILE);
  const gx = Math.floor(toX / TILE);
  const gy = Math.floor(toY / TILE);
  if (sx === gx && sy === gy) return [];
  if (isSolidTile(level, gx, gy)) return [];
  const key = (x, y) => y * COLS + x;
  const prev = new Map();
  const queue = [[sx, sy]];
  prev.set(key(sx, sy), null);
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === gx && cy === gy) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (isSolidTile(level, nx, ny)) continue;
      const k = key(nx, ny);
      if (prev.has(k)) continue;
      prev.set(k, [cx, cy]);
      queue.push([nx, ny]);
    }
  }
  if (!prev.has(key(gx, gy))) return [];
  const path = [];
  let cur = [gx, gy];
  while (cur) {
    path.push(tileCenter(cur[0], cur[1]));
    cur = prev.get(key(cur[0], cur[1]));
  }
  path.reverse();
  path.shift(); // drop the start tile itself
  return path;
}
