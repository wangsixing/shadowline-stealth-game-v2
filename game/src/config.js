// SHADOWLINE — every tuning number and colour in one place.
// The game is a top-down 2D canvas stealth game: a thief in a dark museum
// at night. Steal the artifact, reach the exit, don't get caught.

export const TILE = 32;
export const COLS = 40;
export const ROWS = 25;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 800

export const PLAYER = {
  walkSpeed: 150, // px/s
  crouchSpeed: 85,
  sprintSpeed: 235,
  radius: 12,
  crouchRadius: 10,
};

export const GUARD = {
  patrolSpeed: 70,
  chaseSpeed: 215,
  searchSpeed: 110,
  turnSpeed: 2.6, // rad/s while scanning at a waypoint
  chaseTurnSpeed: 6.0, // rad/s while moving or chasing
  radius: 13,
  coneRange: 235,
  coneHalfAngle: Math.PI / 4, // 45 degrees each side
  bushHideRange: 70, // closer than this, a bush no longer hides you
  catchRange: 26, // an alerted guard this close catches you
  chaseMemory: 4, // seconds of lost sight before giving up the chase
  searchTime: 5, // seconds spent searching the last seen spot
  noiseRadius: 170, // sprint pings reach this far
};

export const DETECTION = {
  fillRate: 0.35, // meter per second while seen
  pointBlankRate: 1.1, // meter per second within pointBlankRange
  pointBlankRange: 60,
  decayRate: 0.4, // meter per second while unseen
  sprintMultiplier: 1.6,
  crouchMultiplier: 0.55,
  shadowMultiplier: 0.5,
  suspiciousAt: 0.15, // meter above this tints the cone orange
};

export const NOISE = {
  sprintPingInterval: 0.45, // seconds between sprint noise pings
  pingRadius: 170,
};

// Night gallery: cool slate floors, warm lamp pools, readable cones.
export const PALETTE = {
  floor: '#232a33',
  floorAlt: '#262e38',
  floorDark: '#1a2027',
  wall: '#0e1218',
  wallTop: '#3a4552',
  crate: '#6b5432',
  crateEdge: '#8a6d42',
  caseGlass: '#3d5a6b',
  caseEdge: '#6fa3b8',
  bush: '#1e4d2b',
  bushEdge: '#2f7a44',
  lampGlow: 'rgba(255,190,90,0.16)',
  shadow: 'rgba(4,6,10,0.55)',
  darkness: 'rgba(3,5,9,0.62)',
  coneCalm: 'rgba(255,205,100,0.20)',
  coneCalmEdge: 'rgba(255,205,100,0.45)',
  coneSuspicious: 'rgba(255,150,60,0.30)',
  coneAlert: 'rgba(255,70,60,0.34)',
  coneAlertEdge: 'rgba(255,70,60,0.6)',
  player: '#e8e4d8',
  playerRing: '#57d9c5',
  guard: '#c94f4f',
  guardDark: '#7e2f2f',
  artifact: '#ffd75e',
  exit: '#4ade80',
  exitGlow: 'rgba(74,222,128,0.25)',
  hudText: '#e8e4d8',
  hudDim: '#9aa5b1',
  danger: '#ff5a4e',
};
