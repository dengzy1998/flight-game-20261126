// Aurora Ridge Flight — the scene: sky, ridges, ground, rings, enemies, jet.
// One job: paint one frame of the world in depth order (far to near), then
// the jet. The HUD and the menus live in hud.js, not here.

import { VIEW, PALETTE } from './config.js';
import { drawSky, drawRidges } from './terrain.js';
import { project, drawPlayerJet, drawDrone, drawAirship, drawTracer } from './aircraft.js';
import { clamp } from './random.js';

function makeCamera(G) {
  const p = G.plane;
  return {
    x: p.x, y: p.y, z: p.z, heading: p.heading,
    horizonY: VIEW.horizonBase - p.pitch * 900 - p.climb * 0.12,
  };
}

// One ground strip: a quad across the valley at two depths, coloured by the
// hills it crosses, with the river and any runway painted on top of it.
function drawGroundStrip(ctx, cam, terrain, zNear, zFar, depth01) {
  // The strip must span the whole screen: its half-width grows with depth
  // (a fixed valley width would converge to a wedge at the horizon).
  const halfW = Math.max(VIEW.groundHalfWidth, 120 + 1.3 * (zFar - cam.z));
  const stepX = 65;
  const nearPts = [];
  const farPts = [];
  let hSum = 0;
  for (let x = -halfW; x <= halfW; x += stepX) {
    const hn = terrain.heightAt(x, zNear);
    const hf = terrain.heightAt(x, zFar);
    hSum += hn + hf;
    nearPts.push(project(cam, x, hn, zNear));
    farPts.push(project(cam, x, hf, zFar));
  }
  if (!nearPts[0] || !farPts[0]) return;
  const avgH = hSum / (nearPts.length * 2);
  ctx.fillStyle = terrain.groundColor(avgH, depth01);
  ctx.beginPath();
  ctx.moveTo(nearPts[0].x, nearPts[0].y);
  for (const pt of nearPts) ctx.lineTo(pt.x, pt.y);
  for (let i = farPts.length - 1; i >= 0; i--) ctx.lineTo(farPts[i].x, farPts[i].y);
  ctx.closePath();
  ctx.fill();

  // Patchwork fields: a couple of translucent quads per strip break the
  // flat banding and read as farmland from altitude.
  const hash = Math.abs(Math.sin(zNear * 0.731 + 3.1)) % 1;
  if (hash > 0.35) {
    const x0 = -520 + hash * 700;
    const a = project(cam, x0, terrain.heightAt(x0, zNear) + 1, zNear);
    const b = project(cam, x0 + 180, terrain.heightAt(x0 + 180, zNear) + 1, zNear);
    const c = project(cam, x0 + 180, terrain.heightAt(x0 + 180, zFar) + 1, zFar);
    const d = project(cam, x0, terrain.heightAt(x0, zFar) + 1, zFar);
    if (a && b && c && d) {
      ctx.fillStyle = hash > 0.7 ? 'rgba(255, 240, 180, 0.10)' : 'rgba(20, 60, 30, 0.12)';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
      ctx.closePath(); ctx.fill();
    }
  }

  // River: a narrow blue band winding down the strip.
  const rxN = terrain.riverX(zNear);
  const rxF = terrain.riverX(zFar);
  const r1 = project(cam, rxN - 9, 2, zNear);
  const r2 = project(cam, rxN + 9, 2, zNear);
  const r3 = project(cam, rxF + 9, 2, zFar);
  const r4 = project(cam, rxF - 9, 2, zFar);
  if (r1 && r2 && r3 && r4) {
    ctx.fillStyle = '#2f6fb2';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y);
    ctx.lineTo(r3.x, r3.y); ctx.lineTo(r4.x, r4.y);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Runway: a grey strip with a dashed centreline when this strip crosses one.
  const rw = terrain.runwayAt(zNear);
  if (rw) {
    const a = project(cam, rw.x - 34, 4, zNear);
    const b = project(cam, rw.x + 34, 4, zNear);
    const c = project(cam, rw.x + 34, 4, zFar);
    const d = project(cam, rw.x - 34, 4, zFar);
    if (a && b && c && d) {
      ctx.fillStyle = PALETTE.runway;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8e4da';
      const mid1 = project(cam, rw.x - 2, 5, zNear);
      const mid2 = project(cam, rw.x + 2, 5, zNear);
      const mid3 = project(cam, rw.x + 2, 5, zFar);
      const mid4 = project(cam, rw.x - 2, 5, zFar);
      if (mid1 && mid2 && mid3 && mid4) {
        ctx.beginPath();
        ctx.moveTo(mid1.x, mid1.y); ctx.lineTo(mid2.x, mid2.y);
        ctx.lineTo(mid3.x, mid3.y); ctx.lineTo(mid4.x, mid4.y);
        ctx.closePath(); ctx.fill();
      }
    }
  }
}

function drawCloud(ctx, cam, c, time) {
  const p = project(cam, c.x, c.y, c.z);
  if (!p) return;
  const s = Math.max(0.2, p.s);
  const r = Math.min(115, c.size * s); // never a screen-filling blob
  if (r < 2 || p.x < -200 || p.x > VIEW.width + 200) return;
  ctx.save();
  ctx.globalAlpha = c.storm ? 0.85 : 0.55;
  ctx.fillStyle = c.storm ? '#3a3348' : '#ffffff';
  for (const [ox, oy, orr] of [[-1.1, 0.15, 0.55], [0, 0, 0.8], [1.05, 0.2, 0.6], [0.5, -0.3, 0.5], [-0.5, -0.25, 0.45]]) {
    ctx.beginPath();
    ctx.ellipse(p.x + ox * r, p.y + oy * r, orr * r, orr * r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Storm clouds flicker with lightning.
  if (c.storm && Math.sin(time * 7 + c.phase) > 0.86) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#bfe8ff';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.4, r * 0.7, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRing(ctx, cam, ring, isNext, time) {
  const p = project(cam, ring.x, ring.y, ring.z);
  if (!p) return;
  const r = 42 * p.s;
  if (r < 2) return;
  const pulse = isNext ? 1 + 0.12 * Math.sin(time * 6) : 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.lineWidth = Math.max(2, 7 * p.s * pulse);
  ctx.strokeStyle = ring.passed ? 'rgba(125, 255, 158, 0.9)' : isNext ? '#ffb347' : 'rgba(120, 220, 255, 0.85)';
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 18 * pulse;
  ctx.beginPath();
  ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, 2 * p.s);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  // Chevrons point the way through.
  if (isNext) {
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.45);
    ctx.lineTo(r * 0.22, -r * 0.1);
    ctx.lineTo(-r * 0.22, -r * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawRelic(ctx, cam, rp, time) {
  const p = project(cam, rp.x, rp.y + Math.sin(time * 2 + rp.phase) * 8, rp.z);
  if (!p || rp.taken) return;
  const s = Math.max(0.3, p.s);
  const r = 16 * s;
  if (r < 2) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(time * 1.5 + rp.phase);
  ctx.fillStyle = '#ffd98a';
  ctx.shadowColor = '#ffb347';
  ctx.shadowBlur = 16;
  ctx.fillRect(-r / 2, -r / 2, r, r);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff3c4';
  ctx.fillRect(-r / 4, -r / 4, r / 2, r / 2);
  ctx.restore();
}

function drawDropZone(ctx, cam, zone, time) {
  const p = project(cam, zone.x, 4, zone.z);
  if (!p || zone.delivered) return;
  const s = Math.max(0.25, p.s);
  const r = 70 * s;
  if (r < 3) return;
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = zone.failed ? '#888' : '#ffb347';
  ctx.lineWidth = Math.max(2, 5 * s);
  ctx.setLineDash([14 * s, 10 * s]);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, r * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // Smoke column marks the zone from far away.
  for (let i = 0; i < 4; i++) {
    const sy = 40 + i * 46 + Math.sin(time + i * 2 + zone.smokePhase) * 8;
    const sp = project(cam, zone.x + Math.sin(time * 0.7 + i) * 12, sy, zone.z);
    if (!sp) continue;
    ctx.fillStyle = `rgba(200, 200, 200, ${0.5 - i * 0.1})`;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, (14 + i * 7) * sp.s, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderScene(ctx, G, terrain, time) {
  const W = VIEW.width;
  const H = VIEW.height;
  const cam = makeCamera(G);
  const p = G.plane;

  // A frame starts from a clean identity transform: no state ever leaks
  // from one frame (or one screenshot) into the next.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // Opaque base coat: no pixel stays transparent, so a rotated layer can
  // never leave a stale or white corner behind.
  ctx.fillStyle = PALETTE.skyTop;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  // Camera shake on hits.
  if (G.shake > 0.01) {
    ctx.translate((Math.random() - 0.5) * G.shake * 14, (Math.random() - 0.5) * G.shake * 14);
    G.shake = Math.max(0, G.shake - 0.03);
  }
  // Rolling the world with the bank sells the turn. Kept gentle: the HUD
  // and the jet are drawn after the restore, always level.
  ctx.translate(W / 2, cam.horizonY);
  ctx.rotate(-p.bank * 0.10);
  ctx.translate(-W / 2, -cam.horizonY);

  drawSky(ctx, W, H, cam.horizonY, time);
  drawRidges(ctx, W, cam.horizonY, p.x, p.heading, time);

  // Base ground: a gradient wash below the horizon so the near field is
  // never bare background — the strips paint the detail over it.
  const gg = ctx.createLinearGradient(0, cam.horizonY, 0, H);
  gg.addColorStop(0, 'rgba(150, 128, 90, 0.9)');
  gg.addColorStop(0.25, 'rgba(96, 128, 66, 0.95)');
  gg.addColorStop(1, 'rgba(47, 107, 58, 1)');
  ctx.fillStyle = gg;
  ctx.fillRect(0, cam.horizonY, W, H - cam.horizonY);

  // Ground, far strips first so near strips paint over them. Strips start
  // ~90 units ahead: closer than that the projection explodes off-screen
  // and the base wash above already covers the near field.
  const strips = Math.floor(VIEW.farDistance / VIEW.stripStep);
  for (let k = strips; k >= 4; k--) {
    const zFar = p.z + k * VIEW.stripStep;
    const zNear = p.z + (k - 1) * VIEW.stripStep;
    drawGroundStrip(ctx, cam, terrain, zNear, zFar, k / strips);
  }

  // World entities, far to near.
  const entities = [];
  for (const c of G.clouds) entities.push({ z: c.z, draw: () => drawCloud(ctx, cam, c, time) });
  for (const r of G.rings) {
    if (!r.passed && !r.missed) entities.push({ z: r.z, draw: () => drawRing(ctx, cam, r, G.rings[G.ringIndex] === r, time) });
  }
  for (const rp of G.relicPickups) entities.push({ z: rp.z, draw: () => drawRelic(ctx, cam, rp, time) });
  for (const z of G.zones) entities.push({ z: z.z, draw: () => drawDropZone(ctx, cam, z, time) });
  for (const d of G.drones) entities.push({ z: d.z, draw: () => drawDrone(ctx, cam, d, time) });
  for (const b of G.bosses) {
    entities.push({
      z: b.z,
      draw: () => {
        if (b.kind === 'airship') drawAirship(ctx, cam, b, time);
        else drawDrone(ctx, cam, b, time);
      },
    });
  }
  entities.sort((a, b) => b.z - a.z);
  for (const e of entities) e.draw();

  // Tracers and particles, also depth-sorted loosely by drawing after entities.
  for (const b of G.bullets) {
    drawTracer(ctx, cam, b, { x: b.x - b.vx * 0.03, y: b.y - b.vy * 0.03, z: b.z - b.vz * 0.03 }, '#ffe98a');
  }
  for (const b of G.enemyBullets) {
    drawTracer(ctx, cam, b, { x: b.x - b.vx * 0.03, y: b.y - b.vy * 0.03, z: b.z - b.vz * 0.03 }, '#ff6a6a');
  }
  for (const pt of G.particles) {
    const pp = project(cam, pt.x, pt.y, pt.z);
    if (!pp) continue;
    ctx.globalAlpha = clamp(pt.life, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, Math.max(1, pt.size * pp.s), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Score popups float up from where they were earned.
  ctx.textAlign = 'center';
  for (const pop of G.popups) {
    const pp = project(cam, pop.x, pop.y + (1.6 - pop.timer) * 30, pop.z);
    if (!pp) continue;
    ctx.globalAlpha = clamp(pop.timer, 0, 1);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffe98a';
    ctx.fillText(pop.text, pp.x, pp.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore(); // un-roll the world

  // Speed lines at high throttle: the air itself rushes past.
  if (p.speed > 240 && G.screen === 'playing') {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const y = ((i * 173 + time * 900) % H);
      const x = (i * 211) % W;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 30, y + 8);
      ctx.stroke();
    }
  }

  // The jet, dead centre, low on the screen: the chase view.
  const firing = G.screen === 'playing' && G.input && G.input.fire && p.fireCooldown > p.fireInterval - 0.05;
  drawPlayerJet(ctx, W / 2, H - 200, p.bank, p.throttle, time, firing);

  // Damage vignette.
  if (G.flash > 0.02) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(255,0,0,0)');
    vg.addColorStop(1, `rgba(255,30,30,${G.flash * 0.55})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    G.flash = Math.max(0, G.flash - 0.02);
  }
}
