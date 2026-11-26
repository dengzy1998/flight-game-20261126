// Aurora Ridge Flight — autopilot and screenshot staging.
// One job: fly the plane when no human is holding the stick, and put the
// game into a photogenic state for each ?shot= URL the maker screenshots.
// The autopilot also powers the moving world behind the title screen.

import { MISSIONS } from './config.js';
import { startMission, startRun } from './missions.js';
import { clamp } from './random.js';

// Steer toward the current objective: next ring, drop zone, or boss.
// Writes into the same input shape the keyboard produces.
export function autopilot(G, input) {
  const p = G.plane;
  const m = MISSIONS[G.missionIndex];
  let tx = 0; // target lateral position
  let ty = 380; // target altitude
  let wantFire = false;

  if (G.screen === 'title') {
    tx = Math.sin(G.time * 0.11) * 140;
    ty = 380 + Math.sin(G.time * 0.23) * 80;
  } else if (m.id === 1) {
    const next = G.rings[G.ringIndex];
    if (next) { tx = next.x; ty = next.y; }
  } else if (m.id === 2) {
    const zone = G.zones.find((z) => !z.delivered && !z.failed);
    if (zone) { tx = zone.x; ty = 300; }
  } else if (m.id === 3) {
    const boss = G.bosses.find((b) => b.hp > 0);
    if (boss) { tx = boss.x; ty = boss.y; wantFire = true; }
    else if (G.drones[0]) { tx = G.drones[0].x; ty = G.drones[0].y; wantFire = true; }
  }
  // Drones in the way are worth a burst.
  if (G.drones.length && Math.abs(G.drones[0].z - p.z) < 800) wantFire = true;

  // Heading-aware steering: aim the nose at the objective, don't chase it
  // with raw position error (that oscillates — the heading outlives the
  // bank that made it, so a position-only controller overshoots every ring).
  const dx = tx - p.x;
  const desiredHeading = Math.atan2(dx, 320);
  const headingErr = desiredHeading - p.heading;
  input.left = headingErr < -0.03;
  input.right = headingErr > 0.03;
  // Pitch: climb or dive toward the objective's altitude, with a dead band.
  const dy = ty - p.y;
  input.up = dy > 30;
  input.down = dy < -30;
  input.throttleUp = p.throttle < 0.72;
  input.throttleDown = p.throttle > 0.78;
  input.fire = wantFire;
  input.drop = false;
  // Drop when the autopilot is lined up over a zone, low and slow.
  if (m.id === 2) {
    const zone = G.zones.find((z) => !z.delivered && !z.failed);
    if (zone && Math.abs(p.z - zone.z) < 100 && Math.abs(p.x - zone.x) < 60 && p.y < 520 && G.crates > 0) {
      input.drop = true;
    }
  }
}

// Put the game into a fixed, photogenic state for a screenshot URL.
// shot: title | cover | boss | score. Deterministic: same seed, same frame.
export function stageShot(G, shot, seed, terrain) {
  const p = G.plane;
  if (shot === 'title') {
    G.screen = 'title';
    G.autopilot = true;
    p.x = 0; p.y = 380; p.z = 0;
    p.throttle = 0.7; p.speed = 200; p.bank = 0.15;
    return;
  }
  if (shot === 'cover') {
    // Mission 1, mid-course: three rings ahead in a gentle line, drones on
    // the wing, low sun. The next ring sits ~300 m out: big, but not on top
    // of the jet. The frame freezes 0.9 s in (see main.js).
    G.shotMode = true;
    G.shotElapsed = 0;
    startRun(G, seed);
    startMission(G, 0, seed);
    G.screen = 'playing';
    G.autopilot = true;
    p.z = 700; // next ring ~260 m out once the 0.9 s freeze-frame settles
    p.x = -40; p.y = 400;
    p.throttle = 0.85; p.speed = 265; p.bank = 0.22; p.climb = 0;
    G.rings[0].passed = true; G.rings[1].passed = true;
    G.ringIndex = 2;
    G.rings[2].x = 60; G.rings[2].y = 430; G.rings[2].z = 1200;
    G.rings[3].x = -90; G.rings[3].y = 380; G.rings[3].z = 1620;
    G.rings[4].x = 140; G.rings[4].y = 470; G.rings[4].z = 2040;
    G.missionStats.ringsPassed = 2;
    G.combo = 2; G.comboTimer = 5;
    G.score = 420;
    G.drones = [
      { x: 180, y: 480, z: p.z + 620, hp: 30, maxHp: 30, fireTimer: 1, phase: 1 },
      { x: -220, y: 300, z: p.z + 760, hp: 30, maxHp: 30, fireTimer: 2, phase: 3 },
    ];
    G.messages = [{ text: 'RING 3 OF 12', sub: 'Thread the amber hoop — it pays fuel and score.', timer: 99, color: '#ffe98a' }];
    return;
  }
  if (shot === 'boss') {
    // Mission 3, mid-fight: the Leviathan ahead, tracers in the air, hull hurt.
    // The frame freezes 0.9 s in (see main.js).
    G.shotMode = true;
    G.shotElapsed = 0;
    startRun(G, seed);
    startMission(G, 2, seed);
    G.screen = 'playing';
    G.autopilot = true;
    G.score = 2450;
    G.combo = 3; G.comboTimer = 5;
    p.throttle = 0.8; p.speed = 250; p.bank = -0.15; p.climb = 0;
    p.y = 460; // level with the boss: no steep climb in the frame
    p.hull = 62;
    const boss = G.bosses.find((b) => b.kind === 'stormhawk');
    if (boss) { boss.hp = 0; G.missionStats.bossesDown = 1; }
    G.bosses = G.bosses.filter((b) => b.hp > 0);
    // The Leviathan arrives already damaged and firing, close enough to
    // read clearly. Storm clouds are pushed to the flanks so the centre
    // lane — and the boss — stay visible.
    const lev = { kind: 'airship', x: -60, y: 500, z: p.z + 850, hp: 150, maxHp: 260, fireTimer: 0.5, phase: 2, speed: 0.4, droneTimer: 5 };
    G.bosses.push(lev);
    for (const c of G.clouds) {
      if (c.storm) c.x = (c.x < 0 ? -1 : 1) * (330 + Math.abs(c.x) % 140);
    }
    G.drones = [
      { x: 200, y: 420, z: p.z + 500, hp: 30, maxHp: 30, fireTimer: 0.6, phase: 0.5 },
      { x: -260, y: 560, z: p.z + 680, hp: 30, maxHp: 30, fireTimer: 1.2, phase: 2 },
    ];
    G.enemyBullets = [
      { x: 120, y: 430, z: p.z + 420, vx: -30, vy: -10, vz: -620, life: 1.2 },
    ];
    G.messages = [{ text: 'SKY LEVIATHAN — HULL 58%', sub: 'Keep firing. Watch the flak.', timer: 99, color: '#ff5a5a' }];
    return;
  }
  if (shot === 'score') {
    // Mission-complete screen with a banked run behind it.
    startRun(G, seed);
    startMission(G, 0, seed);
    G.screen = 'missionComplete';
    G.score = 3250;
    G.medalsEarned = 8;
    G.missionStats.ringsPassed = 11;
    G.endReason = 'Rings 11/12 — the ridge salutes you. Bonus +860, medals +8.';
    p.hull = 78; p.fuel = 41;
    p.relics = ['gold-compass'];
    G.runLog = ['Relic: GOLDEN COMPASS', 'Mission 1 complete: +860 bonus, +8 medals'];
    return;
  }
  // Unknown shot: just play the title backdrop.
  G.screen = 'title';
  G.autopilot = true;
}
