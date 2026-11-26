// Aurora Ridge Flight — missions: courses, bosses, drones, firing, scoring.
// One job: own the run's arc (briefing → flying → upgrade → next mission)
// and every rule that scores it, so main.js only runs the loop.

import { FLIGHT, MISSIONS, UPGRADES, RELICS } from './config.js';
import { mulberry32, shuffle, clamp } from './random.js';
import { buildRingCourse, buildDropZones, buildRelicPickups, ringPassed, ringMissed, magnetPull, zoneDropReady, zoneMissed } from './rings.js';
import { damagePlane, planeAlive } from './physics.js';

function banner(G, text, sub, color) {
  G.messages.push({ text, sub: sub || '', timer: 2.6, color: color || '#ffe98a' });
}

function popup(G, x, y, z, text) {
  G.popups.push({ x, y, z, text, timer: 1.6 });
}

function burst(G, x, y, z, color, n) {
  for (let i = 0; i < (n || 14); i++) {
    G.particles.push({
      x, y, z,
      vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, vz: (Math.random() - 0.5) * 120,
      life: 0.7 + Math.random() * 0.5, color: color || '#ff9a3c', size: 5 + Math.random() * 7,
    });
  }
}

export function startRun(G, seed) {
  const meta = G.meta;
  G.score = 0;
  G.combo = 0;
  G.medalsEarned = 0;
  G.missionIndex = 0;
  G.runLog = [];
  G.scoreAtMissionStart = 0;
  if (meta.relic > 0) {
    const rand = mulberry32(seed + 5);
    const relic = RELICS[Math.floor(rand() * RELICS.length)];
    G.plane.relics.push(relic.id);
    applyRelic(G, relic.id);
    G.runLog.push(`Started with relic: ${relic.name}`);
  }
  startMission(G, 0, seed);
}

export function startMission(G, index, seed) {
  const m = MISSIONS[index];
  const p = G.plane;
  G.missionIndex = index;
  G.missionStats = { ringsPassed: 0, ringsTotal: m.rings || 0, delivered: 0, bossesDown: 0 };
  G.scoreAtMissionStart = G.score;
  // Fresh course, same valley: the plane restarts at the valley mouth.
  p.x = 0; p.y = 320; p.z = 0;
  p.heading = 0; p.pitch = 0; p.bank = 0; p.climb = 0;
  p.speed = 120; p.throttle = 0.68;
  p.fuel = p.maxFuel; // ground crew refuels between sorties; hull damage stays
  G.ringIndex = 0;
  G.rings = m.rings ? buildRingCourse(seed + index * 13, m.rings, 0) : [];
  G.zones = m.zones ? buildDropZones(seed + index * 7) : [];
  G.crates = m.zones || 0;
  G.relicPickups = buildRelicPickups(seed + index * 3, RELICS, m.rings ? m.rings * 420 : 4500, p.relicLuck);
  G.drones = [];
  G.bosses = [];
  G.bullets = [];
  G.enemyBullets = [];
  G.flak = [];
  G.fallingCrates = [];
  G.messages = [];
  G.popups = [];
  G.particles = [];
  // Clouds: fair-weather puffs, plus storm cells on mission 3. Kept small
  // so they never swallow the action.
  const rand = mulberry32(seed + index * 91);
  G.clouds = [];
  for (let i = 0; i < 18; i++) {
    G.clouds.push({
      x: (rand() * 2 - 1) * 520,
      y: 330 + rand() * 380,
      z: 300 + rand() * 1900,
      size: 34 + rand() * 30,
      storm: index === 2 && i < 7,
      phase: rand() * 6,
    });
  }
  if (index === 2) spawnBoss(G, 'stormhawk');
  G.screen = 'briefing';
}

function spawnBoss(G, kind) {
  const p = G.plane;
  if (kind === 'stormhawk') {
    G.bosses.push({
      kind: 'stormhawk', x: 60, y: 420, z: p.z + 650,
      hp: 120, maxHp: 120, fireTimer: 2, phase: Math.random() * 6, speed: 1,
    });
    banner(G, 'STORMHAWK INBOUND', 'The ace holds the pass — bring him down.', '#ff5a5a');
  } else {
    G.bosses.push({
      kind: 'airship', x: -40, y: 480, z: p.z + 900,
      hp: 260, maxHp: 260, fireTimer: 3, phase: Math.random() * 6, speed: 0.4,
      droneTimer: 8,
    });
    banner(G, 'SKY LEVIATHAN', 'A storm airship blocks the ridge. Aim for the hull.', '#ff5a5a');
  }
}

function spawnDrone(G, ahead) {
  const p = G.plane;
  G.drones.push({
    x: (Math.random() * 2 - 1) * 300, y: 220 + Math.random() * 420, z: p.z + ahead,
    hp: 30, maxHp: 30, fireTimer: 1.5 + Math.random(), phase: Math.random() * 6,
  });
}

export function applyRelic(G, id) {
  const p = G.plane;
  if (id === 'gold-compass') p.scoreMult *= 1.15;
  if (id === 'storm-charm') p.stormCharm = true;
  if (id === 'medal-doubler') G.medalMult = 2;
  if (id === 'aurora-lens') p.ringScoreMult *= 1.5;
  // phoenix needs no stat: damagePlane checks the relic list.
}

export function addScore(G, base) {
  const p = G.plane;
  const gained = Math.round(base * p.scoreMult * p.ringScoreMult);
  G.score += gained;
  return gained;
}

function fireCannon(G, audio) {
  const p = G.plane;
  if (p.fireCooldown > 0) return;
  p.fireCooldown = p.fireInterval;
  const nx = p.x + Math.sin(p.heading) * 40;
  const ny = p.y - 20;
  const nz = p.z + 40;
  G.bullets.push({
    x: nx, y: ny, z: nz,
    vx: Math.sin(p.heading) * FLIGHT.bulletSpeed,
    vy: p.climb * 0.4,
    vz: Math.cos(p.heading) * FLIGHT.bulletSpeed,
    life: FLIGHT.bulletRange / FLIGHT.bulletSpeed,
  });
  audio.shot();
}

function enemyFire(G, from, audio) {
  const p = G.plane;
  // Evasion (flares) makes some shots go wide on purpose.
  if (Math.random() < p.evasion * 0.5) return;
  const dx = p.x - from.x;
  const dy = p.y - from.y;
  const dz = p.z - from.z;
  const dist = Math.max(1, Math.hypot(dx, dy, dz));
  const speed = 620;
  const spread = 26;
  G.enemyBullets.push({
    x: from.x, y: from.y, z: from.z,
    vx: (dx / dist) * speed + (Math.random() - 0.5) * spread,
    vy: (dy / dist) * speed + (Math.random() - 0.5) * spread,
    vz: (dz / dist) * speed,
    life: dist / speed + 0.4,
  });
}

// ---- The per-frame mission update, called only while screen === 'playing' ----
export function updateMission(G, dt, terrain, audio, input) {
  const p = G.plane;
  const m = MISSIONS[G.missionIndex];

  // Combo decay.
  if (G.comboTimer > 0) {
    G.comboTimer -= dt;
    if (G.comboTimer <= 0) G.combo = 0;
  }

  // Cannon.
  if (input.fire) fireCannon(G, audio);

  // Rings: magnet, pass, miss.
  for (const r of G.rings) magnetPull(p, r, dt);
  const next = G.rings[G.ringIndex];
  if (next) {
    if (ringPassed(p, next)) {
      next.passed = true;
      G.ringIndex++;
      G.missionStats.ringsPassed++;
      G.combo++;
      G.comboTimer = 6;
      const gained = addScore(G, FLIGHT.ringScore * G.combo);
      p.fuel = Math.min(p.maxFuel, p.fuel + p.fuelPerRing);
      popup(G, next.x, next.y, next.z, `+${gained}`);
      burst(G, next.x, next.y, next.z, '#7dff9e', 10);
      audio.ring();
      if (G.missionStats.ringsPassed === m.rings) banner(G, 'ALL RINGS!', 'The course is yours — fly home.', '#7dff9e');
    } else if (ringMissed(p, next)) {
      next.missed = true;
      G.ringIndex++;
      G.combo = 0;
      banner(G, 'RING MISSED', `${G.missionStats.ringsPassed}/${m.rings} so far.`, '#ffb347');
    }
  }

  // Drop zones: release, fall, resolve.
  if (input.drop && G.crates > 0) {
    const zone = G.zones.find((z) => zoneDropReady(p, z));
    if (zone) {
      G.crates--;
      G.fallingCrates.push({ x: p.x, y: p.y, z: p.z, vy: 0, zone });
      audio.pickup();
      banner(G, 'CRATE AWAY', `${G.crates} crate${G.crates === 1 ? '' : 's'} left.`, '#7dff9e');
    }
  }
  for (const c of G.fallingCrates) {
    c.vy += 300 * dt;
    c.y -= c.vy * dt;
    const ground = terrain.heightAt(c.x, c.z);
    if (c.y <= ground + 4) {
      c.landed = true;
      const hit = Math.abs(c.x - c.zone.x) < 95;
      if (hit) {
        c.zone.delivered = true;
        G.missionStats.delivered++;
        const gained = addScore(G, 300);
        popup(G, c.zone.x, 40, c.zone.z, `SUPPLIED +${gained}`);
        banner(G, 'SUPPLIES DELIVERED', `${G.missionStats.delivered}/3 stations fed.`, '#7dff9e');
        audio.fanfare();
      } else {
        banner(G, 'CRATE LOST', 'It missed the zone.', '#ff5a5a');
      }
    }
  }
  G.fallingCrates = G.fallingCrates.filter((c) => !c.landed);
  for (const z of G.zones) if (zoneMissed(p, z)) z.failed = true;

  // Relic pickups.
  for (const rp of G.relicPickups) {
    if (rp.taken) continue;
    const dx = p.x - rp.x, dy = p.y - rp.y, dz = p.z - rp.z;
    if (Math.abs(dz) < 24 && dx * dx + dy * dy < 50 * 50) {
      rp.taken = true;
      p.relics.push(rp.relic.id);
      applyRelic(G, rp.relic.id);
      banner(G, `RELIC: ${rp.relic.name}`, rp.relic.desc, '#ffd98a');
      audio.pickup();
      G.runLog.push(`Relic: ${rp.relic.name}`);
    }
  }

  // Drones: weave ahead, shoot, die.
  if (m.drones && G.drones.length < m.drones && Math.random() < dt * 0.25) spawnDrone(G, 700);
  for (const d of G.drones) {
    d.phase += dt;
    d.x += Math.sin(d.phase * 1.3) * 60 * dt;
    d.y += Math.cos(d.phase * 0.9) * 40 * dt;
    d.z = p.z + 620 + Math.sin(d.phase * 0.5) * 120;
    d.fireTimer -= dt;
    if (d.fireTimer <= 0 && Math.abs(d.z - p.z) < 900) {
      d.fireTimer = 2.2 + Math.random();
      enemyFire(G, d, audio);
    }
  }

  // Bosses: Stormhawk weaves and strafes; the Leviathan lumbers and barrages.
  for (const b of G.bosses) {
    b.phase += dt;
    if (b.kind === 'stormhawk') {
      b.z = p.z + 620;
      b.x = Math.sin(b.phase * 0.5) * 150;
      b.y = 420 + Math.sin(b.phase * 1.4) * 160;
      b.fireTimer -= dt;
      if (b.fireTimer <= 0) {
        b.fireTimer = 1.8;
        enemyFire(G, b, audio);
      }
    } else {
      b.z = p.z + 850;
      b.x = Math.sin(b.phase * 0.3) * 120;
      b.y = 480 + Math.sin(b.phase * 0.6) * 40;
      b.fireTimer -= dt;
      if (b.fireTimer <= 0) {
        b.fireTimer = 1.1;
        for (const ox of [-90, 0, 90]) enemyFire(G, { x: b.x + ox, y: b.y - 20, z: b.z - 60 }, audio);
      }
      b.droneTimer -= dt;
      if (b.droneTimer <= 0) {
        b.droneTimer = 9;
        spawnDrone(G, 800);
      }
    }
  }

  // Flak near drop zones: bursts bloom where you are about to be.
  if (m.flak && Math.random() < dt * 0.5) {
    const zone = G.zones.find((z) => !z.delivered && !z.failed && Math.abs(z.z - p.z) < 900);
    if (zone) {
      G.flak.push({ x: p.x + (Math.random() - 0.5) * 160, y: p.y + (Math.random() - 0.5) * 120, z: p.z + 200, timer: 0.7 });
    }
  }
  for (const f of G.flak) {
    f.timer -= dt;
    if (f.timer <= 0 && !f.burst) {
      f.burst = true;
      burst(G, f.x, f.y, f.z, '#5a5a5a', 12);
      const dx = p.x - f.x, dy = p.y - f.y, dz = p.z - f.z;
      if (dx * dx + dy * dy + dz * dz < 70 * 70) {
        damagePlane(G, FLIGHT.flakDamage);
        audio.explosion();
      }
    }
  }
  G.flak = G.flak.filter((f) => !f.burst || f.timer > -0.4);

  // Player bullets: fly, hit drones and bosses, expire.
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    for (const d of G.drones) {
      if (d.hp > 0 && Math.abs(b.z - d.z) < 22 && Math.hypot(b.x - d.x, b.y - d.y) < 30) {
        d.hp -= p.bulletDamage;
        b.life = 0;
        burst(G, d.x, d.y, d.z, '#ffb347', 6);
        if (d.hp <= 0) {
          const gained = addScore(G, FLIGHT.droneKillScore);
          popup(G, d.x, d.y, d.z, `DRONE DOWN +${gained}`);
          burst(G, d.x, d.y, d.z, '#ff5a5a', 20);
          audio.explosion();
          G.runLog.push('Drone shot down');
        }
        break;
      }
    }
    for (const boss of G.bosses) {
      if (boss.hp <= 0) continue;
      const radius = boss.kind === 'airship' ? 150 : 48;
      if (Math.abs(b.z - boss.z) < 30 && Math.hypot(b.x - boss.x, b.y - boss.y) < radius) {
        boss.hp -= p.bulletDamage;
        b.life = 0;
        burst(G, b.x, b.y, b.z, '#ffe98a', 4);
        if (boss.hp <= 0) {
          G.missionStats.bossesDown++;
          const gained = addScore(G, FLIGHT.bossKillScore);
          popup(G, boss.x, boss.y, boss.z, `+${gained}`);
          burst(G, boss.x, boss.y, boss.z, '#ff5a5a', 40);
          audio.explosion();
          G.runLog.push(`${boss.kind === 'airship' ? 'Sky Leviathan' : 'Stormhawk'} shot down`);
          if (boss.kind === 'stormhawk') {
            banner(G, 'STORMHAWK DOWN!', 'Something bigger is coming over the ridge…', '#7dff9e');
            spawnBoss(G, 'airship');
          } else {
            banner(G, 'LEVIATHAN DOWN!', 'The ridge is yours, courier.', '#7dff9e');
          }
        }
        break;
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  G.drones = G.drones.filter((d) => d.hp > 0);

  // Enemy bullets: fly, hit the plane, expire.
  for (const b of G.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    if (Math.abs(b.z - p.z) < 26 && Math.hypot(b.x - p.x, b.y - p.y) < 26) {
      b.life = 0;
      damagePlane(G, FLIGHT.droneBulletDamage);
      G.shake = 0.6;
      audio.hit();
    }
  }
  G.enemyBullets = G.enemyBullets.filter((b) => b.life > 0);

  // Clouds drift past; recycle the ones behind.
  for (const c of G.clouds) {
    if (c.z < p.z - 120) {
      c.z += 2300;
      c.x = (Math.random() * 2 - 1) * 520;
      c.y = 330 + Math.random() * 380;
    }
  }

  // Particles and popups age out.
  for (const pt of G.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.z += pt.vz * dt;
    pt.life -= dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
  for (const pop of G.popups) pop.timer -= dt;
  G.popups = G.popups.filter((pop) => pop.timer > 0);
  for (const msg of G.messages) msg.timer -= dt;
  G.messages = G.messages.filter((msg) => msg.timer > 0);

  // ---- Mission end conditions ----
  const courseEnd = m.rings ? m.rings * 420 + 800 : m.zones ? 1600 + 2 * 1500 + 500 : 0;
  if (m.id === 1 && p.z > courseEnd) {
    const ok = G.missionStats.ringsPassed >= m.need;
    endMission(G, ok, ok ? `Rings ${G.missionStats.ringsPassed}/${m.rings} — the ridge salutes you.` : `Only ${G.missionStats.ringsPassed}/${m.rings} rings. The ridge keeps its secrets.`, audio);
  } else if (m.id === 2 && p.z > courseEnd) {
    const ok = G.missionStats.delivered >= m.need;
    endMission(G, ok, ok ? `${G.missionStats.delivered}/3 stations fed. The valley eats tonight.` : `Only ${G.missionStats.delivered}/3 crates delivered. The valley stays hungry.`, audio);
  } else if (m.id === 3 && G.missionStats.bossesDown >= 2) {
    endMission(G, true, 'Stormhawk and the Leviathan are down. The ridge is yours.', audio);
  }

  if (!planeAlive(G)) {
    endRun(G, p.hull <= 0 && p.fuel <= 0 ? 'Out of fuel and out of hull — the valley claims another courier.' : 'Shot down over Aurora Ridge.', audio);
  }
}

// Mission complete / failed: bank the bonus, count the medals, move on.
export function endMission(G, success, reason, audio) {
  const p = G.plane;
  G.endReason = reason;
  if (success) {
    const missionScore = G.score - G.scoreAtMissionStart;
    const bonus = FLIGHT.missionBonus + Math.round(p.fuel * 5) + Math.round(p.hull * 2);
    G.score += bonus;
    const medals = Math.floor((missionScore + bonus) / 500) * (G.medalMult || 1);
    G.medalsEarned += medals;
    G.runLog.push(`Mission ${G.missionIndex + 1} complete: +${bonus} bonus, +${medals} medals`);
    audio.fanfare();
    if (G.missionIndex === 2) {
      G.meta.medals += G.medalsEarned;
      G.meta.best = Math.max(G.meta.best, G.score);
      try { localStorage.setItem('aurora-ridge-meta-v1', JSON.stringify(G.meta)); } catch { /* no storage */ }
      G.screen = 'victory';
    } else {
      G.screen = 'missionComplete';
    }
  } else {
    G.meta.medals += G.medalsEarned;
    G.meta.best = Math.max(G.meta.best, G.score);
    try { localStorage.setItem('aurora-ridge-meta-v1', JSON.stringify(G.meta)); } catch { /* no storage */ }
    G.screen = 'gameover';
  }
}

export function endRun(G, reason, audio) {
  G.endReason = reason;
  G.meta.medals += G.medalsEarned;
  G.meta.best = Math.max(G.meta.best, G.score);
  try { localStorage.setItem('aurora-ridge-meta-v1', JSON.stringify(G.meta)); } catch { /* no storage */ }
  audio.explosion();
  burst(G, G.plane.x, G.plane.y, G.plane.z, '#ff5a5a', 40);
  G.screen = 'gameover';
}

// Between missions: offer 3 fresh upgrade cards from the pool.
export function draftUpgrades(G) {
  const rand = mulberry32((G.seed + G.missionIndex * 101 + Math.floor(Math.random() * 1e6)) >>> 0);
  const pool = UPGRADES.filter((u) => !G.upgradeDraft.includes(u));
  G.upgradeDraft = shuffle(rand, pool).slice(0, 3);
  G.screen = 'upgrade';
}

export function applyUpgrade(G, upgrade, audio) {
  upgrade.apply(G.plane);
  G.runLog.push(`Upgrade: ${upgrade.name}`);
  audio.pickup();
  startMission(G, G.missionIndex + 1, G.seed);
}
