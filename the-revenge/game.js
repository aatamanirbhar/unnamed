import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const $ = (id) => document.getElementById(id);

const ui = {
  canvas: $('game'),
  loading: $('loading'),
  loadText: $('loadText'),
  menu: $('menu'),
  levelYaari: $('levelYaari'),
  hud: $('hud'),
  stats: $('stats'),
  levelName: $('levelName'),
  objectiveList: $('objectiveList'),
  healthFill: $('healthFill'),
  bossBar: $('bossBar'),
  bossFill: $('bossFill'),
  cigBar: $('cigBar'),
  cigFill: $('cigFill'),
  comms: $('comms'),
  prompt: $('prompt'),
  toast: $('toast'),
  weaponBar: $('weaponBar'),
  akBtn: $('akBtn'),
  sickleBtn: $('sickleBtn'),
  dynamiteBtn: $('dynamiteBtn'),
  fireBtn: $('fireBtn'),
  cigBtn: $('cigBtn'),
  pauseBtn: $('pauseBtn'),
  pause: $('pause'),
  resumeBtn: $('resumeBtn'),
  quitBtn: $('quitBtn'),
  intro: $('intro'),
  introA: $('introA'),
  introB: $('introB'),
  skipIntro: $('skipIntro'),
  complete: $('complete'),
  completeText: $('completeText'),
  againBtn: $('againBtn'),
  levelsBtn: $('levelsBtn'),
  failed: $('failed'),
  failedText: $('failedText'),
  retryBtn: $('retryBtn'),
  failedLevelsBtn: $('failedLevelsBtn'),
  crosshair: $('crosshair'),
  damageVignette: $('damageVignette'),
  slowmoVignette: $('slowmoVignette'),
  stick: $('stick'),
  stickKnob: $('stickKnob'),
  look: $('look'),
  lookKnob: $('lookKnob'),
  bgm: $('bgm')
};

const MODEL_FILES = {
  player: 'dhurandar.glb',
  boss: 'finalbossiqbal.glb',
  goon: 'normalgoon.glb',
  cigarette: 'cigerette.glb',
  ak47: 'weapons/ak47.glb',
  dynamite: 'weapons/dynamite.glb'
};

const ANIMATION_FILES = {
  idle: 'Breathing Idle.glb',
  knifeIdle: 'Knife Idle.glb',
  stab: 'Stabbing.glb',
  throw: 'Throw.glb',
  death: 'Flying Back Death.glb',
  gunplay: 'Gunplay.glb',
  rifleIdle: 'rifle aiming idle.glb',
  rifleFire: 'firing rifle.glb',
  rifleRun: 'rifle run.glb',
  walk: 'walking.glb',
  walkBack: 'walking backwards.glb',
  runBack: 'run backwards.glb',
  startWalk: 'start walking.glb',
  stopWalk: 'stop walking.glb',
  startWalkBack: 'start walking backwards.glb',
  stopWalkBack: 'walk backwards stop.glb',
  strafeLeft: 'strafe.glb',
  strafeRight: 'strafe (2).glb',
  jumpForward: 'jump forward.glb',
  jumpBack: 'jump backward.glb',
  walkDeath: 'walking to dying.glb'
};

const ASSET_COUNT = Object.keys(MODEL_FILES).length + Object.keys(ANIMATION_FILES).length;
const WORLD_LIMIT = 56;
const PLAYER_RADIUS = 0.72;
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpV3 = new THREE.Vector3();
const ray = new THREE.Ray();

let scene;
let camera;
let renderer;
let clock;
let loader;
let rootStatic;
let rootDynamic;
let dustField;

const assets = {
  models: {},
  clips: {},
  allClipNames: []
};

const input = {
  keys: new Set(),
  fireHeld: false,
  touchMove: new THREE.Vector2(),
  touchLook: new THREE.Vector2()
};

const state = {
  mode: 'loading',
  elapsed: 0,
  introTimer: 0,
  yaw: 0,
  pitch: 0.08,
  health: 100,
  weapon: 'ak',
  ammo: 260,
  dynamite: 5,
  cigarette: 100,
  slowmo: 0,
  goonsKilled: 0,
  score: 0,
  bossRevealed: false,
  bossDefeated: false,
  firedOnce: false,
  usedSickle: false,
  usedDynamite: false,
  usedCigarette: false,
  enteredTown: false,
  shotCooldown: 0,
  weaponCooldown: 0,
  invuln: 0,
  player: null,
  boss: null,
  goons: [],
  projectiles: [],
  effects: [],
  obstacles: []
};

const OBJECTIVES = [
  { label: 'Enter Yaari Town', done: () => state.enteredTown },
  { label: 'Drop 8 goons', done: () => state.goonsKilled >= 8 },
  { label: 'Use AK47, sickle, dynamite, and cigarette focus', done: () => state.firedOnce && state.usedSickle && state.usedDynamite && state.usedCigarette },
  { label: 'Sever Iqbal and finish the warlord', done: () => state.bossDefeated }
];

boot();

async function boot() {
  setupThree();
  setupStaticWorld();
  bindControls();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);

  try {
    await loadAssets();
    show(ui.loading, false);
    state.mode = 'menu';
    if (shouldAutoplay()) {
      startYaariTown();
      if (new URLSearchParams(window.location.search).get('autoplay') === 'gameplay') {
        beginGameplay();
      }
    } else {
      show(ui.menu, true);
      toast('Loaded ' + assets.allClipNames.length + ' animation clips.');
    }
  } catch (err) {
    console.error(err);
    ui.loadText.textContent = 'Asset load failed. Check the browser console.';
    toast('Asset load failed.', true);
  }
}

function setupThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x140b08);
  scene.fog = new THREE.FogExp2(0x140b08, 0.018);

  camera = new THREE.PerspectiveCamera(62, 1, 0.08, 180);
  camera.position.set(0, 4, -8);

  renderer = new THREE.WebGLRenderer({
    canvas: ui.canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  clock = new THREE.Clock();
  loader = new GLTFLoader();

  rootStatic = new THREE.Group();
  rootDynamic = new THREE.Group();
  scene.add(rootStatic, rootDynamic);

  const hemi = new THREE.HemisphereLight(0xffe7c7, 0x26100a, 1.5);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffbd77, 3.2);
  sun.position.set(-14, 26, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x8ecdc5, 1.35);
  rim.position.set(16, 11, 18);
  scene.add(rim);
}

function setupStaticWorld() {
  rootStatic.clear();
  state.obstacles = [];

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(132, 132, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x624231, roughness: 0.96, metalness: 0.02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  rootStatic.add(ground);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.035, 116),
    new THREE.MeshStandardMaterial({ color: 0x2d2520, roughness: 0.9 })
  );
  road.position.y = 0.022;
  road.receiveShadow = true;
  rootStatic.add(road);

  for (let z = -52; z <= 52; z += 8) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.04, 2.8),
      new THREE.MeshStandardMaterial({ color: 0xd8bb77, roughness: 0.72 })
    );
    stripe.position.set(0, 0.055, z);
    stripe.receiveShadow = true;
    rootStatic.add(stripe);
  }

  addWelcomeSign();
  addBuildings();
  addCoverObjects();
  addDust();
}

function addWelcomeSign() {
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2a1710, roughness: 0.82 });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x3d2118, roughness: 0.8 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.3, 0.28), postMat);
  const right = left.clone();
  left.position.set(-4.3, 2.15, -47.5);
  right.position.set(4.3, 2.15, -47.5);
  const board = new THREE.Mesh(new THREE.BoxGeometry(9.4, 2.2, 0.3), boardMat);
  board.position.set(0, 3.65, -47.5);
  [left, right, board].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    rootStatic.add(m);
  });
  const label = makeTextPlane('YAARI TOWN', 1024, 256, '#f2d3a2', '#2a120b', 70);
  label.position.set(0, 3.68, -47.66);
  rootStatic.add(label);
}

function addBuildings() {
  const rows = [
    { x: -22, z: -22, n: 'CHAI', c: 0x72513c },
    { x: 22, z: -18, n: 'ARMS', c: 0x55382d },
    { x: -25, z: 8, n: 'GARAGE', c: 0x665247 },
    { x: 24, z: 14, n: 'CLINIC', c: 0x5b483a },
    { x: -20, z: 36, n: 'IQBAL', c: 0x3b251e },
    { x: 21, z: 38, n: 'HOTEL', c: 0x654531 }
  ];

  rows.forEach((b, i) => {
    const h = 5 + (i % 3) * 1.4;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(10 + (i % 2) * 3, h, 8),
      new THREE.MeshStandardMaterial({ color: b.c, roughness: 0.88 })
    );
    body.position.set(b.x, h / 2, b.z);
    body.castShadow = true;
    body.receiveShadow = true;
    rootStatic.add(body);
    state.obstacles.push({ pos: new THREE.Vector3(b.x, 0, b.z), radius: 6.2 });

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 0.25, 1.5),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x9e3d32 : 0xd0a04b, roughness: 0.65 })
    );
    awning.position.set(b.x, 2.7, b.z - Math.sign(b.z || 1) * 4.4);
    awning.castShadow = true;
    rootStatic.add(awning);

    const sign = makeTextPlane(b.n, 512, 170, '#f6d39a', '#2b1710', 54);
    sign.position.set(b.x, 3.9, b.z - Math.sign(b.z || 1) * 4.08);
    sign.rotation.y = b.z > 0 ? Math.PI : 0;
    rootStatic.add(sign);
  });
}

function addCoverObjects() {
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x6b4428, roughness: 0.82 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x354548, roughness: 0.7, metalness: 0.18 });
  const positions = [
    [-8, -28], [8, -18], [-10, -4], [10, 4], [-8, 21], [9, 30],
    [-16, -37], [17, -35], [-15, 48], [14, 47]
  ];
  positions.forEach((p, i) => {
    let m;
    if (i % 3 === 0) {
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.7, 18), barrelMat);
      m.position.set(p[0], 0.85, p[1]);
    } else {
      m = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.7, 2.1), crateMat);
      m.position.set(p[0], 0.85, p[1]);
    }
    m.castShadow = true;
    m.receiveShadow = true;
    rootStatic.add(m);
    state.obstacles.push({ pos: new THREE.Vector3(p[0], 0, p[1]), radius: 1.45 });
  });

  const gate = new THREE.Mesh(
    new THREE.BoxGeometry(17, 0.22, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x26140e, roughness: 0.8 })
  );
  gate.position.set(0, 1.8, 52.5);
  gate.castShadow = true;
  rootStatic.add(gate);
}

function addDust() {
  const count = 360;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = THREE.MathUtils.randFloatSpread(110);
    positions[i * 3 + 1] = THREE.MathUtils.randFloat(0.4, 5.5);
    positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(110);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dustField = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xd9ad76,
      size: 0.045,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    })
  );
  rootStatic.add(dustField);
}

function makeTextPlane(text, w, h, fg, bg, size) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.fillStyle = fg;
  ctx.font = '700 ' + size + 'px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w / 105, h / 105), mat);
  return plane;
}

async function loadAssets() {
  let loaded = 0;
  const entries = [
    ...Object.entries(MODEL_FILES).map(([key, file]) => ({ kind: 'model', key, file })),
    ...Object.entries(ANIMATION_FILES).map(([key, file]) => ({ kind: 'animation', key, file }))
  ];

  await runLimited(entries, 3, async ({ kind, key, file }) => {
    const label = kind === 'model' ? 'model' : 'animation';
    setLoadText('Loading ' + label + ' ' + key + ' (' + (loaded + 1) + '/' + ASSET_COUNT + ')');
    const gltf = await loadGLTF(assetUrl(file), (ev) => {
      if (!ev.total) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      setLoadText('Loading ' + label + ' ' + key + ' - ' + pct + '%');
    });
    loaded += 1;

    if (kind === 'model') {
      assets.models[key] = gltf.scene;
      if (gltf.animations && gltf.animations.length) {
        gltf.animations.forEach((clip, idx) => storeClip(key + '_' + idx, clip));
      }
    } else {
      if (gltf.animations && gltf.animations.length) {
        storeClip(key, gltf.animations[gltf.animations.length - 1]);
        gltf.animations.forEach((clip, idx) => {
          if (idx !== gltf.animations.length - 1) storeClip(key + '_' + idx, clip);
        });
      }
      disposeObject(gltf.scene);
    }
    setLoadText('Loaded ' + loaded + '/' + ASSET_COUNT + ' assets.');
    await nextFrame();
  });

  setLoadText('Ready.');
}

async function runLimited(items, limit, worker) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function disposeObject(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(child.material);
    }
  });
}

function disposeMaterial(material) {
  if (!material) return;
  Object.keys(material).forEach((key) => {
    const value = material[key];
    if (value && value.isTexture) value.dispose();
  });
  material.dispose();
}

function assetUrl(file) {
  return encodeURI('assets/' + file);
}

function loadGLTF(url, onProgress) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, onProgress, reject);
  });
}

function storeClip(name, clip) {
  const saved = clip.clone();
  saved.name = name;
  assets.clips[name] = saved;
  assets.allClipNames.push(name);
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function setLoadText(text) {
  if (ui.loadText) ui.loadText.textContent = text;
}

function bindControls() {
  if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) {
    document.body.classList.add('touch');
  }

  window.addEventListener('keydown', (ev) => {
    const key = ev.key.toLowerCase();
    input.keys.add(key);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) ev.preventDefault();
    if (key === '1') setWeapon('ak');
    if (key === '2') setWeapon('sickle');
    if (key === '3') setWeapon('dynamite');
    if (key === 'q') activateCigarette();
    if (key === 'escape' && state.mode === 'playing') pauseGame();
    else if (key === 'escape' && state.mode === 'paused') resumeGame();
  });

  window.addEventListener('keyup', (ev) => {
    input.keys.delete(ev.key.toLowerCase());
  });

  ui.canvas.addEventListener('mousedown', (ev) => {
    if (state.mode !== 'playing') return;
    if (ev.button === 0) {
      input.fireHeld = true;
      if (ui.canvas.requestPointerLock && !document.pointerLockElement) ui.canvas.requestPointerLock();
      fireWeapon();
    }
  });
  window.addEventListener('mouseup', () => {
    input.fireHeld = false;
    ui.fireBtn.classList.remove('holding');
  });
  window.addEventListener('mousemove', (ev) => {
    if (state.mode !== 'playing' || document.pointerLockElement !== ui.canvas) return;
    state.yaw -= ev.movementX * 0.0022;
    state.pitch = THREE.MathUtils.clamp(state.pitch - ev.movementY * 0.0016, -0.35, 0.58);
  });

  bindButton(ui.levelYaari, startYaariTown);
  bindButton(ui.pauseBtn, pauseGame);
  bindButton(ui.resumeBtn, resumeGame);
  bindButton(ui.quitBtn, backToMenu);
  bindButton(ui.againBtn, startYaariTown);
  bindButton(ui.levelsBtn, backToMenu);
  bindButton(ui.retryBtn, startYaariTown);
  bindButton(ui.failedLevelsBtn, backToMenu);
  bindButton(ui.skipIntro, beginGameplay);

  bindButton(ui.akBtn, () => setWeapon('ak'));
  bindButton(ui.sickleBtn, () => setWeapon('sickle'));
  bindButton(ui.dynamiteBtn, () => setWeapon('dynamite'));
  bindButton(ui.cigBtn, activateCigarette);

  ui.fireBtn.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    if (state.mode !== 'playing') return;
    input.fireHeld = true;
    ui.fireBtn.classList.add('holding');
    fireWeapon();
  });
  ui.fireBtn.addEventListener('pointerup', () => {
    input.fireHeld = false;
    ui.fireBtn.classList.remove('holding');
  });
  ui.fireBtn.addEventListener('pointercancel', () => {
    input.fireHeld = false;
    ui.fireBtn.classList.remove('holding');
  });

  bindStick(ui.stick, ui.stickKnob, input.touchMove, true);
  bindStick(ui.look, ui.lookKnob, input.touchLook, false);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'playing') pauseGame();
  });
}

function bindButton(el, fn) {
  if (!el) return;
  el.addEventListener('click', (ev) => {
    ev.preventDefault();
    fn();
  });
}

function bindStick(area, knob, target, invertY) {
  if (!area || !knob) return;
  let activeId = null;
  const max = 42;

  const reset = () => {
    activeId = null;
    target.set(0, 0);
    knob.style.transform = 'translate(0px, 0px)';
  };

  const update = (ev) => {
    const rect = area.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = ev.clientX - cx;
    let dy = ev.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    target.set(dx / max, (invertY ? -dy : dy) / max);
  };

  area.addEventListener('pointerdown', (ev) => {
    activeId = ev.pointerId;
    area.setPointerCapture(activeId);
    update(ev);
  });
  area.addEventListener('pointermove', (ev) => {
    if (activeId !== ev.pointerId) return;
    update(ev);
  });
  area.addEventListener('pointerup', reset);
  area.addEventListener('pointercancel', reset);
}

function startYaariTown() {
  if (state.mode === 'loading') return;
  resetLevelState();
  buildDynamicLevel();

  show(ui.menu, false);
  show(ui.complete, false);
  show(ui.failed, false);
  show(ui.pause, false);
  show(ui.hud, true);
  show(ui.comms, true);
  show(ui.weaponBar, true);
  show(ui.crosshair, true);
  show(ui.intro, true);

  ui.introA.textContent = 'Yaari Town - High Noon';
  ui.introB.textContent = '"They killed my brother on this street."';
  state.mode = 'intro';
  state.introTimer = 0;
  updateHud();
  updateWeaponButtons();
  setComms('Walk through the gate. Iqbal is waiting past the market.');
}

function resetLevelState() {
  state.elapsed = 0;
  state.introTimer = 0;
  state.yaw = 0;
  state.pitch = 0.08;
  state.health = 100;
  state.weapon = 'ak';
  state.ammo = 260;
  state.dynamite = 5;
  state.cigarette = 100;
  state.slowmo = 0;
  state.goonsKilled = 0;
  state.score = 0;
  state.bossRevealed = false;
  state.bossDefeated = false;
  state.firedOnce = false;
  state.usedSickle = false;
  state.usedDynamite = false;
  state.usedCigarette = false;
  state.enteredTown = false;
  state.shotCooldown = 0;
  state.weaponCooldown = 0;
  state.invuln = 0;
  state.projectiles = [];
  state.effects = [];
  state.goons = [];
  state.boss = null;
  input.fireHeld = false;
  rootDynamic.clear();
  ui.damageVignette.style.opacity = 0;
  ui.slowmoVignette.style.opacity = 0;
}

function buildDynamicLevel() {
  const player = createActor({
    scene: assets.models.player,
    height: 2.15,
    tint: null,
    animated: true
  });
  player.group.position.set(0, 0, -42);
  player.group.rotation.y = state.yaw;
  player.weaponMount = new THREE.Group();
  player.weaponMount.position.set(0.38, 1.24, 0.52);
  player.group.add(player.weaponMount);
  rootDynamic.add(player.group);
  state.player = player;
  playAction(player, 'rifleIdle', 0.01);
  rebuildWeaponMount();

  const spawnPoints = [
    [-12, -25], [12, -21], [-15, -7], [16, -1],
    [-13, 16], [14, 19], [-16, 34], [12, 38],
    [-3, 12], [3, 28]
  ];
  spawnPoints.forEach((p, idx) => {
    const goon = createEnemy(p[0], p[1], idx);
    state.goons.push(goon);
    rootDynamic.add(goon.actor.group);
  });

  const boss = createBoss();
  state.boss = boss;
  rootDynamic.add(boss.actor.group);
}

function createActor({ scene: sourceScene, height, tint, animated }) {
  const group = new THREE.Group();
  let model;
  if (sourceScene) {
    model = SkeletonUtils.clone(sourceScene);
  } else {
    model = createFallbackHuman(tint || 0xd34d3f);
  }
  prepareModel(model, height, tint);
  group.add(model);

  const actor = {
    group,
    model,
    mixer: animated ? new THREE.AnimationMixer(model) : null,
    actions: {},
    current: '',
    currentAction: null,
    lockUntil: 0,
    velocity: new THREE.Vector3(),
    staticBob: Math.random() * 10,
    baseModelY: model.position.y
  };

  if (actor.mixer) {
    Object.entries(assets.clips).forEach(([name, clip]) => {
      try {
        actor.actions[name] = actor.mixer.clipAction(clip);
      } catch (err) {
        console.warn('Unable to bind clip', name, err);
      }
    });
  }
  return actor;
}

function prepareModel(model, targetHeight, tint) {
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    if (obj.material) {
      obj.material = cloneMaterial(obj.material, tint);
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = size.y > 0.001 ? targetHeight / size.y : 1;
  model.scale.multiplyScalar(scale);
  const box2 = new THREE.Box3().setFromObject(model);
  const center = box2.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= box2.min.y;
  model.position.z -= center.z;
}

function cloneMaterial(material, tint) {
  if (Array.isArray(material)) return material.map((m) => cloneMaterial(m, tint));
  const mat = material.clone();
  if (mat.color && tint) {
    mat.color.lerp(new THREE.Color(tint), 0.38);
  }
  if ('roughness' in mat) mat.roughness = Math.max(mat.roughness || 0.65, 0.72);
  return mat;
}

function createFallbackHuman(color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 6, 12), mat);
  body.position.y = 1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), mat);
  head.position.y = 1.75;
  group.add(body, head);
  return group;
}

function createEnemy(x, z, idx) {
  const actor = createActor({
    scene: assets.models.goon,
    height: 1.92,
    tint: idx % 2 ? 0x7f2e28 : 0x3b4e4b,
    animated: false
  });
  actor.group.position.set(x, 0, z);
  actor.group.rotation.y = Math.random() * Math.PI * 2;
  const goon = {
    type: 'goon',
    actor,
    health: 46,
    maxHealth: 46,
    speed: 3.2 + Math.random() * 0.45,
    radius: 0.82,
    attackCooldown: Math.random() * 1.2,
    hurtFlash: 0,
    dead: false,
    removeTimer: 3,
    phase: Math.random() * 10
  };
  return goon;
}

function createBoss() {
  const actor = createActor({
    scene: assets.models.boss,
    height: 2.45,
    tint: 0x7d1c16,
    animated: true
  });
  actor.group.position.set(0, 0, 47);
  actor.group.rotation.y = Math.PI;
  playAction(actor, 'idle', 0.01);
  return {
    type: 'boss',
    actor,
    health: 280,
    maxHealth: 280,
    radius: 1.18,
    speed: 2.45,
    attackCooldown: 1.0,
    burstTimer: 0,
    dead: false,
    active: false,
    armorCuts: 0,
    hurtFlash: 0
  };
}

function playAction(actor, name, fade = 0.16, once = false, timeScale = 1) {
  if (!actor || !actor.mixer) return;
  let action = actor.actions[name];
  if (!action) action = actor.actions.idle || actor.actions.rifleIdle || actor.actions.walk;
  if (!action) return;
  if (!once && actor.currentAction === action) return;

  const prev = actor.currentAction;
  action.enabled = true;
  action.setEffectiveWeight(1);
  action.setEffectiveTimeScale(timeScale);
  action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
  action.clampWhenFinished = once;
  if (once || actor.currentAction !== action) action.reset();
  action.fadeIn(fade).play();
  if (prev && prev !== action) prev.fadeOut(fade);
  actor.currentAction = action;
  actor.current = name;
  if (once) {
    actor.lockUntil = state.elapsed + Math.min(action.getClip().duration / Math.max(timeScale, 0.01), 1.45);
  }
}

function updateActorMixer(actor, dt) {
  if (actor && actor.mixer) actor.mixer.update(dt);
}

function rebuildWeaponMount() {
  const player = state.player;
  if (!player || !player.weaponMount) return;
  player.weaponMount.clear();

  if (state.weapon === 'ak') {
    const gun = makeWeaponObject(assets.models.ak47, 1.15, 0x2f3433);
    gun.rotation.set(0.02, Math.PI / 2, -0.04);
    player.weaponMount.add(gun);
  } else if (state.weapon === 'dynamite') {
    const dyn = makeWeaponObject(assets.models.dynamite, 0.48, 0xc94a36);
    dyn.rotation.set(-0.2, 0.2, 0.1);
    player.weaponMount.add(dyn);
  } else {
    const sickle = createSickleMesh();
    sickle.scale.setScalar(1.05);
    sickle.rotation.set(0.2, 0.1, -0.72);
    player.weaponMount.add(sickle);
  }
}

function makeWeaponObject(source, targetSize, fallbackColor) {
  let obj = source ? SkeletonUtils.clone(source) : null;
  if (!obj) {
    obj = new THREE.Mesh(
      new THREE.BoxGeometry(targetSize, targetSize * 0.16, targetSize * 0.16),
      new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.55 })
    );
  }
  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.material = cloneMaterial(child.material, null);
    }
  });
  fitObject(obj, targetSize);
  return obj;
}

function fitObject(obj, targetSize) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z);
  if (max > 0.001) obj.scale.multiplyScalar(targetSize / max);
  const box2 = new THREE.Box3().setFromObject(obj);
  const center = box2.getCenter(new THREE.Vector3());
  obj.position.sub(center);
}

function createSickleMesh() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xd9d7c6, roughness: 0.35, metalness: 0.8 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x3a1e13, roughness: 0.8 });
  const blade = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.026, 8, 34, Math.PI * 1.35), metal);
  blade.rotation.z = -0.95;
  blade.position.set(0.13, 0.18, 0);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.72, 10), handleMat);
  handle.rotation.z = -0.45;
  handle.position.set(-0.12, -0.14, 0);
  group.add(blade, handle);
  group.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return group;
}

function beginGameplay() {
  if (state.mode !== 'intro') return;
  state.mode = 'playing';
  show(ui.intro, false);
  setComms('Iqbal has goons on every corner. Keep moving.');
  tryPlayMusic();
}

function pauseGame() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  show(ui.pause, true);
  if (document.pointerLockElement) document.exitPointerLock();
  tryPauseMusic();
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = 'playing';
  show(ui.pause, false);
  tryPlayMusic();
}

function backToMenu() {
  state.mode = 'menu';
  show(ui.menu, true);
  show(ui.pause, false);
  show(ui.complete, false);
  show(ui.failed, false);
  show(ui.hud, false);
  show(ui.comms, false);
  show(ui.weaponBar, false);
  show(ui.crosshair, false);
  show(ui.intro, false);
  tryPauseMusic();
  if (document.pointerLockElement) document.exitPointerLock();
}

function loop() {
  requestAnimationFrame(loop);
  const realDt = Math.min(clock.getDelta(), 0.045);
  state.elapsed += realDt;

  if (state.mode === 'intro') updateIntro(realDt);
  if (state.mode === 'playing') updateGameplay(realDt);
  if (dustField) dustField.rotation.y += realDt * 0.015;

  renderer.render(scene, camera);
}

function updateIntro(dt) {
  state.introTimer += dt;
  const player = state.player;
  if (!player) return;
  updateActorMixer(player, dt);
  playAction(player, 'idle', 0.2);
  const t = state.introTimer;
  const orbit = t * 0.42;
  const pos = player.group.position;
  camera.position.set(
    pos.x + Math.sin(orbit) * 7.5,
    2.3 + Math.sin(t * 1.2) * 0.4,
    pos.z - 8 + Math.cos(orbit) * 3.0
  );
  camera.lookAt(pos.x, 1.35, pos.z + 1.8);
  if (t > 4.2) beginGameplay();
}

function updateGameplay(realDt) {
  const playerDt = realDt * (state.slowmo > 0 ? 0.86 : 1);
  const simDt = realDt * (state.slowmo > 0 ? 0.28 : 1);

  state.shotCooldown = Math.max(0, state.shotCooldown - playerDt);
  state.weaponCooldown = Math.max(0, state.weaponCooldown - playerDt);
  state.invuln = Math.max(0, state.invuln - realDt);
  if (state.slowmo > 0) {
    state.slowmo = Math.max(0, state.slowmo - realDt);
    ui.slowmoVignette.style.opacity = state.slowmo > 0 ? 0.8 : 0;
  } else {
    state.cigarette = Math.min(100, state.cigarette + realDt * 8.5);
  }

  if (input.touchLook.lengthSq() > 0.0001) {
    state.yaw -= input.touchLook.x * realDt * 2.8;
    state.pitch = THREE.MathUtils.clamp(state.pitch - input.touchLook.y * realDt * 1.6, -0.35, 0.58);
  }

  updatePlayer(playerDt);
  updateCamera(realDt);
  updateGoons(simDt);
  updateBoss(simDt);
  updateProjectiles(simDt);
  updateEffects(realDt);
  updateHud();

  if (input.fireHeld && state.weapon === 'ak') fireWeapon();
}

function updatePlayer(dt) {
  const player = state.player;
  if (!player) return;

  const move = readMoveInput();
  const moving = move.lengthSq() > 0.001;
  const speed = (input.keys.has('shift') ? 7.2 : 5.4) * (state.weapon === 'dynamite' ? 0.94 : 1);

  if (moving) {
    const forward = forwardVector(state.yaw);
    const right = rightVector(state.yaw);
    tmpV.copy(forward).multiplyScalar(move.y).addScaledVector(right, move.x);
    if (tmpV.lengthSq() > 1) tmpV.normalize();
    tmpV.multiplyScalar(speed * dt);
    moveWithCollisions(player.group, tmpV, PLAYER_RADIUS);
    player.group.rotation.y = Math.atan2(tmpV.x, tmpV.z);
  } else {
    player.group.rotation.y = lerpAngle(player.group.rotation.y, state.yaw, Math.min(1, dt * 10));
  }

  if (!state.enteredTown && player.group.position.z > -35) {
    state.enteredTown = true;
    setComms('Welcome to Yaari Town. They saw you cross the sign.');
  }

  updatePlayerAnimation(move, moving);
  updateActorMixer(player, dt);
}

function readMoveInput() {
  const x = (input.keys.has('a') || input.keys.has('arrowleft') ? -1 : 0)
    + (input.keys.has('d') || input.keys.has('arrowright') ? 1 : 0)
    + input.touchMove.x;
  const y = (input.keys.has('w') || input.keys.has('arrowup') ? 1 : 0)
    + (input.keys.has('s') || input.keys.has('arrowdown') ? -1 : 0)
    + input.touchMove.y;
  const v = new THREE.Vector2(x, y);
  if (v.lengthSq() > 1) v.normalize();
  return v;
}

function updatePlayerAnimation(move, moving) {
  const player = state.player;
  if (!player || player.lockUntil > state.elapsed) return;
  if (moving) {
    if (Math.abs(move.x) > Math.abs(move.y) && Math.abs(move.x) > 0.25) {
      playAction(player, move.x < 0 ? 'strafeLeft' : 'strafeRight', 0.14);
    } else if (move.y < -0.2) {
      playAction(player, state.weapon === 'ak' ? 'runBack' : 'walkBack', 0.14);
    } else if (state.weapon === 'ak') {
      playAction(player, input.keys.has('shift') ? 'rifleRun' : 'walk', 0.14);
    } else {
      playAction(player, 'walk', 0.14);
    }
  } else if (state.weapon === 'ak') {
    playAction(player, 'rifleIdle', 0.18);
  } else if (state.weapon === 'sickle') {
    playAction(player, 'knifeIdle', 0.18);
  } else {
    playAction(player, 'idle', 0.18);
  }
}

function moveWithCollisions(group, delta, radius) {
  group.position.add(delta);
  group.position.x = THREE.MathUtils.clamp(group.position.x, -WORLD_LIMIT, WORLD_LIMIT);
  group.position.z = THREE.MathUtils.clamp(group.position.z, -WORLD_LIMIT, WORLD_LIMIT);

  for (const obs of state.obstacles) {
    const dx = group.position.x - obs.pos.x;
    const dz = group.position.z - obs.pos.z;
    const min = radius + obs.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq > 0.0001 && distSq < min * min) {
      const dist = Math.sqrt(distSq);
      const push = (min - dist) / dist;
      group.position.x += dx * push;
      group.position.z += dz * push;
    }
  }
}

function forwardVector(yaw) {
  return tmpV2.set(Math.sin(yaw), 0, Math.cos(yaw));
}

function rightVector(yaw) {
  return tmpV3.set(Math.cos(yaw), 0, -Math.sin(yaw));
}

function updateCamera(dt) {
  const player = state.player;
  if (!player) return;
  const target = tmpV.copy(player.group.position);
  target.y += 1.35;

  const dist = 10.8;
  const height = 4.2 + state.pitch * 3.2;
  const forward = forwardVector(state.yaw).clone();
  const right = rightVector(state.yaw).clone();
  const back = forward.clone().multiplyScalar(-dist);
  const shoulder = 4.3;
  const desired = target.clone().add(back).addScaledVector(right, shoulder);
  desired.y += height;

  const smooth = 1 - Math.pow(0.001, dt);
  camera.position.lerp(desired, smooth);
  const look = target.clone().addScaledVector(forward, 9.5).addScaledVector(right, shoulder);
  look.y += state.pitch * 2.8 + 0.75;
  camera.lookAt(look);
}

function updateGoons(dt) {
  const playerPos = state.player.group.position;
  for (let i = state.goons.length - 1; i >= 0; i -= 1) {
    const goon = state.goons[i];
    const actor = goon.actor;
    if (goon.dead) {
      goon.removeTimer -= dt;
      actor.group.rotation.x = THREE.MathUtils.lerp(actor.group.rotation.x, -Math.PI / 2, dt * 4);
      if (goon.removeTimer <= 0) {
        rootDynamic.remove(actor.group);
        state.goons.splice(i, 1);
      }
      continue;
    }

    const pos = actor.group.position;
    const dist = pos.distanceTo(playerPos);
    const seesPlayer = dist < 26 || state.enteredTown;
    if (seesPlayer && dist > 2.15) {
      tmpV.copy(playerPos).sub(pos);
      tmpV.y = 0;
      if (tmpV.lengthSq() > 0.001) tmpV.normalize();
      const pace = goon.speed * (dist > 10 ? 1 : 0.72);
      moveWithCollisions(actor.group, tmpV.multiplyScalar(pace * dt), goon.radius);
      actor.group.rotation.y = Math.atan2(tmpV.x, tmpV.z);
    }

    goon.attackCooldown -= dt;
    if (dist <= 2.45 && goon.attackCooldown <= 0) {
      goon.attackCooldown = 1.0 + Math.random() * 0.5;
      damagePlayer(8, 'Goon knife');
      spawnHitFlash(playerPos, 0xd34d3f);
    } else if (dist < 16 && goon.attackCooldown <= 0) {
      goon.attackCooldown = 1.4 + Math.random() * 0.8;
      if (Math.random() > 0.35) {
        damagePlayer(5, 'Goon rifle');
        spawnBulletTrail(pos.clone().add(new THREE.Vector3(0, 1.25, 0)), playerPos.clone().add(new THREE.Vector3(0, 1.1, 0)), 0xd34d3f);
      }
    }

    const bob = Math.sin(state.elapsed * 8 + goon.phase) * 0.035;
    actor.model.position.y = actor.baseModelY + bob;
  }
}

function updateBoss(dt) {
  const boss = state.boss;
  if (!boss || boss.dead) return;

  if (!boss.active && (state.goonsKilled >= 8 || state.player.group.position.z > 35)) {
    revealBoss();
  }
  if (!boss.active) {
    updateActorMixer(boss.actor, dt);
    return;
  }

  const actor = boss.actor;
  const pos = actor.group.position;
  const playerPos = state.player.group.position;
  const dist = pos.distanceTo(playerPos);

  if (dist > 3.1) {
    tmpV.copy(playerPos).sub(pos);
    tmpV.y = 0;
    if (tmpV.lengthSq() > 0.001) tmpV.normalize();
    moveWithCollisions(actor.group, tmpV.multiplyScalar(boss.speed * dt), boss.radius);
    actor.group.rotation.y = Math.atan2(tmpV.x, tmpV.z);
    if (actor.lockUntil <= state.elapsed) playAction(actor, 'walk', 0.16);
  } else if (actor.lockUntil <= state.elapsed) {
    playAction(actor, 'rifleIdle', 0.18);
  }

  boss.attackCooldown -= dt;
  boss.burstTimer -= dt;
  if (boss.attackCooldown <= 0) {
    boss.attackCooldown = boss.health < boss.maxHealth * 0.45 ? 0.75 : 1.05;
    boss.burstTimer = 0.22;
    playAction(actor, dist < 4 ? 'stab' : 'rifleFire', 0.08, true, 1.2);
    if (dist < 4) {
      damagePlayer(14, 'Iqbal blade');
      spawnHitFlash(playerPos, 0xffcc77);
    } else {
      const hitChance = state.slowmo > 0 ? 0.35 : 0.7;
      if (Math.random() < hitChance) damagePlayer(10, 'Iqbal rifle');
      spawnBulletTrail(pos.clone().add(new THREE.Vector3(0, 1.55, 0)), playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffd27a);
    }
  }

  updateActorMixer(actor, dt);
}

function revealBoss() {
  const boss = state.boss;
  if (!boss) return;
  boss.active = true;
  state.bossRevealed = true;
  show(ui.bossBar, true);
  setComms('Iqbal stepped out. Break his guard with the sickle.');
  toast('Boss fight: Brigadier Iqbal');
  spawnShockwave(boss.actor.group.position, 0xd34d3f);
}

function fireWeapon() {
  if (state.mode !== 'playing') return;
  if (state.weapon === 'ak') return shootAk();
  if (state.weapon === 'sickle') return throwSickle();
  return throwDynamite();
}

function shootAk() {
  if (state.shotCooldown > 0 || state.ammo <= 0) {
    if (state.ammo <= 0) toast('AK is empty.');
    return;
  }
  state.shotCooldown = state.slowmo > 0 ? 0.16 : 0.105;
  state.ammo -= 1;
  state.firedOnce = true;
  playAction(state.player, 'rifleFire', 0.04, true, 1.55);
  pulseCrosshair();

  const origin = camera.position.clone();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const target = findRayTarget(origin, dir, 54);
  const end = target
    ? target.actor.group.position.clone().add(new THREE.Vector3(0, target.type === 'boss' ? 1.5 : 1.1, 0))
    : origin.clone().addScaledVector(dir, 48);
  spawnBulletTrail(state.player.group.position.clone().add(new THREE.Vector3(0.35, 1.25, 0.35)), end, 0xfff0a8);
  spawnMuzzleFlash();

  if (target) damageTarget(target, target.type === 'boss' ? 8 : 16, 'ak');
}

function throwSickle() {
  if (state.weaponCooldown > 0) return;
  state.weaponCooldown = 0.72;
  state.usedSickle = true;
  playAction(state.player, 'throw', 0.06, true, 1.25);
  pulseCrosshair();

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = THREE.MathUtils.clamp(dir.y, -0.05, 0.18);
  dir.normalize();
  const mesh = createSickleMesh();
  mesh.scale.setScalar(1.35);
  mesh.position.copy(state.player.group.position).add(new THREE.Vector3(0, 1.24, 0)).addScaledVector(dir, 1.15);
  rootDynamic.add(mesh);
  state.projectiles.push({
    type: 'sickle',
    mesh,
    dir,
    age: 0,
    returning: false,
    hit: new Set(),
    speed: 19
  });
}

function throwDynamite() {
  if (state.weaponCooldown > 0) return;
  if (state.dynamite <= 0) {
    toast('No dynamite left.');
    return;
  }
  state.weaponCooldown = 0.95;
  state.dynamite -= 1;
  state.usedDynamite = true;
  playAction(state.player, 'throw', 0.06, true, 1.1);

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = Math.max(0.18, dir.y + 0.12);
  dir.normalize();
  const mesh = makeWeaponObject(assets.models.dynamite, 0.58, 0xc94a36);
  mesh.position.copy(state.player.group.position).add(new THREE.Vector3(0, 1.15, 0)).addScaledVector(dir, 1.1);
  rootDynamic.add(mesh);
  state.projectiles.push({
    type: 'dynamite',
    mesh,
    vel: dir.multiplyScalar(13),
    age: 0,
    fuse: 1.35
  });
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i];
    p.age += dt;
    if (p.type === 'sickle') {
      p.mesh.rotation.y += dt * 18;
      p.mesh.rotation.z += dt * 12;
      if (!p.returning && p.age > 0.55) p.returning = true;
      if (p.returning) {
        tmpV.copy(state.player.group.position).add(new THREE.Vector3(0, 1.1, 0)).sub(p.mesh.position);
        if (tmpV.length() < 0.75 || p.age > 2.4) {
          rootDynamic.remove(p.mesh);
          state.projectiles.splice(i, 1);
          continue;
        }
        tmpV.normalize();
        p.mesh.position.addScaledVector(tmpV, p.speed * 1.1 * dt);
      } else {
        p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      }
      forEachTarget((target) => {
        if (p.hit.has(target) || target.dead) return;
        const d = target.actor.group.position.distanceTo(p.mesh.position);
        if (d < (target.type === 'boss' ? 1.7 : 1.15)) {
          p.hit.add(target);
          damageTarget(target, target.type === 'boss' ? 32 : 38, 'sickle');
          spawnHitFlash(p.mesh.position, 0x8ecdc5);
          if (target.type === 'boss') cutBossArmor(target);
        }
      });
    } else if (p.type === 'dynamite') {
      p.vel.y -= 11.5 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 7;
      p.mesh.rotation.z += dt * 5;
      if (p.mesh.position.y < 0.24) {
        p.mesh.position.y = 0.24;
        p.vel.y *= -0.34;
        p.vel.x *= 0.78;
        p.vel.z *= 0.78;
      }
      if (p.age >= p.fuse) {
        explode(p.mesh.position.clone());
        rootDynamic.remove(p.mesh);
        state.projectiles.splice(i, 1);
      }
    }
  }
}

function findRayTarget(origin, dir, maxDist) {
  ray.origin.copy(origin);
  ray.direction.copy(dir);
  let best = null;
  let bestT = maxDist;
  forEachTarget((target) => {
    if (target.dead) return;
    const center = target.actor.group.position.clone();
    center.y += target.type === 'boss' ? 1.35 : 1.05;
    const to = center.sub(origin);
    const t = to.dot(dir);
    if (t <= 0 || t > maxDist || t > bestT) return;
    const distSq = to.lengthSq() - t * t;
    const radius = target.type === 'boss' ? 1.35 : 0.78;
    if (distSq < radius * radius) {
      best = target;
      bestT = t;
    }
  });
  return best;
}

function forEachTarget(fn) {
  state.goons.forEach(fn);
  if (state.boss && state.boss.active && !state.boss.dead) fn(state.boss);
}

function damageTarget(target, amount, kind) {
  if (target.dead) return;
  const multiplier = state.slowmo > 0 && kind === 'ak' ? 1.18 : 1;
  target.health -= amount * multiplier;
  target.hurtFlash = 0.1;
  spawnHitFlash(target.actor.group.position.clone().add(new THREE.Vector3(0, 1.1, 0)), kind === 'sickle' ? 0x8ecdc5 : 0xffe082);

  if (target.type === 'boss') {
    if (target.health <= 0) killBoss();
    else if (kind === 'dynamite') setComms('Iqbal staggered. Close in with the sickle.');
    return;
  }

  if (target.health <= 0) killGoon(target, kind);
}

function cutBossArmor(boss) {
  if (boss.dead) return;
  const cutThreshold = Math.min(3, Math.floor((boss.maxHealth - boss.health) / 55));
  if (cutThreshold > boss.armorCuts) {
    boss.armorCuts = cutThreshold;
    const lines = ['Left guard cut.', 'Right guard cut.', 'Iqbal is exposed.'];
    setComms(lines[boss.armorCuts - 1] || 'Iqbal is exposed.');
    toast(lines[boss.armorCuts - 1] || 'Armor cut');
    spawnShockwave(boss.actor.group.position, 0x8ecdc5);
  }
}

function killGoon(goon, kind) {
  goon.dead = true;
  goon.health = 0;
  goon.removeTimer = 3.2;
  state.goonsKilled += 1;
  state.score += kind === 'sickle' ? 140 : 100;
  playAction(goon.actor, 'death', 0.08, true, 1);
  spawnShockwave(goon.actor.group.position, 0xd34d3f);
  if (state.goonsKilled === 4) setComms('Half the patrol is down. Iqbal can hear the street go quiet.');
  if (state.goonsKilled === 8 && !state.bossRevealed) revealBoss();
}

function killBoss() {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  boss.dead = true;
  boss.health = 0;
  state.bossDefeated = true;
  state.score += 1000;
  playAction(boss.actor, 'death', 0.12, true, 0.9);
  spawnShockwave(boss.actor.group.position, 0xffe082);
  setComms('Iqbal falls. Yaari Town breathes again.');
  setTimeout(() => {
    if (state.mode === 'playing') completeLevel();
  }, 1200);
}

function explode(position) {
  spawnShockwave(position, 0xffd27a);
  spawnHitFlash(position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd27a, 2.4);
  forEachTarget((target) => {
    const d = target.actor.group.position.distanceTo(position);
    if (d < 6.4) {
      const dmg = THREE.MathUtils.mapLinear(d, 0, 6.4, target.type === 'boss' ? 46 : 58, 12);
      damageTarget(target, dmg, 'dynamite');
    }
  });
  if (state.player.group.position.distanceTo(position) < 5) damagePlayer(12, 'Dynamite splash');
}

function damagePlayer(amount, reason) {
  if (state.invuln > 0 || state.mode !== 'playing') return;
  state.invuln = 0.38;
  state.health = Math.max(0, state.health - amount);
  ui.damageVignette.style.opacity = 1;
  setTimeout(() => { ui.damageVignette.style.opacity = 0; }, 90);
  if (state.health <= 0) failLevel(reason);
}

function activateCigarette() {
  if (state.mode !== 'playing') return;
  if (state.slowmo > 0) return;
  if (state.cigarette < 100) {
    toast('Cigarette focus is charging.');
    return;
  }
  state.cigarette = 0;
  state.slowmo = 5.3;
  state.usedCigarette = true;
  playAction(state.player, 'idle', 0.12);
  showCigarette();
  ui.slowmoVignette.style.opacity = 0.8;
  setComms('Smoke in. Time bends.');
}

function showCigarette() {
  const cig = makeWeaponObject(assets.models.cigarette, 0.36, 0xf2d3a2);
  cig.position.copy(state.player.group.position).add(new THREE.Vector3(0, 1.62, 0)).addScaledVector(forwardVector(state.yaw), 0.72);
  rootDynamic.add(cig);
  state.effects.push({ type: 'meshFade', mesh: cig, life: 1.1, maxLife: 1.1, spin: 2.2 });
}

function spawnMuzzleFlash() {
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff0a8, transparent: true, opacity: 0.95 });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), mat);
  flash.position.copy(state.player.group.position).add(new THREE.Vector3(0, 1.22, 0)).addScaledVector(forwardVector(state.yaw), 0.9);
  rootDynamic.add(flash);
  state.effects.push({ type: 'flash', mesh: flash, life: 0.08, maxLife: 0.08 });
}

function spawnBulletTrail(start, end, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  rootDynamic.add(line);
  state.effects.push({ type: 'line', mesh: line, material: mat, life: 0.09, maxLife: 0.09 });
}

function spawnHitFlash(position, color, scale = 1) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16 * scale, 12, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
  );
  mesh.position.copy(position);
  rootDynamic.add(mesh);
  state.effects.push({ type: 'flash', mesh, life: 0.18, maxLife: 0.18 });
}

function spawnShockwave(position, color) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.36, 36),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(position);
  ring.position.y = 0.08;
  rootDynamic.add(ring);
  state.effects.push({ type: 'shockwave', mesh: ring, life: 0.65, maxLife: 0.65 });
}

function updateEffects(dt) {
  for (let i = state.effects.length - 1; i >= 0; i -= 1) {
    const e = state.effects[i];
    e.life -= dt;
    const t = Math.max(0, e.life / e.maxLife);
    if (e.type === 'shockwave') {
      const s = 1 + (1 - t) * 8;
      e.mesh.scale.set(s, s, s);
      e.mesh.material.opacity = t * 0.72;
    } else if (e.type === 'line') {
      e.material.opacity = t * 0.9;
    } else if (e.type === 'meshFade') {
      e.mesh.rotation.y += dt * e.spin;
      e.mesh.position.y += dt * 0.45;
      e.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = t;
        }
      });
    } else if (e.mesh.material) {
      e.mesh.scale.setScalar(1 + (1 - t) * 2.2);
      e.mesh.material.opacity = t * 0.8;
    }

    if (e.life <= 0) {
      rootDynamic.remove(e.mesh);
      state.effects.splice(i, 1);
    }
  }
}

function pulseCrosshair() {
  ui.crosshair.classList.remove('fire');
  void ui.crosshair.offsetWidth;
  ui.crosshair.classList.add('fire');
}

function setWeapon(weapon) {
  if (state.mode !== 'playing' && state.mode !== 'intro') return;
  state.weapon = weapon;
  rebuildWeaponMount();
  updateWeaponButtons();
  if (weapon === 'ak') setComms('AK47 ready. Hold fire to cut a lane.');
  if (weapon === 'sickle') setComms('Sickle ready. It returns if you stay alive.');
  if (weapon === 'dynamite') setComms('Dynamite ready. Fuse is short.');
}

function updateWeaponButtons() {
  ui.akBtn.classList.toggle('on', state.weapon === 'ak');
  ui.sickleBtn.classList.toggle('on', state.weapon === 'sickle');
  ui.dynamiteBtn.classList.toggle('on', state.weapon === 'dynamite');
  ui.cigBtn.classList.toggle('on', state.slowmo > 0);
}

function updateHud() {
  ui.healthFill.style.width = state.health + '%';
  ui.cigFill.style.width = Math.round(state.cigarette) + '%';
  show(ui.cigBar, true);
  show(ui.bossBar, state.bossRevealed && state.boss && !state.bossDefeated);
  if (state.boss) {
    const bossPct = THREE.MathUtils.clamp((state.boss.health / state.boss.maxHealth) * 100, 0, 100);
    ui.bossFill.style.width = bossPct + '%';
  }
  ui.stats.innerHTML =
    'HP <b>' + Math.round(state.health) + '</b> | AK <b>' + state.ammo + '</b> | DYN <b>' + state.dynamite + '</b><br>' +
    'GOONS <b>' + state.goonsKilled + '/8</b> | SCORE <b>' + state.score + '</b> | WEAPON <b>' + state.weapon.toUpperCase() + '</b>';
  ui.objectiveList.innerHTML = OBJECTIVES.map((o) => {
    const done = o.done();
    return '<div class="' + (done ? 'done' : '') + '">' + (done ? '[x] ' : '[ ] ') + o.label + '</div>';
  }).join('');
  updateWeaponButtons();
}

function setComms(text) {
  ui.comms.textContent = text;
}

function toast(text, err = false) {
  ui.toast.textContent = text;
  ui.toast.classList.toggle('err', err);
  ui.toast.classList.add('on');
  clearTimeout(ui.toast._timer);
  ui.toast._timer = setTimeout(() => ui.toast.classList.remove('on'), 2200);
}

function completeLevel() {
  state.mode = 'complete';
  if (document.pointerLockElement) document.exitPointerLock();
  tryPauseMusic();
  show(ui.complete, true);
  show(ui.weaponBar, false);
  show(ui.crosshair, false);
  ui.completeText.textContent = 'Score ' + state.score + '. Iqbal is down, ' + state.goonsKilled + ' goons are gone, and Yaari Town is yours.';
}

function failLevel(reason) {
  state.mode = 'failed';
  if (document.pointerLockElement) document.exitPointerLock();
  tryPauseMusic();
  show(ui.failed, true);
  show(ui.weaponBar, false);
  show(ui.crosshair, false);
  ui.failedText.textContent = (reason || 'You fell') + '. Replay the street and keep distance when Iqbal steps out.';
}

function tryPlayMusic() {
  if (!ui.bgm) return;
  ui.bgm.volume = 0.34;
  ui.bgm.play().catch(() => {});
}

function tryPauseMusic() {
  if (!ui.bgm) return;
  ui.bgm.pause();
}

function show(el, on) {
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

function shouldAutoplay() {
  const params = new URLSearchParams(window.location.search);
  return params.has('autoplay') || params.has('play');
}

function lerpAngle(a, b, t) {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

function resize() {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
