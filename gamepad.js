/*
 * OmenlyGamepad — shared gamepad layer for every game in the arcade.
 *
 * Usage in a game's <head>:
 *   <script src="/gamepad.js" defer></script>
 *
 * Then in the game's per-frame update():
 *   OmenlyGamepad.poll();
 *   const ax = OmenlyGamepad.axis(0);
 *   if (ax.x || ax.y) { mx += ax.x; mz += ax.y; }
 *   if (OmenlyGamepad.button('a')) { ... held ... }
 *   if (OmenlyGamepad.pressed('b')) { ... single press edge ... }
 *
 * Button names use the standard XInput / W3C 'standard' mapping:
 *   a, b, x, y           — face buttons (Xbox A/B/X/Y, PS ×/○/□/△)
 *   lb, rb, lt, rt       — shoulders & triggers (analogue trigger thresholded at 0.4)
 *   back, start, ls, rs  — select, start, stick clicks
 *   up, down, left, right — d-pad
 *
 * axis(0) = left stick, axis(1) = right stick. {x, y} with ~0.18 deadzone.
 */
(function () {
  'use strict';

  const BTN_NAMES = [
    'a', 'b', 'x', 'y',
    'lb', 'rb', 'lt', 'rt',
    'back', 'start', 'ls', 'rs',
    'up', 'down', 'left', 'right',
    'home'
  ];
  const DEADZONE = 0.18;
  const TRIGGER_THRESHOLD = 0.4;

  let curButtons = Object.create(null);
  let prevButtons = Object.create(null);
  let axes = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  let lastPolledTick = -1;
  let connected = false;
  let connectListeners = [];
  let toastEl = null;
  let toastTimer = null;

  function applyDeadzone(v) {
    if (Math.abs(v) < DEADZONE) return 0;
    // remap [DEADZONE..1] -> [0..1] preserving sign
    const sign = v < 0 ? -1 : 1;
    return sign * (Math.abs(v) - DEADZONE) / (1 - DEADZONE);
  }

  function getActivePad() {
    if (!navigator.getGamepads) return null;
    const list = navigator.getGamepads();
    if (!list) return null;
    for (let i = 0; i < list.length; i++) {
      const gp = list[i];
      if (gp && gp.connected) return gp;
    }
    return null;
  }

  function poll() {
    const gp = getActivePad();
    prevButtons = curButtons;
    curButtons = Object.create(null);
    axes = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    if (!gp) { return; }
    if (!connected) {
      connected = true;
      showToast(gp.id || 'GAMEPAD CONNECTED');
      for (const cb of connectListeners) { try { cb(gp); } catch (_) {} }
    }
    // buttons
    const btns = gp.buttons || [];
    for (let i = 0; i < BTN_NAMES.length; i++) {
      const b = btns[i];
      if (!b) continue;
      // 6,7 are triggers — analogue. Threshold them.
      let pressed = !!b.pressed;
      if (i === 6 || i === 7) pressed = (b.value || 0) >= TRIGGER_THRESHOLD;
      curButtons[BTN_NAMES[i]] = pressed;
    }
    // axes — standard mapping: 0,1 = left stick; 2,3 = right stick.
    const a = gp.axes || [];
    if (a.length >= 2) {
      axes[0] = { x: applyDeadzone(a[0] || 0), y: applyDeadzone(a[1] || 0) };
    }
    if (a.length >= 4) {
      axes[1] = { x: applyDeadzone(a[2] || 0), y: applyDeadzone(a[3] || 0) };
    }
    lastPolledTick++;
  }

  function button(name) { return !!curButtons[name]; }
  function pressed(name) { return !!curButtons[name] && !prevButtons[name]; }
  function axis(i) { return axes[i] || { x: 0, y: 0 }; }
  function isConnected() { return connected; }
  function onConnect(cb) { connectListeners.push(cb); }

  // ── toast ──
  function ensureToastEl() {
    if (toastEl) return toastEl;
    toastEl = document.createElement('div');
    toastEl.style.cssText = [
      'position:fixed',
      'top:max(14px,env(safe-area-inset-top,0px) + 8px)',
      'left:50%',
      'transform:translateX(-50%) translateY(-10px)',
      'z-index:999',
      'background:rgba(10,8,6,0.85)',
      'border:1px solid currentColor',
      'color:#e8d8c8',
      'padding:8px 16px',
      'font-family:"Courier New",monospace',
      'font-size:11px',
      'letter-spacing:3px',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.25s, transform 0.25s',
      'backdrop-filter:blur(4px)',
      'box-shadow:0 0 18px rgba(255,200,120,0.18)'
    ].join(';');
    document.body.appendChild(toastEl);
    return toastEl;
  }
  function showToast(msg) {
    if (!document.body) { document.addEventListener('DOMContentLoaded', () => showToast(msg), { once: true }); return; }
    const el = ensureToastEl();
    el.textContent = '🎮  ' + String(msg).toUpperCase().slice(0, 40);
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 2200);
  }

  // ── connection / disconnection events ──
  window.addEventListener('gamepadconnected', (e) => {
    // First poll will fire showToast — but emit one immediately too so games
    // that haven't polled yet still see it.
    if (!connected) showToast(e.gamepad && e.gamepad.id ? e.gamepad.id : 'GAMEPAD CONNECTED');
  });
  window.addEventListener('gamepaddisconnected', () => {
    connected = false;
    curButtons = Object.create(null);
    prevButtons = Object.create(null);
    axes = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    showToast('GAMEPAD DISCONNECTED');
  });

  window.OmenlyGamepad = {
    poll,
    button,
    pressed,
    axis,
    isConnected,
    onConnect,
    BTN_NAMES
  };
})();
