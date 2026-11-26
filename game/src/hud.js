// Aurora Ridge Flight — all 2D overlay UI: the cockpit instruments, the
// banners, and every menu screen. One job: draw UI and report where its
// buttons are, so main.js can hit-test clicks against the same rectangles.

import { VIEW, PALETTE, MISSIONS, META_SHOP, RELICS } from './config.js';
import { clamp } from './random.js';

const C = (ctx, x, y, w, h, r = 10) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  C(ctx, x, y, w, h);
  ctx.fill();
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function text(ctx, s, x, y, size, color, align = 'left', bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px monospace`;
  ctx.fillStyle = color || PALETTE.hudText;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.14)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
}

function button(ctx, rect, label, hover, accent) {
  ctx.fillStyle = hover ? 'rgba(120, 220, 255, 0.28)' : 'rgba(8, 22, 34, 0.8)';
  C(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.strokeStyle = accent || PALETTE.hudBorder;
  ctx.lineWidth = hover ? 2 : 1;
  ctx.stroke();
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 6, 18, PALETTE.hudText, 'center', true);
}

export function inRect(p, r) {
  return p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// ---- Button layouts (shared by drawing and hit-testing) ----
export function titleButtons() {
  const cx = VIEW.width / 2 - 170;
  return {
    fly: { x: cx, y: 470, w: 340, h: 62 },
    hangar: { x: cx, y: 546, w: 340, h: 52 },
    howto: { x: cx, y: 612, w: 340, h: 52 },
  };
}
export function hangarRows() {
  return META_SHOP.map((item, i) => ({ item, rect: { x: 300, y: 250 + i * 84, w: 680, h: 68 } }));
}
export function hangarClose() { return { x: VIEW.width / 2 - 110, y: 620, w: 220, h: 52 }; }
export function howtoClose() { return { x: VIEW.width / 2 - 110, y: 620, w: 220, h: 52 }; }
export function briefingButton() { return { x: VIEW.width / 2 - 170, y: 560, w: 340, h: 62 }; }
export function upgradeCardRects() {
  return [0, 1, 2].map((i) => ({ x: 140 + i * 340, y: 300, w: 300, h: 250 }));
}
export function continueButton() { return { x: VIEW.width / 2 - 170, y: 600, w: 340, h: 60 }; }
export function endButtons() {
  return {
    retry: { x: VIEW.width / 2 - 350, y: 590, w: 320, h: 60 },
    title: { x: VIEW.width / 2 + 30, y: 590, w: 320, h: 60 },
  };
}

// ---- In-flight HUD ----
export function drawHUD(ctx, G, terrain) {
  const p = G.plane;
  const W = VIEW.width;
  const mission = MISSIONS[G.missionIndex];

  // Top-left: mission + objective.
  panel(ctx, 16, 14, 330, 78);
  text(ctx, `MISSION ${mission.id} — ${mission.name}`, 30, 40, 16, PALETTE.hudAmber, 'left', true);
  let objective = '';
  if (mission.id === 1) objective = `Rings ${G.missionStats.ringsPassed}/${mission.rings}  ·  pass ${mission.need}`;
  else if (mission.id === 2) objective = `Crates ${G.missionStats.delivered}/3  ·  need ${mission.need}`;
  else objective = `Bosses down ${G.missionStats.bossesDown}/2`;
  text(ctx, objective, 30, 66, 15, PALETTE.hudText);
  text(ctx, `RUN ${G.missionIndex + 1}/3`, 30, 84, 12, 'rgba(207,238,255,0.6)');

  // Top-centre: compass tape.
  const hdg = Math.round(((p.heading * 180) / Math.PI % 360 + 360) % 360);
  panel(ctx, W / 2 - 190, 14, 380, 56);
  ctx.save();
  ctx.beginPath();
  ctx.rect(W / 2 - 190, 14, 380, 56);
  ctx.clip();
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  for (let d = -90; d <= 90; d += 15) {
    const deg = (hdg + d + 360) % 360;
    const x = W / 2 + d * 2.1;
    ctx.strokeStyle = 'rgba(207,238,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(x, 52);
    ctx.lineTo(x, d % 45 === 0 ? 34 : 44);
    ctx.stroke();
    if (deg % 45 === 0) text(ctx, names[Math.round(deg / 45) % 8], x, 30, 12, PALETTE.hudText, 'center');
  }
  ctx.restore();
  text(ctx, `${String(hdg).padStart(3, '0')}°`, W / 2, 68, 13, PALETTE.hudAmber, 'center', true);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 6, 14); ctx.lineTo(W / 2 + 6, 14); ctx.lineTo(W / 2, 24);
  ctx.closePath(); ctx.fill();

  // Top-right: score, combo, medals.
  panel(ctx, W - 346, 14, 330, 78);
  text(ctx, `SCORE ${G.score.toLocaleString()}`, W - 30, 40, 17, PALETTE.hudText, 'right', true);
  if (G.combo > 1) text(ctx, `COMBO x${G.combo}`, W - 30, 64, 15, PALETTE.hudAmber, 'right', true);
  text(ctx, `MEDALS ${G.medalsEarned}`, W - 30, 84, 12, 'rgba(207,238,255,0.6)', 'right');

  // Bottom-left: artificial horizon + altitude.
  panel(ctx, 16, VIEW.height - 150, 250, 134);
  const ax = 81, ay = VIEW.height - 83, ar = 52;
  ctx.save();
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
  ctx.translate(ax, ay);
  ctx.rotate(-p.bank * 0.9);
  ctx.fillStyle = '#2f6fb2';
  ctx.fillRect(-ar, -ar - p.pitch * 300, ar * 2, ar + p.pitch * 300);
  ctx.fillStyle = '#8a6a3f';
  ctx.fillRect(-ar, -p.pitch * 300, ar * 2, ar + p.pitch * 300);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.moveTo(-ar, -p.pitch * 300); ctx.lineTo(ar, -p.pitch * 300); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax + 14, ay); ctx.stroke();
  text(ctx, `ALT ${Math.round(p.y * 15).toLocaleString()} FT`, 150, VIEW.height - 108, 15, PALETTE.hudText, 'left', true);
  text(ctx, `V/S ${p.climb >= 0 ? '+' : ''}${Math.round(p.climb * 15)} FT/M`, 150, VIEW.height - 84, 13, PALETTE.hudText);
  text(ctx, `HDG ${String(hdg).padStart(3, '0')}°`, 150, VIEW.height - 60, 13, PALETTE.hudText);

  // Bottom-centre: throttle + airspeed + fuel.
  panel(ctx, W / 2 - 190, VIEW.height - 150, 380, 134);
  text(ctx, `AIRSPEED ${Math.round(p.speed * 1.2)} KT`, W / 2, VIEW.height - 118, 18, PALETTE.hudText, 'center', true);
  text(ctx, 'THR', W / 2 - 170, VIEW.height - 88, 12, PALETTE.hudText);
  bar(ctx, W / 2 - 120, VIEW.height - 98, 240, 12, p.throttle, '#ffb347');
  text(ctx, 'FUEL', W / 2 - 170, VIEW.height - 58, 12, PALETTE.hudText);
  const fuelLow = p.fuel / p.maxFuel < 0.25;
  bar(ctx, W / 2 - 120, VIEW.height - 68, 240, 12, p.fuel / p.maxFuel, fuelLow ? PALETTE.hudRed : PALETTE.hudGreen);
  text(ctx, `${Math.round(p.fuel)}/${Math.round(p.maxFuel)}`, W / 2 + 130, VIEW.height - 56, 12, fuelLow ? PALETTE.hudRed : PALETTE.hudText);
  if (fuelLow && Math.floor(G.time * 3) % 2 === 0) {
    text(ctx, 'LOW FUEL — FIND A RING OR RUNWAY', W / 2, VIEW.height - 30, 14, PALETTE.hudRed, 'center', true);
  }

  // Bottom-right: hull + weapon + relics.
  panel(ctx, W - 266, VIEW.height - 150, 250, 134);
  text(ctx, 'HULL', W - 250, VIEW.height - 118, 13, PALETTE.hudText, 'left', true);
  bar(ctx, W - 250, VIEW.height - 108, 218, 12, p.hull / p.maxHull, p.hull / p.maxHull < 0.3 ? PALETTE.hudRed : PALETTE.hudGreen);
  text(ctx, `${Math.round(p.hull)}/${p.maxHull}`, W - 32, VIEW.height - 84, 13, PALETTE.hudText, 'right');
  text(ctx, 'CANNON [SPACE]  ·  DROP [X]', W - 250, VIEW.height - 60, 12, 'rgba(207,238,255,0.75)');
  if (p.relics.length) {
    text(ctx, `RELICS: ${p.relics.map((r) => r.replace(/-/g, ' ').toUpperCase()).join(' · ')}`, W - 250, VIEW.height - 36, 11, PALETTE.hudAmber);
  } else {
    text(ctx, 'RELICS: none yet — gold diamonds drift the course', W - 250, VIEW.height - 36, 11, 'rgba(207,238,255,0.55)');
  }

  // Flight-path marker + next-ring range, dead centre.
  ctx.strokeStyle = 'rgba(255, 233, 138, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(W / 2, VIEW.height / 2 - 40, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 - 20, VIEW.height / 2 - 40); ctx.lineTo(W / 2 - 12, VIEW.height / 2 - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 + 12, VIEW.height / 2 - 40); ctx.lineTo(W / 2 + 20, VIEW.height / 2 - 40); ctx.stroke();
  const next = G.rings[G.ringIndex];
  if (next && !next.passed && G.missionIndex === 0) {
    const dist = Math.max(0, Math.round(next.z - p.z));
    text(ctx, `NEXT RING ${dist}m`, W / 2, VIEW.height / 2 + 40, 14, PALETTE.hudAmber, 'center', true);
  }
  const zone = G.zones.find((z) => !z.delivered && !z.failed);
  if (zone && G.missionIndex === 1) {
    const dist = Math.max(0, Math.round(zone.z - p.z));
    const ready = Math.abs(p.z - zone.z) < 120 && Math.abs(p.x - zone.x) < 95 && p.y < 520;
    text(ctx, ready ? 'DROP NOW — PRESS X' : `NEXT DROP ZONE ${dist}m — DIVE BELOW 500 FT`, W / 2, VIEW.height / 2 + 40, 14, ready ? PALETTE.hudGreen : PALETTE.hudAmber, 'center', true);
  }

  // Boss health bar, unrotated, below the compass tape.
  const boss = G.bosses.find((b) => b.kind === 'airship' && b.hp > 0);
  if (boss) {
    const bw = 320;
    const bx = W / 2 - bw / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx - 2, 102, bw + 4, 16);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(bx, 104, bw * Math.max(0, boss.hp / boss.maxHp), 12);
    text(ctx, 'SKY LEVIATHAN', W / 2, 96, 13, '#fff', 'center', true);
  }

  // Terrain warning.
  const ground = terrain.heightAt(p.x, p.z);
  if (p.y - ground < 70 && G.screen === 'playing') {
    if (Math.floor(G.time * 3) % 2 === 0) {
      text(ctx, '▲ PULL UP ▲', W / 2, 130, 26, PALETTE.hudRed, 'center', true);
    }
  }

  // Floating banners, on a dark strip so they read over bright clouds.
  let by = 150;
  for (const m of G.messages) {
    ctx.globalAlpha = clamp(m.timer, 0, 1);
    ctx.font = 'bold 24px monospace';
    const w1 = ctx.measureText(m.text).width;
    ctx.font = '15px monospace';
    const w2 = m.sub ? ctx.measureText(m.sub).width : 0;
    const bw = Math.max(w1, w2) + 36;
    ctx.fillStyle = 'rgba(8, 16, 28, 0.62)';
    C(ctx, W / 2 - bw / 2, by - 30, bw, m.sub ? 62 : 40, 8);
    ctx.fill();
    text(ctx, m.text, W / 2, by, 24, m.color || '#ffe98a', 'center', true);
    if (m.sub) text(ctx, m.sub, W / 2, by + 26, 15, PALETTE.hudText, 'center');
    by += 56;
  }
  ctx.globalAlpha = 1;
}

// ---- Screens ----
function dim(ctx) {
  ctx.fillStyle = 'rgba(10, 8, 24, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

export function drawTitle(ctx, G, mouse) {
  dim(ctx);
  text(ctx, 'AURORA RIDGE', VIEW.width / 2, 150, 72, '#ffe9b0', 'center', true);
  text(ctx, 'A SKY COURIER ROGUELITE', VIEW.width / 2, 196, 22, PALETTE.hudAmber, 'center', true);
  text(ctx, '3 MISSIONS  ·  12 RINGS  ·  2 BOSSES  ·  9 UPGRADES  ·  5 RELICS', VIEW.width / 2, 232, 17, PALETTE.hudText, 'center');
  text(ctx, 'Fly the ridge. Thread the rings. Bring the crates home. Beat the storm.', VIEW.width / 2, 262, 15, 'rgba(207,238,255,0.75)', 'center');
  const b = titleButtons();
  button(ctx, b.fly, `FLY MISSION ${G.missionIndex + 1}`, mouse && inRect(mouse, b.fly), PALETTE.hudAmber);
  button(ctx, b.hangar, `HANGAR  ·  ${G.meta.medals} MEDALS`, mouse && inRect(mouse, b.hangar));
  button(ctx, b.howto, 'HOW TO FLY', mouse && inRect(mouse, b.howto));
  text(ctx, `BEST SCORE ${G.meta.best.toLocaleString()}   ·   ARROWS / WASD fly  ·  SHIFT throttle  ·  SPACE fire  ·  X drop  ·  P pause`, VIEW.width / 2, 700, 14, 'rgba(207,238,255,0.65)', 'center');
  text(ctx, 'An original game — art, sound and code made for this bounty. No network, no build step.', VIEW.width / 2, 730, 12, 'rgba(207,238,255,0.45)', 'center');
}

export function drawHowto(ctx, mouse) {
  dim(ctx);
  panel(ctx, 240, 120, 800, 480);
  text(ctx, 'HOW TO FLY', VIEW.width / 2, 170, 30, PALETTE.hudAmber, 'center', true);
  const lines = [
    ['↑ / W', 'Climb — trading speed for altitude'],
    ['↓ / S', 'Dive — trading altitude for speed'],
    ['← → / A D', 'Bank and turn. Full bank turns hardest'],
    ['SHIFT / CTRL', 'Throttle up / down. Fast burns fuel'],
    ['SPACE', 'Fire the cannon (missions 2–3)'],
    ['X / B', 'Drop a supply crate over a smoking zone'],
    ['RINGS', 'Fly through hoops: +score, +fuel, combo'],
    ['RUNWAYS', 'Fly low over a strip to refuel'],
    ['P', 'Pause   ·   M mute   ·   R restart run'],
  ];
  lines.forEach(([k, v], i) => {
    text(ctx, k, 300, 220 + i * 38, 16, PALETTE.hudAmber, 'left', true);
    text(ctx, v, 520, 220 + i * 38, 15, PALETTE.hudText);
  });
  button(ctx, howtoClose(), 'CLOSE', mouse && inRect(mouse, howtoClose()));
}

export function drawHangar(ctx, G, mouse) {
  dim(ctx);
  panel(ctx, 240, 120, 800, 540);
  text(ctx, 'HANGAR — PERMANENT UPGRADES', VIEW.width / 2, 170, 26, PALETTE.hudAmber, 'center', true);
  text(ctx, `SKY MEDALS: ${G.meta.medals}  (earn them by finishing missions — 1 medal per 500 score)`, VIEW.width / 2, 205, 15, PALETTE.hudText, 'center');
  for (const { item, rect } of hangarRows()) {
    const level = G.meta[item.id];
    const owned = level >= item.max;
    const afford = G.meta.medals >= item.cost;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    C(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = owned ? PALETTE.hudGreen : afford ? PALETTE.hudBorder : 'rgba(255,255,255,0.15)';
    ctx.stroke();
    text(ctx, item.name, rect.x + 18, rect.y + 26, 17, owned ? PALETTE.hudGreen : PALETTE.hudText, 'left', true);
    text(ctx, item.desc, rect.x + 18, rect.y + 50, 13, 'rgba(207,238,255,0.7)');
    text(ctx, owned ? 'MAXED' : `LV ${level}/${item.max}  ·  ${item.cost} MEDALS`, rect.x + rect.w - 18, rect.y + 34, 15, owned ? PALETTE.hudGreen : afford ? PALETTE.hudAmber : PALETTE.hudRed, 'right', true);
  }
  button(ctx, hangarClose(), 'CLOSE', mouse && inRect(mouse, hangarClose()));
}

export function drawBriefing(ctx, G, mouse) {
  dim(ctx);
  const m = MISSIONS[G.missionIndex];
  panel(ctx, 290, 150, 700, 420);
  text(ctx, `MISSION ${m.id} — ${m.name}`, VIEW.width / 2, 210, 30, PALETTE.hudAmber, 'center', true);
  // Word-wrap the brief.
  const words = m.brief.split(' ');
  let line = '';
  let y = 260;
  ctx.font = '17px monospace';
  for (const w of words) {
    if ((line + ' ' + w).length > 52) {
      text(ctx, line, VIEW.width / 2, y, 17, PALETTE.hudText, 'center');
      line = w;
      y += 28;
    } else line = line ? line + ' ' + w : w;
  }
  if (line) text(ctx, line, VIEW.width / 2, y, 17, PALETTE.hudText, 'center');
  text(ctx, `OBJECTIVE: ${m.goal}`, VIEW.width / 2, y + 60, 18, PALETTE.hudGreen, 'center', true);
  text(ctx, `Fuel ${Math.round(G.plane.maxFuel)}  ·  Hull ${Math.round(G.plane.maxHull)}  ·  Relics: ${G.plane.relics.length ? G.plane.relics.join(', ') : 'none'}`, VIEW.width / 2, y + 92, 14, 'rgba(207,238,255,0.7)', 'center');
  button(ctx, briefingButton(), 'FLY  ▶', mouse && inRect(mouse, briefingButton()), PALETTE.hudAmber);
}

export function drawUpgrade(ctx, G, mouse) {
  dim(ctx);
  text(ctx, 'CHOOSE AN UPGRADE', VIEW.width / 2, 210, 34, PALETTE.hudAmber, 'center', true);
  text(ctx, 'One card, kept for the rest of the run. Click or press 1 / 2 / 3.', VIEW.width / 2, 246, 16, PALETTE.hudText, 'center');
  const rects = upgradeCardRects();
  G.upgradeDraft.forEach((u, i) => {
    const r = rects[i];
    const hover = mouse && inRect(mouse, r);
    ctx.fillStyle = hover ? 'rgba(120, 220, 255, 0.22)' : PALETTE.hudPanel;
    C(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.strokeStyle = hover ? PALETTE.hudAmber : PALETTE.hudBorder;
    ctx.lineWidth = hover ? 2 : 1;
    ctx.stroke();
    text(ctx, `[${i + 1}]`, r.x + r.w / 2, r.y + 44, 15, PALETTE.hudAmber, 'center', true);
    // Word-wrap the name + description.
    const nameWords = u.name.split(' ');
    let line = '';
    let y = r.y + 78;
    ctx.font = 'bold 19px monospace';
    for (const w of nameWords) {
      if ((line + ' ' + w).length > 15) {
        text(ctx, line, r.x + r.w / 2, y, 19, PALETTE.hudText, 'center', true);
        line = w;
        y += 26;
      } else line = line ? line + ' ' + w : w;
    }
    if (line) text(ctx, line, r.x + r.w / 2, y, 19, PALETTE.hudText, 'center', true);
    const descWords = u.desc.split(' ');
    line = '';
    y += 44;
    ctx.font = '15px monospace';
    for (const w of descWords) {
      if ((line + ' ' + w).length > 26) {
        text(ctx, line, r.x + r.w / 2, y, 15, 'rgba(207,238,255,0.8)', 'center');
        line = w;
        y += 24;
      } else line = line ? line + ' ' + w : w;
    }
    if (line) text(ctx, line, r.x + r.w / 2, y, 15, 'rgba(207,238,255,0.8)', 'center');
  });
}

function scoreLines(G) {
  const p = G.plane;
  return [
    ['MISSION SCORE', G.score.toLocaleString()],
    ['HULL REMAINING', `${Math.round(p.hull)}/${Math.round(p.maxHull)}`],
    ['FUEL REMAINING', `${Math.round(p.fuel)}/${Math.round(p.maxFuel)}`],
    ['RELICS HELD', p.relics.length ? p.relics.map((id) => (RELICS.find((r) => r.id === id) || { name: id }).name).join(', ') : 'none'],
    ['MEDALS EARNED', String(G.medalsEarned)],
  ];
}

export function drawEnd(ctx, G, mouse, kind) {
  dim(ctx);
  const isVictory = kind === 'victory';
  const isComplete = kind === 'missionComplete';
  panel(ctx, 290, 110, 700, 460);
  const title = isVictory ? 'RIDGE CONQUERED!' : isComplete ? 'MISSION COMPLETE' : 'RUN OVER';
  text(ctx, title, VIEW.width / 2, 170, 36, isVictory || isComplete ? PALETTE.hudGreen : PALETTE.hudRed, 'center', true);
  text(ctx, G.endReason || (isVictory ? 'Stormhawk and the Leviathan are down. The ridge is yours.' : ''), VIEW.width / 2, 208, 16, PALETTE.hudText, 'center');
  const lines = scoreLines(G);
  lines.forEach(([k, v], i) => {
    text(ctx, k, 360, 260 + i * 36, 16, 'rgba(207,238,255,0.75)');
    text(ctx, v, 920, 260 + i * 36, 16, PALETTE.hudText, 'right', true);
  });
  if (G.runLog.length) {
    text(ctx, 'FLIGHT LOG', 360, 260 + lines.length * 36 + 14, 13, PALETTE.hudAmber, 'left', true);
    G.runLog.slice(-3).forEach((entry, i) => {
      text(ctx, `· ${entry}`, 360, 260 + lines.length * 36 + 40 + i * 22, 13, 'rgba(207,238,255,0.65)');
    });
  }
  const b = endButtons();
  if (isComplete) {
    button(ctx, continueButton(), 'CONTINUE  ▶', mouse && inRect(mouse, continueButton()), PALETTE.hudAmber);
  } else {
    button(ctx, b.retry, '↻  FLY AGAIN  [R]', mouse && inRect(mouse, b.retry), PALETTE.hudAmber);
    button(ctx, b.title, 'TITLE SCREEN', mouse && inRect(mouse, b.title));
  }
  if (!isComplete) {
    text(ctx, 'Your score and medals are banked. The hangar keeps your medals for the next run.', VIEW.width / 2, 540, 13, 'rgba(207,238,255,0.6)', 'center');
  }
}

export function drawPaused(ctx, G, mouse) {
  dim(ctx);
  text(ctx, 'PAUSED', VIEW.width / 2, 320, 48, PALETTE.hudText, 'center', true);
  text(ctx, 'P / ESC to resume  ·  R to restart the run  ·  M to mute', VIEW.width / 2, 380, 17, 'rgba(207,238,255,0.75)', 'center');
}
