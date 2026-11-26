// Aurora Ridge Flight — seeded randomness: one tiny RNG and value noise.
// One job: every deterministic roll in the game (terrain, courses, drafts)
// comes from here, so a seed replays the same ridge.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1D value noise in [-1, 1]: cheap, seedable, good enough for ridges.
export function makeNoise1D(seed) {
  const rand = mulberry32(seed);
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) table[i] = rand() * 2 - 1;
  const fade = (t) => t * t * (3 - 2 * t);
  return function noise(x) {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = table[((xi % 256) + 256) % 256];
    const b = table[(((xi + 1) % 256) + 256) % 256];
    return a + (b - a) * fade(xf);
  };
}

// Two layered octaves of the same noise: rolling hills with fine detail.
export function makeRidgeNoise(seed) {
  const n1 = makeNoise1D(seed);
  const n2 = makeNoise1D(seed + 101);
  return function ridge(x) {
    return n1(x * 0.011) * 0.72 + n2(x * 0.043) * 0.28;
  };
}

export function pick(rand, array) {
  return array[Math.floor(rand() * array.length)];
}

export function shuffle(rand, array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
