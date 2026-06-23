import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = id => document.getElementById(id);

const canvas = $('game');
const loading = $('loading');
const loadText = $('loadText');
const menu = $('menu');
const hud = $('hud');
const comms = $('comms');
const weaponBar = $('weaponBar');
const pauseModal = $('pause');
const completeModal = $('complete');
const failedModal = $('failed');
const crosshair = $('crosshair');
const promptEl = $('prompt');
const toastEl = $('toast');
const damageVignette = $('damageVignette');
const bgm = $('bgm');

const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');

const ASSET_URLS = {
  map: 'assets/map.glb',
  hero: 'assets/hero.glb',
  goon: 'assets/normalgoon.glb',
  iqbalBefore: 'assets/iqbalbeforesickle.glb',
  iqbalAfter: 'assets/iqbalaftersickle.glb',
  ak47: 'assets/ak47.glb',
  sickle: 'assets/sickletool.glb',
  dynamite: 'assets/dynamite.glb',
  cigarette: 'assets/cigerette.glb'
};

const OBJECTIVES = [
  'Enter Lyari Town',
  'Break the market patrol',
  'Light dynamite at Iqbal gate',
  'Reach Iqbal compound',
  'Strike Iqbal with sickle',
  'Finish Brigadier Iqbal'
];

const PLACE_LABELS = [
  ['LYARI TOWN ARCH', 0, -30],
  ['KALRI MARKET', -15, -9],
  ['RUST BUS DEPOT', 17, -5],
  ['OLD CINEMA ROAD', 0, 9],
  ['CANAL FLATS', -20, 20],
  ['IQBAL COMPOUND', 0, 32]
];

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc4814e);
scene.fog = new THREE.Fog(0xc4814e, 32, 105);

const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 180);
camera.position.set(0, 4, -9);

const hemi = new THREE.HemisphereLight(0xffefd0, 0x394f42, 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd089, 2.2);
sun.position.set(-25, 42, -18);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -55;
sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8ecdc5, 0.75);
fill.position.set(18, 12, 25);
scene.add(fill);

const world = new THREE.Group();
const actorRoot = new THREE.Group();
const fxRoot = new THREE.Group();
scene.add(world, actorRoot, fxRoot);

const loader = new GLTFLoader();
const models = {};
const colliders = [];
const bullets = [];
const particles = [];
const explosions = [];
const goons = [];
const missionMarkers = [];
const destructibles = [];
const barrels = [];
const pickups = [];
const keys = Object.create(null);

const input = {
  moveX: 0,
  moveZ: 0,
  lookX: 0,
  lookY: 0,
  stickX: 0,
  stickY: 0,
  lookStickX: 0,
  lookStickY: 0,
  mouseDown: false
};

const state = {
  mode: 'loading',
  time: 0,
  last: performance.now(),
  cameraYaw: 0,
  cameraPitch: 0.15,
  mouseLocked: false,
  toastTimer: 0,
  prompt: '',
  damagePulse: 0,
  introT: 0,
  objectives: OBJECTIVES.map(text => ({ text, done: false })),
  commT: 0,
  score: 0,
  bossSeen: false,
  reinforced: false,
  assetsReady: false
};

const hero = {
  group: null,
  body: null,
  weapons: {},
  pos: new THREE.Vector3(0, 0, -38),
  yaw: 0,
  health: 100,
  weapon: 'ak47',
  ammo: 180,
  dynamite: 3,
  fireCd: 0,
  sickleCd: 0,
  dynamiteCd: 0,
  cinematic: null,
  recoil: 0,
  step: 0
};

const iqbal = {
  group: null,
  before: null,
  after: null,
  pos: new THREE.Vector3(0, 0, 35),
  yaw: Math.PI,
  hp: 260,
  maxHp: 260,
  sickled: false,
  dead: false,
  shotCd: 1.4,
  phase: 'waiting'
};

let audioCtx = null;

boot();

async function boot() {
  bindUI();
  bindInput();
  buildWorldShell();
  updateHUD();

  try {
    await loadAssets();
    createDistrictFromMap();
    createActors();
    state.assetsReady = true;
    loading.classList.add('hidden');
    menu.classList.remove('hidden');
    state.mode = 'menu';
    comm('Choose level: Brigadier Iqbal.');
  } catch (err) {
    console.error(err);
    loadText.textContent = 'Could not load one or more GLB assets. Check the assets folder.';
  }

  requestAnimationFrame(loop);
}

async function loadAssets() {
  const entries = Object.entries(ASSET_URLS);
  let loaded = 0;
  await Promise.all(entries.map(async ([name, url]) => {
    models[name] = await loadGLB(url);
    loaded += 1;
    loadText.textContent = `Loading assets ${loaded}/${entries.length}`;
  }));
}

function loadGLB(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, gltf => {
      gltf.scene.traverse(obj => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          if (obj.material) {
            obj.material.side = THREE.FrontSide;
            obj.material.needsUpdate = true;
          }
        }
      });
      resolve(gltf.scene);
    }, undefined, reject);
  });
}

function bindUI() {
  $('levelIqbal').addEventListener('click', () => startLevel());
  $('akBtn').addEventListener('click', () => setWeapon('ak47'));
  $('sickleBtn').addEventListener('click', () => setWeapon('sickle'));
  $('dynamiteBtn').addEventListener('click', () => useDynamite());
  $('pauseBtn').addEventListener('click', pauseGame);
  $('resumeBtn').addEventListener('click', resumeGame);
  $('quitBtn').addEventListener('click', showMenu);
  $('againBtn').addEventListener('click', startLevel);
  $('levelsBtn').addEventListener('click', showMenu);
  $('retryBtn').addEventListener('click', startLevel);
  $('failedLevelsBtn').addEventListener('click', showMenu);
  window.addEventListener('resize', resize);
}

function bindInput() {
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (state.mode !== 'play' && state.mode !== 'intro') return;
    if (k === '1') setWeapon('ak47');
    if (k === '2') setWeapon('sickle');
    if (k === '3' || k === 'q') useDynamite();
    if (k === 'f' || k === ' ') useCurrentWeapon();
    if (k === 'escape') pauseGame();
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  document.addEventListener('pointerlockchange', () => {
    state.mouseLocked = document.pointerLockElement === canvas;
  });
  canvas.addEventListener('click', () => {
    if (state.mode !== 'play') return;
    if (!isTouch && !state.mouseLocked) {
      canvas.requestPointerLock?.();
      return;
    }
    useCurrentWeapon();
  });
  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) input.mouseDown = true;
  });
  window.addEventListener('mouseup', e => {
    if (e.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', e => {
    if (state.mode !== 'play' || !state.mouseLocked) return;
    input.lookX += e.movementX || 0;
    input.lookY += e.movementY || 0;
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  bindTouch();
}

function bindTouch() {
  if (!isTouch) return;
  bindPad($('stick'), $('stickKnob'), (x, y) => { input.stickX = x; input.stickY = y; });
  bindPad($('look'), $('lookKnob'), (x, y) => { input.lookStickX = x; input.lookStickY = y; });
}

function bindPad(pad, knob, setter) {
  let id = null;
  function move(x, y) {
    const r = pad.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = x - cx;
    let dy = y - cy;
    const max = r.width * 0.34;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = dx / len * max;
      dy = dy / len * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    setter(dx / max, dy / max);
  }
  function end(e) {
    if (id !== e.pointerId) return;
    id = null;
    knob.style.transform = '';
    setter(0, 0);
    try { pad.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  pad.addEventListener('pointerdown', e => {
    id = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    move(e.clientX, e.clientY);
  });
  pad.addEventListener('pointermove', e => { if (id === e.pointerId) move(e.clientX, e.clientY); });
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
}

function buildWorldShell() {
  const groundTex = makeGroundTexture();
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(18, 18);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(96, 96),
    new THREE.MeshStandardMaterial({ color: 0x6a5944, map: groundTex, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  addRoad(0, 0, 9.5, 86, 0);
  addRoad(-17, -8, 24, 6, -0.18);
  addRoad(17, 3, 25, 5.5, 0.12);
  addRoad(-15, 22, 26, 5, 0.18);

  addArch();
  addDistrictBuildings();
  addPlaceLabels();
  addMissionMarkers();
  addCanopiesAndWires();
  addPerimeter();
  addCompound();
  addCombatProps();
}

function createDistrictFromMap() {
  const map = normalizeModel(models.map, 72, 'footprint');
  map.name = 'Map concept GLB';
  map.position.set(0, 0.03, 1.5);
  map.traverse(obj => {
    if (!obj.isMesh) return;
    if (obj.material) {
      obj.material = obj.material.clone();
      obj.material.color = new THREE.Color(0x8a7861);
      obj.material.roughness = 0.95;
      obj.material.metalness = 0.02;
      obj.material.transparent = true;
      obj.material.opacity = 0.42;
      obj.material.depthWrite = false;
    }
  });
  world.add(map);
}

function addRoad(x, z, w, h, rot) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x494a43, roughness: 0.92 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  road.rotation.x = -Math.PI / 2;
  road.rotation.z = rot;
  road.position.set(x, 0.045, z);
  road.receiveShadow = true;
  world.add(road);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd2b36b, transparent: true, opacity: 0.5 });
  for (let i = -Math.floor(h / 5); i <= Math.floor(h / 5); i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1.4), lineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.rotation.z = rot;
    dash.position.set(x + Math.sin(rot) * i * 5, 0.055, z + Math.cos(rot) * i * 5);
    world.add(dash);
  }
}

function addArch() {
  const stone = new THREE.MeshStandardMaterial({ color: 0x574233, roughness: 0.96 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c261f, roughness: 0.9 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6.2, 1.2), stone);
  const right = left.clone();
  left.position.set(-5.2, 3.1, -30);
  right.position.set(5.2, 3.1, -30);
  const top = new THREE.Mesh(new THREE.BoxGeometry(12, 1.1, 1.35), stone);
  top.position.set(0, 6.25, -30);
  const sign = makeTextPlane('WELCOME TO LYARI TOWN', 720, 96, '#fff3df', '#2f2720', 24);
  sign.position.set(0, 5.85, -29.25);
  sign.scale.set(7.7, 1.02, 1);
  const back = sign.clone();
  back.position.z = -30.76;
  back.rotation.y = Math.PI;
  world.add(left, right, top, sign, back);
  [left, right, top].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
  addCollider(0, -30, 12.8, 1.2, 'archTop', false);
  addCollider(-5.2, -30, 1.6, 1.4, 'archLeft');
  addCollider(5.2, -30, 1.6, 1.4, 'archRight');

  const watch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.1), dark);
  watch.position.set(-7.2, 0.55, -29.8);
  world.add(watch);
}

function addDistrictBuildings() {
  const mats = [
    new THREE.MeshStandardMaterial({ color: 0x7d5f45, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x5f6d58, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x8a5540, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x6e6a5e, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x415f62, roughness: 1 })
  ];
  const blocks = [
    [-16, -24, 8, 7, 3.4, 0], [15, -23, 8, 8, 4.0, 1],
    [-22, -12, 8, 10, 2.9, 2], [-9, -11, 5, 7, 2.6, 3], [18, -9, 9, 9, 3.1, 4],
    [-25, 5, 8, 10, 3.9, 1], [-12, 7, 6, 8, 3.2, 2], [13, 12, 8, 8, 4.8, 0],
    [25, 10, 6, 12, 3.4, 3], [-23, 25, 9, 9, 4.5, 4], [-10, 25, 7, 9, 3.3, 0],
    [18, 25, 7, 11, 3.7, 1], [30, 26, 5, 8, 2.8, 2],
    [-28, -32, 6, 7, 2.8, 3], [27, -32, 7, 7, 3.2, 2]
  ];
  blocks.forEach((b, i) => addBuilding(...b, mats[b[5] % mats.length], i));

  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (7 + Math.random() * 7);
    const z = -27 + i * 2.3 + (Math.random() - 0.5) * 1.2;
    if (z > 28) continue;
    addStreetClutter(x, z, i);
  }
}

function addBuilding(x, z, w, d, h, mat, idx) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.22, d + 0.25), new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 0.88 }));
  roof.position.y = h + 0.13;
  roof.castShadow = true;
  g.add(roof);

  const winMat = new THREE.MeshStandardMaterial({ color: idx % 3 ? 0x2f4e54 : 0xe0a84e, emissive: idx % 3 ? 0x11272a : 0x6d3f12, emissiveIntensity: 0.25, roughness: 0.6 });
  const count = Math.max(1, Math.floor(w / 2));
  for (let i = 0; i < count; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), winMat);
    win.position.set(-w / 2 + 1 + i * 1.6, h * 0.58, d / 2 + 0.012);
    g.add(win);
  }

  g.position.set(x, 0, z);
  world.add(g);
  addCollider(x, z, w + 0.3, d + 0.3, 'building');
}

function addStreetClutter(x, z, i) {
  const group = new THREE.Group();
  const drumMat = new THREE.MeshStandardMaterial({ color: i % 3 ? 0x38666b : 0x9b3e33, roughness: 0.8, metalness: 0.08 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.75, 12), drumMat);
  drum.position.y = 0.38;
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), new THREE.MeshStandardMaterial({ color: 0x4c3522, roughness: 0.95 }));
  crate.position.set(0.75, 0.28, 0.1);
  group.add(drum, crate);
  group.position.set(x, 0, z);
  group.rotation.y = Math.random() * Math.PI;
  world.add(group);
  addCollider(x + 0.35, z, 1.5, 1.0, 'clutter');
}

function addPlaceLabels() {
  PLACE_LABELS.forEach(([name, x, z]) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f2923, roughness: 0.7 })
    );
    pole.position.set(x, 1.1, z);
    const sign = makeTextPlane(name, 560, 78, '#15110d', '#e9b44c', 25);
    sign.position.set(x, 2.35, z);
    sign.scale.set(3.8, 0.53, 1);
    sign.userData.billboard = true;
    world.add(pole, sign);
  });
}

function addMissionMarkers() {
  const markerData = [
    [0, 0, -30, 'ARCH'],
    [1, -3, -9, 'MARKET'],
    [2, 0, 23, 'GATE'],
    [3, 0, 31, 'COMPOUND'],
    [4, 0, 35, 'SICKLE'],
    [5, 0, 35, 'IQBAL']
  ];
  markerData.forEach(([objective, x, z, label]) => {
    const group = new THREE.Group();
    const color = objective >= 3 ? 0xd34d3f : 0xe9b44c;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.045, 8, 34),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.07;
    const post = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.68, 4),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    post.position.y = 1.2;
    post.rotation.y = Math.PI / 4;
    const sign = makeTextPlane(label, 260, 58, '#15110d', objective >= 3 ? '#d34d3f' : '#e9b44c', 22);
    sign.position.y = 1.82;
    sign.scale.set(1.8, 0.4, 1);
    sign.userData.billboard = true;
    group.add(ring, post, sign);
    group.position.set(x, 0, z);
    group.userData.objective = objective;
    group.userData.ring = ring;
    group.userData.post = post;
    world.add(group);
    missionMarkers.push(group);
  });
}

function addCanopiesAndWires() {
  const tarpMats = [
    new THREE.MeshStandardMaterial({ color: 0xbd6f48, roughness: 0.95, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0x477d83, roughness: 0.95, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0x9d8a49, roughness: 0.95, side: THREE.DoubleSide })
  ];
  [
    [-10, -7, 5.2, 2.5, 0.08],
    [9, -6, 4.8, 2.3, -0.14],
    [-17, 9, 5.4, 2.4, 0.2],
    [17, 17, 5.8, 2.6, -0.18],
    [-8, 25, 5.5, 2.5, 0.13]
  ].forEach((p, i) => {
    const tarp = new THREE.Mesh(new THREE.PlaneGeometry(p[2], p[3], 3, 1), tarpMats[i % tarpMats.length]);
    tarp.rotation.x = -Math.PI / 2.7;
    tarp.rotation.z = p[4];
    tarp.position.set(p[0], 2.65, p[1]);
    tarp.castShadow = true;
    world.add(tarp);
  });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x181511, transparent: true, opacity: 0.72 });
  [
    [[-25, 4, -24], [0, 6.2, -18], [24, 4.5, -22]],
    [[-27, 5.4, -4], [-2, 6.7, 4], [27, 4.8, 1]],
    [[-22, 5.2, 19], [2, 6.4, 22], [25, 5.0, 18]]
  ].forEach(points => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p[0], p[1], p[2]))), wireMat);
    world.add(line);
  });
}

function addPerimeter() {
  addCollider(0, -45, 96, 2, 'northEdge');
  addCollider(0, 45, 96, 2, 'southEdge');
  addCollider(-47, 0, 2, 96, 'westEdge');
  addCollider(47, 0, 2, 96, 'eastEdge');
}

function addCompound() {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x40352b, roughness: 0.92 });
  const parts = [
    [0, 41, 30, 1.2],
    [-15, 32, 1.2, 18],
    [15, 32, 1.2, 18],
    [-8.2, 23, 13.5, 1.2],
    [8.2, 23, 13.5, 1.2]
  ];
  parts.forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, d), wallMat);
    m.position.set(x, 1.6, z);
    m.castShadow = true;
    m.receiveShadow = true;
    world.add(m);
    addCollider(x, z, w, d, 'compound');
  });
  const gateMat = new THREE.MeshStandardMaterial({ color: 0x2b2824, roughness: 0.7, metalness: 0.14 });
  const gate = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.4, 0.34), gateMat);
  gate.position.set(0, 1.25, 23.05);
  gate.userData.kind = 'iqbalGate';
  world.add(gate);
  const gateCollider = addCollider(0, 23.05, 5.8, 0.7, 'iqbalGate');
  destructibles.push({ kind: 'gate', mesh: gate, collider: gateCollider, x: 0, z: 23.05, hp: 120, destroyed: false });
  const title = makeTextPlane('IQBAL COMPOUND', 520, 74, '#fff3df', '#2b2824', 26);
  title.position.set(0, 2.9, 22.82);
  title.scale.set(4.8, 0.68, 1);
  world.add(title);
}

function addCombatProps() {
  [
    [-7.5, -5.5], [8.5, -1.5], [-16.5, 13.5], [12.5, 21.5], [-5.5, 28.5]
  ].forEach((p, i) => addExplosiveBarrel(p[0], p[1], i));
  [
    ['ammo', -12, -20],
    ['health', 21, 6],
    ['dynamite', -21, 19],
    ['ammo', 12, 30]
  ].forEach(p => addPickup(p[0], p[1], p[2]));
}

function addExplosiveBarrel(x, z, i) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1.05, 16),
    new THREE.MeshStandardMaterial({ color: i % 2 ? 0x9b3e33 : 0x2f666f, roughness: 0.75, metalness: 0.08 })
  );
  body.position.y = 0.53;
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x1b1713, roughness: 0.8 });
  const bandA = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.06, 16), bandMat);
  const bandB = bandA.clone();
  bandA.position.y = 0.26;
  bandB.position.y = 0.8;
  group.add(body, bandA, bandB);
  group.position.set(x, 0, z);
  world.add(group);
  const collider = addCollider(x, z, 1.1, 1.1, 'barrel');
  barrels.push({ group, collider, pos: new THREE.Vector3(x, 0, z), hp: 42, exploded: false });
}

function addPickup(type, x, z) {
  const color = type === 'health' ? 0x6f9d70 : type === 'dynamite' ? 0xd34d3f : 0xe9b44c;
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.08, 18),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.46 })
  );
  base.position.y = 0.06;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.38, 0.55),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12, roughness: 0.62 })
  );
  box.position.y = 0.38;
  const label = makeTextPlane(type.toUpperCase(), 220, 58, '#15110d', type === 'health' ? '#6f9d70' : type === 'dynamite' ? '#d34d3f' : '#e9b44c', 21);
  label.position.y = 1.05;
  label.scale.set(1.3, 0.34, 1);
  label.userData.billboard = true;
  group.add(base, box, label);
  group.position.set(x, 0, z);
  group.userData.box = box;
  world.add(group);
  pickups.push({ type, group, pos: new THREE.Vector3(x, 0, z), taken: false });
}

function createActors() {
  hero.group = new THREE.Group();
  hero.body = normalizeModel(models.hero, 2.25, 'height');
  hero.body.rotation.y = Math.PI;
  hero.group.add(hero.body);
  hero.group.position.copy(hero.pos);
  actorRoot.add(hero.group);

  hero.weapons.ak47 = makeWeapon('ak47');
  hero.weapons.sickle = makeWeapon('sickle');
  hero.weapons.dynamite = makeWeapon('dynamite');
  hero.weapons.cigarette = makeWeapon('cigarette');
  hero.group.add(hero.weapons.ak47, hero.weapons.sickle, hero.weapons.dynamite, hero.weapons.cigarette);
  updateWeaponVisibility();

  createGoons();
  createIqbal();
}

function makeWeapon(kind) {
  let model;
  if (kind === 'ak47') {
    model = normalizeModel(models.ak47, 1.35, 'longest');
    model.position.set(0.42, 1.2, 0.42);
    model.rotation.set(0.04, -Math.PI / 2, -0.08);
  } else if (kind === 'sickle') {
    model = normalizeModel(models.sickle, 1.08, 'longest');
    model.position.set(0.44, 1.1, 0.35);
    model.rotation.set(0.65, -Math.PI / 2, -0.7);
  } else if (kind === 'dynamite') {
    model = normalizeModel(models.dynamite, 0.9, 'longest');
    model.position.set(0.34, 1.03, 0.34);
    model.rotation.set(1.1, 0.25, -0.5);
  } else {
    model = normalizeModel(models.cigarette, 0.46, 'longest');
    model.position.set(0.18, 1.72, 0.35);
    model.rotation.set(0.1, -Math.PI / 2, 0);
  }
  model.name = kind;
  return model;
}

function createGoons() {
  clearArray(goons, g => actorRoot.remove(g.group));
  const data = [
    [-11, -17, [[-11, -17], [-22, -13], [-15, -4], [-8, -10]]],
    [11, -15, [[11, -15], [22, -9], [18, 1], [7, -4]]],
    [-19, 5, [[-19, 5], [-25, 11], [-16, 15], [-9, 8]]],
    [18, 12, [[18, 12], [27, 16], [21, 24], [11, 19]]],
    [-7, 21, [[-7, 21], [-17, 23], [-15, 30], [-5, 29]]],
    [8, 26, [[8, 26], [13, 29], [9, 36], [2, 31]]],
    [-9, 33, [[-9, 33], [-13, 36], [-4, 38], [-1, 32]]],
    [9, 34, [[9, 34], [13, 37], [4, 39], [1, 33]]]
  ];
  data.forEach((d, i) => {
    addGoon(d[0], d[1], d[2], i, true);
  });
}

function addGoon(x, z, route, i, base) {
  const group = normalizeModel(models.goon, 2.05, 'height');
  group.position.set(x, 0, z);
  actorRoot.add(group);
  const goon = {
    group,
    pos: new THREE.Vector3(x, 0, z),
    yaw: 0,
    hp: 70,
    maxHp: 70,
    route: route.map(p => new THREE.Vector3(p[0], 0, p[1])),
    target: 0,
    state: 'patrol',
    shotCd: Math.random() * 1.1 + 0.4,
    hurt: 0,
    dead: false,
    base
  };
  goons.push(goon);
  addEnemyMarker(group, i % 2 ? 0xd34d3f : 0xe9b44c);
  return goon;
}

function createIqbal() {
  if (iqbal.group) actorRoot.remove(iqbal.group);
  iqbal.group = new THREE.Group();
  iqbal.before = normalizeModel(models.iqbalBefore, 2.3, 'height');
  iqbal.after = normalizeModel(models.iqbalAfter, 2.3, 'height');
  iqbal.before.rotation.y = Math.PI;
  iqbal.after.rotation.y = Math.PI;
  iqbal.after.visible = false;
  iqbal.group.add(iqbal.before, iqbal.after);
  iqbal.group.position.copy(iqbal.pos);
  iqbal.group.rotation.y = iqbal.yaw;
  addBossAura(iqbal.group);
  actorRoot.add(iqbal.group);
}

function addEnemyMarker(group, color) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.035, 8, 18),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);
}

function addBossAura(group) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.045, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xd34d3f, transparent: true, opacity: 0.82 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);
  group.userData.ring = ring;
}

function startLevel() {
  if (!state.assetsReady) return;
  initAudio();
  bgm.volume = 0.62;
  bgm.currentTime = 0;
  bgm.play().catch(() => {});

  menu.classList.add('hidden');
  pauseModal.classList.add('hidden');
  completeModal.classList.add('hidden');
  failedModal.classList.add('hidden');
  hud.classList.remove('hidden');
  comms.classList.remove('hidden');
  weaponBar.classList.remove('hidden');
  crosshair.classList.remove('hidden');
  state.mode = 'intro';
  state.introT = 0;
  state.time = 0;
  state.score = 0;
  state.bossSeen = false;
  state.reinforced = false;
  state.objectives = OBJECTIVES.map(text => ({ text, done: false }));
  hero.pos.set(0, 0, -38);
  hero.yaw = 0;
  hero.health = 100;
  hero.weapon = 'ak47';
  hero.ammo = 180;
  hero.dynamite = 3;
  hero.fireCd = 0;
  hero.sickleCd = 0;
  hero.dynamiteCd = 0;
  hero.cinematic = null;
  iqbal.hp = iqbal.maxHp;
  iqbal.sickled = false;
  iqbal.dead = false;
  iqbal.phase = 'waiting';
  iqbal.shotCd = 1.3;
  if (iqbal.before) iqbal.before.visible = true;
  if (iqbal.after) iqbal.after.visible = false;
  destructibles.forEach(item => {
    item.destroyed = false;
    item.hp = item.kind === 'gate' ? 120 : item.hp;
    if (item.collider) item.collider.disabled = false;
    if (item.mesh) item.mesh.visible = true;
  });
  barrels.forEach(barrel => {
    barrel.exploded = false;
    barrel.hp = 42;
    barrel.group.visible = true;
    if (barrel.collider) barrel.collider.disabled = false;
  });
  pickups.forEach(p => {
    p.taken = false;
    p.group.visible = true;
  });
  for (let i = goons.length - 1; i >= 0; i--) {
    if (!goons[i].base) {
      actorRoot.remove(goons[i].group);
      goons.splice(i, 1);
    }
  }
  goons.forEach((g, i) => {
    const p = g.route[0];
    g.pos.copy(p);
    g.group.position.copy(p);
    g.hp = g.maxHp;
    g.dead = false;
    g.state = 'patrol';
    g.target = (i + 1) % g.route.length;
    g.group.visible = true;
    g.shotCd = Math.random() * 1.2 + 0.5;
  });
  clearFX();
  updateWeaponVisibility();
  updateHUD();
  toast('Aari Aari rolls through the block.');
  comm('The arch is ahead. The first location is Kalri Market.');
}

function pauseGame() {
  if (state.mode !== 'play' && state.mode !== 'intro') return;
  state.mode = 'paused';
  pauseModal.classList.remove('hidden');
}

function resumeGame() {
  pauseModal.classList.add('hidden');
  state.mode = state.objectives[0].done ? 'play' : 'intro';
}

function showMenu() {
  state.mode = 'menu';
  menu.classList.remove('hidden');
  pauseModal.classList.add('hidden');
  completeModal.classList.add('hidden');
  failedModal.classList.add('hidden');
  hud.classList.add('hidden');
  comms.classList.add('hidden');
  weaponBar.classList.add('hidden');
  crosshair.classList.add('hidden');
  document.exitPointerLock?.();
  bgm.pause();
}

function completeLevel() {
  state.mode = 'complete';
  completeModal.classList.remove('hidden');
  hud.classList.add('hidden');
  comms.classList.add('hidden');
  weaponBar.classList.add('hidden');
  crosshair.classList.add('hidden');
  $('completeText').textContent = `Score ${Math.floor(state.score)}. Brigadier Iqbal is down and the route through Lyari Town is open.`;
  document.exitPointerLock?.();
}

function failLevel(reason) {
  state.mode = 'failed';
  failedModal.classList.remove('hidden');
  hud.classList.add('hidden');
  comms.classList.add('hidden');
  weaponBar.classList.add('hidden');
  crosshair.classList.add('hidden');
  $('failedText').textContent = reason || 'The patrols closed in.';
  document.exitPointerLock?.();
}

function loop(now) {
  const dt = Math.min(0.05, (now - state.last) / 1000 || 0);
  state.last = now;
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function update(dt) {
  state.time += dt;
  if (state.mode === 'intro') updateIntro(dt);
  if (state.mode === 'play') updatePlay(dt);
  if (state.mode === 'intro' || state.mode === 'play' || state.mode === 'paused') {
    updateCamera(dt);
    animateWorld(dt);
  }
  updateFX(dt);
  updatePrompt(dt);
  updateToast(dt);
  updateDamage(dt);
}

function updateIntro(dt) {
  state.introT += dt;
  const t = clamp(state.introT / 6.2, 0, 1);
  const eased = t * t * (3 - 2 * t);
  hero.pos.set(0, 0, lerp(-38, -24.7, eased));
  hero.yaw = 0;
  hero.step += dt * 3.3;
  syncHero(dt);
  if (t > 0.34 && !state.objectives[0].done) {
    completeObjective(0);
    comm('Welcome to Lyari Town.');
  }
  if (t >= 1) {
    state.mode = 'play';
    toast('Kalri Market patrols are moving.');
  }
}

function updatePlay(dt) {
  readMovement();
  updateCooldowns(dt);
  updateHeroMovement(dt);
  updateGoons(dt);
  updateIqbal(dt);
  updateBullets(dt);
  updatePickups(dt);
  updateObjectives();
  if (input.mouseDown && hero.weapon === 'ak47') fireAK();
  syncHero(dt);
  updateHUD();
  if (hero.health <= 0) failLevel('The block swallowed the hero before Iqbal fell.');
}

function readMovement() {
  let x = 0;
  let z = 0;
  if (keys.a || keys.arrowleft) x -= 1;
  if (keys.d || keys.arrowright) x += 1;
  if (keys.w || keys.arrowup) z += 1;
  if (keys.s || keys.arrowdown) z -= 1;
  x += input.stickX;
  z += -input.stickY;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  input.moveX = x;
  input.moveZ = z;
}

function updateCooldowns(dt) {
  hero.fireCd = Math.max(0, hero.fireCd - dt);
  hero.sickleCd = Math.max(0, hero.sickleCd - dt);
  hero.dynamiteCd = Math.max(0, hero.dynamiteCd - dt);
  hero.recoil = Math.max(0, hero.recoil - dt * 7);
}

function updateHeroMovement(dt) {
  if (hero.cinematic) {
    updateHeroCinematic(dt);
    return;
  }
  const lookSpeed = isTouch ? 2.2 : 0.0032;
  state.cameraYaw -= input.lookX * lookSpeed;
  state.cameraPitch = clamp(state.cameraPitch - input.lookY * 0.002, -0.35, 0.55);
  state.cameraYaw -= input.lookStickX * dt * 2.7;
  state.cameraPitch = clamp(state.cameraPitch - input.lookStickY * dt * 1.4, -0.35, 0.55);
  input.lookX = 0;
  input.lookY = 0;

  const forward = new THREE.Vector3(Math.sin(state.cameraYaw), 0, Math.cos(state.cameraYaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const move = new THREE.Vector3()
    .addScaledVector(forward, input.moveZ)
    .addScaledVector(right, input.moveX);
  if (move.lengthSq() > 0.0001) {
    move.normalize();
    hero.yaw = Math.atan2(move.x, move.z);
    const speed = keys.shift ? 7.6 : 5.1;
    tryHeroMove(move.x * speed * dt, move.z * speed * dt);
    hero.step += dt * speed * 1.6;
  }
}

function updateHeroCinematic(dt) {
  const c = hero.cinematic;
  c.t += dt;
  if (c.type === 'sickleIqbal') {
    updateSickleCinematic(c);
  } else if (c.type === 'dynamite') {
    updateDynamiteCinematic(c);
  }
}

function updateSickleCinematic(c) {
  const t = c.t;
  const face = directionTo(hero.pos, iqbal.pos);
  hero.yaw = Math.atan2(face.x, face.z);
  if (t < 0.32) {
    hero.weapons.sickle.rotation.z = lerp(-0.7, 1.6, t / 0.32);
    hero.weapons.sickle.position.y = lerp(1.1, 0.75, t / 0.32);
  } else if (t < 0.72) {
    const k = (t - 0.32) / 0.4;
    hero.weapons.sickle.rotation.z = lerp(1.6, -1.25, k);
    hero.weapons.sickle.position.y = lerp(0.75, 0.42, k);
    if (!c.hit && k > 0.45) {
      c.hit = true;
      slashIqbalLeg();
    }
  } else if (t < 1.45) {
    hero.weapons.sickle.rotation.z = lerp(-1.25, -0.7, (t - 0.72) / 0.73);
    hero.weapons.sickle.position.y = lerp(0.42, 1.1, (t - 0.72) / 0.73);
  } else {
    hero.cinematic = null;
    hero.sickleCd = 0.9;
    hero.weapons.sickle.rotation.set(0.65, -Math.PI / 2, -0.7);
    hero.weapons.sickle.position.set(0.44, 1.1, 0.35);
  }
}

function slashIqbalLeg() {
  iqbal.sickled = true;
  iqbal.phase = 'wounded';
  iqbal.hp = Math.min(iqbal.hp, 170);
  iqbal.before.visible = false;
  iqbal.after.visible = true;
  iqbal.group.rotation.z = -0.18;
  completeObjective(4);
  spawnSlashArc(iqbal.pos.clone().add(new THREE.Vector3(0, 0.55, 0)), 0xd34d3f);
  spawnRedBurst(iqbal.pos.clone().add(new THREE.Vector3(0.15, 0.45, -0.1)), 22);
  shakeCamera(0.28);
  tone(110, 0.12, 'sawtooth', 0.06);
  toast('Iqbal is wounded.');
  comm('The sickle lands. Iqbal staggers and reaches for his last line of guards.');
  spawnReinforcements();
  state.score += 500;
}

function spawnReinforcements() {
  if (state.reinforced) return;
  state.reinforced = true;
  const data = [
    [-12, 39, [[-12, 39], [-6, 35], [-10, 30], [-15, 33]]],
    [12, 39, [[12, 39], [6, 35], [10, 30], [15, 33]]],
    [0, 41, [[0, 41], [-4, 35], [0, 30], [4, 35]]]
  ];
  data.forEach((d, i) => {
    const g = addGoon(d[0], d[1], d[2], i + 20, false);
    g.state = 'chase';
    g.hp = 82;
    g.maxHp = 82;
    spawnHitSpark(g.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xd34d3f);
  });
  toast('Iqbal calls reinforcements.');
}

function updateDynamiteCinematic(c) {
  const t = c.t;
  if (t < 0.34) {
    hero.weapons.cigarette.visible = true;
    hero.weapons.dynamite.visible = true;
    hero.weapons.dynamite.position.set(0.32, lerp(0.9, 1.3, t / 0.34), 0.34);
    hero.weapons.cigarette.position.set(0.18, 1.7, 0.36);
  } else if (t < 0.92) {
    const k = (t - 0.34) / 0.58;
    hero.weapons.cigarette.position.set(lerp(0.18, 0.36, k), lerp(1.7, 1.35, k), lerp(0.36, 0.42, k));
    if (!c.lit && k > 0.55) {
      c.lit = true;
      spawnFuseFlame(hero.group.localToWorld(new THREE.Vector3(0.4, 1.35, 0.45)));
      tone(620, 0.08, 'triangle', 0.04);
      toast('Fuse lit.');
    }
  } else if (t < 1.32) {
    const k = (t - 0.92) / 0.4;
    hero.weapons.dynamite.position.set(lerp(0.32, 0.08, k), lerp(1.3, 1.05, k), lerp(0.34, 0.62, k));
  } else if (t < 1.42) {
    if (!c.thrown) {
      c.thrown = true;
      throwDynamiteObject();
      hero.weapons.dynamite.visible = false;
      hero.weapons.cigarette.visible = false;
    }
  } else {
    hero.cinematic = null;
    updateWeaponVisibility();
  }
}

function tryHeroMove(dx, dz) {
  const oldX = hero.pos.x;
  const oldZ = hero.pos.z;
  hero.pos.x = clamp(hero.pos.x + dx, -44, 44);
  if (hitsCollider(hero.pos.x, hero.pos.z, 0.55)) hero.pos.x = oldX;
  hero.pos.z = clamp(hero.pos.z + dz, -42, 43);
  if (hitsCollider(hero.pos.x, hero.pos.z, 0.55)) hero.pos.z = oldZ;
}

function syncHero(dt) {
  if (!hero.group) return;
  hero.group.position.copy(hero.pos);
  hero.group.rotation.y = hero.yaw;
  const bob = Math.sin(hero.step) * 0.035;
  hero.body.position.y = bob;
  if (hero.weapon === 'ak47') {
    hero.weapons.ak47.position.z = 0.42 - hero.recoil * 0.22;
    hero.weapons.ak47.rotation.x = 0.04 - hero.recoil * 0.35;
  }
}

function updateGoons(dt) {
  const alive = goons.filter(g => !g.dead);
  alive.forEach(g => {
    const dHero = g.pos.distanceTo(hero.pos);
    if (dHero < 15 || state.bossSeen) g.state = 'chase';
    if (g.hurt > 0) g.hurt -= dt;

    if (g.state === 'chase') {
      const dir = directionTo(g.pos, hero.pos);
      const speed = dHero < 3 ? 1.1 : 2.45;
      moveEnemy(g, dir, speed * dt);
      g.yaw = Math.atan2(dir.x, dir.z);
      g.shotCd -= dt;
      if (dHero < 16 && g.shotCd <= 0) {
        g.shotCd = 1.15 + Math.random() * 0.75;
        enemyShoot(g.pos, g.yaw, 7);
      }
    } else {
      const target = g.route[g.target];
      const dir = directionTo(g.pos, target);
      moveEnemy(g, dir, 1.35 * dt);
      g.yaw = Math.atan2(dir.x, dir.z);
      if (g.pos.distanceTo(target) < 0.6) g.target = (g.target + 1) % g.route.length;
    }
    g.group.position.copy(g.pos);
    g.group.rotation.y = g.yaw + Math.sin(state.time * 4) * 0.035;
    g.group.rotation.z = g.hurt > 0 ? Math.sin(state.time * 34) * 0.08 : 0;
  });
}

function moveEnemy(g, dir, amount) {
  const old = g.pos.clone();
  g.pos.addScaledVector(dir, amount);
  if (hitsCollider(g.pos.x, g.pos.z, 0.45)) g.pos.copy(old);
}

function updateIqbal(dt) {
  if (iqbal.dead) return;
  const d = hero.pos.distanceTo(iqbal.pos);
  if (d < 19 && !state.bossSeen) {
    state.bossSeen = true;
    iqbal.phase = 'active';
    completeObjective(3);
    comm('Brigadier Iqbal is inside the compound.');
    toast('Iqbal spotted.');
  }
  if (!state.bossSeen) return;
  const dir = directionTo(iqbal.pos, hero.pos);
  iqbal.yaw = Math.atan2(dir.x, dir.z);
  iqbal.group.rotation.y = iqbal.yaw;
  if (iqbal.group.userData.ring) {
    iqbal.group.userData.ring.rotation.z += dt * 1.7;
  }
  if (iqbal.sickled) {
    iqbal.group.rotation.z = Math.sin(state.time * 7) * 0.05 - 0.16;
  }
  iqbal.shotCd -= dt;
  if (d < 24 && iqbal.shotCd <= 0) {
    iqbal.shotCd = iqbal.sickled ? 1.3 : 0.9;
    enemyShoot(iqbal.pos, iqbal.yaw, iqbal.sickled ? 10 : 8);
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.vel, dt);
    b.trail.scale.z = Math.max(0.1, b.life * 2.8);
    if (b.life <= 0 || hitsCollider(b.mesh.position.x, b.mesh.position.z, 0.05)) {
      removeBullet(i);
      continue;
    }
    if (b.owner === 'hero') {
      const hitGoon = goons.find(g => !g.dead && g.pos.distanceTo(b.mesh.position) < 0.8);
      if (hitGoon) {
        damageGoon(hitGoon, b.damage);
        spawnHitSpark(b.mesh.position, 0xe9b44c);
        removeBullet(i);
        continue;
      }
      const hitBarrel = barrels.find(barrel => !barrel.exploded && barrel.pos.distanceTo(b.mesh.position) < 0.8);
      if (hitBarrel) {
        damageBarrel(hitBarrel, b.damage);
        spawnHitSpark(b.mesh.position, 0xe9b44c);
        removeBullet(i);
        continue;
      }
      const gate = destructibles.find(d => d.kind === 'gate' && !d.destroyed);
      if (gate && Math.hypot(gate.x - b.mesh.position.x, gate.z - b.mesh.position.z) < 2.9) {
        damageGate(gate, Math.round(b.damage * 0.35), false);
        spawnHitSpark(b.mesh.position, 0xe9b44c);
        removeBullet(i);
        continue;
      }
      if (!iqbal.dead && state.bossSeen && iqbal.pos.distanceTo(b.mesh.position) < 1.05) {
        if (!iqbal.sickled) {
          iqbal.hp = Math.max(185, iqbal.hp - Math.round(b.damage * 0.18));
          toast('Iqbal is armored. Close in with the sickle.');
          spawnHitSpark(b.mesh.position, 0xd34d3f);
        } else {
          damageIqbal(b.damage);
          spawnHitSpark(b.mesh.position, 0xe9b44c);
        }
        removeBullet(i);
        continue;
      }
    } else if (hero.pos.distanceTo(b.mesh.position) < 0.85) {
      damageHero(b.damage);
      spawnHitSpark(b.mesh.position, 0xd34d3f);
      removeBullet(i);
    }
  }
}

function updatePickups(dt) {
  pickups.forEach(p => {
    if (p.taken) return;
    p.group.rotation.y += dt * 1.1;
    if (p.group.userData.box) {
      p.group.userData.box.position.y = 0.38 + Math.sin(state.time * 4) * 0.08;
    }
    if (hero.pos.distanceTo(p.pos) < 1.25) {
      p.taken = true;
      p.group.visible = false;
      if (p.type === 'ammo') {
        hero.ammo += 75;
        toast('AK47 ammo picked up.');
      } else if (p.type === 'health') {
        hero.health = Math.min(100, hero.health + 35);
        toast('Health recovered.');
      } else {
        hero.dynamite += 1;
        toast('Dynamite picked up.');
      }
      updateHUD();
    }
  });
}

function damageBarrel(barrel, amount) {
  if (barrel.exploded) return;
  barrel.hp -= amount;
  if (barrel.hp <= 0) explodeBarrel(barrel);
}

function explodeBarrel(barrel) {
  if (barrel.exploded) return;
  barrel.exploded = true;
  barrel.collider.disabled = true;
  barrel.group.visible = false;
  spawnExplosion(barrel.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0.78, true);
}

function damageGate(gate, amount, fromExplosion) {
  if (gate.destroyed) return;
  gate.hp -= amount;
  if (!fromExplosion && gate.hp > 0) {
    toast('The gate is reinforced. Dynamite will open it.');
  }
  if (gate.hp <= 0 || fromExplosion) destroyGate(gate);
}

function destroyGate(gate) {
  if (gate.destroyed) return;
  gate.destroyed = true;
  gate.collider.disabled = true;
  gate.mesh.visible = false;
  completeObjective(2);
  spawnHitSpark(new THREE.Vector3(gate.x, 1.2, gate.z), 0xe9b44c);
  spawnExplosion(new THREE.Vector3(gate.x, 0.35, gate.z), 0.7, false);
  comm('The dynamite tears open Iqbal gate.');
  toast('Iqbal gate opened.');
  state.score += 420;
}

function removeBullet(i) {
  const b = bullets[i];
  fxRoot.remove(b.mesh);
  bullets.splice(i, 1);
}

function updateObjectives() {
  const aliveMarket = goons.filter(g => !g.dead && g.pos.z < 23).length;
  if (!state.objectives[1].done && aliveMarket <= 1) {
    completeObjective(1);
    comm('The market patrol is broken. Iqbal gate needs dynamite.');
  }
  if (!state.objectives[3].done && hero.pos.z > 22) {
    completeObjective(3);
    state.bossSeen = true;
    comm('Iqbal compound is open.');
  }
}

function useCurrentWeapon() {
  if (state.mode !== 'play') return;
  if (hero.weapon === 'ak47') fireAK();
  else if (hero.weapon === 'sickle') swingSickle();
  else useDynamite();
}

function setWeapon(kind) {
  if (hero.cinematic) return;
  hero.weapon = kind;
  updateWeaponVisibility();
  updateHUD();
}

function updateWeaponVisibility() {
  if (!hero.weapons.ak47) return;
  hero.weapons.ak47.visible = hero.weapon === 'ak47';
  hero.weapons.sickle.visible = hero.weapon === 'sickle';
  hero.weapons.dynamite.visible = hero.weapon === 'dynamite';
  hero.weapons.cigarette.visible = false;
  $('akBtn').classList.toggle('on', hero.weapon === 'ak47');
  $('sickleBtn').classList.toggle('on', hero.weapon === 'sickle');
  $('dynamiteBtn').classList.toggle('on', hero.weapon === 'dynamite');
}

function fireAK() {
  if (hero.fireCd > 0 || hero.ammo <= 0 || hero.cinematic) return;
  setWeapon('ak47');
  hero.yaw = state.cameraYaw;
  hero.fireCd = 0.085;
  hero.ammo -= 1;
  hero.recoil = 1;
  const dir = new THREE.Vector3(Math.sin(hero.yaw), 0, Math.cos(hero.yaw)).normalize();
  const origin = hero.pos.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(dir, 0.95);
  const spread = (Math.random() - 0.5) * 0.045;
  const shotDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
  spawnBullet(origin, shotDir.multiplyScalar(34), 'hero', 16);
  spawnMuzzle(origin, dir);
  tone(82 + Math.random() * 22, 0.055, 'square', 0.035);
}

function swingSickle() {
  if (hero.sickleCd > 0 || hero.cinematic) return;
  setWeapon('sickle');
  hero.yaw = state.cameraYaw;
  hero.sickleCd = 0.62;
  const dir = new THREE.Vector3(Math.sin(hero.yaw), 0, Math.cos(hero.yaw));
  const center = hero.pos.clone().addScaledVector(dir, 1.2);
  spawnSlashArc(center.clone().add(new THREE.Vector3(0, 0.9, 0)), 0xe9b44c);
  let hit = false;
  goons.forEach(g => {
    if (g.dead) return;
    const to = g.pos.clone().sub(hero.pos);
    if (to.length() < 2.2 && dir.dot(to.normalize()) > 0.25) {
      damageGoon(g, 55);
      hit = true;
    }
  });
  if (!iqbal.dead && state.bossSeen && hero.pos.distanceTo(iqbal.pos) < 2.6) {
    if (!iqbal.sickled) {
      hero.cinematic = { type: 'sickleIqbal', t: 0, hit: false };
      hit = true;
    } else {
      damageIqbal(34);
      spawnRedBurst(iqbal.pos.clone().add(new THREE.Vector3(0, 1, 0)), 10);
      hit = true;
    }
  }
  tone(hit ? 180 : 240, 0.09, 'triangle', hit ? 0.06 : 0.03);
}

function useDynamite() {
  if (state.mode !== 'play' || hero.dynamiteCd > 0 || hero.dynamite <= 0 || hero.cinematic) return;
  setWeapon('dynamite');
  hero.yaw = state.cameraYaw;
  hero.dynamite -= 1;
  hero.dynamiteCd = 2.4;
  hero.cinematic = { type: 'dynamite', t: 0, lit: false, thrown: false };
  updateWeaponVisibility();
  hero.weapons.dynamite.visible = true;
  hero.weapons.cigarette.visible = true;
  comm('The cigarette meets the fuse.');
}

function throwDynamiteObject() {
  const dir = new THREE.Vector3(Math.sin(hero.yaw), 0, Math.cos(hero.yaw));
  const start = hero.pos.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(dir, 0.8);
  const obj = normalizeModel(models.dynamite, 0.85, 'longest');
  obj.position.copy(start);
  fxRoot.add(obj);
  explosions.push({
    mesh: obj,
    vel: dir.multiplyScalar(8.5).add(new THREE.Vector3(0, 4.0, 0)),
    t: 0,
    fuse: 1.45,
    exploded: false
  });
}

function enemyShoot(pos, yaw, damage) {
  const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  const origin = pos.clone().add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(dir, 0.8);
  const spread = (Math.random() - 0.5) * 0.12;
  const shotDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
  spawnBullet(origin, shotDir.multiplyScalar(24), 'enemy', damage);
  spawnMuzzle(origin, dir, 0xd34d3f);
  tone(150, 0.05, 'sawtooth', 0.02);
}

function spawnBullet(origin, velocity, owner, damage) {
  const color = owner === 'hero' ? 0xe9b44c : 0xd34d3f;
  const group = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 8, 5),
    new THREE.MeshBasicMaterial({ color })
  );
  const trail = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.035, 1.0),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
  );
  trail.position.z = -0.45;
  group.add(ball, trail);
  group.position.copy(origin);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), velocity.clone().normalize());
  fxRoot.add(group);
  bullets.push({ mesh: group, trail, vel: velocity, life: 1.35, owner, damage });
}

function damageGoon(g, amount) {
  g.hp -= amount;
  g.hurt = 0.16;
  g.state = 'chase';
  spawnRedBurst(g.pos.clone().add(new THREE.Vector3(0, 1.0, 0)), 8);
  if (g.hp <= 0) {
    g.dead = true;
    g.group.visible = false;
    state.score += 120;
    spawnBodyMark(g.pos.x, g.pos.z);
  }
}

function damageIqbal(amount) {
  if (iqbal.dead) return;
  iqbal.hp -= amount;
  spawnRedBurst(iqbal.pos.clone().add(new THREE.Vector3(0, 1.0, 0)), 8);
  if (iqbal.hp <= 0) {
    iqbal.dead = true;
    iqbal.group.rotation.z = -1.18;
    iqbal.group.position.y = 0.08;
    completeObjective(5);
    state.score += 1600 + hero.health * 8 + hero.dynamite * 90 + hero.ammo;
    spawnExplosion(iqbal.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), 0.65, false);
    comm('Iqbal is finished.');
    setTimeout(() => completeLevel(), 900);
  }
}

function damageHero(amount) {
  hero.health = Math.max(0, hero.health - amount);
  state.damagePulse = 1;
  shakeCamera(0.1);
}

function updateFX(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i];
    ex.t += dt;
    if (!ex.exploded) {
      ex.vel.y -= 9.8 * dt;
      ex.mesh.position.addScaledVector(ex.vel, dt);
      if (ex.mesh.position.y < 0.22) {
        ex.mesh.position.y = 0.22;
        ex.vel.y *= -0.28;
        ex.vel.x *= 0.68;
        ex.vel.z *= 0.68;
      }
      if (Math.random() < 0.6) spawnFuseFlame(ex.mesh.position.clone().add(new THREE.Vector3(0, 0.25, 0)), 0.38);
      if (ex.t >= ex.fuse) {
        ex.exploded = true;
        const p = ex.mesh.position.clone();
        fxRoot.remove(ex.mesh);
        explosions.splice(i, 1);
        spawnExplosion(p, 1.0, true);
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vel.y -= p.gravity * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += p.spin.x * dt;
    p.mesh.rotation.y += p.spin.y * dt;
    p.mesh.scale.multiplyScalar(1 + p.grow * dt);
    if (p.mesh.material && 'opacity' in p.mesh.material) {
      p.mesh.material.opacity = Math.max(0, p.life / p.maxLife) * p.baseOpacity;
    }
    if (p.life <= 0) {
      fxRoot.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

function spawnExplosion(pos, scale = 1, applyDamage = true) {
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(1.4 * scale, 18, 12),
    new THREE.MeshBasicMaterial({ color: 0xffc15a, transparent: true, opacity: 0.82 })
  );
  ball.position.copy(pos);
  fxRoot.add(ball);
  particles.push({ mesh: ball, vel: new THREE.Vector3(), life: 0.48, maxLife: 0.48, gravity: 0, spin: new THREE.Vector3(), grow: 4.2, baseOpacity: 0.82 });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.4 * scale, 0.55 * scale, 30),
    new THREE.MeshBasicMaterial({ color: 0xe9b44c, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(pos);
  ring.position.y = 0.08;
  fxRoot.add(ring);
  particles.push({ mesh: ring, vel: new THREE.Vector3(), life: 0.55, maxLife: 0.55, gravity: 0, spin: new THREE.Vector3(), grow: 5.5, baseOpacity: 0.9 });
  for (let i = 0; i < 42; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = new THREE.Vector3(Math.cos(a) * (2 + Math.random() * 7), 1.4 + Math.random() * 4, Math.sin(a) * (2 + Math.random() * 7));
    spawnParticle(pos.clone(), v, 0xe9b44c, 0.14 + Math.random() * 0.12, 0.7 + Math.random() * 0.5, 0.35);
  }
  tone(56, 0.28, 'sawtooth', 0.09);
  shakeCamera(0.45);
  if (!applyDamage) return;
  barrels.forEach(barrel => {
    if (!barrel.exploded && barrel.pos.distanceTo(pos) < 6.2 * scale) explodeBarrel(barrel);
  });
  destructibles.forEach(item => {
    if (item.kind === 'gate' && !item.destroyed && Math.hypot(item.x - pos.x, item.z - pos.z) < 6.4 * scale) {
      damageGate(item, 999, true);
    }
  });
  goons.forEach(g => {
    if (!g.dead && g.pos.distanceTo(pos) < 7.2 * scale) damageGoon(g, 120);
  });
  if (!iqbal.dead && iqbal.pos.distanceTo(pos) < 7.2 * scale) {
    if (!iqbal.sickled) {
      iqbal.hp = Math.max(170, iqbal.hp - 30);
      toast('Iqbal absorbs the blast. The sickle is needed.');
    } else {
      damageIqbal(95);
    }
  }
  if (hero.pos.distanceTo(pos) < 5.0 * scale) damageHero(24);
}

function spawnMuzzle(pos, dir, color = 0xe9b44c) {
  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.55, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 })
  );
  flash.position.copy(pos).addScaledVector(dir, 0.25);
  flash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  fxRoot.add(flash);
  particles.push({ mesh: flash, vel: dir.clone().multiplyScalar(1.2), life: 0.06, maxLife: 0.06, gravity: 0, spin: new THREE.Vector3(), grow: 1.2, baseOpacity: 0.88 });
}

function spawnSlashArc(pos, color) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.035, 8, 32, Math.PI * 1.25), mat);
  ring.position.copy(pos);
  ring.rotation.set(Math.PI / 2, 0.4, hero.yaw - Math.PI / 2);
  fxRoot.add(ring);
  particles.push({ mesh: ring, vel: new THREE.Vector3(), life: 0.24, maxLife: 0.24, gravity: 0, spin: new THREE.Vector3(0, 3, 0), grow: 1.0, baseOpacity: 0.9 });
}

function spawnHitSpark(pos, color) {
  for (let i = 0; i < 8; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 2.5, (Math.random() - 0.5) * 4);
    spawnParticle(pos.clone(), v, color, 0.06, 0.38, 0.45);
  }
}

function spawnRedBurst(pos, n) {
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 3.5, 0.6 + Math.random() * 2.5, (Math.random() - 0.5) * 3.5);
    spawnParticle(pos.clone(), v, 0x9c1717, 0.07 + Math.random() * 0.04, 0.58, 0.5);
  }
}

function spawnFuseFlame(pos, amount = 1) {
  for (let i = 0; i < 3 * amount; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 1.2, (Math.random() - 0.5) * 0.6);
    spawnParticle(pos.clone(), v, Math.random() > 0.5 ? 0xffc15a : 0xd34d3f, 0.045, 0.32, 0.9);
  }
}

function spawnBodyMark(x, z) {
  const mark = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 14),
    new THREE.MeshBasicMaterial({ color: 0x5d1110, transparent: true, opacity: 0.42, depthWrite: false })
  );
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(x, 0.065, z);
  fxRoot.add(mark);
  particles.push({ mesh: mark, vel: new THREE.Vector3(), life: 7, maxLife: 7, gravity: 0, spin: new THREE.Vector3(), grow: 0.03, baseOpacity: 0.42 });
}

function spawnParticle(pos, vel, color, size, life, opacity) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
  );
  mesh.position.copy(pos);
  fxRoot.add(mesh);
  particles.push({
    mesh,
    vel,
    life,
    maxLife: life,
    gravity: 5.2,
    spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
    grow: -0.3,
    baseOpacity: opacity
  });
}

function updateCamera(dt) {
  const yaw = state.cameraYaw;
  const pitch = state.cameraPitch;
  const behind = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(7.2);
  const target = hero.pos.clone().add(new THREE.Vector3(0, 1.45, 0));
  const desired = target.clone().add(behind).add(new THREE.Vector3(0, 3.3 + pitch * 3, 0));
  camera.position.lerp(desired, 1 - Math.pow(0.002, dt));
  const lookAt = target.clone().add(new THREE.Vector3(Math.sin(yaw), 0.2 + pitch * 2, Math.cos(yaw)).multiplyScalar(3.4));
  camera.lookAt(lookAt);
}

function animateWorld(dt) {
  world.traverse(obj => {
    if (obj.userData.billboard) obj.lookAt(camera.position.x, obj.position.y, camera.position.z);
  });
  updateMissionMarkers(dt);
}

function updateMissionMarkers(dt) {
  const next = state.objectives.findIndex(o => !o.done);
  missionMarkers.forEach(marker => {
    const objective = marker.userData.objective;
    const shouldShow = (state.mode === 'intro' || state.mode === 'play')
      && (objective === next || (state.bossSeen && objective >= 3 && !state.objectives[objective].done));
    marker.visible = shouldShow;
    if (!shouldShow) return;
    const pulse = 1 + Math.sin(state.time * 4 + objective) * 0.1;
    marker.userData.ring.scale.setScalar(pulse);
    marker.userData.ring.rotation.z += dt * (1.2 + objective * 0.15);
    marker.userData.post.position.y = 1.15 + Math.sin(state.time * 5 + objective) * 0.14;
  });
}

function updateHUD() {
  $('stats').innerHTML = `HP <b>${Math.ceil(hero.health)}</b> | AMMO <b>${hero.ammo}</b> | DYN <b>${hero.dynamite}</b> | WEAPON <b>${hero.weapon.toUpperCase()}</b>`;
  $('healthFill').style.width = `${clamp(hero.health, 0, 100)}%`;
  const bossVisible = state.bossSeen && !iqbal.dead;
  $('bossBar').classList.toggle('hidden', !bossVisible);
  $('bossFill').style.width = `${clamp((iqbal.hp / iqbal.maxHp) * 100, 0, 100)}%`;
  $('objectiveList').innerHTML = state.objectives.map(o => `<div class="${o.done ? 'done' : ''}">${escapeHTML(o.text)}</div>`).join('');
}

function updatePrompt() {
  let txt = '';
  if (state.mode === 'play') {
    if (!iqbal.dead && state.bossSeen && !iqbal.sickled && hero.pos.distanceTo(iqbal.pos) < 2.8) txt = 'SICKLE IQBAL';
    else if (hero.weapon === 'dynamite' && hero.dynamite > 0) txt = 'USE DYNAMITE';
  }
  promptEl.textContent = txt;
  promptEl.classList.toggle('on', !!txt);
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  state.toastTimer = 2.3;
}

function updateToast(dt) {
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) toastEl.classList.remove('on');
  }
}

function comm(msg) {
  comms.textContent = msg;
}

function updateDamage(dt) {
  state.damagePulse = Math.max(0, state.damagePulse - dt * 2.9);
  damageVignette.style.opacity = state.damagePulse * 0.72;
}

function completeObjective(i) {
  if (state.objectives[i] && !state.objectives[i].done) {
    state.objectives[i].done = true;
    state.score += 180 + i * 60;
    updateHUD();
  }
}

function hitsCollider(x, z, radius) {
  for (const c of colliders) {
    if (c.disabled) continue;
    if (c.soft) continue;
    const nx = clamp(x, c.x - c.w / 2, c.x + c.w / 2);
    const nz = clamp(z, c.z - c.d / 2, c.z + c.d / 2);
    if (Math.hypot(x - nx, z - nz) < radius) return true;
  }
  return false;
}

function addCollider(x, z, w, d, name, solid = true) {
  const collider = { x, z, w, d, name, soft: !solid, disabled: false };
  colliders.push(collider);
  return collider;
}

function directionTo(a, b) {
  const d = new THREE.Vector3(b.x - a.x, 0, b.z - a.z);
  if (d.lengthSq() < 0.0001) return new THREE.Vector3(0, 0, 1);
  return d.normalize();
}

function normalizeModel(src, target, mode) {
  const root = src.clone(true);
  const group = new THREE.Group();
  group.add(root);
  let box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  let basis = size.y || 1;
  if (mode === 'longest') basis = Math.max(size.x, size.y, size.z) || 1;
  if (mode === 'footprint') basis = Math.max(size.x, size.z) || 1;
  const s = target / basis;
  root.scale.setScalar(s);
  box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  group.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return group;
}

function makeTextPlane(text, w, h, fg, bg, fontSize) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = fg;
  ctx.font = `bold ${fontSize}px Courier New, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: false, side: THREE.DoubleSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(1, h / w), mat);
}

function makeGroundTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6a5944';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const v = 78 + Math.random() * 64;
    ctx.fillStyle = `rgba(${v},${Math.max(55, v - 18)},${Math.max(42, v - 32)},${0.08 + Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = 'rgba(40,34,28,0.18)';
    ctx.beginPath();
    ctx.moveTo(Math.random() * 128, Math.random() * 128);
    ctx.lineTo(Math.random() * 128, Math.random() * 128);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(c);
}

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(freq, dur, type, gain) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function shakeCamera(amount) {
  camera.position.x += (Math.random() - 0.5) * amount;
  camera.position.y += (Math.random() - 0.5) * amount * 0.5;
}

function clearFX() {
  bullets.splice(0).forEach(b => fxRoot.remove(b.mesh));
  explosions.splice(0).forEach(e => fxRoot.remove(e.mesh));
  particles.splice(0).forEach(p => fxRoot.remove(p.mesh));
}

function clearArray(arr, remove) {
  while (arr.length) {
    const item = arr.pop();
    remove(item);
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
