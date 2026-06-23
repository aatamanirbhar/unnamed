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

  const SCALE = 0.02;
  const GAMEPAD_DEADZONE = 0.18;
  const MISSIONS = createSunlitMissions();
  const COMMS = [
    'HQ: The island is public-facing. Smile like you belong there.',
    'HQ: Cameras are wired through the marina office. One hack buys a quiet minute.',
    'Felix: Guests, guards, yachts, sunshine. Try not to start a diplomatic incident.',
    'Pilot: Helipad extraction is hot once the gate relay is open.',
    'Bond: Sunlight, champagne, and a villain with terrible perimeter planning.',
    'HQ: Your cufflinks are still government property.'
  ];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9edcff);
  scene.fog = new THREE.Fog(0x9edcff, 24, 105);
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(0, 3, 5);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xbdd78f, 2.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1c2, 2.7);
  sun.position.set(16, 28, 10);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x88ccff, 0.9);
  fill.position.set(-12, 10, -12);
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
    civilians: [],
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
    lookStickX: 0, lookStickY: 0,
    gamepadX: 0, gamepadY: 0,
    moveTouchId: null, lookTouchId: null
  };
  const keys = Object.create(null);
  const textureLoader = new THREE.TextureLoader();
  let playerPortraitTexture = null;
  loadPlayerPortrait();
  let last = performance.now();
  let toastTimer = 0;
  let mouseLocked = false;
  let cameraYaw = 0;
  let cameraPitch = 0.18;
  const hudCache = {
    t: 0,
    force: true,
    mission: '',
    stats: '',
    alert: '',
    objectives: '',
    pips: '',
    next: '',
    near: ''
  };

  previewMissions();
  bind();
  if (isTouch) setupTouch();
  requestAnimationFrame(loop);

  function createSunlitMissions() {
    return [
      scaleMission({
        name: 'Sunbreak Protocol',
        place: 'Azure Crown Island Resort',
        palette: ['#9edcff', '#4fbf7a', '#ffd166'],
        brief: 'Baron Beige is auctioning a satellite key at a public island resort. Cross the open grounds, blend through the crowds, steal the yacht ledger, open the villa relay, photograph the auction, and escape by helicopter.',
        ops: [
          'Start at the beach pier and cross the whole island in daylight.',
          'Hack the marina office to quiet the camera grid.',
          'Steal the yacht ledger, open the villa relay, and photograph the auction table.',
          'Use crowds, hedges, umbrellas, darts, decoys, smoke, and charm to reach the helipad extraction.'
        ],
        w: 2480,
        h: 1760,
        start: [180, 1540],
        exit: [2210, 170, 150, 150],
        objectives: [
          [520, 1230, 'Marina camera office', 'You loop the resort cameras through a sunscreen advert.'],
          [1040, 840, 'Yacht ledger', 'The ledger names every buyer, yacht, and fake accent.'],
          [1520, 590, 'Villa gate relay', 'The relay pops open with a cufflink and one rude spark.'],
          [1930, 1110, 'Auction photo', 'You photograph the satellite key beside a very small quiche.']
        ],
        guards: [
          [[420, 1320], [780, 1320], [780, 1050], [430, 1030]],
          [[910, 940], [1280, 900], [1280, 650], [900, 680]],
          [[1390, 430], [1710, 430], [1730, 690], [1400, 710]],
          [[1800, 980], [2190, 980], [2190, 1260], [1810, 1260]],
          [[1900, 320], [2250, 320], [2250, 560], [1900, 560]],
          [[620, 520], [950, 500], [960, 310], [650, 330]]
        ],
        civilians: [
          [[330, 1450], [560, 1460], [560, 1330], [330, 1340]],
          [[720, 1220], [900, 1130], [820, 980], [650, 1030]],
          [[1050, 1190], [1330, 1190], [1320, 1030], [1040, 1030]],
          [[470, 740], [700, 710], [780, 610], [520, 600]],
          [[1040, 500], [1260, 520], [1240, 330], [1020, 350]],
          [[1530, 900], [1760, 910], [1720, 1050], [1500, 1040]],
          [[1990, 1420], [2240, 1390], [2260, 1510], [2010, 1550]],
          [[1940, 710], [2210, 700], [2220, 850], [1940, 860]],
          [[1340, 1420], [1600, 1370], [1640, 1530], [1380, 1580]],
          [[760, 1560], [1040, 1530], [1040, 1390], [760, 1400]],
          [[1550, 250], [1750, 260], [1740, 360], [1550, 350]],
          [[380, 390], [550, 390], [570, 250], [390, 260]]
        ],
        cameras: [
          [560, 1120, 0.4],
          [1210, 760, -0.6],
          [1680, 610, 2.5],
          [2070, 1020, -2.7],
          [2080, 370, 2.8]
        ],
        lasers: [
          [1420, 520, 1780, 520],
          [1810, 900, 2220, 900],
          [2140, 400, 2140, 710]
        ],
        walls: [
          [0, 0, 2480, 30], [0, 1730, 2480, 30], [0, 0, 30, 1760], [2450, 0, 30, 1760],
          [250, 1220, 360, 28], [760, 1220, 250, 28], [1180, 1010, 420, 28], [1800, 880, 450, 28],
          [1320, 380, 28, 340], [1780, 380, 28, 340], [2050, 420, 28, 290],
          [470, 620, 28, 360], [720, 620, 28, 230], [1020, 250, 360, 28],
          [350, 250, 270, 28], [560, 250, 28, 190], [1840, 1340, 430, 28],
          [1820, 1340, 28, 250], [2260, 1320, 28, 300], [1450, 1230, 28, 330]
        ]
      })
    ];
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
      civilians: (m.civilians || []).map(route => route.map(p => [p[0] * SCALE, p[1] * SCALE])),
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
    document.addEventListener('visibilitychange', () => {
      last = performance.now();
      input.lookDX = 0;
      input.lookDY = 0;
    });
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

    const lookMax = 38;
    let lookOriginX = 0;
    let lookOriginY = 0;

    function setLookStick(dx, dy) {
      const len = Math.hypot(dx, dy);
      const cap = len > lookMax ? lookMax / len : 1;
      const sx = dx * cap;
      const sy = dy * cap;
      input.lookStickX = sx / lookMax;
      input.lookStickY = sy / lookMax;
      lookKnob.style.transform = `translate(${sx}px, ${sy}px)`;
    }

    function resetLookStick(id) {
      if (lookId !== id) return;
      lookId = null;
      input.lookStickX = 0;
      input.lookStickY = 0;
      lookKnob.style.transform = '';
    }

    lookPad.addEventListener('pointerdown', e => {
      e.preventDefault();
      lookId = e.pointerId;
      lookOriginX = e.clientX;
      lookOriginY = e.clientY;
      lookPad.setPointerCapture(e.pointerId);
      setLookStick(0, 0);
    });
    lookPad.addEventListener('pointermove', e => {
      e.preventDefault();
      if (lookId !== e.pointerId) return;
      setLookStick(e.clientX - lookOriginX, e.clientY - lookOriginY);
    });
    lookPad.addEventListener('pointerup', e => { resetLookStick(e.pointerId); });
    lookPad.addEventListener('pointercancel', e => { resetLookStick(e.pointerId); });
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
    state.civilians = [];
    state.cameras = [];
    state.lasers = [];
    state.worldBounds = { w: state.mission.w, h: state.mission.h };
    hudCache.force = true;
    hudCache.near = '';
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
    scene.fog.near = 32;
    scene.fog.far = Math.max(88, Math.max(m.w, m.h) * 1.55);
    hemi.intensity = 2.15;
    sun.intensity = 2.75;
    fill.intensity = 0.95;
    hemi.color.copy(new THREE.Color(0xffffff));
    hemi.groundColor.copy(new THREE.Color(0x9bcf7a));
    sun.color.copy(new THREE.Color(0xfff1c2));
    fill.color.copy(new THREE.Color(0x8fd3ff));

    const world = new THREE.Group();
    worldRoot.add(world);
    state.world = world;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(m.w, m.h, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x74c96b, roughness: 0.92, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(m.w / 2, 0, m.h / 2);
    world.add(floor);

    const grid = new THREE.GridHelper(Math.max(m.w, m.h), Math.ceil(Math.max(m.w, m.h) / 2), 0xf7e1a0, 0xffffff);
    grid.position.set(m.w / 2, 0.02, m.h / 2);
    grid.material.transparent = true;
    grid.material.opacity = 0.14;
    world.add(grid);

    state.walls = m.walls.map((r, idx) => {
      const wall = {
        x: r[0], z: r[1], w: r[2], h: r[3],
        mesh: new THREE.Mesh(
          new THREE.BoxGeometry(r[2], 1.2, r[3]),
          new THREE.MeshStandardMaterial({ color: idx < 4 ? 0xd9c394 : (idx % 2 ? 0x3d8f58 : 0xf3e7bc), roughness: 0.88, metalness: 0.02 })
        )
      };
      wall.mesh.position.set(r[0] + r[2] / 2, 0.6, r[1] + r[3] / 2);
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

    state.civilians = m.civilians.map((route, idx) => {
      const c = makeCivilian(route, idx);
      world.add(c.mesh);
      return c;
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
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xf1d99d, roughness: 1, metalness: 0 });
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xe9e0c8, roughness: 0.86, metalness: 0 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3dbce8, roughness: 0.65, metalness: 0.02, transparent: true, opacity: 0.86 });
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2f934e, roughness: 0.95, metalness: 0 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f3df, roughness: 0.78, metalness: 0 });
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xd9894c, roughness: 0.82, metalness: 0 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x8ed7ff, roughness: 0.24, metalness: 0.02, transparent: true, opacity: 0.55 });

    addGroundPatch(world, mission.w * 0.5, mission.h - 2.0, mission.w * 0.92, 3.7, sandMat);
    addGroundPatch(world, mission.w * 0.08, mission.h * 0.5, 2.2, mission.h * 0.84, sandMat);
    addGroundPatch(world, mission.w * 0.52, mission.h * 0.61, mission.w * 0.68, 1.25, pathMat);
    addGroundPatch(world, mission.w * 0.67, mission.h * 0.35, 1.15, mission.h * 0.44, pathMat);
    addGroundPatch(world, mission.w * 0.86, mission.h * 0.78, 2.3, 2.6, waterMat);
    addGroundPatch(world, mission.w * 0.14, mission.h * 0.2, 2.1, 2.6, waterMat);

    addVilla(world, 31.0, 7.7, 4.5, 3.3, whiteMat, terracottaMat, glassMat);
    addVilla(world, 9.2, 6.9, 3.3, 2.6, whiteMat, terracottaMat, glassMat);
    addVilla(world, 40.8, 24.8, 4.9, 2.7, whiteMat, terracottaMat, glassMat);
    addYacht(world, 6.9, 29.0);
    addYacht(world, 42.2, 30.1);
    addHelipad(world, 45.5, 3.9, mission.palette[2]);

    const umbrellas = [
      [5.8, 29.1, 0xe95464], [9.4, 28.5, 0x31a7e0], [14.6, 25.0, 0xffd166],
      [21.5, 21.4, 0xe95464], [30.2, 21.1, 0x31a7e0], [39.8, 18.4, 0xffd166],
      [35.6, 28.2, 0xe95464], [16.2, 30.8, 0x31a7e0], [25.4, 28.8, 0xffd166]
    ];
    for (const u of umbrellas) if (isFreeSpot(u[0], u[1], 0.46)) world.add(makeUmbrella(u[2], u[0], u[1]));

    const palms = [
      [3.4, 27.2], [4.8, 20.1], [7.7, 13.4], [11.5, 4.8], [18.0, 31.9],
      [22.4, 14.5], [28.0, 28.7], [32.7, 4.8], [38.4, 8.9], [44.8, 14.6],
      [46.8, 27.4], [16.2, 8.0], [26.8, 5.4], [34.7, 24.2]
    ];
    for (const p of palms) if (isFreeSpot(p[0], p[1], 0.55)) world.add(makePalm(p[0], p[1]));

    const hedges = [
      [12.5, 21.2, 4.6, 0.34], [19.5, 19.0, 5.5, 0.34], [26.2, 16.4, 0.34, 5.6],
      [35.8, 13.6, 0.34, 5.0], [38.9, 17.2, 5.7, 0.34], [9.5, 9.9, 0.34, 4.2],
      [14.5, 7.9, 5.2, 0.34], [30.4, 25.2, 0.34, 4.2]
    ];
    for (const h of hedges) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(h[2], 0.72, h[3]), hedgeMat);
      mesh.position.set(h[0], 0.36, h[1]);
      world.add(mesh);
    }

    const tablePositions = [[10.8, 24.2], [12.9, 24.4], [22.7, 22.7], [31.0, 23.2], [38.5, 22.2], [40.2, 15.5], [30.8, 10.7], [20.5, 9.4]];
    for (let i = 0; i < tablePositions.length; i++) {
      const [x, z] = tablePositions[i];
      if (!isFreeSpot(x, z, 0.5)) continue;
      world.add(makeCafeTable(i, x, z));
    }
  }

  function addGroundPatch(world, x, z, w, h, material) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.025, z);
    world.add(patch);
  }

  function addVilla(world, x, z, w, h, wallMat, roofMat, glassMat) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 1.7, h), wallMat);
    body.position.y = 0.85;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.26, h + 0.35), roofMat);
    roof.position.y = 1.84;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.9, 0.06), glassMat);
    door.position.set(0, 0.52, h / 2 + 0.04);
    const windowA = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.44, 0.06), glassMat);
    const windowB = windowA.clone();
    windowA.position.set(-w * 0.28, 1.02, h / 2 + 0.05);
    windowB.position.set(w * 0.28, 1.02, h / 2 + 0.05);
    group.add(body, roof, door, windowA, windowB);
    group.position.set(x, 0, z);
    world.add(group);
  }

  function addYacht(world, x, z) {
    const group = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.38, 0.72), new THREE.MeshStandardMaterial({ color: 0xf7f7f0, roughness: 0.52, metalness: 0.04 }));
    hull.position.y = 0.28;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.44, 0.52), new THREE.MeshStandardMaterial({ color: 0x92d7ff, roughness: 0.2, transparent: true, opacity: 0.78 }));
    cabin.position.set(0.25, 0.7, 0);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0xff5fa2, emissive: 0xff5fa2, emissiveIntensity: 0.12 }));
    stripe.position.set(0, 0.38, 0.39);
    group.add(hull, cabin, stripe);
    group.position.set(x, 0.02, z);
    group.rotation.y = -0.14;
    world.add(group);
  }

  function addHelipad(world, x, z, accent) {
    const padMat = new THREE.MeshStandardMaterial({ color: 0x2d343b, roughness: 0.7, metalness: 0.06 });
    const lineMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.25, roughness: 0.35 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.08, 32), padMat);
    pad.position.set(x, 0.06, z);
    world.add(pad);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.04, 0.18), lineMat);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 1.25), lineMat);
    h1.position.set(x, 0.13, z);
    h2.position.set(x, 0.14, z);
    world.add(h1, h2);
  }

  function makeUmbrella(color, x, z) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8), new THREE.MeshStandardMaterial({ color: 0xf8f3df, roughness: 0.5 }));
    pole.position.y = 0.42;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.36, 18), new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.02 }));
    shade.position.y = 1.0;
    group.add(pole, shade);
    group.position.set(x, 0, z);
    return group;
  }

  function makePalm(x, z) {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x9c6a3d, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x247d40, roughness: 0.92 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.9, 9), trunkMat);
    trunk.position.y = 0.95;
    trunk.rotation.z = 0.08;
    group.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 1.18), leafMat);
      leaf.position.y = 1.88;
      leaf.position.z = 0.43;
      leaf.rotation.y = i * Math.PI / 3;
      leaf.rotation.x = 0.42;
      group.add(leaf);
    }
    group.position.set(x, 0, z);
    return group;
  }

  function makeCafeTable(idx, x, z) {
    const group = new THREE.Group();
    const tableMat = new THREE.MeshStandardMaterial({ color: idx % 2 ? 0xffffff : 0xffd166, roughness: 0.72 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x56606a, roughness: 0.5, metalness: 0.28 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16), tableMat);
    top.position.y = 0.55;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), metalMat);
    stem.position.y = 0.28;
    const chairA = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), tableMat);
    const chairB = chairA.clone();
    chairA.position.set(-0.58, 0.26, 0);
    chairB.position.set(0.58, 0.26, 0);
    group.add(top, stem, chairA, chairB);
    group.position.set(x, 0, z);
    group.rotation.y = (idx % 3) * 0.4;
    return group;
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
    const portrait = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.52),
      new THREE.MeshBasicMaterial({ map: playerPortraitTexture, color: 0xffffff, transparent: true, side: THREE.DoubleSide })
    );
    portrait.position.set(0, 1.72, 0.185);
    portrait.rotation.y = 0;
    portrait.visible = !!playerPortraitTexture;
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.46),
      new THREE.MeshBasicMaterial({ map: playerPortraitTexture, color: 0xffffff, transparent: true, side: THREE.DoubleSide })
    );
    badge.position.set(0, 1.16, 0.205);
    badge.visible = !!playerPortraitTexture;
    g.add(jacket, torso, head, shirtBox, tieBox, legL, legR, armL, armR, cuff, portrait, badge);
    g.userData.portrait = portrait;
    g.userData.badge = badge;
    g.position.y = 0;
    return g;
  }

  async function loadPlayerPortrait() {
    const src = await firstExistingAsset(['model.webp', 'model.jpg']);
    if (!src) return;
    textureLoader.load(src, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      playerPortraitTexture = tex;
      tex.needsUpdate = true;
      applyPlayerPortraitTexture(tex);
    });
  }

  async function firstExistingAsset(paths) {
    for (const path of paths) {
      try {
        const res = await fetch(path, { method: 'HEAD', cache: 'no-store' });
        if (res.ok) return path;
      } catch (_) {}
    }
    return null;
  }

  function applyPlayerPortraitTexture(tex) {
    if (!player.mesh) return;
    for (const part of [player.mesh.userData.portrait, player.mesh.userData.badge]) {
      if (!part?.material) continue;
      part.material.map = tex;
      part.visible = true;
      part.material.needsUpdate = true;
    }
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

  function makeCivilian(route, idx) {
    const p = route[0];
    const q = route[1] || route[0];
    const palette = [
      [0xffffff, 0x31a7e0, 0xffd166],
      [0xffe2a8, 0xe95464, 0xffffff],
      [0x91d18b, 0xf8f3df, 0x31a7e0],
      [0xf7b4cf, 0x2e6f95, 0xffd166]
    ][idx % 4];
    return {
      x: p[0],
      z: p[1],
      route: route.map(v => ({ x: v[0], z: v[1] })),
      idx: route.length > 1 ? 1 : 0,
      angle: Math.atan2(q[0] - p[0], q[1] - p[1]),
      speed: (38 + (idx % 5) * 4) * SCALE,
      radius: 0.18,
      phase: idx * 0.8,
      mesh: makeNpc(palette[0], palette[1], palette[2], true)
    };
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

  function makeNpc(body, tie, glow, casual = false) {
    const g = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: body, roughness: 0.92, metalness: 0.02 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd0ad8a, roughness: 0.96 });
    const accent = new THREE.MeshStandardMaterial({ color: tie, emissive: glow, emissiveIntensity: 0.24, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.24), suit);
    torso.position.y = 1.1;
    const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.76, 0.28), new THREE.MeshStandardMaterial({ color: casual ? body : 0x131722, roughness: 0.88 }));
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
    const tieBox = new THREE.Mesh(new THREE.BoxGeometry(casual ? 0.2 : 0.05, casual ? 0.12 : 0.22, 0.04), accent);
    tieBox.position.set(0.02, casual ? 1.2 : 1.02, 0.16);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 14), new THREE.MeshStandardMaterial({ color: casual ? tie : 0x222734, roughness: 0.7 }));
    hat.position.y = 1.86;
    g.add(jacket, torso, head, leg, leg2, arm, arm2, tieBox, hat);
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
    for (const child of worldRoot.children.slice()) disposeObject(child);
    for (const child of fxRoot.children.slice()) disposeObject(child);
    state.world = null;
    player.mesh = null;
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
    readGamepad(dt);
    if (input.lookDX || input.lookDY) {
      cameraYaw += input.lookDX * 0.0027;
      cameraPitch = clamp(cameraPitch + input.lookDY * 0.0012, -0.14, 0.42);
      input.lookDX = 0;
      input.lookDY = 0;
    }
    if (input.lookStickX || input.lookStickY) {
      const lookMul = player.crouch ? 0.82 : 1;
      cameraYaw += input.lookStickX * dt * 2.8 * lookMul;
      cameraPitch = clamp(cameraPitch + input.lookStickY * dt * 1.35 * lookMul, -0.14, 0.42);
    }

    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.stickX + input.gamepadX;
    const forward = (input.up ? 1 : 0) - (input.down ? 1 : 0) - input.stickY - input.gamepadY;
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
    updateCivilians(dt);
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

  function readGamepad(dt) {
    input.gamepadX = 0;
    input.gamepadY = 0;
    const raw = readRawGamepad();
    let move;
    let look;
    if (raw?.rightJoyCon) {
      move = { x: 0, y: 0 };
      look = raw.primary;
    } else if (window.OmenlyGamepad) {
      const GP = window.OmenlyGamepad;
      GP.poll();
      move = GP.axis(0);
      look = GP.axis(1);
    } else {
      move = raw?.primary || { x: 0, y: 0 };
      look = raw?.secondary || { x: 0, y: 0 };
    }
    input.gamepadX = move.x || 0;
    input.gamepadY = move.y || 0;
    if (look.x || look.y) {
      const lookMul = player.crouch ? 0.82 : 1;
      cameraYaw += look.x * dt * 2.8 * lookMul;
      cameraPitch = clamp(cameraPitch + look.y * dt * 1.35 * lookMul, -0.14, 0.42);
    }
    if (!window.OmenlyGamepad) return;
    const GP = window.OmenlyGamepad;
    if (GP.button('ls')) player.crouch = true;
    if (GP.pressed('b')) {
      player.crouch = !player.crouch;
      const b = $('tbCrouch');
      if (b) b.classList.toggle('on', player.crouch);
    }
    if (GP.pressed('a')) interactAction();
    if (GP.pressed('rt') || GP.pressed('x')) fireDart();
    if (GP.pressed('y')) throwDecoy();
    if (GP.pressed('rb')) smokeBomb();
    if (GP.pressed('lb')) charmPulse();
    if (GP.pressed('start')) toggleMap();
  }

  function readRawGamepad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (!pads) return null;
    let pad = null;
    for (const candidate of pads) {
      if (candidate?.connected) {
        pad = candidate;
        break;
      }
    }
    if (!pad) return null;
    const id = String(pad.id || '').toLowerCase();
    const a = pad.axes || [];
    const primary = {
      x: applyGamepadDeadzone(a[0] || 0),
      y: applyGamepadDeadzone(a[1] || 0)
    };
    const secondary = {
      x: applyGamepadDeadzone(a[2] || 0),
      y: applyGamepadDeadzone(a[3] || 0)
    };
    const rightJoyCon = id.includes('joy-con') && id.includes('(r)') && a.length < 4;
    return { id, primary, secondary, rightJoyCon };
  }

  function applyGamepadDeadzone(v) {
    if (Math.abs(v) < GAMEPAD_DEADZONE) return 0;
    const sign = v < 0 ? -1 : 1;
    return sign * (Math.abs(v) - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE);
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
    for (const c of state.civilians) {
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.angle;
      const bob = Math.sin(state.time * 5 + c.phase) * 0.025;
      c.mesh.position.y = bob;
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

  function updateCivilians(dt) {
    for (const c of state.civilians) {
      const target = c.route[c.idx];
      moveNpc(c, target.x, target.z, dt, 0.72);
      if (dist(c.x, c.z, target.x, target.z) < 0.2) c.idx = (c.idx + 1) % c.route.length;
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
        if (d.mesh) disposeObject(d.mesh);
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
        if (s.mesh) disposeObject(s.mesh);
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
        if (p.mesh) disposeObject(p.mesh);
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
    const nearText = state.near ? state.near.text : '';
    if (hudCache.near !== nearText) {
      hudCache.near = nearText;
      if (state.near) {
        interact.textContent = state.near.text;
        interact.classList.add('on');
      } else {
        interact.classList.remove('on');
      }
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
    const back = 5.15;
    const shoulder = 0.72;
    const height = 2.7 + cameraPitch;
    const margin = 0.45;
    const targetX = clamp(player.x - sin * back + cos * shoulder, margin, state.worldBounds.w - margin);
    const targetY = height;
    const targetZ = clamp(player.z - cos * back - sin * shoulder, margin, state.worldBounds.h - margin);
    const t = 1 - Math.pow(0.0008, dt);
    camera.position.x += (targetX - camera.position.x) * t;
    camera.position.y += (targetY - camera.position.y) * t;
    camera.position.z += (targetZ - camera.position.z) * t;
    const lookX = clamp(player.x + Math.sin(cameraYaw) * 4.8, 0.4, state.worldBounds.w - 0.4);
    const lookZ = clamp(player.z + Math.cos(cameraYaw) * 4.8, 0.4, state.worldBounds.h - 0.4);
    camera.lookAt(lookX, 1.25 - cameraPitch * 1.25, lookZ);
  }

  function snapCamera() {
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    const margin = 0.45;
    camera.position.set(
      clamp(player.x - sin * 5.15 + cos * 0.72, margin, state.worldBounds.w - margin),
      2.7 + cameraPitch,
      clamp(player.z - cos * 5.15 - sin * 0.72, margin, state.worldBounds.h - margin)
    );
    camera.lookAt(
      clamp(player.x + Math.sin(cameraYaw) * 4.8, 0.4, state.worldBounds.w - 0.4),
      1.25 - cameraPitch * 1.25,
      clamp(player.z + Math.cos(cameraYaw) * 4.8, 0.4, state.worldBounds.h - 0.4)
    );
  }

  function updateHud() {
    hudCache.t += 1;
    if (!hudCache.force && hudCache.t % 5 !== 0) return;
    hudCache.force = false;
    const missionText = `${state.missionIndex + 1}/${MISSIONS.length} ${state.mission.name}`;
    if (hudCache.mission !== missionText) {
      hudCache.mission = missionText;
      $('missionName').textContent = missionText;
    }
    const statsHTML = isTouch
      ? `<span class="mobileStat">D<b>${player.darts}</b></span><span class="mobileStat">Q<b>${player.decoys}</b></span><span class="mobileStat">S<b>${player.smoke}</b></span><span class="mobileStat">C<b>${player.charms}</b></span><span class="mobileStat mobileAlert">A<b>${Math.floor(state.alert)}</b></span>`
      : `DARTS <b>${player.darts}</b>  DECOYS <b>${player.decoys}</b>  SMOKE <b>${player.smoke}</b>  CHARM <b>${player.charms}</b><br>STYLE <b>${Math.floor(state.score)}</b>  ALERT <b>${Math.floor(state.alert)}%</b>  ${player.crouch ? '<b>CROUCH</b>' : 'WALK'}`;
    if (hudCache.stats !== statsHTML) {
      hudCache.stats = statsHTML;
      $('hudStats').innerHTML = statsHTML;
    }
    const alertWidth = `${Math.floor(state.alert)}%`;
    if (hudCache.alert !== alertWidth) {
      hudCache.alert = alertWidth;
      $('alertFill').style.width = state.alert + '%';
    }
    const objectivesHTML = state.objectives.map(o => `<div class="${o.done ? 'done' : ''}">${o.done ? 'DONE' : 'TODO'} - ${escapeHTML(o.label)}</div>`).join('') +
      `<div>${allObjectivesDone() ? 'ESCAPE AVAILABLE' : 'FINISH OBJECTIVES TO UNLOCK EXIT'}</div>`;
    if (hudCache.objectives !== objectivesHTML) {
      hudCache.objectives = objectivesHTML;
      $('objectives').innerHTML = objectivesHTML;
    }
    const pips = $('objectivePips');
    const next = $('nextObjective');
    if (pips && next) {
      const pipsHTML = state.objectives.map(o => `<span class="pip ${o.done ? 'done' : ''}"></span>`).join('');
      if (hudCache.pips !== pipsHTML) {
        hudCache.pips = pipsHTML;
        pips.innerHTML = pipsHTML;
      }
      const pending = state.objectives.find(o => !o.done);
      const nextText = pending ? pending.label : 'Exit unlocked';
      if (hudCache.next !== nextText) {
        hudCache.next = nextText;
        next.textContent = nextText;
      }
    }
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
    miniCtx.fillStyle = '#ffffff';
    for (const c of state.civilians) miniCtx.fillRect(c.x * sx - 1.5, c.z * sy - 1.5, 3, 3);
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
    if (isTouch) {
      toast(msg.replace(/^HQ:\s*/, ''));
      return;
    }
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function loop(now) {
    let dt = Math.min(0.05, (now - last) / 1000 || 0);
    if (document.hidden) dt = 0;
    last = now;
    if (state.mode === 'play') update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
})();
