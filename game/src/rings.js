// Aurora Ridge Flight — rings, relics and drop zones: the things to fly through.
// One job: build each mission's course from a seed, and judge passes, drops
// and pickups, so the missions never do geometry themselves.

import { mulberry32, clamp } from './random.js';
import { FLIGHT } from './config.js';

// Mission 1 course: 12 rings winding down the valley, 350 units apart.
export function buildRingCourse(seed, count, startZ) {
  const rand = mulberry32(seed);
  const rings = [];
  let x = 0;
  let y = 320;
  for (let i = 0; i < count; i++) {
    // Gentle steps: the pilot has ~1.7 s between rings, so each hoop sits
    // within one comfortable turn of the last, never a snap across the sky.
    x = clamp(x + (rand() * 2 - 1) * 130, -320, 320);
    y = clamp(y + (rand() * 2 - 1) * 140, 150, 700);
    rings.push({ x, y, z: startZ + 500 + i * 420, passed: false, missed: false });
  }
  return rings;
}

// Mission 2: 3 drop zones on the valley floor, marked with smoke.
export function buildDropZones(seed) {
  const rand = mulberry32(seed + 31);
  const zones = [];
  for (let i = 0; i < 3; i++) {
    zones.push({
      x: (rand() * 2 - 1) * 220,
      z: 1600 + i * 1500,
      delivered: false,
      failed: false,
      smokePhase: rand() * 6,
    });
  }
  return zones;
}

// Relics drift across the course: 2 per mission, placed between objectives.
export function buildRelicPickups(seed, relics, missionLength, luck) {
  const rand = mulberry32(seed + 57);
  const count = 2 + (rand() < 0.3 + luck * 0.2 ? 1 : 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: (rand() * 2 - 1) * 280,
      y: 220 + rand() * 420,
      z: 900 + i * (missionLength / count) + rand() * 300,
      relic: relics[Math.floor(rand() * relics.length)],
      taken: false,
      phase: rand() * 6,
    });
  }
  return out;
}

// Ring pass: the plane crosses the ring's z-plane inside its hoop.
export function ringPassed(plane, ring) {
  if (ring.passed || ring.missed) return false;
  const dz = plane.z - ring.z;
  if (Math.abs(dz) > 18) return false;
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  return dx * dx + dy * dy < FLIGHT.ringRadius * FLIGHT.ringRadius;
}

// A ring is missed once the plane flies 60 units past its plane.
export function ringMissed(plane, ring) {
  return !ring.passed && !ring.missed && plane.z - ring.z > 60;
}

// Ring magnet: a nearby ring drifts toward the plane's line of flight.
export function magnetPull(plane, ring, dt) {
  if (!plane.ringMagnet || ring.passed) return;
  const dz = ring.z - plane.z;
  if (dz < 0 || dz > 500) return;
  const pull = 90 * dt;
  ring.x += Math.sign(plane.x - ring.x) * Math.min(pull, Math.abs(plane.x - ring.x));
  ring.y += Math.sign(plane.y - ring.y) * Math.min(pull, Math.abs(plane.y - ring.y));
}

// Crate drop: low, slow-ish, over the zone, with a crate to spare.
export function zoneDropReady(plane, zone) {
  if (zone.delivered || zone.failed) return false;
  return Math.abs(plane.z - zone.z) < 120
    && Math.abs(plane.x - zone.x) < 95
    && plane.y < 520;
}

export function zoneMissed(plane, zone) {
  return !zone.delivered && !zone.failed && plane.z - zone.z > 160;
}
