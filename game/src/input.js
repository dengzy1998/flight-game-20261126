// Aurora Ridge Flight — keyboard, mouse and touch: one input snapshot per frame.
// One job: turn raw device events into the game's {left, right, up, down,
// throttleUp, throttleDown, fire, drop} shape, plus clicks for the menus.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    left: false, right: false, up: false, down: false,
    throttleUp: false, throttleDown: false,
    fire: false, drop: false,
    mouseX: 0, mouseY: 0, clicked: false, clickX: 0, clickY: 0,
    paused: false,
  };
  let clickQueue = null;

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'throttleUp', ShiftRight: 'throttleUp',
    ControlLeft: 'throttleDown', ControlRight: 'throttleDown',
    Space: 'fire',
    KeyB: 'drop', KeyX: 'drop',
  };

  function refresh() {
    state.left = keys.has('left');
    state.right = keys.has('right');
    state.up = keys.has('up');
    state.down = keys.has('down');
    state.throttleUp = keys.has('throttleUp');
    state.throttleDown = keys.has('throttleDown');
    state.fire = keys.has('fire') || state.mouseDown;
    state.drop = keys.has('drop');
  }

  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (name) {
      keys.add(name);
      if (e.code === 'Space') e.preventDefault();
      refresh();
    }
    if (e.code === 'KeyP' || e.code === 'Escape') state.paused = !state.paused;
    if (e.code === 'KeyR') state.restartPressed = true;
    if (e.code === 'Enter') state.confirmPressed = true;
    if (e.code === 'KeyM') state.mutePressed = true;
    if (e.code === 'KeyH') state.hangarPressed = true;
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) { keys.delete(name); refresh(); }
  });
  window.addEventListener('blur', () => { keys.clear(); refresh(); });

  function toGame(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }
  canvas.addEventListener('mousemove', (e) => {
    const p = toGame(e);
    state.mouseX = p.x;
    state.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toGame(e);
    state.mouseDown = true;
    state.mouseX = p.x;
    state.mouseY = p.y;
    refresh();
  });
  window.addEventListener('mouseup', () => { state.mouseDown = false; refresh(); });
  canvas.addEventListener('click', (e) => {
    const p = toGame(e);
    clickQueue = p;
  });
  // Touch: left half steers, right half fires; buttons handle the rest.
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const p = toGame(t);
    if (p.x < canvas.width / 2) state.left = p.y > canvas.height / 2 ? false : true;
    state.mouseDown = true;
    refresh();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { state.mouseDown = false; keys.clear(); refresh(); });

  // The loop calls this once per frame: delivers at most one click.
  state.consumeClick = function consumeClick() {
    const c = clickQueue;
    clickQueue = null;
    return c;
  };
  state.consumeKey = function consumeKey(name) {
    const v = !!state[name];
    state[name] = false;
    return v;
  };
  return state;
}
