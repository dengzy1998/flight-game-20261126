// Aurora Ridge Flight — tuning tables: missions, upgrades, relics, meta shop.
// One job: every number the game balances on lives here, so tuning never
// means hunting through the flight model or the renderer.

export const VIEW = {
  width: 1280,
  height: 800,
  focal: 560, // projection focal length (screen px per world unit at depth 1)
  horizonBase: 330, // horizon line in px before pitch offset
  farDistance: 1900, // how far ahead the ground strips reach
  stripStep: 40, // world units per ground strip
  groundHalfWidth: 520, // world units of ground drawn each side
};

export const FLIGHT = {
  minSpeed: 55, // knots shown are speed * 1.2; world units per second here
  maxSpeed: 340,
  cruiseThrottle: 0.68,
  accelRate: 55, // speed units/s^2 toward throttle target
  maxBank: 0.95, // radians of visual bank at full stick
  turnRate: 0.55, // heading change per second at full bank, scaled by speed
  climbRate: 150, // world units/s of altitude at full pitch
  minAltitude: 40, // hard floor above the highest hill + margin
  maxAltitude: 950,
  fuelBurnBase: 0.32, // fuel per second at idle
  fuelBurnThrottle: 1.05, // extra fuel per second at full throttle
  fuelPerRing: 6,
  runwayRefuel: 2.5, // fuel per second while low over a runway
  hullMax: 100,
  fuelMax: 100,
  terrainHitDamage: 34,
  bulletDamage: 10,
  droneBulletDamage: 6,
  flakDamage: 10,
  stormDamagePerSec: 9,
  fireInterval: 0.12, // seconds between cannon shots
  bulletSpeed: 1200,
  bulletRange: 1300,
  ringRadius: 55, // world units; flying through the hoop counts
  ringScore: 100,
  droneKillScore: 150,
  bossKillScore: 1000,
  missionBonus: 500,
};

export const MISSIONS = [
  {
    id: 1,
    name: 'RING RUN',
    brief: 'Thread 12 sky rings over Aurora Ridge before your tanks run dry. Rings refuel you — fly clean, fly fast.',
    goal: 'Pass at least 9 of 12 rings',
    rings: 12,
    need: 9,
    drones: 0,
    flak: 0,
    storm: 0,
  },
  {
    id: 2,
    name: 'SUPPLY DROP',
    brief: 'Three cut-off ridge stations need crates. Dive below 500 ft over a smoking drop zone and release. Flak and drones guard the valley.',
    goal: 'Deliver at least 2 of 3 crates',
    rings: 0,
    need: 2,
    zones: 3,
    drones: 2,
    flak: 1,
    storm: 0,
  },
  {
    id: 3,
    name: 'STORM BOSS',
    brief: 'Two sky pirates hold the pass: the ace STORMHAWK, then the airship SKY LEVIATHAN. Shoot them down and the ridge is yours.',
    goal: 'Shoot down both bosses',
    rings: 0,
    need: 2,
    drones: 3,
    flak: 0,
    storm: 1,
  },
];

// 9 upgrades: the pool the between-mission draft draws 3 cards from.
export const UPGRADES = [
  { id: 'tank', name: 'EXTRA FUEL TANK', desc: '+30 max fuel. Longer legs, fewer hard choices.', apply: (p) => { p.maxFuel += 30; p.fuel += 30; } },
  { id: 'turbo', name: 'TURBOFAN ENGINE', desc: '+15% top speed and faster climb.', apply: (p) => { p.topSpeed *= 1.15; p.climb *= 1.15; } },
  { id: 'hull', name: 'REINFORCED HULL', desc: '+25 max hull. Bounces hurt less.', apply: (p) => { p.maxHull += 25; p.hull += 25; } },
  { id: 'cannon', name: 'RAPID CANNON', desc: 'Fire rate +40%. The sky gets quieter.', apply: (p) => { p.fireInterval *= 0.6; } },
  { id: 'magnet', name: 'RING MAGNET', desc: 'Rings pull toward you and pay +50% score.', apply: (p) => { p.ringMagnet = true; p.ringScoreMult *= 1.5; } },
  { id: 'scoop', name: 'FUEL SCOOP', desc: 'Rings give +8 fuel instead of +6.', apply: (p) => { p.fuelPerRing = 8; } },
  { id: 'flares', name: 'FLARE COUNTERMEASURES', desc: 'Enemy fire misses 35% more often.', apply: (p) => { p.evasion += 0.35; } },
  { id: 'gyro', name: 'GYRO STABILIZER', desc: 'Turn rate +25%. The ridge bends to you.', apply: (p) => { p.turnRate *= 1.25; } },
  { id: 'compass', name: 'LUCKY COMPASS', desc: '+10% score and relics appear more often.', apply: (p) => { p.scoreMult *= 1.1; p.relicLuck += 0.5; } },
];

// 5 relics: rare pickups that drift across the course, one effect each.
export const RELICS = [
  { id: 'gold-compass', name: 'GOLDEN COMPASS', desc: 'Score +15% for the rest of the run.' },
  { id: 'storm-charm', name: 'STORM CHARM', desc: 'Storm clouds hurt half as much.' },
  { id: 'medal-doubler', name: 'SKY MEDAL DOUBLER', desc: 'Medals earned this run are doubled.' },
  { id: 'phoenix', name: 'PHOENIX FEATHER', desc: 'Once per run, survive a fatal hit at 50% hull.' },
  { id: 'aurora-lens', name: 'AURORA LENS', desc: 'Rings are worth +50% score.' },
];

// Permanent hangar (meta) progression, bought with Sky Medals, kept in localStorage.
export const META_SHOP = [
  { id: 'fuel', name: 'DEEP TANKS', desc: '+10% max fuel, every run.', cost: 10, max: 3 },
  { id: 'armor', name: 'ARMOURED SKIN', desc: '+10 max hull, every run.', cost: 15, max: 3 },
  { id: 'guns', name: 'BORE-SIGHTED GUNS', desc: '+25% cannon damage, every run.', cost: 15, max: 3 },
  { id: 'relic', name: 'LUCKY CHARM SLOT', desc: 'Start every run holding one random relic.', cost: 25, max: 1 },
];

export const PALETTE = {
  skyTop: '#1b1740',
  skyMid: '#4a2d6b',
  skyHorizon: '#e8803c',
  sunCore: '#ffd98a',
  sunGlow: 'rgba(255, 170, 80, 0.55)',
  mountainFar: '#6a548f',
  mountainMid: '#4a3568',
  mountainNear: '#2e2044',
  groundLow: '#2f6b3a',
  groundHigh: '#7d9b4e',
  groundRock: '#8a7a68',
  groundSnow: '#e8e4da',
  river: '#3f8fd2',
  runway: '#3a3f46',
  hudPanel: 'rgba(8, 22, 34, 0.74)',
  hudBorder: 'rgba(120, 220, 255, 0.55)',
  hudText: '#cfeeff',
  hudAmber: '#ffb347',
  hudRed: '#ff5a5a',
  hudGreen: '#7dff9e',
};
