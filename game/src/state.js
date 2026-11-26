// Aurora Ridge Flight — the shared game state: one object every module reads.
// One job: hold the whole run (screen, plane, mission, scores, meta) in one
// place, so the loop, the renderer and the missions never drift apart.

import { FLIGHT } from './config.js';

export const META_KEY = 'aurora-ridge-meta-v1';

export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { medals: 0, fuel: 0, armor: 0, guns: 0, relic: 0, best: 0 };
    const m = JSON.parse(raw);
    return { medals: m.medals | 0, fuel: m.fuel | 0, armor: m.armor | 0, guns: m.guns | 0, relic: m.relic | 0, best: m.best | 0 };
  } catch {
    return { medals: 0, fuel: 0, armor: 0, guns: 0, relic: 0, best: 0 };
  }
}

export function saveMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Private mode or no storage: the run still plays, medals just don't persist.
  }
}

// A fresh plane: meta shop levels fold in here, upgrade picks fold in later.
export function newPlane(meta) {
  return {
    x: 0, y: 320, z: 0, // world position; y is altitude in world units
    heading: 0, // radians; 0 = due north up the valley
    pitch: 0, // visual pitch, radians
    bank: 0, // visual bank, radians
    climb: 0, // vertical speed, world units/s
    speed: 120,
    throttle: 0.68,
    maxFuel: FLIGHT.fuelMax * (1 + 0.1 * meta.fuel),
    fuel: FLIGHT.fuelMax * (1 + 0.1 * meta.fuel),
    maxHull: FLIGHT.hullMax + 10 * meta.armor,
    hull: FLIGHT.hullMax + 10 * meta.armor,
    topSpeed: FLIGHT.maxSpeed,
    climbRate: FLIGHT.climbRate,
    turnRate: FLIGHT.turnRate,
    fireInterval: FLIGHT.fireInterval,
    bulletDamage: FLIGHT.bulletDamage * (1 + 0.25 * meta.guns),
    fuelPerRing: FLIGHT.fuelPerRing,
    ringMagnet: false,
    ringScoreMult: 1,
    scoreMult: 1,
    relicLuck: 0,
    evasion: 0,
    fireCooldown: 0,
    relics: [],
    phoenixUsed: false,
    stormCharm: false,
  };
}

export function newGame(seed) {
  return {
    seed,
    screen: 'title', // title | briefing | playing | upgrade | missionComplete | gameover | victory | paused
    prevScreen: 'title',
    time: 0, // seconds since the run started
    missionIndex: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    medalsEarned: 0,
    meta: loadMeta(),
    plane: newPlane(loadMeta()),
    rings: [], // {x, y, z, passed, missed}
    ringIndex: 0,
    zones: [], // supply-drop zones {x, z, delivered, failed}
    crates: 3,
    relicPickups: [], // drifting relics {x, y, z, relic, taken}
    drones: [], // enemy drones {x, y, z, hp, fireTimer, vx, phase}
    bosses: [], // {kind, x, y, z, hp, maxHp, fireTimer, phase}
    bullets: [], // player tracers {x, y, z, vx, vy, vz, life}
    enemyBullets: [], // {x, y, z, vx, vy, vz, life}
    flak: [], // flak bursts {x, y, z, timer}
    clouds: [],
    messages: [], // floating HUD banners {text, sub, timer, color}
    popups: [], // world-space score popups {x, y, z, text, timer}
    particles: [], // {x, y, z, vx, vy, vz, life, color, size}
    shake: 0,
    flash: 0, // red damage vignette 0..1
    autopilot: false,
    upgradeDraft: [], // 3 upgrade cards offered between missions
    missionStats: { ringsPassed: 0, ringsTotal: 0, delivered: 0, bossesDown: 0 },
    endReason: '', // why the run ended, shown on the end screen
    endTitle: '',
    hangar: false, // hangar overlay open on the title screen
    muted: false,
    runLog: [], // short event log for the end screen
  };
}

export const G = newGame(20261126);
