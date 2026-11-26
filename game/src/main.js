// Aurora Ridge Flight — the loop: screens, input routing, and the frame.
// One job: own the state machine and call the other modules in order.
// Screens: title → briefing → playing → upgrade → briefing … → victory / gameover.

import { VIEW, MISSIONS } from './config.js';
import { G, newGame, newPlane, saveMeta } from './state.js';
import { createTerrain } from './terrain.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { renderScene } from './render.js';
import { stepPlane } from './physics.js';
import {
  drawHUD, drawTitle, drawHowto, drawHangar, drawBriefing, drawUpgrade,
  drawEnd, drawPaused, titleButtons, hangarRows, hangarClose, howtoClose,
  briefingButton, upgradeCardRects, continueButton, endButtons, inRect,
} from './hud.js';
import { startRun, startMission, updateMission, draftUpgrades, applyUpgrade, endRun } from './missions.js';
import { autopilot, stageShot } from './demo.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
// Render into an offscreen buffer and blit it in one drawImage: a slow
// frame can never be screenshotted half-painted (world done, HUD missing).
const off = document.createElement('canvas');
off.width = VIEW.width;
off.height = VIEW.height;
const octx = off.getContext('2d');

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 20261126);
const shot = params.get('shot') || '';
const demoMode = params.get('demo') === '1' || shot !== '';

const terrain = createTerrain(seed);
const input = createInput(canvas);
G.input = input;
const audio = createAudio();
const statusEl = document.getElementById('status');

let overlay = null; // 'howto' | 'hangar' | null — overlays on the title screen
let prevDrop = false;
let lastFrame = performance.now();
let statusText = '';

function setStatus(s) {
  if (s !== statusText) {
    statusText = s;
    if (statusEl) statusEl.textContent = s;
  }
}

function resetScenic() {
  // Back to the title screen: a fresh plane flying itself over the ridge.
  G.plane = newPlane(G.meta);
  G.plane.x = 0; G.plane.y = 380; G.plane.z = 0;
  G.plane.throttle = 0.7; G.plane.speed = 200;
  G.rings = []; G.zones = []; G.drones = []; G.bosses = [];
  G.bullets = []; G.enemyBullets = []; G.messages = []; G.popups = [];
  G.missionIndex = 0;
  G.autopilot = true;
  G.screen = 'title';
  overlay = null;
}

// Scenic flight behind the title: autopilot, no objectives, clouds recycle.
function updateScenic(dt) {
  const scenicInput = { left: false, right: false, up: false, down: false, throttleUp: false, throttleDown: false, fire: false, drop: false };
  autopilot(G, scenicInput);
  stepPlane(G, scenicInput, dt, terrain);
  for (const c of G.clouds) {
    if (c.z < G.plane.z - 120) {
      c.z += 2300;
      c.x = (Math.random() * 2 - 1) * 520;
      c.y = 330 + Math.random() * 380;
    }
  }
  // Keep some clouds around even before any mission starts.
  if (!G.clouds.length) {
    for (let i = 0; i < 18; i++) {
      G.clouds.push({ x: (Math.random() * 2 - 1) * 520, y: 330 + Math.random() * 380, z: 300 + Math.random() * 1900, size: 34 + Math.random() * 30, storm: false, phase: Math.random() * 6 });
    }
  }
}

function frame(now) {
  const rawDt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  let dt = rawDt;
  // Screenshot staging: freeze the simulation ~0.9 s in, so the staged
  // moment (rings ahead, boss in frame, clean banners) is what the camera
  // catches, not whatever the autopilot wandered into 12 s later.
  if (G.shotMode) {
    G.shotElapsed = (G.shotElapsed || 0) + rawDt;
    if (G.shotElapsed > 0.9) dt = 0;
  }
  G.time += dt;

  // Global keys.
  if (input.consumeKey('mutePressed')) {
    G.muted = !G.muted;
    audio.setMuted(G.muted);
  }
  if (input.consumeKey('restartPressed') && (G.screen === 'playing' || G.screen === 'gameover' || G.screen === 'victory' || G.screen === 'paused')) {
    G.plane = newPlane(G.meta);
    startRun(G, seed);
  }
  const click = input.consumeClick();
  const mouse = { x: input.mouseX, y: input.mouseY };

  // Pause toggling.
  if (input.paused) {
    input.paused = false;
    if (G.screen === 'playing') G.screen = 'paused';
    else if (G.screen === 'paused') G.screen = 'playing';
  }

  switch (G.screen) {
    case 'title': {
      updateScenic(dt);
      setStatus('Aurora Ridge Flight. Title screen. Press Enter or click Fly Mission to start.');
      if (overlay === 'hangar') {
        if (click) {
          for (const { item, rect } of hangarRows()) {
            if (inRect(click, rect) && G.meta[item.id] < item.max && G.meta.medals >= item.cost) {
              G.meta[item.id]++;
              G.meta.medals -= item.cost;
              saveMeta(G.meta);
              audio.click();
            }
          }
          if (inRect(click, hangarClose())) { overlay = null; audio.click(); }
        }
      } else if (overlay === 'howto') {
        if (click && inRect(click, howtoClose())) { overlay = null; audio.click(); }
      } else if (click) {
        const b = titleButtons();
        if (inRect(click, b.fly)) { audio.unlock(); audio.click(); G.plane = newPlane(G.meta); startRun(G, seed); }
        else if (inRect(click, b.hangar)) { overlay = 'hangar'; audio.click(); }
        else if (inRect(click, b.howto)) { overlay = 'howto'; audio.click(); }
      } else if (input.consumeKey('confirmPressed')) {
        audio.unlock(); audio.click(); G.plane = newPlane(G.meta); startRun(G, seed);
      } else if (input.consumeKey('hangarPressed')) {
        overlay = 'hangar';
      }
      break;
    }
    case 'briefing': {
      setStatus(`Mission ${G.missionIndex + 1}: ${MISSIONS[G.missionIndex].name}. ${MISSIONS[G.missionIndex].goal}.`);
      if ((click && inRect(click, briefingButton())) || input.consumeKey('confirmPressed')) {
        audio.unlock(); audio.click();
        G.screen = 'playing';
      }
      break;
    }
    case 'playing': {
      const liveInput = { ...input, drop: input.drop && !prevDrop };
      prevDrop = input.drop;
      if (G.autopilot) autopilot(G, liveInput);
      const events = stepPlane(G, liveInput, dt, terrain);
      for (const e of events) {
        if (e.type === 'terrainHit') audio.explosion();
        if (e.type === 'flameout') endRun(G, 'Out of fuel — the courier glides into the valley.', audio);
      }
      if (G.screen === 'playing') {
        updateMission(G, dt, terrain, audio, liveInput);
        audio.engine(G.plane.throttle, G.plane.speed / 340);
      }
      setStatus(`Flying mission ${G.missionIndex + 1}. Altitude ${Math.round(G.plane.y * 15)} feet, speed ${Math.round(G.plane.speed * 1.2)} knots, fuel ${Math.round(G.plane.fuel)}.`);
      break;
    }
    case 'upgrade': {
      if (click) {
        const rects = upgradeCardRects();
        rects.forEach((r, i) => {
          if (inRect(click, r) && G.upgradeDraft[i]) applyUpgrade(G, G.upgradeDraft[i], audio);
        });
      }
      if (input.consumeKey('confirmPressed') && G.upgradeDraft[0]) applyUpgrade(G, G.upgradeDraft[0], audio);
      break;
    }
    case 'missionComplete': {
      if ((click && inRect(click, continueButton())) || input.consumeKey('confirmPressed')) {
        audio.click();
        draftUpgrades(G);
      }
      break;
    }
    case 'gameover':
    case 'victory': {
      if (click) {
        const b = endButtons();
        if (inRect(click, b.retry)) { audio.click(); G.plane = newPlane(G.meta); startRun(G, seed); }
        else if (inRect(click, b.title)) { audio.click(); resetScenic(); }
      } else if (input.consumeKey('restartPressed') || input.consumeKey('confirmPressed')) {
        G.plane = newPlane(G.meta); startRun(G, seed);
      }
      break;
    }
    case 'paused': {
      if (click || input.consumeKey('confirmPressed')) G.screen = 'playing';
      break;
    }
    default:
      break;
  }

  // ---- Draw into the offscreen buffer, then blit it whole. ----
  renderScene(octx, G, terrain, G.time);
  if (G.screen === 'playing' || G.screen === 'paused') drawHUD(octx, G, terrain);
  if (G.screen === 'title') {
    drawTitle(octx, G, mouse);
    if (overlay === 'howto') drawHowto(octx, mouse);
    if (overlay === 'hangar') drawHangar(octx, G, mouse);
  }
  if (G.screen === 'briefing') drawBriefing(octx, G, mouse);
  if (G.screen === 'upgrade') drawUpgrade(octx, G, mouse);
  if (G.screen === 'missionComplete') drawEnd(octx, G, mouse, 'missionComplete');
  if (G.screen === 'gameover') drawEnd(octx, G, mouse, 'gameover');
  if (G.screen === 'victory') drawEnd(octx, G, mouse, 'victory');
  if (G.screen === 'paused') drawPaused(octx, G, mouse);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(off, 0, 0);

  requestAnimationFrame(frame);
}

// Boot: a staged screenshot, the demo, or the plain title screen.
if (shot) {
  stageShot(G, shot, seed, terrain);
  G.autopilot = shot !== 'score';
  // ?freeze=0 lets a staged run play out in full (endurance testing):
  // the frame no longer freezes 0.9 s in.
  if (params.get('freeze') === '0') G.shotMode = false;
} else if (demoMode) {
  G.autopilot = true;
}
resetScenicClouds();
function resetScenicClouds() {
  if (!G.clouds.length) {
    for (let i = 0; i < 18; i++) {
      G.clouds.push({ x: (Math.random() * 2 - 1) * 520, y: 330 + Math.random() * 380, z: 300 + Math.random() * 1900, size: 34 + Math.random() * 30, storm: false, phase: Math.random() * 6 });
    }
  }
}
// stageShot starts its own run; the plain boot starts scenic.
if (!shot) resetScenic();
requestAnimationFrame(frame);
