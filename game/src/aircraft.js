// Aurora Ridge Flight — every aircraft the eye sees, drawn with canvas paths.
// One job: turn a 3D position into a recognisable flying machine. The player
// jet is a chase-view drawing; drones and the airship boss are projected
// polygons, so they shrink honestly with distance.

import { VIEW } from './config.js';

// Project a world point into screen space. Returns null behind the camera.
export function project(cam, x, y, z) {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const dz = z - cam.z;
  const cos = Math.cos(cam.heading);
  const sin = Math.sin(cam.heading);
  const rx = dx * cos - dz * sin;
  const rz = dx * sin + dz * cos;
  if (rz < 6) return null;
  const s = VIEW.focal / rz;
  return {
    x: VIEW.width / 2 + rx * s,
    y: cam.horizonY - dy * s,
    s, // pixels per world unit at this depth: sizes scale with it
  };
}

// The player jet, drawn from behind and slightly above, centred on screen.
// bank rotates it; throttle drives the afterburner flame.
export function drawPlayerJet(ctx, cx, cy, bank, throttle, time, firing) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank * 0.85);
  const S = 1; // jet drawn at fixed screen size: it is the camera, not the world
  // Afterburner glow, flickering with throttle.
  const flame = 26 + throttle * 34 + Math.sin(time * 47) * 5;
  const fg = ctx.createLinearGradient(0, 34 * S, 0, 34 * S + flame);
  fg.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
  fg.addColorStop(0.5, 'rgba(255, 120, 40, 0.75)');
  fg.addColorStop(1, 'rgba(255, 80, 20, 0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-14 * S, 30 * S);
  ctx.lineTo(0, 30 * S + flame);
  ctx.lineTo(14 * S, 30 * S);
  ctx.closePath();
  ctx.fill();
  // Twin tail fins.
  ctx.fillStyle = '#5a6b7d';
  ctx.beginPath();
  ctx.moveTo(-52 * S, 6 * S); ctx.lineTo(-30 * S, -34 * S); ctx.lineTo(-18 * S, -30 * S); ctx.lineTo(-30 * S, 10 * S);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(52 * S, 6 * S); ctx.lineTo(30 * S, -34 * S); ctx.lineTo(18 * S, -30 * S); ctx.lineTo(30 * S, 10 * S);
  ctx.closePath(); ctx.fill();
  // Swept delta wings.
  ctx.fillStyle = '#7d90a6';
  ctx.beginPath();
  ctx.moveTo(-8 * S, -6 * S); ctx.lineTo(-118 * S, 26 * S); ctx.lineTo(-112 * S, 40 * S); ctx.lineTo(-6 * S, 22 * S);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8 * S, -6 * S); ctx.lineTo(118 * S, 26 * S); ctx.lineTo(112 * S, 40 * S); ctx.lineTo(6 * S, 22 * S);
  ctx.closePath(); ctx.fill();
  // Fuselage: long tapered body, nose away from the viewer.
  const body = ctx.createLinearGradient(0, -78 * S, 0, 44 * S);
  body.addColorStop(0, '#aebfd2');
  body.addColorStop(0.55, '#7d90a6');
  body.addColorStop(1, '#4c5d70');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -82 * S);
  ctx.quadraticCurveTo(13 * S, -40 * S, 15 * S, 6 * S);
  ctx.lineTo(12 * S, 42 * S);
  ctx.lineTo(-12 * S, 42 * S);
  ctx.lineTo(-15 * S, 6 * S);
  ctx.quadraticCurveTo(-13 * S, -40 * S, 0, -82 * S);
  ctx.closePath(); ctx.fill();
  // Canopy glint.
  ctx.fillStyle = '#bfe8ff';
  ctx.beginPath();
  ctx.ellipse(0, -34 * S, 7 * S, 20 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-2 * S, -42 * S, 2.5 * S, 8 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spine stripe + roundel.
  ctx.fillStyle = '#e8803c';
  ctx.fillRect(-2 * S, -18 * S, 4 * S, 46 * S);
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath(); ctx.arc(0, 8 * S, 6 * S, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.arc(0, 8 * S, 3 * S, 0, Math.PI * 2); ctx.fill();
  // Wingtip navigation lights: red port, green starboard.
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath(); ctx.arc(-114 * S, 32 * S, 4 * S, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4dff88';
  ctx.beginPath(); ctx.arc(114 * S, 32 * S, 4 * S, 0, Math.PI * 2); ctx.fill();
  // Muzzle flash while firing.
  if (firing) {
    ctx.fillStyle = 'rgba(255, 240, 150, 0.95)';
    ctx.beginPath();
    ctx.moveTo(-16 * S, -78 * S); ctx.lineTo(0, -96 * S); ctx.lineTo(16 * S, -78 * S);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// An enemy drone: small dart, projected from its 3D points.
export function drawDrone(ctx, cam, d, time) {
  const p = project(cam, d.x, d.y, d.z);
  if (!p) return;
  const s = Math.max(0.25, p.s);
  const w = 26 * s;
  if (w < 3) return; // too far to read: skip the dot
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.sin(time * 2 + d.phase) * 0.15);
  ctx.fillStyle = '#3d2b2b';
  ctx.beginPath();
  ctx.moveTo(0, -16 * s); ctx.lineTo(7 * s, 8 * s); ctx.lineTo(0, 4 * s); ctx.lineTo(-7 * s, 8 * s);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a2f2f';
  ctx.fillRect(-20 * s, 2 * s, 40 * s, 4 * s);
  ctx.fillStyle = '#ff5a5a';
  ctx.beginPath(); ctx.arc(0, -8 * s, 3.2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Health ticks above the drone.
  if (d.hp < d.maxHp) {
    const bw = 30 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p.x - bw / 2, p.y - 26 * s, bw, 4);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(p.x - bw / 2, p.y - 26 * s, bw * (d.hp / d.maxHp), 4);
  }
}

// The SKY LEVIATHAN: a storm airship with fins, gondola and turret nubs.
export function drawAirship(ctx, cam, b, time) {
  const p = project(cam, b.x, b.y, b.z);
  if (!p) return;
  const s = Math.max(0.2, p.s);
  ctx.save();
  ctx.translate(p.x, p.y);
  // Envelope: long dark hull with storm-light panels.
  const eg = ctx.createLinearGradient(0, -34 * s, 0, 34 * s);
  eg.addColorStop(0, '#5d4a68');
  eg.addColorStop(0.5, '#3a2f47');
  eg.addColorStop(1, '#241d30');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.ellipse(0, 0, 150 * s, 34 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8803c';
  ctx.fillRect(-150 * s, -4 * s, 300 * s, 5 * s);
  // Tail fins.
  ctx.fillStyle = '#4a3a58';
  ctx.beginPath();
  ctx.moveTo(120 * s, -6 * s); ctx.lineTo(168 * s, -52 * s); ctx.lineTo(150 * s, -2 * s);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(120 * s, 6 * s); ctx.lineTo(168 * s, 52 * s); ctx.lineTo(150 * s, 2 * s);
  ctx.closePath(); ctx.fill();
  // Gondola + glowing turrets.
  ctx.fillStyle = '#241d30';
  ctx.fillRect(-58 * s, 26 * s, 116 * s, 16 * s);
  ctx.fillStyle = '#ffb347';
  for (const tx of [-90, -30, 30, 90]) {
    ctx.beginPath(); ctx.arc(tx * s, -30 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
  }
  // Storm-light flicker along the hull.
  ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 9);
  ctx.fillStyle = '#9fd8ff';
  ctx.fillRect(-120 * s, -18 * s, 240 * s, 6 * s);
  ctx.globalAlpha = 1;
  ctx.restore();
  // (The boss health bar is drawn unrotated by the HUD, not here: this
  // function runs inside the world's bank roll.)
}

// A tracer round: a short glowing streak between two 3D points.
export function drawTracer(ctx, cam, a, b, color) {
  const pa = project(cam, a.x, a.y, a.z);
  const pb = project(cam, b.x, b.y, b.z);
  if (!pa || !pb) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
