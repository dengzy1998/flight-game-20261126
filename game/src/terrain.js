// Aurora Ridge Flight — the valley itself: heightfield, river, runways, ridges.
// One job: answer "what is the ground doing at (x, z)?" and draw the sky's
// far layers, so the renderer never computes terrain itself.

import { makeRidgeNoise, clamp } from './random.js';
import { PALETTE } from './config.js';

// The valley is a seeded heightfield: rolling hills, a river canyon down the
// middle, and flat benches where the runways sit.
export function createTerrain(seed) {
  const ridge = makeRidgeNoise(seed);
  const ridge2 = makeRidgeNoise(seed + 77);
  const riverNoise = makeRidgeNoise(seed + 913);

  // The river winds down the valley: its centreline x at any z.
  function riverX(z) {
    return riverNoise(z * 0.0009) * 190;
  }

  // Runways sit on flat benches: every 4200 units, a 700-unit strip at x = -170.
  function runwayAt(z) {
    const period = 4200;
    const local = ((z % period) + period) % period;
    if (local < 700) return { x: -170, z0: z - local, z1: z - local + 700 };
    return null;
  }

  function heightAt(x, z) {
    // Valley floor near the river, hills rising to both sides.
    const distRiver = Math.abs(x - riverX(z));
    const valley = clamp((distRiver - 60) / 260, 0, 1);
    let h = ridge(x * 0.6 + z * 0.35) * 95 * valley;
    h += ridge2(x * 0.2 + z * 0.11) * 55 * valley;
    h += 14 * valley; // base lift so hills read against the river
    // Runway benches are graded flat.
    const rw = runwayAt(z);
    if (rw && Math.abs(x - rw.x) < 46) h = 6;
    return Math.max(0, h);
  }

  // Ground colour by altitude and distance: green valley, rock, then snow.
  // Distance haze is capped: the far ground stays green, it never goes orange.
  function groundColor(h, depth01) {
    const fog = Math.min(0.45, depth01 * 0.55); // 0 near, up to 0.45 far
    let r, g, b;
    if (h < 26) { r = 47; g = 107; b = 58; }
    else if (h < 70) { r = 96; g = 128; b = 66; }
    else if (h < 120) { r = 138; g = 122; b = 104; }
    else { r = 232; g = 228; b = 218; }
    const fr = 176, fg = 138, fb = 122; // muted dusk haze, never full orange
    return `rgb(${Math.round(r + (fr - r) * fog)},${Math.round(g + (fg - g) * fog)},${Math.round(b + (fb - b) * fog)})`;
  }

  return { seed, riverX, runwayAt, heightAt, groundColor };
}

// Paint the sky gradient, low sun and stars on the canvas (screen space).
export function drawSky(ctx, W, H, horizonY, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
  grad.addColorStop(0, PALETTE.skyTop);
  grad.addColorStop(0.55, PALETTE.skyMid);
  grad.addColorStop(1, PALETTE.skyHorizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, horizonY + 40);
  // Stars, only high up where the sky is dark.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 46; i++) {
    const sx = ((i * 173.3) % W);
    const sy = ((i * 97.7) % Math.max(40, horizonY - 140));
    const tw = 0.35 + 0.3 * Math.sin(time * 2 + i);
    ctx.globalAlpha = Math.max(0, tw);
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Low sun, left of centre, with a warm glow.
  const sunX = W * 0.30, sunY = horizonY - 58;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
  glow.addColorStop(0, PALETTE.sunGlow);
  glow.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
  ctx.fillStyle = PALETTE.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
}

// Three parallax ridge silhouettes above the horizon, drifting with heading.
export function drawRidges(ctx, W, horizonY, camX, heading, time) {
  const layers = [
    { color: PALETTE.mountainFar, amp: 74, base: 0, parallax: 0.05, speed: 0.0016 },
    { color: PALETTE.mountainMid, amp: 96, base: 16, parallax: 0.11, speed: 0.0031 },
    { color: PALETTE.mountainNear, amp: 118, base: 34, parallax: 0.2, speed: 0.0052 },
  ];
  for (const L of layers) {
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 2);
    for (let sx = 0; sx <= W; sx += 16) {
      const wx = sx + camX * L.parallax * 8 + heading * 900 * L.parallax;
      const y = horizonY - L.base
        - (Math.sin(wx * L.speed) * 0.6 + Math.sin(wx * L.speed * 2.7 + 1.7) * 0.4) * L.amp;
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(W, horizonY + 2);
    ctx.closePath();
    ctx.fill();
  }
}
