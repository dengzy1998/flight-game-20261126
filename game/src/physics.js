// Aurora Ridge Flight — the flight model: throttle, bank, pitch, fuel, damage.
// One job: move the plane one step and report what happened (terrain hit,
// fuel empty, storm soak), so the missions can react without doing physics.

import { FLIGHT } from './config.js';
import { clamp, lerp } from './random.js';

// input: {left, right, up, down, throttleUp, throttleDown, fire}
// Returns events: [] of {type, ...} for the mission layer to score.
export function stepPlane(G, input, dt, terrain) {
  const p = G.plane;
  const events = [];

  // Throttle: Shift/W raises it, Ctrl/S lowers it; it chases its target speed.
  if (input.throttleUp) p.throttle = clamp(p.throttle + 0.7 * dt, 0, 1);
  if (input.throttleDown) p.throttle = clamp(p.throttle - 0.7 * dt, 0, 1);
  const targetSpeed = FLIGHT.minSpeed + (p.topSpeed - FLIGHT.minSpeed) * p.throttle;
  p.speed += (targetSpeed - p.speed) * clamp(1.6 * dt, 0, 1);

  // Bank and turn: left/right roll the jet; heading follows the bank.
  const bankTarget = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const bankGoal = bankTarget * FLIGHT.maxBank;
  p.bank = lerp(p.bank, bankGoal, clamp(6 * dt, 0, 1));
  const speedFactor = clamp(p.speed / 200, 0.4, 1.4);
  p.heading += p.bank * p.turnRate * speedFactor * dt;
  p.heading = clamp(p.heading, -0.55, 0.55); // the valley walls keep you honest

  // Pitch and climb: up climbs, down dives; diving trades altitude for speed.
  const pitchInput = (input.up ? 1 : 0) - (input.down ? 1 : 0);
  const climbGoal = pitchInput * p.climbRate;
  p.climb = lerp(p.climb, climbGoal, clamp(4 * dt, 0, 1));
  p.pitch = lerp(p.pitch, -pitchInput * 0.16, clamp(5 * dt, 0, 1));
  if (pitchInput < 0) p.speed = Math.min(p.topSpeed * 1.06, p.speed + 26 * dt); // dive gains speed
  p.y = clamp(p.y + p.climb * dt, FLIGHT.minAltitude, FLIGHT.maxAltitude);

  // Advance along the heading.
  p.x += Math.sin(p.heading) * p.speed * dt;
  p.z += Math.cos(p.heading) * p.speed * dt;
  p.x = clamp(p.x, -480, 480);

  // Fuel: throttle burns it; empty tanks flame out to a glide.
  p.fuel -= (FLIGHT.fuelBurnBase + FLIGHT.fuelBurnThrottle * p.throttle) * dt;
  if (p.fuel <= 0) {
    p.fuel = 0;
    p.throttle = Math.max(0, p.throttle - 0.5 * dt);
    if (p.speed < 70) events.push({ type: 'flameout' });
  }

  // Runway refuel: low and slow over the strip tops the tanks up.
  const rw = terrain.runwayAt(p.z);
  if (rw && Math.abs(p.x - rw.x) < 40 && p.y < 130 && p.fuel < p.maxFuel) {
    p.fuel = Math.min(p.maxFuel, p.fuel + FLIGHT.runwayRefuel * dt);
    events.push({ type: 'refuelling' });
  }

  // Terrain: the hills bite. A hit costs hull, bounces you up, shakes the view.
  const ground = terrain.heightAt(p.x, p.z);
  if (p.y < ground + 26) {
    p.y = ground + 26;
    p.climb = Math.abs(p.climb) * 0.6 + 60;
    damagePlane(G, FLIGHT.terrainHitDamage);
    G.shake = 1;
    events.push({ type: 'terrainHit', ground });
  }

  // Storm soak: inside a storm cloud the hull ticks down.
  if (G.missionIndex === 2 && stormSoak(G)) {
    damagePlane(G, FLIGHT.stormDamagePerSec * (p.stormCharm ? 0.5 : 1) * dt);
    events.push({ type: 'storm' });
  }

  // Cannon cooldown.
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  return events;
}

// Storm clouds hang over mission 3's pass; flying through one hurts.
export function stormSoak(G) {
  const p = G.plane;
  for (const c of G.clouds) {
    if (!c.storm) continue;
    if (Math.abs(p.z - c.z) < 90 && Math.abs(p.x - c.x) < 130 && Math.abs(p.y - c.y) < 90) return true;
  }
  return false;
}

// Damage with the phoenix rule: one fatal hit per run is survived at 50%.
export function damagePlane(G, amount) {
  const p = G.plane;
  if (amount <= 0) return;
  p.hull -= amount;
  G.flash = Math.min(1, G.flash + 0.45);
  if (p.hull <= 0 && p.relics.includes('phoenix') && !p.phoenixUsed) {
    p.phoenixUsed = true;
    p.hull = p.maxHull * 0.5;
    G.messages.push({ text: 'PHOENIX FEATHER!', sub: 'The feather burns — you fly on.', timer: 2.4, color: '#ffd98a' });
  }
  if (p.hull <= 0) p.hull = 0;
}

export function planeAlive(G) {
  return G.plane.hull > 0;
}
