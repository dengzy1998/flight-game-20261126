// Aurora Ridge Flight — synthesized sound: no audio files, everything is
// WebAudio oscillators and filtered noise, built fresh at runtime.
// One job: engine hum, cannon, chimes, booms and UI clicks, all mutable.

export function createAudio() {
  const api = {
    ctx: null, master: null, engineOsc: null, engineGain: null, noise: null,
    enabled: true, started: false,
  };

  function ensure() {
    if (api.started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      api.ctx = new AC();
      api.master = api.ctx.createGain();
      api.master.gain.value = 0.5;
      api.master.connect(api.ctx.destination);
      // Engine: two detuned saws through a lowpass, gain follows throttle.
      api.engineOsc = api.ctx.createOscillator();
      api.engineOsc.type = 'sawtooth';
      api.engineOsc.frequency.value = 55;
      const osc2 = api.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 55.7;
      const filter = api.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      api.engineGain = api.ctx.createGain();
      api.engineGain.gain.value = 0.0;
      api.engineOsc.connect(filter);
      osc2.connect(filter);
      filter.connect(api.engineGain);
      api.engineGain.connect(api.master);
      api.engineOsc.start();
      osc2.start();
      api.osc2 = osc2;
      api.started = true;
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!api.enabled || !ensure()) return;
    try {
      const t = api.ctx.currentTime;
      const o = api.ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      const g = api.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(api.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch { /* audio is garnish: never break the game */ }
  }

  function noiseBurst(dur, vol, low) {
    if (!api.enabled || !ensure()) return;
    try {
      const t = api.ctx.currentTime;
      const len = Math.floor(api.ctx.sampleRate * dur);
      const buf = api.ctx.createBuffer(1, len, api.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = api.ctx.createBufferSource();
      src.buffer = buf;
      const f = api.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = low || 900;
      const g = api.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(api.master);
      src.start(t);
    } catch { /* audio is garnish */ }
  }

  return {
    unlock() { ensure(); if (api.ctx && api.ctx.state === 'suspended') api.ctx.resume(); },
    setMuted(m) { api.enabled = !m; if (api.engineGain) api.engineGain.gain.value = 0; },
    engine(throttle, speed01) {
      if (!api.enabled || !ensure()) return;
      try {
        const f = 48 + throttle * 70 + speed01 * 30;
        api.engineOsc.frequency.setTargetAtTime(f, api.ctx.currentTime, 0.08);
        api.osc2.frequency.setTargetAtTime(f * 1.012, api.ctx.currentTime, 0.08);
        api.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.05, api.ctx.currentTime, 0.1);
      } catch { /* garnish */ }
    },
    ring() { tone(880, 0.18, 'sine', 0.22); tone(1320, 0.28, 'sine', 0.16, 1760); },
    shot() { tone(220, 0.07, 'square', 0.08, 90); },
    explosion() { noiseBurst(0.7, 0.5, 700); tone(90, 0.5, 'sine', 0.3, 40); },
    hit() { noiseBurst(0.25, 0.3, 1200); },
    pickup() { tone(660, 0.12, 'triangle', 0.2); tone(990, 0.2, 'triangle', 0.18); },
    click() { tone(1200, 0.05, 'square', 0.1); },
    alarm() { tone(440, 0.3, 'square', 0.12, 440); tone(440, 0.3, 'square', 0.12, 440); },
    fanfare() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.22), i * 130));
    },
  };
}
