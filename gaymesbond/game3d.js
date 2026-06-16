(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const mini = $('minimap');
  const miniCtx = mini.getContext('2d');
  const hud = $('hud');
  const rightHud = $('rightHud');
  const title = $('title');
  const briefing = $('briefing');
  const gameover = $('gameover');
  const complete = $('complete');
  const interact = $('interact');
  const toastEl = $('toast');
  const minimapWrap = $('minimapWrap');
  const lockHint = $('lockHint');
  const lookPad = $('lookPad');
  const lookKnob = $('lookKnob');
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  const legacySource = $('legacy2d-source')?.textContent || '';
  const rawMissions = parseMissions(legacySource);
  if (!rawMissions.length) {
    title.classList.remove('hidden');
    $('missionPreview').innerHTML = '<div><strong>01 - LOAD ERROR</strong><small>Could not read the mission campaign.</small></div>';
    throw new Error('Gaymes Bond missions could not be parsed.');
  }

  const SCALE = 0.02;
  const MISSIONS = rawMissions.map(scaleMission);
  const COMMS = [
    'HQ: The tuxedo is still a valid tactical asset.',
    'HQ: Try to look less like a secret and more like a rumor.',
    'Villain PA: Sir, the spy is again being dramatic in the hallway.',
    'HQ: If caught, deny everything except the hat.',
    'Bond: I came for intelligence and stayed for the terrible lighting.',
    'HQ: Your cufflinks are not supposed to be emotionally supportive.'
  ];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060814);
  scene.fog = new THREE.Fog(0x060814, 8, 70);
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(0, 3, 5);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x182030, 1.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b0, 1.5);
  sun.position.set(10, 18, 8);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x7db7ff, 0.55);
  fill.position.set(-8, 8, -10);
  scene.add(fill);

  const worldRoot = new THREE.Group();
  scene.add(worldRoot);
  const fxRoot = new THREE.Group();
  scene.add(fxRoot);

  const state = {
    mode: 'menu',
    missionIndex: 0,
    mission: null,
    score: 0,
    alert: 0,
    time: 0,
    mapSeen: false,
    near: null,
    world: null,
    worldBounds: { w: 1, h: 1 },
    walls: [],
    objectives: [],
    guards: [],
    cameras: [],
    lasers: [],
    decoys: [],
    smoke: [],
    sparkles: [],
    messageT: 0,
    lastComms: ''
  };

  const player = {
    x: 0,
    z: 0,
    yaw: 0,
    radius: 15 * SCALE,
    crouch: false,
    smokeTimer: 0,
    charmCd: 0,
    darts: 4,
    decoys: 3,
    smoke: 2,
    charms: 2,
    mesh: null
  };

  const input = {
    up: false, down: false, left: false, right: false, shift: false,
    stickX: 0, stickY: 0,
    lookDX: 0, lookDY: 0,
    moveTouchId: null, lookTouchId: null
  };
  const keys = Object.create(null);
  let last = performance.now();
  let toastTimer = 0;
  let mouseLocked = false;
  let cameraYaw = 0;
  let cameraPitch = 0.18;

  previewMissions();
  bind();
  if (isTouch) setupTouch();
  requestAnimationFrame(loop);

  function parseMissions(src) {
    const startToken = 'const MISSIONS =';
    const start = src.indexOf(startToken);
    if (start < 0) return [];
    const arrStart = src.indexOf('[', start);
    if (arrStart < 0) return [];
    let depth = 0;
    let inStr = false;
    let str = '';
    let esc = false;
    for (let i = arrStart; i < src.length; i++) {
      const ch = src[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === str) inStr = false;
        continue;
      }
      if (ch === '"' || ch === '\'' || ch === '`') { inStr = true; str = ch; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          const literal = src.slice(arrStart, i + 1);
          try { return Function('"use strict"; return (' + literal + ');')(); } catch (_) { return []; }
        }
      }
    }
    return [];
  }

  function scaleMission(m) {
    return {
      name: m.name,
      place: m.place,
      palette: m.palette.slice(),
      brief: m.brief,
      ops: m.ops.slice(),
      w: m.w * SCALE,
      h: m.h * SCALE,
      start: [m.start[0] * SCALE, m.start[1] * SCALE],
      exit: [m.exit[0] * SCALE, m.exit[1] * SCALE, m.exit[2] * SCALE, m.exit[3] * SCALE],
      objectives: m.objectives.map(o => [o[0] * SCALE, o[1] * SCALE, o[2], o[3]]),
      guards: m.guards.map(route => route.map(p => [p[0] * SCALE, p[1] * SCALE])),
      cameras: m.cameras.map(c => [c[0] * SCALE, c[1] * SCALE, Math.PI / 2 - c[2]]),
      lasers: m.lasers.map(l => [l[0] * SCALE, l[1] * SCALE, l[2] * SCALE, l[3] * SCALE]),
      walls: m.walls.map(r => [r[0] * SCALE, r[1] * SCALE, r[2] * SCALE, r[3] * SCALE])
    };
  }

  function previewMissions() {
    $('missionPreview').innerHTML = MISSIONS.map((m, i) =>
      `<div><strong>${String(i + 1).padStart(2, '0')} - ${escapeHTML(m.name)}</strong><small>${escapeHTML(m.place)}<br>${escapeHTML(m.brief)}</small></div>`
    ).join('');
  }

  function bind() {
    $('startBtn').addEventListener('click', () => showBriefing(0));
    $('skipBtn').addEventListener('click', () => showBriefing(Math.min(state.missionIndex, MISSIONS.length - 1)));
    $('briefStart').addEventListener('click', () => startMission(state.missionIndex));
    $('briefBack').addEventListener('click', showMenu);
    $('retryBtn').addEventListener('click', () => startMission(state.missionIndex));
    $('menuBtn').addEventListener('click', showMenu);
    $('menuBtn2').addEventListener('click', showMenu);
    $('nextBtn').addEventListener('click', () => {
      complete.classList.add('hidden');
      if (state.missionIndex + 1 >= MISSIONS.length) {
        showMenu();
        toast('Campaign complete. Baron Beige has been tastefully detained.');
      } else {
        showBriefing(state.missionIndex + 1);
      }
    });
    window.addEventListener('resize', resize);
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    document.addEventListener('pointerlockchange', () => {
      mouseLocked = document.pointerLockElement === canvas;
      lockHint.classList.toggle('hidden', mouseLocked || isTouch || state.mode !== 'play');
    });
    canvas.addEventListener('click', () => {
      if (state.mode !== 'play' || isTouch) return;
      if (!mouseLocked) canvas.requestPointerLock?.();
    });
    canvas.addEventListener('mousemove', e => {
      if (!mouseLocked || state.mode !== 'play') return;
      input.lookDX += e.movementX || 0;
      input.lookDY += e.movementY || 0;
    });
    canvas.addEventListener('mousedown', e => {
      if (state.mode !== 'play') return;
      if (!mouseLocked && !isTouch) { canvas.requestPointerLock?.(); return; }
      if (e.button === 0) fireDart();
      if (e.button === 2) throwDecoy();
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (state.mode !== 'play') return;
      if (k === 'e') interactAction();
      if (k === 'f') fireDart();
      if (k === 'q') throwDecoy();
      if (k === ' ') smokeBomb();
      if (k === 'c') charmPulse();
      if (k === 'm') toggleMap();
    });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    $('tbAct').addEventListener('pointerdown', e => { e.preventDefault(); interactAction(); });
    $('tbDart').addEventListener('pointerdown', e => { e.preventDefault(); fireDart(); });
    $('tbDecoy').addEventListener('pointerdown', e => { e.preventDefault(); throwDecoy(); });
    $('tbSmoke').addEventListener('pointerdown', e => { e.preventDefault(); smokeBomb(); });
    $('tbCharm').addEventListener('pointerdown', e => { e.preventDefault(); charmPulse(); });
    $('tbCrouch').addEventListener('pointerdown', e => {
      e.preventDefault();
      player.crouch = !player.crouch;
      $('tbCrouch').classList.toggle('on', player.crouch);
    });
    setInterval(readKeys, 16);
    setInterval(() => {
      if (state.mode === 'play' && Math.random() < 0.45) setComms(COMMS[Math.floor(Math.random() * COMMS.length)]);
    }, 8500);
  }

  function setupTouch() {
    const stick = $('stick');
    const knob = $('knob');
    let moveId = null;
    let lookId = null;
    let lastLookX = 0;
    let lastLookY = 0;
    const max = 46;

    function setStick(dx, dy) {
      const len = Math.hypot(dx, dy);
      const cap = len > max ? max / len : 1;
      const sx = dx * cap;
      const sy = dy * cap;
      input.stickX = sx / max;
      input.stickY = sy / max;
      knob.style.transform = `translate(${sx}px, ${sy}px)`;
    }

    function resetStick(id) {
      if (moveId !== id) return;
      moveId = null;
      input.stickX = 0;
      input.stickY = 0;
      knob.style.transform = '';
    }

    stick.addEventListener('pointerdown', e => {
      moveId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      const r = stick.getBoundingClientRect();
      setStick(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    });
    stick.addEventListener('pointermove', e => {
      if (moveId !== e.pointerId) return;
      const r = stick.getBoundingClientRect();
      setStick(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    });
    stick.addEventListener('pointerup', e => { resetStick(e.pointerId); });
    stick.addEventListener('pointercancel', e => { resetStick(e.pointerId); });

    lookPad.addEventListener('pointerdown', e => {
      lookId = e.pointerId;
      lastLookX = e.clientX;
      lastLookY = e.clientY;
      lookPad.setPointerCapture(e.pointerId);
    });
    lookPad.addEventListener('pointermove', e => {
      if (lookId !== e.pointerId) return;
      const dx = e.clientX - lastLookX;
      const dy = e.clientY - lastLookY;
      lastLookX = e.clientX;
      lastLookY = e.clientY;
      input.lookDX += dx;
      input.lookDY += dy;
      const r = lookPad.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const ox = clamp(e.clientX - cx, -38, 38);
      const oy = clamp(e.clientY - cy, -38, 38);
      lookKnob.style.transform = `translate(${ox}px, ${oy}px)`;
    });
    lookPad.addEventListener('pointerup', e => {
      if (lookId !== e.pointerId) return;
      lookId = null;
      lookKnob.style.transform = '';
    });
    lookPad.addEventListener('pointercancel', e => {
      if (lookId !== e.pointerId) return;
      lookId = null;
      lookKnob.style.transform = '';
    });
  }

  function showMenu() {
    state.mode = 'menu';
    title.classList.remove('hidden');
    briefing.classList.add('hidden');
    gameover.classList.add('hidden');
    complete.classList.add('hidden');
    hud.classList.add('hidden');
    rightHud.classList.add('hidden');
    minimapWrap.classList.remove('on');
    lockHint.classList.add('hidden');
  }

  function showBriefing(i) {
    state.mode = 'briefing';
    state.missionIndex = clamp(i, 0, MISSIONS.length - 1);
    const m = MISSIONS[state.missionIndex];
    $('briefKicker').textContent = `MISSION ${state.missionIndex + 1} OF ${MISSIONS.length} - ${m.place}`;
    $('briefTitle').textContent = m.name;
    $('briefText').textContent = m.brief;
    $('briefList').innerHTML = m.ops.map(op => `<div>${escapeHTML(op)}</div>`).join('');
    title.classList.add('hidden');
    gameover.classList.add('hidden');
    complete.classList.add('hidden');
    briefing.classList.remove('hidden');
    hud.classList.add('hidden');
    rightHud.classList.add('hidden');
    lockHint.classList.add('hidden');
  }

  function startMission(i) {
    state.missionIndex = clamp(i, 0, MISSIONS.length - 1);
    state.mission = MISSIONS[state.missionIndex];
    state.mode = 'play';
    state.time = 0;
    state.alert = 0;
    state.near = null;
    state.mapSeen = false;
    state.decoys = [];
    state.smoke = [];
    state.sparkles = [];
    state.walls = [];
    state.objectives = [];
    state.guards = [];
    state.cameras = [];
    state.lasers = [];
    state.worldBounds = { w: state.mission.w, h: state.mission.h };
    player.x = state.mission.start[0];
    player.z = state.mission.start[1];
    player.yaw = 0;
    player.crouch = false;
    player.smokeTimer = 0;
    player.charmCd = 0;
    player.darts = 4 + Math.floor(i / 3);
    player.decoys = 3 + Math.floor(i / 4);
    player.smoke = 2 + Math.floor(i / 5);
    player.charms = 2 + Math.floor(i / 4);
    title.classList.add('hidden');
    briefing.classList.add('hidden');
    gameover.classList.add('hidden');
    complete.classList.add('hidden');
    hud.classList.remove('hidden');
    rightHud.classList.remove('hidden');
    lockHint.classList.toggle('hidden', mouseLocked || isTouch);
    minimapWrap.classList.remove('on');
    clearWorld();
    buildWorld();
    setComms(`HQ: ${state.mission.brief}`);
    toast('Infiltration started. Try subtle. We rehearsed subtle.');
  }

  function buildWorld() {
    const m = state.mission;
    const bg = new THREE.Color(m.palette[0]);
    scene.background = bg;
    scene.fog.color.copy(bg);
    scene.fog.near = 8;
    scene.fog.far = Math.max(55, Math.max(m.w, m.h) * 1.1);
    hemi.color.copy(new THREE.Color(m.palette[2]));
    hemi.groundColor.copy(new THREE.Color(m.palette[0]));
    sun.color.copy(new THREE.Color(m.palette[2]));
    fill.color.copy(new THREE.Color(m.palette[1]));

    const world = new THREE.Group();
    worldRoot.add(world);
    state.world = world;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(m.w, m.h, 1, 1),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(m.palette[1]).multiplyScalar(0.32), roughness: 1, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(m.w / 2, 0, m.h / 2);
    world.add(floor);

    const grid = new THREE.GridHelper(Math.max(m.w, m.h), Math.ceil(Math.max(m.w, m.h) / 2), 0x223048, 0x111824);
    grid.position.set(m.w / 2, 0.02, m.h / 2);
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    world.add(grid);

    state.walls = m.walls.map((r, idx) => {
      const wall = {
        x: r[0], z: r[1], w: r[2], h: r[3],
        mesh: new THREE.Mesh(
          new THREE.BoxGeometry(r[2], 2.6, r[3]),
          new THREE.MeshStandardMaterial({ color: idx % 2 ? 0x171b27 : 0x20283a, roughness: 0.95, metalness: 0.02, transparent: true, opacity: 0.98 })
        )
      };
      wall.mesh.position.set(r[0] + r[2] / 2, 1.3, r[1] + r[3] / 2);
      world.add(wall.mesh);
      return wall;
    });
    addMissionProps(world, m);

    const exit = m.exit;
    state.exit = {
      x: exit[0],
      z: exit[1],
      w: exit[2],
      h: exit[3],
      mesh: makeExit(exit[2], exit[3], m.palette[2])
    };
    state.exit.mesh.position.set(exit[0] + exit[2] / 2, 0.05, exit[1] + exit[3] / 2);
    world.add(state.exit.mesh);

    state.objectives = m.objectives.map((o, idx) => {
      const obj = {
        x: o[0], z: o[1], label: o[2], text: o[3], done: false,
        mesh: makeObjective(idx, m.palette[idx % m.palette.length])
      };
      obj.mesh.position.set(o[0], 0.35, o[1]);
      world.add(obj.mesh);
      return obj;
    });

    state.guards = m.guards.map((route, idx) => {
      const g = makeGuard(route, idx);
      world.add(g.mesh);
      world.add(g.vision);
      return g;
    });

    state.cameras = m.cameras.map((c, idx) => {
      const cam = makeCameraNode(c[0], c[1], c[2], idx, m.palette);
      world.add(cam.mesh);
      world.add(cam.vision);
      return cam;
    });

    state.lasers = m.lasers.map((l, idx) => {
      const laser = makeLaser(l[0], l[1], l[2], l[3], idx, m.palette);
      world.add(laser.mesh);
      return laser;
    });

    player.mesh = makePlayer(m.palette);
    world.add(player.mesh);
    cameraYaw = 0;
    updateWorldTransforms();
    snapCamera();
  }

  function addMissionProps(world, mission) {
    const accent = new THREE.Color(mission.palette[2]).getHex();
    const dark = new THREE.Color(mission.palette[0]).multiplyScalar(0.7).getHex();
    const mid = new THREE.Color(mission.palette[1]).multiplyScalar(0.65).getHex();
    const propMat = new THREE.MeshStandardMaterial({ color: dark, roughness: 0.82, metalness: 0.08 });
    const trimMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.18, roughness: 0.38, metalness: 0.16 });
    const carpetMat = new THREE.MeshStandardMaterial({ color: mid, roughness: 1, metalness: 0 });

    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(mission.w * 0.72, Math.min(2.2, mission.h * 0.22)), carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(mission.w * 0.5, 0.035, mission.h * 0.5);
    world.add(carpet);

    const count = 9 + Math.min(9, mission.objectives.length + mission.guards.length);
    for (let i = 0; i < count; i++) {
      const x = 1.5 + ((i * 4.7) % Math.max(2, mission.w - 3));
      const z = 1.5 + ((i * 3.1 + mission.place.length * 0.2) % Math.max(2, mission.h - 3));
      if (!isFreeSpot(x, z, 0.45)) continue;
      const table = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.09, 0.42), propMat);
      top.position.y = 0.48;
      table.add(top);
      for (const sx of [-0.25, 0.25]) for (const sz of [-0.14, 0.14]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), propMat);
        leg.position.set(sx, 0.24, sz);
        table.add(leg);
      }
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 10), trimMat);
      lamp.position.set(0.16, 0.63, 0.02);
      table.add(lamp);
      table.position.set(x, 0, z);
      table.rotation.y = (i % 4) * Math.PI / 2 + 0.2;
      world.add(table);
    }

    for (let i = 0; i < 6; i++) {
      const x = mission.w * (0.18 + i * 0.12);
      const z = i % 2 ? mission.h * 0.2 : mission.h * 0.8;
      if (!isFreeSpot(x, z, 0.6)) continue;
      const statue = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.2, 12), propMat);
      base.position.y = 0.1;
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), trimMat);
      body.position.y = 0.65;
      statue.add(base, body);
      statue.position.set(x, 0, z);
      world.add(statue);
    }
  }

  function isFreeSpot(x, z, r) {
    for (const w of state.walls) if (circleRect(x, z, r, w)) return false;
    return true;
  }

  function makePlayer(palette) {
    const g = new THREE.Group();
    const black = new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.92, metalness: 0.05 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xf3f4f7, roughness: 1 });
    const tie = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette[2]), emissive: new THREE.Color(palette[2]), emissiveIntensity: 0.22 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd9b08c, roughness: 0.94 });
    const coat = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette[0]).multiplyScalar(0.45), roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.74, 0.28), black);
    torso.position.y = 1.12;
    const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), coat);
    jacket.position.y = 1.08;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), skin);
    head.position.y = 1.72;
    const shirtBox = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.32, 0.08), shirt);
    shirtBox.position.set(0, 1.18, 0.17);
    const tieBox = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.04), tie);
    tieBox.position.set(0.02, 1.06, 0.19);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.16), black);
    const legR = legL.clone();
    legL.position.set(-0.11, 0.34, 0);
    legR.position.set(0.11, 0.34, 0);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2a3143, roughness: 0.96 });
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), armMat);
    const armR = armL.clone();
    armL.position.set(-0.31, 1.08, 0);
    armR.position.set(0.31, 1.08, 0.02);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), tie);
    cuff.position.set(0.37, 0.92, 0.03);
    g.add(jacket, torso, head, shirtBox, tieBox, legL, legR, armL, armR, cuff);
    g.position.y = 0;
    return g;
  }

  function makeGuard(route, idx) {
    const p = route[0];
    const q = route[1] || route[0];
    const guard = {
      x: p[0], z: p[1], route: route.map(v => ({ x: v[0], z: v[1] })),
      idx: route.length > 1 ? 1 : 0,
      angle: Math.atan2(q[0] - p[0], q[1] - p[1]),
      speed: (64 + (idx % 3) * 9) * SCALE,
      state: 'patrol',
      stun: 0,
      investigate: null,
      talk: 0,
      name: ['NIGEL', 'PIP', 'BRUNO', 'CLIVE', 'MARTA', 'SLOANE', 'VAL', 'OTTO'][idx % 8],
      cone: (300 + (idx % 2) * 25) * SCALE,
      fov: 0.72,
      mesh: makeNpc(0x20242e, 0xffd166, 0xff4d6d),
      vision: makeVisionCone((300 + (idx % 2) * 25) * SCALE, 0.72, 0xffd166, 0.16)
    };
    return guard;
  }

  function makeCameraNode(x, z, base, idx, palette) {
    const color = idx % 2 ? 0xff4d6d : 0x7fffd4;
    return {
      x, z, base, angle: base, sweep: 0.72 + (idx % 2) * 0.22, phase: idx * 1.7,
      range: (260 + (idx % 3) * 30) * SCALE, fov: 0.58, disabled: 0,
      mesh: makeCamera(color),
      vision: makeVisionCone((260 + (idx % 3) * 30) * SCALE, 0.58, color, 0.12)
    };
  }

  function makeLaser(x1, z1, x2, z2, idx, palette) {
    const color = idx % 2 ? 0xff4d6d : new THREE.Color(palette[2]).getHex();
    const len = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(x2 - x1, z2 - z1);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.05, 0.06),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.1 })
    );
    mesh.position.set((x1 + x2) / 2, 0.55, (z1 + z2) / 2);
    mesh.rotation.y = angle - Math.PI / 2;
    return { x1, z1, x2, z2, off: false, pulse: idx * 0.8, mesh };
  }

  function makeNpc(body, tie, glow) {
    const g = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: body, roughness: 0.92, metalness: 0.02 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd0ad8a, roughness: 0.96 });
    const accent = new THREE.MeshStandardMaterial({ color: tie, emissive: glow, emissiveIntensity: 0.24, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.24), suit);
    torso.position.y = 1.1;
    const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.76, 0.28), new THREE.MeshStandardMaterial({ color: 0x131722, roughness: 0.88 }));
    jacket.position.y = 1.07;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), skin);
    head.position.y = 1.68;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.14), suit);
    const leg2 = leg.clone();
    leg.position.set(-0.1, 0.32, 0);
    leg2.position.set(0.1, 0.32, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.1), suit);
    const arm2 = arm.clone();
    arm.position.set(-0.28, 1.04, 0);
    arm2.position.set(0.28, 1.04, 0.01);
    const tieBox = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.04), accent);
    tieBox.position.set(0.02, 1.02, 0.16);
    g.add(jacket, torso, head, leg, leg2, arm, arm2, tieBox);
    return g;
  }

  function makeCamera(color) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.22), new THREE.MeshStandardMaterial({ color: 0x222734, roughness: 0.8 }));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.12, 10), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.2 }));
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.13;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.18), new THREE.MeshStandardMaterial({ color: 0x151a24, roughness: 0.9 }));
    arm.position.z = -0.08;
    g.add(base, lens, arm);
    return g;
  }

  function makeVisionCone(range, fov, color, opacity) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, range, -fov, fov, false);
    shape.lineTo(0, 0);
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.02;
    return mesh;
  }

  function makeObjective(idx, accent) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16, 0),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.2 })
    );
    core.position.y = 0.16;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.04, 10, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8eef7, emissive: accent, emissiveIntensity: 0.2, roughness: 0.45 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    g.add(core, ring);
    g.userData.core = core;
    g.userData.ring = ring;
    return g;
  }

  function makeExit(w, h, accent) {
    const g = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.max(w, h) * 0.42, Math.max(w, h) * 0.42, 0.06, 20, 1),
      new THREE.MeshStandardMaterial({ color: 0x0f121a, emissive: accent, emissiveIntensity: 0.14, roughness: 0.95 })
    );
    pad.position.y = 0.03;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(w, h) * 0.48, 0.03, 8, 18),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6, roughness: 0.2 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    g.add(pad, ring);
    return g;
  }

  function clearWorld() {
    while (worldRoot.children.length) disposeObject(worldRoot.children[0]);
    while (fxRoot.children.length) disposeObject(fxRoot.children[0]);
    state.world = null;
  }

  function disposeObject(obj) {
    obj.traverse?.(node => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
        else node.material.dispose();
      }
    });
    obj.parent?.remove(obj);
  }

  function update(dt) {
    if (state.mode !== 'play' || !state.mission) return;
    state.time += dt;
    if (toastTimer > 0) toastTimer -= dt; else toastEl.classList.remove('on');
    player.smokeTimer = Math.max(0, player.smokeTimer - dt);
    player.charmCd = Math.max(0, player.charmCd - dt);
    if (input.lookDX || input.lookDY) {
      cameraYaw += input.lookDX * 0.0027;
      cameraPitch = clamp(cameraPitch + input.lookDY * 0.0012, -0.14, 0.42);
      input.lookDX = 0;
      input.lookDY = 0;
    }

    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.stickX;
    const forward = (input.up ? 1 : 0) - (input.down ? 1 : 0) - input.stickY;
    const moveLen = Math.hypot(strafe, forward);
    const crouch = input.shift || player.crouch;
    const speed = (crouch ? 1.9 : 3.15) * (player.smokeTimer > 0 ? 1.08 : 1);
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    if (moveLen > 0.05) {
      const nx = (strafe / moveLen) * speed * dt;
      const nz = (forward / moveLen) * speed * dt;
      const dx = nx * cos + nz * sin;
      const dz = nz * cos - nx * sin;
      moveCircle(player, dx, dz);
      const desired = Math.atan2(dx, dz);
      player.yaw = lerpAngle(player.yaw, desired, 0.18);
      if (!crouch) noiseAt(player.x, player.z, 3.2, 0.18);
    } else {
      player.yaw = lerpAngle(player.yaw, cameraYaw, 0.06);
    }
    updateGuards(dt);
    updateCameras(dt);
    updateLasers(dt);
    updateEffects(dt);
    updateNear();
    updateAlert(dt);
    updateCamera(dt);
    updateHud();
    updateWorldTransforms();
  }

  function readKeys() {
    input.up = !!(keys.w || keys.arrowup);
    input.down = !!(keys.s || keys.arrowdown);
    input.left = !!(keys.a || keys.arrowleft);
    input.right = !!(keys.d || keys.arrowright);
    input.shift = !!keys.shift;
  }

  function updateWorldTransforms() {
    if (!player.mesh) return;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.yaw;
    player.mesh.scale.y = player.crouch ? 0.82 : 1;
    for (const g of state.guards) {
      g.mesh.position.set(g.x, 0, g.z);
      g.mesh.rotation.y = g.angle;
      g.vision.position.set(g.x, 0.025, g.z);
      g.vision.rotation.y = g.angle - Math.PI / 2;
      g.vision.visible = g.stun <= 0;
      g.vision.material.opacity = g.state === 'alert' ? 0.22 : 0.12;
      if (g.stun > 0) {
        g.mesh.rotation.z = -0.55;
        g.mesh.position.y = 0;
      } else {
        g.mesh.rotation.z = 0;
      }
    }
    for (const c of state.cameras) {
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.angle - Math.PI / 2;
      c.vision.position.set(c.x, 0.02, c.z);
      c.vision.rotation.y = c.angle - Math.PI / 2;
      c.vision.material.opacity = c.disabled > 0 ? 0.06 : 0.14;
    }
    for (const l of state.lasers) {
      l.mesh.visible = !l.off;
      l.mesh.material.opacity = l.off ? 0.15 : 1;
      l.mesh.scale.y = 1 + Math.sin(l.pulse * 8) * 0.03;
    }
    for (const o of state.objectives) {
      o.mesh.visible = !o.done;
      o.mesh.rotation.y += 0.03;
      o.mesh.position.y = 0.35 + Math.sin(state.time * 2 + o.x * 0.4) * 0.05;
    }
    if (state.exit?.mesh) state.exit.mesh.rotation.y += 0.01;
  }

  function updateGuards(dt) {
    for (const g of state.guards) {
      g.talk = Math.max(0, g.talk - dt);
      if (g.stun > 0) {
        g.stun -= dt;
        continue;
      }
      if (g.state === 'investigate' && g.investigate) {
        moveNpc(g, g.investigate.x, g.investigate.z, dt, 1.18);
        if (dist(g.x, g.z, g.investigate.x, g.investigate.z) < 0.25) {
          g.state = 'patrol';
          g.investigate = null;
          guardQuip(g, 'Where is the tiny disco sound coming from?');
        }
      } else if (g.state === 'alert') {
        moveNpc(g, player.x, player.z, dt, 1.35);
      } else {
        const target = g.route[g.idx];
        moveNpc(g, target.x, target.z, dt, 1.0);
        if (dist(g.x, g.z, target.x, target.z) < 0.24) g.idx = (g.idx + 1) % g.route.length;
      }
      if (canSeePlayer(g.x, g.z, g.angle, g.cone, g.fov)) {
        g.state = 'alert';
        state.alert += (player.smokeTimer > 0 ? 10 : 30) * dt;
        if (g.talk <= 0) guardQuip(g, ['Intruder in formalwear!', 'That tuxedo is moving suspiciously!', 'Stop, charismatic trespasser!'][Math.floor(Math.random() * 3)]);
      } else if (g.state === 'alert' && dist(g.x, g.z, player.x, player.z) > g.cone * 1.4) {
        g.state = 'patrol';
      }
    }
  }

  function moveNpc(g, tx, tz, dt, mul) {
    const dx = tx - g.x;
    const dz = tz - g.z;
    const len = Math.hypot(dx, dz) || 1;
    g.angle = Math.atan2(dx, dz);
    moveCircle(g, dx / len * g.speed * mul * dt, dz / len * g.speed * mul * dt);
  }

  function canSeePlayer(x, z, angle, range, fov) {
    if (player.smokeTimer > 0) return false;
    const dx = player.x - x;
    const dz = player.z - z;
    const d = Math.hypot(dx, dz);
    if (d > range) return false;
    const a = Math.atan2(dx, dz);
    if (Math.abs(wrapAngle(a - angle)) > fov) return false;
    return los(x, z, player.x, player.z);
  }

  function updateCameras(dt) {
    for (const c of state.cameras) {
      c.disabled = Math.max(0, c.disabled - dt);
      c.phase += dt;
      c.angle = c.base + Math.sin(c.phase * 0.75) * c.sweep;
      if (c.disabled <= 0 && canSeePlayer(c.x, c.z, c.angle, c.range, c.fov)) {
        state.alert += 38 * dt;
        if (state.time % 1 < dt) setComms('SECURITY CAMERA: Fabulous movement detected. Very suspicious.');
      }
    }
  }

  function updateLasers(dt) {
    for (const l of state.lasers) {
      l.pulse += dt;
      if (!l.off && segDist(player.x, player.z, l.x1, l.z1, l.x2, l.z2) < player.radius + 0.05 && player.smokeTimer <= 0) {
        state.alert += 60 * dt;
        if (state.time % 1 < dt) toast('Laser trip. The building is judging you.');
      }
    }
  }

  function updateEffects(dt) {
    for (let i = state.decoys.length - 1; i >= 0; i--) {
      const d = state.decoys[i];
      d.t -= dt;
      d.pulse += dt;
      noiseAt(d.x, d.z, 6.2, 0.7 * dt);
      if (d.mesh) {
        d.mesh.position.set(d.x, 0.12, d.z);
        d.mesh.scale.setScalar(0.8 + Math.sin(d.pulse * 8) * 0.15);
      }
      if (d.t <= 0) {
        d.mesh?.parent?.remove(d.mesh);
        state.decoys.splice(i, 1);
      }
    }
    for (let i = state.smoke.length - 1; i >= 0; i--) {
      const s = state.smoke[i];
      s.t -= dt;
      s.r = Math.min(6, s.r + dt * 1.8);
      if (s.mesh) {
        s.mesh.position.set(s.x, 0.45, s.z);
        s.mesh.scale.setScalar(s.r * 0.42);
        s.mesh.material.opacity = 0.12 + Math.min(0.18, s.t * 0.03);
      }
      if (s.t <= 0) {
        s.mesh?.parent?.remove(s.mesh);
        state.smoke.splice(i, 1);
      }
    }
    for (let i = state.sparkles.length - 1; i >= 0; i--) {
      const p = state.sparkles[i];
      p.t -= dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      if (p.mesh) {
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.material.opacity = clamp(p.t * 2, 0, 1);
      }
      if (p.t <= 0) {
        p.mesh?.parent?.remove(p.mesh);
        state.sparkles.splice(i, 1);
      }
    }
  }

  function updateNear() {
    state.near = null;
    let best = 999;
    for (const o of state.objectives) {
      if (o.done) continue;
      const d = dist(player.x, player.z, o.x, o.z);
      if (d < best && d < 1.45) { best = d; state.near = { type: 'objective', obj: o, text: `E: ${o.label}` }; }
    }
    for (const c of state.cameras) {
      const d = dist(player.x, player.z, c.x, c.z);
      if (c.disabled <= 0 && d < best && d < 1.6) { best = d; state.near = { type: 'camera', obj: c, text: 'E: hack camera grid' }; }
    }
    for (const l of state.lasers) {
      const d = segDist(player.x, player.z, l.x1, l.z1, l.x2, l.z2);
      if (!l.off && d < best && d < 0.65) { best = d; state.near = { type: 'laser', obj: l, text: 'E: disable laser' }; }
    }
    for (const g of state.guards) {
      if (g.stun > 0) continue;
      const d = dist(player.x, player.z, g.x, g.z);
      const behind = Math.abs(wrapAngle(Math.atan2(player.x - g.x, player.z - g.z) - g.angle)) > 2.25;
      if (d < best && d < 1.0 && behind) { best = d; state.near = { type: 'takedown', obj: g, text: 'E: velvet takedown' }; }
    }
    if (allObjectivesDone() && state.exit && rectContains(state.exit, player.x, player.z)) {
      state.near = { type: 'exit', obj: state.exit, text: 'E: escape' };
    }
    if (state.near) {
      interact.textContent = state.near.text;
      interact.classList.add('on');
    } else {
      interact.classList.remove('on');
    }
  }

  function updateAlert(dt) {
    const decay = player.crouch || player.smokeTimer > 0 ? 15 : 7;
    state.alert = clamp(state.alert - decay * dt, 0, 100);
    if (state.alert >= 100) failMission('The whole base saw you. On the bright side, the outfit got excellent reviews.');
  }

  function updateCamera(dt) {
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    const back = 3.9;
    const shoulder = 0.72;
    const height = 2.05 + cameraPitch;
    const targetX = player.x - sin * back + cos * shoulder;
    const targetY = height;
    const targetZ = player.z - cos * back - sin * shoulder;
    const t = 1 - Math.pow(0.0008, dt);
    camera.position.x += (targetX - camera.position.x) * t;
    camera.position.y += (targetY - camera.position.y) * t;
    camera.position.z += (targetZ - camera.position.z) * t;
    camera.lookAt(player.x + Math.sin(cameraYaw) * 5, 1.35 - cameraPitch * 1.4, player.z + Math.cos(cameraYaw) * 5);
  }

  function snapCamera() {
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    camera.position.set(player.x - sin * 3.9 + cos * 0.72, 2.05 + cameraPitch, player.z - cos * 3.9 - sin * 0.72);
    camera.lookAt(player.x + Math.sin(cameraYaw) * 5, 1.35 - cameraPitch * 1.4, player.z + Math.cos(cameraYaw) * 5);
  }

  function updateHud() {
    $('missionName').textContent = `${state.missionIndex + 1}/${MISSIONS.length} ${state.mission.name}`;
    $('hudStats').innerHTML = `DARTS <b>${player.darts}</b>  DECOYS <b>${player.decoys}</b>  SMOKE <b>${player.smoke}</b>  CHARM <b>${player.charms}</b><br>STYLE <b>${Math.floor(state.score)}</b>  ALERT <b>${Math.floor(state.alert)}%</b>  ${player.crouch ? '<b>CROUCH</b>' : 'WALK'}`;
    $('alertFill').style.width = state.alert + '%';
    $('objectives').innerHTML = state.objectives.map(o => `<div class="${o.done ? 'done' : ''}">${o.done ? 'DONE' : 'TODO'} - ${escapeHTML(o.label)}</div>`).join('') +
      `<div>${allObjectivesDone() ? 'ESCAPE AVAILABLE' : 'FINISH OBJECTIVES TO UNLOCK EXIT'}</div>`;
    if (state.mapSeen) drawMinimap();
  }

  function drawMinimap() {
    const m = state.mission;
    miniCtx.clearRect(0, 0, mini.width, mini.height);
    miniCtx.fillStyle = '#061014';
    miniCtx.fillRect(0, 0, mini.width, mini.height);
    const sx = mini.width / m.w;
    const sy = mini.height / m.h;
    miniCtx.fillStyle = 'rgba(248,238,247,0.18)';
    for (const w of state.walls) miniCtx.fillRect(w.x * sx, w.z * sy, w.w * sx, w.h * sy);
    miniCtx.fillStyle = '#ffd166';
    for (const o of state.objectives) if (!o.done) miniCtx.fillRect(o.x * sx - 2, o.z * sy - 2, 4, 4);
    miniCtx.fillStyle = '#ff4d6d';
    for (const g of state.guards) if (g.stun <= 0) miniCtx.fillRect(g.x * sx - 2, g.z * sy - 2, 4, 4);
    miniCtx.fillStyle = '#7fffd4';
    miniCtx.fillRect(player.x * sx - 3, player.z * sy - 3, 6, 6);
  }

  function interactAction() {
    if (state.mode !== 'play' || !state.near) return;
    const n = state.near;
    if (n.type === 'objective') {
      n.obj.done = true;
      state.score += 500;
      burst(n.obj.x, 0.35, n.obj.z, 18, 0xffd166);
      toast(n.obj.text);
      setComms(COMMS[Math.floor(Math.random() * COMMS.length)]);
      if (allObjectivesDone()) toast('All objectives complete. Exit unlocked.');
    } else if (n.type === 'camera') {
      for (const c of state.cameras) c.disabled = 9;
      state.score += 160;
      burst(n.obj.x, 0.35, n.obj.z, 14, 0x7fffd4);
      toast('Camera grid hacked. The walls promise not to look.');
    } else if (n.type === 'laser') {
      n.obj.off = true;
      state.score += 130;
      burst(player.x, 0.25, player.z, 14, 0x7fffd4);
      toast('Laser disabled with a cufflink and a raised eyebrow.');
    } else if (n.type === 'takedown') {
      n.obj.stun = 8.5;
      n.obj.state = 'stunned';
      state.score += 260;
      burst(n.obj.x, 0.25, n.obj.z, 16, 0xff5fa2);
      toast('Velvet takedown. Silent, moisturized, effective.');
    } else if (n.type === 'exit') {
      completeMission();
    }
  }

  function fireDart() {
    if (state.mode !== 'play') return;
    if (player.darts <= 0) { toast('No darts. Q says budget cuts.'); return; }
    player.darts--;
    const a = cameraYaw;
    let best = null;
    let bestD = 6.5;
    for (const g of state.guards) {
      if (g.stun > 0) continue;
      const dx = g.x - player.x;
      const dz = g.z - player.z;
      const d = Math.hypot(dx, dz);
      const da = Math.abs(wrapAngle(Math.atan2(dx, dz) - a));
      if (d < bestD && da < 0.18 && los(player.x, player.z, g.x, g.z)) { best = g; bestD = d; }
    }
    if (best) {
      best.stun = 12;
      best.state = 'stunned';
      state.score += 180;
      burst(best.x, 0.28, best.z, 14, 0x7fffd4);
      toast('Cufflink dart deployed. Nap time, darling.');
    } else {
      const tx = player.x + Math.sin(cameraYaw) * 6;
      const tz = player.z + Math.cos(cameraYaw) * 6;
      noiseAt(tx, tz, 4.6, 0.8);
      toast('Dart missed and hit something expensive.');
    }
  }

  function throwDecoy() {
    if (state.mode !== 'play') return;
    if (player.decoys <= 0) { toast('No decoys. The tiny disco balls are gone.'); return; }
    player.decoys--;
    const p = { x: clamp(player.x + Math.sin(cameraYaw) * 4.2, 0.2, state.worldBounds.w - 0.2), z: clamp(player.z + Math.cos(cameraYaw) * 4.2, 0.2, state.worldBounds.h - 0.2) };
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.5, roughness: 0.3 })
    );
    fxRoot.add(mesh);
    state.decoys.push({ x: p.x, z: p.z, t: 5.2, pulse: 0, mesh });
    burst(p.x, 0.18, p.z, 12, 0xffd166);
    toast('Glitter decoy thrown. Guards respect sparkle.');
    for (const g of state.guards) {
      if (dist(g.x, g.z, p.x, p.z) < 6.5) { g.state = 'investigate'; g.investigate = { x: p.x, z: p.z }; }
    }
  }

  function smokeBomb() {
    if (state.mode !== 'play') return;
    if (player.smoke <= 0) { toast('No smoke. Drama reserves depleted.'); return; }
    player.smoke--;
    player.smokeTimer = 5.5;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xdfe8ef, transparent: true, opacity: 0.18, roughness: 1 })
    );
    fxRoot.add(mesh);
    state.smoke.push({ x: player.x, z: player.z, r: 1, t: 5.5, mesh });
    burst(player.x, 0.2, player.z, 18, 0xdfe8ef);
    toast('Lipstick smoke cloud. Extremely opaque, lightly scented.');
  }

  function charmPulse() {
    if (state.mode !== 'play') return;
    if (player.charms <= 0) { toast('No charm charges. Impossible, but true.'); return; }
    if (player.charmCd > 0) return;
    player.charms--;
    player.charmCd = 1.2;
    let hit = 0;
    for (const g of state.guards) {
      if (g.stun <= 0 && dist(player.x, player.z, g.x, g.z) < 3.3 && los(player.x, player.z, g.x, g.z)) {
        g.stun = 4.5;
        g.state = 'stunned';
        hit++;
        burst(g.x, 0.25, g.z, 10, 0xff5fa2);
      }
    }
    state.score += hit * 120;
    toast(hit ? 'Charm pulse. Security briefly questions its career.' : 'Charm pulse whiffs. Still a great pose.');
  }

  function allObjectivesDone() {
    return state.objectives.every(o => o.done);
  }

  function noiseAt(x, z, radius, chance) {
    for (const g of state.guards) {
      if (g.stun > 0) continue;
      if (dist(x, z, g.x, g.z) < radius && Math.random() < chance) {
        g.state = 'investigate';
        g.investigate = { x, z };
      }
    }
  }

  function burst(x, y, z, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.9 + Math.random() * 1.8;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.05),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, transparent: true, opacity: 1 })
      );
      fxRoot.add(mesh);
      state.sparkles.push({ x, y, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, t: 0.45 + Math.random() * 0.45, mesh });
    }
  }

  function completeMission() {
    state.mode = 'complete';
    const bonus = Math.max(0, 1000 - Math.floor(state.alert) * 8) + player.darts * 40 + player.decoys * 35 + player.smoke * 50;
    state.score += bonus;
    $('completeTitle').textContent = `${state.mission.name} complete`;
    $('completeText').textContent = `Clean escape. Style bonus ${bonus}. Total style ${Math.floor(state.score)}. HQ says the villain is furious and the decor is improved.`;
    complete.classList.remove('hidden');
    hud.classList.add('hidden');
    rightHud.classList.add('hidden');
  }

  function failMission(reason) {
    if (state.mode === 'failed') return;
    state.mode = 'failed';
    $('overText').textContent = reason;
    gameover.classList.remove('hidden');
    hud.classList.add('hidden');
    rightHud.classList.add('hidden');
  }

  function moveCircle(obj, dx, dz) {
    let nx = obj.x + dx;
    for (const w of state.walls) if (circleRect(nx, obj.z, obj.radius || obj.r || 0.25, w)) nx = obj.x;
    nx = clamp(nx, obj.radius || obj.r || 0.25, state.worldBounds.w - (obj.radius || obj.r || 0.25));
    let nz = obj.z + dz;
    for (const w of state.walls) if (circleRect(nx, nz, obj.radius || obj.r || 0.25, w)) nz = obj.z;
    nz = clamp(nz, obj.radius || obj.r || 0.25, state.worldBounds.h - (obj.radius || obj.r || 0.25));
    obj.x = nx;
    obj.z = nz;
  }

  function circleRect(cx, cz, cr, r) {
    const x = clamp(cx, r.x, r.x + r.w);
    const z = clamp(cz, r.z, r.z + r.h);
    return Math.hypot(cx - x, cz - z) < cr;
  }

  function rectContains(r, x, z) {
    return x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.h;
  }

  function los(x1, z1, x2, z2) {
    for (const w of state.walls) if (lineRect(x1, z1, x2, z2, w)) return false;
    return true;
  }

  function lineRect(x1, z1, x2, z2, r) {
    if (rectContains(r, x1, z1) || rectContains(r, x2, z2)) return true;
    const e = [[r.x, r.z, r.x + r.w, r.z], [r.x + r.w, r.z, r.x + r.w, r.z + r.h], [r.x + r.w, r.z + r.h, r.x, r.z + r.h], [r.x, r.z + r.h, r.x, r.z]];
    return e.some(a => segSeg(x1, z1, x2, z2, a[0], a[1], a[2], a[3]));
  }

  function segSeg(ax, az, bx, bz, cx, cz, dx, dz) {
    const den = (ax - bx) * (cz - dz) - (az - bz) * (cx - dx);
    if (Math.abs(den) < 1e-5) return false;
    const t = ((ax - cx) * (cz - dz) - (az - cz) * (cx - dx)) / den;
    const u = -((ax - bx) * (az - cz) - (az - bz) * (ax - cx)) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const t = clamp(((px - ax) * dx + (pz - az) * dz) / ((dx * dx + dz * dz) || 1), 0, 1);
    return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(a, b, c, d) { return Math.hypot(a - c, b - d); }
  function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
  function lerpAngle(a, b, t) { return a + wrapAngle(b - a) * t; }

  function setComms(msg) {
    state.lastComms = msg;
    $('comms').textContent = msg;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    toastTimer = 2.5;
  }

  function toggleMap() {
    state.mapSeen = !state.mapSeen;
    minimapWrap.classList.toggle('on', state.mapSeen);
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  }

  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (state.mode === 'play') update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
})();
