/*
 * OmenlyGamepad
 * Shared gamepad + controls overlay layer for the whole arcade.
 *
 * Existing games can keep using:
 *   OmenlyGamepad.poll()
 *   OmenlyGamepad.axis(0 / 1)
 *   OmenlyGamepad.button('a')
 *   OmenlyGamepad.pressed('rt')
 *
 * The script also gives menu screens controller navigation and injects a
 * gameplay-only Controls button with Keyboard / Gamepad / Mobile tabs.
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
  const NAV_COOLDOWN = 170;

  let curButtons = Object.create(null);
  let prevButtons = Object.create(null);
  let axes = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  let connected = false;
  let connectListeners = [];
  let toastEl = null;
  let toastTimer = null;
  let frameId = 0;
  let polledFrame = -1;
  let navTimer = 0;
  let controlsReady = false;
  let controlsOpen = false;
  let controlsButton = null;
  let controlsPanel = null;
  let lastPlayVisible = false;

  const DEFAULT_CONTROLS = {
    echo: {
      title: 'Echo',
      keyboard: ['WASD / arrows: move', 'Mouse / click: aim and ping', 'F: flash', 'X: EMP', 'C / Shift: crouch'],
      gamepad: ['Left stick: move', 'Right stick: aim', 'RT / A: ping', 'X: flash', 'Y: EMP', 'B: crouch'],
      mobile: ['Left stick: move', 'PING: sonar pulse', 'FLASH: stun nearby threats', 'EMP: disable electronics', 'CROUCH: move quietly']
    },
    porchlight: {
      title: 'Porchlight',
      keyboard: ['Tab / arrows: move between choices', 'Enter / Space: choose', 'Esc: close open dialog'],
      gamepad: ['D-pad / left stick: move between choices', 'A: choose', 'B: back / close'],
      mobile: ['Tap choices and story buttons']
    },
    ashenreach: {
      title: 'Ashenreach',
      keyboard: ['WASD / arrows: move', 'J / click: attack', 'K: dash', 'E: interact', 'L / F: lantern'],
      gamepad: ['Left stick: move', 'RT / X: attack', 'A: dash', 'Y: interact', 'B: lantern'],
      mobile: ['Left stick: move', 'ATTACK: strike', 'DASH: evade', 'INTERACT: use nearby objects']
    },
    stillhunt: {
      title: 'Stillhunt',
      keyboard: ['Mouse: aim', 'Click / Space: fire', 'R: reload', 'Shift: steady breath'],
      gamepad: ['Right stick: aim', 'RT / A: fire', 'B: reload', 'LT: steady breath'],
      mobile: ['Aim stick: aim', 'FIRE: shoot', 'RELOAD: chamber / reload']
    },
    blacksite: {
      title: 'Blacksite',
      keyboard: ['WASD / arrows: move', 'Mouse: aim', 'Shift: crouch', 'E: act / use', 'F: dart', 'Q: coin', 'M: map'],
      gamepad: ['Left stick: move', 'Right stick: aim', 'B / LS: crouch', 'A: act / use', 'RT / X: dart', 'Y: coin', 'Start: map'],
      mobile: ['Left stick: move', 'CROUCH: toggle crouch', 'ACT: use / takedown', 'DART: fire dart', 'COIN: throw distraction', 'MAP: toggle map']
    },
    gaymesbond: {
      title: 'gaymesbond',
      keyboard: ['WASD / arrows: move', 'Mouse: look', 'Shift: crouch', 'E: interact / takedown', 'F / click: dart', 'Q / right click: decoy', 'Space: smoke', 'C: charm', 'M: minimap'],
      gamepad: ['Left stick: move', 'Right stick: look', 'A: interact / takedown', 'B / LS: crouch', 'RT / X: dart', 'Y: decoy', 'RB: smoke', 'LB: charm', 'Start: minimap'],
      mobile: ['Left stick: move', 'Right stick: look', 'ACT: interact / takedown', 'CROUCH: toggle crouch', 'DART / DECOY / SMOKE / CHARM: gadgets']
    },
    raccoon: {
      title: 'Raccoon',
      keyboard: ['WASD / arrows: move', 'Mouse: look', 'Click: fire / slash', 'R: reload', 'F: stealth kill / use', '1-9: select weapon', 'Q / E: cycle weapons', 'Shift: sprint'],
      gamepad: ['Left stick: move', 'Right stick: look', 'RT: fire / slash', 'B: reload', 'A: use / stealth kill', 'X: quick swap pistol / rocket', 'Y: rocket launcher', 'LB / RB: previous / next weapon', 'LS: sprint'],
      mobile: ['Left stick: move', 'Look stick: aim', 'FIRE: shoot / slash', 'RELOAD: reload', 'USE: interact / stealth kill', 'WEAP / KNIFE / KATANA / RPG / FRAG: select weapons']
    },
    dinorift: {
      title: 'Dinorift',
      keyboard: ['WASD / arrows: move', 'Mouse: aim', 'Click: fire', '1-4: weapons', 'R: reload', 'Space: dodge'],
      gamepad: ['Left stick: move', 'Right stick: aim', 'RT: fire', 'B: reload', 'LB / RB: cycle weapons', 'A: dodge'],
      mobile: ['Left stick: move', 'Aim stick: aim', 'FIRE: shoot', 'Weapon buttons: swap weapons']
    },
    siteline: {
      title: 'Siteline',
      keyboard: ['WASD / arrows: move', 'Mouse: aim', 'Click: fire', 'Right click / SCOPE: scope any weapon', 'R: reload', '1 / 2: swap weapons', 'G: cycle grenades', 'F: throw / use', 'B: buy menu', 'Tab: scoreboard', 'Enter: chat', 'Space: jump', 'Shift: walk'],
      gamepad: ['Left stick: move', 'Right stick: aim', 'RT: fire', 'LT: hold scope on any weapon', 'LS: walk', 'A: jump', 'B: reload', 'X: swap weapon', 'Y: throw grenade', 'RB: cycle grenades', 'LB: buy menu', 'Start: scoreboard'],
      mobile: ['Left stick: move', 'Look stick: aim', 'FIRE: shoot', 'SCOPE: scope any weapon', 'RELOAD: reload', 'SWAP: change weapon', 'NADE: grenade', 'USE: objective / hostage']
    },
    girth: {
      title: 'Girth',
      keyboard: ['A / D or arrows: rub left and right', 'Space / Enter: tap action', 'Mouse drag: rub'],
      gamepad: ['Left stick / D-pad: rub left and right', 'A / RT: tap action'],
      mobile: ['Drag left and right on the tool', 'Tap buttons when they appear']
    },
    nocturne: {
      title: 'Nocturne',
      keyboard: ['Tab / arrows: move between doors and notebook choices', 'Enter / Space: select', 'Esc: close notebook / dialog'],
      gamepad: ['D-pad / left stick: move focus', 'A: select', 'B: back / close'],
      mobile: ['Tap doors, notebook entries, and accusation choices']
    },
    rentsim: {
      title: 'Rent Simulator',
      keyboard: ['Tab / arrows: move between actions', 'Enter / Space: choose action', 'Esc: close dialog'],
      gamepad: ['D-pad / left stick: move between actions', 'A: choose action', 'B: close dialog', 'Start: controls'],
      mobile: ['Tap actions, locations, workflow choices, and dialog buttons']
    },
    carve: {
      title: 'Carve',
      keyboard: ['A / D or arrows: step lanes', 'Click / Space: slash', 'Enter: start / select'],
      gamepad: ['Left stick / D-pad: step lanes', 'A / RT: slash', 'Start: start'],
      mobile: ['Tap left / right edges to step', 'Tap center to slash']
    },
    graveyardshift: {
      title: 'Graveyard Shift',
      keyboard: ['WASD / arrows: move', 'Mouse: look', 'Click: shine light / swing', 'E: repair / rescue / interact', 'Q: drop pallet', 'R: reload battery', 'Shift: sprint', 'Tab: scoreboard'],
      gamepad: ['Left stick: move', 'Right stick: look', 'RT: shine light / swing', 'A: repair / rescue / interact', 'X: drop pallet', 'B: reload battery / crouch', 'Y: swap role tool', 'Start: scoreboard'],
      mobile: ['Left stick: move', 'Look stick: aim', 'ACTION: repair / rescue / interact', 'LIGHT / SWING: use role tool', 'PALLET: drop obstacle', 'BATTERY: reload']
    },
    default: {
      title: 'Controls',
      keyboard: ['WASD / arrows: move when supported', 'Mouse / click: aim or choose', 'Enter / Space: activate focused item', 'Esc: close menus'],
      gamepad: ['Left stick / D-pad: move or focus menu items', 'Right stick: look / aim when supported', 'A: select / action', 'B: back / close', 'RT: fire / primary action'],
      mobile: ['Tap buttons and choices', 'Use on-screen sticks/buttons when visible']
    }
  };

  function applyDeadzone(v) {
    if (Math.abs(v) < DEADZONE) return 0;
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
    if (polledFrame === frameId) return;
    polledFrame = frameId;
    const gp = getActivePad();
    prevButtons = curButtons;
    curButtons = Object.create(null);
    axes = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    if (!gp) return;
    if (!connected) {
      connected = true;
      showToast(gp.id || 'GAMEPAD CONNECTED');
      for (const cb of connectListeners) {
        try { cb(gp); } catch (_) {}
      }
    }
    const btns = gp.buttons || [];
    for (let i = 0; i < BTN_NAMES.length; i++) {
      const b = btns[i];
      if (!b) continue;
      let isDown = !!b.pressed;
      if (i === 6 || i === 7) isDown = (b.value || 0) >= TRIGGER_THRESHOLD;
      curButtons[BTN_NAMES[i]] = isDown;
    }
    const a = gp.axes || [];
    if (a.length >= 2) axes[0] = { x: applyDeadzone(a[0] || 0), y: applyDeadzone(a[1] || 0) };
    if (a.length >= 4) axes[1] = { x: applyDeadzone(a[2] || 0), y: applyDeadzone(a[3] || 0) };
  }

  function button(name) { return !!curButtons[name]; }
  function pressed(name) { return !!curButtons[name] && !prevButtons[name]; }
  function axis(i) { return axes[i] || { x: 0, y: 0 }; }
  function isConnected() { return connected; }
  function onConnect(cb) { connectListeners.push(cb); }

  function ensureToastEl() {
    if (toastEl) return toastEl;
    toastEl = document.createElement('div');
    toastEl.style.cssText = [
      'position:fixed',
      'top:max(14px,calc(env(safe-area-inset-top,0px) + 8px))',
      'left:50%',
      'transform:translateX(-50%) translateY(-10px)',
      'z-index:100200',
      'background:rgba(10,8,6,0.86)',
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
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => showToast(msg), { once: true });
      return;
    }
    const el = ensureToastEl();
    el.textContent = 'GAMEPAD - ' + String(msg).toUpperCase().slice(0, 44);
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 2200);
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    if (el.hidden || el.classList.contains('hidden')) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function isTypingElement(el) {
    if (!el) return false;
    const t = (el.tagName || '').toLowerCase();
    return t === 'input' || t === 'textarea' || t === 'select' || el.isContentEditable;
  }

  function focusables(root) {
    const scope = root || document;
    return Array.from(scope.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )).filter(el => visible(el) && !el.closest('[aria-hidden="true"]'));
  }

  function topVisiblePanel() {
    if (controlsOpen && controlsPanel) return controlsPanel;
    const selectors = [
      '.omenly-controls-panel.on',
      '.panel:not(.hidden)',
      '.modal.on',
      '#modal.on',
      '#title:not(.hidden)',
      '#briefing:not(.hidden)',
      '#gameover:not(.hidden)',
      '#complete:not(.hidden)',
      '#menu:not(.hidden)',
      '#team-panel:not(.hidden)',
      '#buy-menu:not(.hidden)',
      '#scoreboard:not(.hidden)',
      '#upgrade-panel:not(.hidden)'
    ];
    for (const sel of selectors) {
      const found = Array.from(document.querySelectorAll(sel)).filter(visible);
      if (found.length) return found[found.length - 1];
    }
    return null;
  }

  function pageIsHub() {
    const cfg = window.OMENLY_CONFIG || {};
    return cfg.isHub || cfg.game === 'omenly' || !!document.getElementById('grid');
  }

  function gameplayLikelyVisible() {
    if (pageIsHub()) return false;
    if (document.body && document.body.classList.contains('omenly-no-controls')) return false;
    if (controlsOpen) return true;
    const blockers = ['#title', '#briefing', '#gameover', '#complete', '#modal', '.modal.on', '.panel:not(.hidden)'];
    for (const sel of blockers) {
      const nodes = document.querySelectorAll(sel);
      for (const n of nodes) {
        if (visible(n)) return false;
      }
    }
    const canvas = document.querySelector('canvas');
    const app = document.querySelector('main,.app,#game,#scene');
    return !!(canvas || app);
  }

  function moveFocus(dir) {
    const panel = topVisiblePanel();
    let items = focusables(panel || document);
    if (!items.length && pageIsHub()) items = focusables(document);
    if (!items.length) return;
    const active = document.activeElement;
    let idx = items.indexOf(active);
    if (idx < 0) idx = dir > 0 ? -1 : 0;
    const next = items[(idx + dir + items.length) % items.length];
    try { next.focus({ preventScroll: false }); } catch (_) { next.focus(); }
  }

  function clickFocused() {
    const active = document.activeElement;
    if (!active || active === document.body || !visible(active)) {
      const items = focusables(topVisiblePanel() || document);
      if (items[0]) {
        try { items[0].focus({ preventScroll: false }); } catch (_) { items[0].focus(); }
      }
      return;
    }
    if (isTypingElement(active)) return;
    active.click();
  }

  function shouldDriveDom() {
    if (controlsOpen) return true;
    if (topVisiblePanel()) return true;
    if (pageIsHub()) return true;
    const active = document.activeElement;
    return active && active !== document.body && visible(active);
  }

  function dispatchEscape() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  function handleDomNavigation() {
    const now = performance.now();
    const ax = axis(0);
    const nav = pressed('down') || pressed('right') || ax.y > 0.72 || ax.x > 0.72 ? 1
      : pressed('up') || pressed('left') || ax.y < -0.72 || ax.x < -0.72 ? -1
      : 0;
    if (nav && now - navTimer > NAV_COOLDOWN && shouldDriveDom()) {
      navTimer = now;
      moveFocus(nav);
    }
    if (pressed('a') && shouldDriveDom()) clickFocused();
    if (pressed('b')) {
      if (controlsOpen) closeControls();
      else if (topVisiblePanel()) dispatchEscape();
    }
    if (pressed('start') && controlsReady && controlsButton && visible(controlsButton)) {
      toggleControls();
    }
  }

  function controlsForGame() {
    const cfg = window.OMENLY_CONFIG || {};
    const id = (cfg.game || document.body?.dataset?.omenlyGame || '').toLowerCase();
    return Object.assign({}, DEFAULT_CONTROLS.default, DEFAULT_CONTROLS[id] || {}, window.OMENLY_CONTROLS || {});
  }

  function makeList(items) {
    return '<ul>' + (items || []).map(item => '<li>' + escapeHTML(item) + '</li>').join('') + '</ul>';
  }

  function ensureControls() {
    if (controlsReady || pageIsHub() || !document.body) return;
    controlsReady = true;
    const data = controlsForGame();

    if (!document.getElementById('omenly-controls-style')) {
      const st = document.createElement('style');
      st.id = 'omenly-controls-style';
      st.textContent = [
        '.omenly-controls-btn{position:fixed;right:max(14px,env(safe-area-inset-right,0px) + 8px);top:max(14px,env(safe-area-inset-top,0px) + 8px);z-index:100100;border:1px solid rgba(255,255,255,.44);background:rgba(6,7,12,.68);color:#f5ead8;padding:8px 12px;font:11px "Courier New",monospace;letter-spacing:2px;text-transform:uppercase;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 8px 28px rgba(0,0,0,.28)}',
        '.omenly-controls-btn:hover,.omenly-controls-btn:focus-visible{outline:none;border-color:currentColor;background:rgba(255,255,255,.12)}',
        '.omenly-controls-btn.is-hidden{display:none}',
        '.omenly-controls-panel{position:fixed;inset:0;z-index:100150;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,2,5,.76);backdrop-filter:blur(8px)}',
        '.omenly-controls-panel.on{display:flex}',
        '.omenly-controls-card{width:min(620px,96vw);max-height:calc(100dvh - 28px);overflow:auto;background:rgba(10,10,16,.94);border:1px solid rgba(255,255,255,.22);box-shadow:0 26px 80px rgba(0,0,0,.6);color:#f5ead8;font-family:"Courier New",monospace;padding:20px}',
        '.omenly-controls-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}',
        '.omenly-controls-title{font:italic 24px Georgia,serif;color:var(--omenly-accent,#ffd089);line-height:1.1}',
        '.omenly-controls-close{width:36px;height:36px;border:1px solid rgba(255,255,255,.25);background:transparent;color:#f5ead8;font-size:20px;cursor:pointer}',
        '.omenly-controls-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}',
        '.omenly-controls-tab{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.04);color:#f5ead8;padding:10px 8px;font:11px "Courier New",monospace;letter-spacing:2px;text-transform:uppercase;cursor:pointer}',
        '.omenly-controls-tab.on{border-color:var(--omenly-accent,#ffd089);color:var(--omenly-accent,#ffd089);background:rgba(255,255,255,.1)}',
        '.omenly-controls-page{display:none}',
        '.omenly-controls-page.on{display:block}',
        '.omenly-controls-page ul{margin:0;padding:0;display:grid;gap:8px;list-style:none}',
        '.omenly-controls-page li{border-left:3px solid var(--omenly-accent,#ffd089);background:rgba(255,255,255,.045);padding:9px 11px;line-height:1.35;font-size:12px;color:rgba(245,234,216,.86)}',
        '@media(max-width:680px){.omenly-controls-btn{top:auto;bottom:max(12px,env(safe-area-inset-bottom,0px) + 8px);right:max(12px,env(safe-area-inset-right,0px) + 8px);padding:7px 10px;font-size:10px}.omenly-controls-card{padding:16px}.omenly-controls-tabs{gap:6px}.omenly-controls-tab{font-size:10px;letter-spacing:1px}}'
      ].join('\n');
      document.head.appendChild(st);
    }

    controlsButton = document.createElement('button');
    controlsButton.type = 'button';
    controlsButton.className = 'omenly-controls-btn is-hidden';
    controlsButton.textContent = 'Controls';
    controlsButton.setAttribute('aria-haspopup', 'dialog');
    controlsButton.addEventListener('click', toggleControls);

    controlsPanel = document.createElement('div');
    controlsPanel.className = 'omenly-controls-panel';
    controlsPanel.setAttribute('role', 'dialog');
    controlsPanel.setAttribute('aria-modal', 'true');
    controlsPanel.innerHTML = ''
      + '<div class="omenly-controls-card">'
      + '  <div class="omenly-controls-head">'
      + '    <div class="omenly-controls-title">' + escapeHTML(data.title || 'Controls') + '</div>'
      + '    <button type="button" class="omenly-controls-close" aria-label="Close controls">x</button>'
      + '  </div>'
      + '  <div class="omenly-controls-tabs" role="tablist">'
      + '    <button type="button" class="omenly-controls-tab on" data-omenly-controls-tab="keyboard">Keyboard</button>'
      + '    <button type="button" class="omenly-controls-tab" data-omenly-controls-tab="gamepad">Gamepad</button>'
      + '    <button type="button" class="omenly-controls-tab" data-omenly-controls-tab="mobile">Mobile</button>'
      + '  </div>'
      + '  <div class="omenly-controls-page on" data-omenly-controls-page="keyboard">' + makeList(data.keyboard) + '</div>'
      + '  <div class="omenly-controls-page" data-omenly-controls-page="gamepad">' + makeList(data.gamepad) + '</div>'
      + '  <div class="omenly-controls-page" data-omenly-controls-page="mobile">' + makeList(data.mobile) + '</div>'
      + '</div>';

    controlsPanel.querySelector('.omenly-controls-close').addEventListener('click', closeControls);
    controlsPanel.addEventListener('click', e => { if (e.target === controlsPanel) closeControls(); });
    controlsPanel.querySelectorAll('[data-omenly-controls-tab]').forEach(btn => {
      btn.addEventListener('click', () => setControlsTab(btn.getAttribute('data-omenly-controls-tab')));
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && controlsOpen) closeControls();
    });
    document.body.append(controlsButton, controlsPanel);
    reflectControlsButton();
  }

  function setControlsTab(name) {
    if (!controlsPanel) return;
    controlsPanel.querySelectorAll('[data-omenly-controls-tab]').forEach(btn => {
      btn.classList.toggle('on', btn.getAttribute('data-omenly-controls-tab') === name);
    });
    controlsPanel.querySelectorAll('[data-omenly-controls-page]').forEach(page => {
      page.classList.toggle('on', page.getAttribute('data-omenly-controls-page') === name);
    });
  }

  function toggleControls() {
    if (controlsOpen) closeControls();
    else openControls();
  }

  function openControls() {
    if (!controlsPanel) return;
    controlsOpen = true;
    controlsPanel.classList.add('on');
    const first = controlsPanel.querySelector('.omenly-controls-tab.on') || controlsPanel.querySelector('button');
    if (first) first.focus();
  }

  function closeControls() {
    if (!controlsPanel) return;
    controlsOpen = false;
    controlsPanel.classList.remove('on');
    if (controlsButton && visible(controlsButton)) controlsButton.focus();
  }

  function reflectControlsButton() {
    if (!controlsButton) return;
    const shouldShow = gameplayLikelyVisible();
    if (shouldShow !== lastPlayVisible) {
      lastPlayVisible = shouldShow;
      controlsButton.classList.toggle('is-hidden', !shouldShow);
      if (!shouldShow && controlsOpen) closeControls();
    }
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function autoFrame() {
    frameId++;
    poll();
    handleDomNavigation();
    if (controlsReady) reflectControlsButton();
    requestAnimationFrame(autoFrame);
  }

  window.addEventListener('gamepadconnected', (e) => {
    connected = true;
    showToast(e.gamepad && e.gamepad.id ? e.gamepad.id : 'GAMEPAD CONNECTED');
    setTimeout(() => {
      if (pageIsHub()) {
        const first = document.querySelector('[data-omenly-tile], .tile, button, a[href]');
        if (first && visible(first)) first.focus();
      }
    }, 120);
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

  window.OmenlyControls = {
    open: openControls,
    close: closeControls,
    toggle: toggleControls,
    setTab: setControlsTab
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureControls);
  } else {
    ensureControls();
  }
  requestAnimationFrame(autoFrame);
})();
