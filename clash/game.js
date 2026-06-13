const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const STEP = 1 / 60;
const ARENA_X = 6.2;
const ARENA_Z = 2.35;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

const SETTINGS_DEFAULT = {
  difficulty: 'medium',
  roundTime: 99,
  deadzone: 0.18,
  shake: true,
  rumble: true,
  sound: true
};

const DIFF = {
  easy: { react: 0.42, aggro: 0.34, block: 0.22, combo: 0.2, mistake: 0.22 },
  medium: { react: 0.26, aggro: 0.52, block: 0.44, combo: 0.42, mistake: 0.12 },
  hard: { react: 0.16, aggro: 0.7, block: 0.64, combo: 0.68, mistake: 0.06 },
  nightmare: { react: 0.08, aggro: 0.86, block: 0.82, combo: 0.86, mistake: 0.02 }
};

const FIGHTERS = [
  {
    id: 'rowan',
    name: 'Rowan',
    role: 'Wild Balance',
    color: 0xc94c3d,
    accent: 0xf5c45e,
    hair: 0x1a1210,
    skin: 0xd79a72,
    scale: 1,
    speed: 4.0,
    step: 3.2,
    dash: 7.8,
    jump: 8.2,
    weight: 1,
    power: 6,
    reach: 5,
    defense: 6,
    technique: 6,
    special: 'Flame Fang',
    super: 'Great Stag Breaker',
    style: 'Balanced martial artist with clean launch confirms and a reliable anti-air.'
  },
  {
    id: 'brakka',
    name: 'Brakka',
    role: 'Iron Grappler',
    color: 0x36664a,
    accent: 0xffd275,
    hair: 0x322018,
    skin: 0xc48660,
    scale: 1.16,
    speed: 3.25,
    step: 2.55,
    dash: 6.2,
    jump: 7.1,
    weight: 1.25,
    power: 10,
    reach: 4,
    defense: 9,
    technique: 4,
    special: 'Horn Driver',
    super: 'Mountain Splitter',
    style: 'Huge command throws, armored shoulders, and terrifying close-range damage.'
  },
  {
    id: 'kaia',
    name: 'Kaia',
    role: 'Moonblade Ninja',
    color: 0x30306f,
    accent: 0x67e5ff,
    hair: 0x07111a,
    skin: 0xd8a07a,
    scale: 0.93,
    speed: 5.05,
    step: 4.1,
    dash: 10,
    jump: 9.4,
    weight: 0.9,
    power: 5,
    reach: 6,
    defense: 4,
    technique: 9,
    special: 'Shadow Wheel',
    super: 'No-Moon Rend',
    style: 'Fastest sidestep, cross-up air pressure, and long juggle routes.'
  },
  {
    id: 'sora',
    name: 'Sora',
    role: 'Storm Zoner',
    color: 0x7455bd,
    accent: 0xff77d6,
    hair: 0xf4e6ff,
    skin: 0xca9470,
    scale: 0.98,
    speed: 3.75,
    step: 3.35,
    dash: 7.2,
    jump: 8.0,
    weight: 0.96,
    power: 6,
    reach: 10,
    defense: 5,
    technique: 7,
    special: 'Prism Howl',
    super: 'Sky River',
    style: 'Controls the arena with arcing projectiles and long-range beam punishes.'
  },
  {
    id: 'voss',
    name: 'Voss',
    role: 'Rushdown Striker',
    color: 0xd66a28,
    accent: 0xffef6a,
    hair: 0x6b1d13,
    skin: 0xd49a70,
    scale: 0.96,
    speed: 4.75,
    step: 3.7,
    dash: 10.5,
    jump: 8.6,
    weight: 0.95,
    power: 7,
    reach: 4,
    defense: 5,
    technique: 7,
    special: 'Blitz Antler',
    super: 'Thunder Stampede',
    style: 'Relentless plus frames, wall carry, and brutal spinning kicks.'
  },
  {
    id: 'mira',
    name: 'Mira',
    role: 'Technical Druid',
    color: 0x188b83,
    accent: 0x9dffb7,
    hair: 0x173b2d,
    skin: 0xd9a57d,
    scale: 0.99,
    speed: 4.2,
    step: 3.8,
    dash: 8.6,
    jump: 8.4,
    weight: 0.97,
    power: 6,
    reach: 6,
    defense: 5,
    technique: 10,
    special: 'Bloom Snare',
    super: 'Verdant Clockwork',
    style: 'Trap setups, cancel-heavy strings, and technical air conversions.'
  }
];

const BY_ID = new Map(FIGHTERS.map((f) => [f.id, f]));

const MOVE = {
  light: { name: 'Light', damage: 6, startup: 4, active: 5, recovery: 10, hit: 18, block: 8, reach: 0.98, width: 0.56, depth: 0.55, height: 0.7, y: 1.25, push: 1.25, meter: 5 },
  heavy: { name: 'Heavy', damage: 11, startup: 8, active: 7, recovery: 16, hit: 25, block: 12, reach: 1.2, width: 0.7, depth: 0.65, height: 0.82, y: 1.18, push: 1.9, meter: 8, launch: 1.1 },
  kick: { name: 'Wild Kick', damage: 15, startup: 11, active: 9, recovery: 22, hit: 32, block: 15, reach: 1.45, width: 0.86, depth: 0.78, height: 0.82, y: 1.02, push: 2.45, meter: 11, launch: 2.15, counter: 5 },
  crouch: { name: 'Low Sweep', damage: 12, startup: 9, active: 8, recovery: 23, hit: 32, block: 13, reach: 1.28, width: 0.8, depth: 0.74, height: 0.36, y: 0.45, push: 2.1, meter: 9, low: true, knockdown: 42 },
  air: { name: 'Air Fang', damage: 10, startup: 6, active: 12, recovery: 10, hit: 27, block: 12, reach: 1.1, width: 0.7, depth: 0.7, height: 0.72, y: 1.08, push: 1.8, meter: 8, overhead: true },
  throw: { name: 'Throw', damage: 15, startup: 5, active: 5, recovery: 22, hit: 26, reach: 0.9, width: 0.8, depth: 0.72, height: 1.25, y: 1, push: 3.2, unblockable: true, knockdown: 50 },
  special: { name: 'Special', damage: 18, startup: 10, active: 14, recovery: 26, hit: 35, block: 17, reach: 1.75, width: 0.95, depth: 0.85, height: 0.9, y: 1.05, push: 2.8, meter: 16, launch: 2.7 },
  super: { name: 'Super', damage: 39, startup: 7, active: 28, recovery: 40, hit: 50, block: 24, reach: 2.4, width: 1.25, depth: 1.05, height: 1.1, y: 1.05, push: 4.3, meter: 0, launch: 4, chip: 6 }
};

const KEYS = {
  p1: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', block: 'KeyU', light: 'KeyJ', heavy: 'KeyK', kick: 'KeyL', special: 'KeyI', throw: 'KeyO', super: 'KeyP' },
  p2: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', block: 'Numpad0', light: 'Numpad1', heavy: 'Numpad2', kick: 'Numpad3', special: 'Numpad4', throw: 'Numpad5', super: 'Numpad6' }
};

let scene;
let camera;
let renderer;
let p1;
let p2;
let accumulator = 0;
let last = 0;
let frame = 0;
let keys = new Set();
let settings = loadSettings();
let selectedMode = 'arcade';
let selectedSide = 'p1';
let selected = { p1: 'rowan', p2: 'kaia' };
let wins = { p1: 0, p2: 0 };
let roundNo = 1;
let roundTime = settings.roundTime;
let running = false;
let paused = false;
let roundOver = false;
let freeze = 0;
let shakeT = 0;
let shakeAmp = 0;
let sparks = [];
let projectiles = [];
let touch = { x: 0, z: 0, buttons: {} };
let audioCtx = null;
let arcadeIdx = 0;

class Latch {
  constructor() {
    this.now = false;
    this.prev = false;
  }
  set(v) {
    this.prev = this.now;
    this.now = !!v;
  }
  get pressed() {
    return this.now && !this.prev;
  }
}

class Fighter {
  constructor(def, side, human) {
    this.def = def;
    this.side = side;
    this.human = human;
    this.buttons = {
      light: new Latch(),
      heavy: new Latch(),
      kick: new Latch(),
      special: new Latch(),
      throw: new Latch(),
      super: new Latch(),
      block: new Latch()
    };
    this.model = createAnimeFighter(def);
    scene.add(this.model.root);
    this.reset(side === 'p1' ? -2.2 : 2.2);
  }

  reset(x) {
    this.x = x;
    this.z = this.side === 'p1' ? 0.35 : -0.35;
    this.y = 0;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.facing = x < 0 ? 1 : -1;
    this.hp = 100;
    this.white = 100;
    this.meter = this.meter || 0;
    this.state = 'intro';
    this.t = 0;
    this.move = null;
    this.hitDone = false;
    this.hitstun = 0;
    this.blockstun = 0;
    this.knockdown = 0;
    this.invuln = 50;
    this.throwInvuln = 18;
    this.grounded = true;
    this.crouch = false;
    this.combo = 0;
    this.comboDamage = 0;
    this.comboT = 0;
    this.perfect = true;
    this.ai = { think: 0, act: 'idle', actT: 0, blockT: 0 };
    this.pose = Math.random() * TAU;
    sync(this);
  }

  box() {
    const h = this.crouch ? 1.05 : 1.9;
    return { x: this.x, z: this.z, y: this.y + h / 2, w: 0.68 * this.def.scale, d: 0.56 * this.def.scale, h: h * this.def.scale };
  }

  canAct() {
    return this.state !== 'intro' && this.state !== 'ko' && this.hitstun <= 0 && this.blockstun <= 0 && this.knockdown <= 0 && freeze <= 0;
  }
}

class Projectile {
  constructor(owner, move) {
    this.owner = owner;
    this.move = move;
    this.x = owner.x + owner.facing * 0.8;
    this.z = owner.z;
    this.y = 1.18;
    this.vx = owner.facing * 8.5;
    this.life = 72;
    this.mesh = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), toon(owner.def.accent));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 24), basic(owner.def.accent, 0.65));
    ring.rotation.y = Math.PI / 2;
    this.mesh.add(core, ring);
    scene.add(this.mesh);
  }

  tick() {
    this.life--;
    this.x += this.vx * STEP;
    this.mesh.position.set(this.x, this.y + Math.sin(frame * 0.25) * 0.06, this.z);
    this.mesh.rotation.x += 0.16;
    this.mesh.rotation.y += 0.24;
    const target = this.owner === p1 ? p2 : p1;
    if (target && overlap({ x: this.x, z: this.z, y: this.y, w: 0.46, d: 0.46, h: 0.46 }, target.box())) {
      applyHit(this.owner, target, this.move);
      burst(this.x, this.y, this.z, this.owner.def.accent, 18, 0.55);
      removeObj(this.mesh);
      return false;
    }
    if (this.life <= 0 || Math.abs(this.x) > ARENA_X + 2) {
      removeObj(this.mesh);
      return false;
    }
    return true;
  }
}

function loadSettings() {
  try {
    return { ...SETTINGS_DEFAULT, ...JSON.parse(localStorage.getItem('gotw.settings') || '{}') };
  } catch (_) {
    return { ...SETTINGS_DEFAULT };
  }
}

function saveSettings() {
  localStorage.setItem('gotw.settings', JSON.stringify(settings));
}

function boot() {
  if (!window.THREE) {
    $('menu').innerHTML = '<div class="modal"><div><h2>Three.js failed to load</h2></div></div>';
    return;
  }
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070a);
  scene.fog = new THREE.Fog(0x06070a, 16, 54);
  camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 3.1, 10.8);
  renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  addLights();
  buildStage();
  bindUI();
  bindInput();
  fillFighters();
  applySettings();
  resize();
  requestAnimationFrame(loop);
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xfce7c8, 0x1b1d28, 0.78));
  const key = new THREE.DirectionalLight(0xffd99a, 2.4);
  key.position.set(-5, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x66d9ff, 1.4);
  rim.position.set(7, 6, -7);
  scene.add(rim);
}

function buildStage() {
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 0.36, 96), toon(0x202034));
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.38, 96), toon(0x2b4d38));
  grass.position.y = -0.18;
  grass.receiveShadow = true;
  scene.add(grass);
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 + i * 1.35, 0.025, 8, 96), basic(i % 2 ? 0x66d9ff : 0xf5c45e, 0.5));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(60, 24), basic(0x0d111c, 0.95));
  back.position.set(0, 8, -16);
  scene.add(back);
  for (let i = -8; i <= 8; i++) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 2.4, 8), toon(0x4a2a18));
    trunk.position.y = 1.1;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 8), toon(i % 2 ? 0x183f37 : 0x244b2d));
    crown.position.y = 2.8;
    tree.add(trunk, crown);
    tree.position.set(i * 1.75, 0, -10.5 - Math.random() * 2);
    tree.rotation.y = Math.random() * TAU;
    scene.add(tree);
  }
  for (let i = 0; i < 12; i++) {
    const lamp = new THREE.PointLight(i % 2 ? 0x66d9ff : 0xf5c45e, 1.3, 9, 2);
    const a = (i / 12) * TAU;
    lamp.position.set(Math.cos(a) * 8.4, 4.4, Math.sin(a) * 5.5 - 1);
    scene.add(lamp);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), basic(i % 2 ? 0x66d9ff : 0xf5c45e, 1));
    orb.position.copy(lamp.position);
    scene.add(orb);
  }
}

function toon(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: null });
}

function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
}

function outline(mesh, scale = 1.055) {
  const clone = mesh.clone();
  clone.material = basic(0x050507, 0.88);
  clone.scale.multiplyScalar(scale);
  clone.renderOrder = -1;
  return clone;
}

function capsule(r, len, mat) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat);
}

function createAnimeFighter(def) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const skin = toon(def.skin);
  const cloth = toon(def.color);
  const accent = toon(def.accent);
  const dark = toon(0x10131b);
  const hairMat = toon(def.hair);
  const outlineParts = [];

  function add(mesh, parent = rig, o = 1.055) {
    parent.add(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const out = outline(mesh, o);
    parent.add(out);
    outlineParts.push(out);
    return mesh;
  }

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 36), basic(0x000000, 0.3));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  const pelvis = add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.42), dark));
  pelvis.position.y = 0.82;
  const torso = add(capsule(0.34, 0.78, cloth));
  torso.position.y = 1.34;
  torso.scale.set(1.08, 1, 0.78);
  const chest = add(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.08), accent));
  chest.position.set(0, 1.48, 0.33);
  const waist = add(new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.1, 0.46), accent));
  waist.position.y = 1.0;
  const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.16, 12), skin));
  neck.position.y = 1.86;
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 14), skin));
  head.position.y = 2.08;
  head.scale.set(0.92, 1.05, 0.9);
  const hair = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 10, 0, TAU, 0, Math.PI / 1.65), hairMat));
  hair.position.set(0, 2.16, -0.02);
  hair.rotation.x = -0.12;
  const bangL = add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), hairMat));
  bangL.position.set(-0.12, 2.02, 0.19);
  bangL.rotation.z = -0.35;
  const bangR = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34, 6), hairMat));
  bangR.position.set(0.13, 2.04, 0.2);
  bangR.rotation.z = 0.32;
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.02), basic(0x050507, 1));
  eye.position.set(0, 2.08, 0.245);
  rig.add(eye);
  const scarf = add(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.16), accent));
  scarf.position.set(0, 1.82, 0.08);

  const armL = limbArm(-1, cloth, skin, accent, add);
  const armR = limbArm(1, cloth, skin, accent, add);
  const legL = limbLeg(-1, dark, accent, add);
  const legR = limbLeg(1, dark, accent, add);
  rig.add(armL.group, armR.group, legL.group, legR.group);

  const coat = add(new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.78, 5, 1, true), cloth));
  coat.position.y = 0.82;
  coat.rotation.y = Math.PI / 5;
  coat.scale.z = 0.55;
  const aura = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.025, 8, 48), basic(def.accent, 0.52));
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.03;
  root.add(aura);
  const model = { root, rig, pelvis, torso, chest, waist, neck, head, hair, bangL, bangR, eye, scarf, armL, armR, legL, legR, coat, aura, shadow, outlineParts };
  root.userData.model = model;
  return model;
}

function limbArm(side, cloth, skin, accent, add) {
  const group = new THREE.Group();
  group.position.set(side * 0.46, 1.7, 0.02);
  const upper = add(capsule(0.085, 0.42, cloth), group);
  upper.position.y = -0.25;
  const fore = add(capsule(0.073, 0.38, skin), group);
  fore.position.y = -0.67;
  const fist = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), accent), group);
  fist.position.y = -0.93;
  return { group, upper, fore, fist };
}

function limbLeg(side, dark, accent, add) {
  const group = new THREE.Group();
  group.position.set(side * 0.18, 0.82, 0);
  const thigh = add(capsule(0.105, 0.48, dark), group);
  thigh.position.y = -0.28;
  const shin = add(capsule(0.092, 0.5, dark), group);
  shin.position.y = -0.82;
  const foot = add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.44), accent), group);
  foot.position.set(0, -1.1, 0.13);
  return { group, thigh, shin, foot };
}

function bindUI() {
  document.querySelectorAll('.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b === btn));
      document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('on', p.id === `panel-${btn.dataset.tab}`));
    });
  });
  document.querySelectorAll('.mode').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedMode = btn.dataset.mode;
      document.querySelectorAll('.mode').forEach((b) => b.classList.toggle('selected', b === btn));
      startMatch();
    });
  });
  $('start-button').addEventListener('click', startMatch);
  document.querySelectorAll('[data-side]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedSide = btn.dataset.side;
      document.querySelectorAll('[data-side]').forEach((b) => b.classList.toggle('on', b === btn));
      detail(BY_ID.get(selected[selectedSide]));
    });
  });
  $('pause-button').addEventListener('click', togglePause);
  $('resume-button').addEventListener('click', togglePause);
  $('restart-button').addEventListener('click', () => { closePause(); startMatch(); });
  $('pause-menu-button').addEventListener('click', backMenu);
  $('menu-button').addEventListener('click', backMenu);
  $('continue-button').addEventListener('click', continueRound);
  $('difficulty').addEventListener('change', (e) => { settings.difficulty = e.target.value; saveSettings(); });
  $('round-time').addEventListener('change', (e) => { settings.roundTime = Number(e.target.value); saveSettings(); });
  $('deadzone').addEventListener('input', (e) => { settings.deadzone = Number(e.target.value); saveSettings(); });
  for (const id of ['shake', 'rumble', 'sound']) {
    $(id).addEventListener('change', (e) => { settings[id] = e.target.checked; saveSettings(); });
  }
}

function applySettings() {
  $('difficulty').value = settings.difficulty;
  $('round-time').value = String(settings.roundTime);
  $('deadzone').value = String(settings.deadzone);
  $('shake').checked = settings.shake;
  $('rumble').checked = settings.rumble;
  $('sound').checked = settings.sound;
}

function fillFighters() {
  const grid = $('fighter-grid');
  grid.innerHTML = '';
  for (const f of FIGHTERS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fighter';
    btn.style.setProperty('--color', hex(f.color));
    btn.style.setProperty('--accent', hex(f.accent));
    btn.style.setProperty('--glow', hex(f.accent));
    btn.style.setProperty('--bg', `linear-gradient(145deg, rgba(255,255,255,.12), rgba(0,0,0,.32)), ${hex(f.color)}`);
    btn.innerHTML = `<div class="portrait"></div><b>${f.name}</b><span>${f.role}</span><div class="tags"></div>`;
    btn.addEventListener('click', () => {
      selected[selectedSide] = f.id;
      if (selected.p1 === selected.p2) selected[selectedSide === 'p1' ? 'p2' : 'p1'] = FIGHTERS.find((x) => x.id !== f.id).id;
      markFighters();
      detail(f);
    });
    grid.appendChild(btn);
  }
  markFighters();
  detail(BY_ID.get(selected.p1));
}

function markFighters() {
  [...document.querySelectorAll('.fighter')].forEach((el, i) => {
    const f = FIGHTERS[i];
    el.classList.toggle('p1', selected.p1 === f.id);
    el.classList.toggle('p2', selected.p2 === f.id);
    el.querySelector('.tags').innerHTML = `${selected.p1 === f.id ? '<i>P1</i>' : ''}${selected.p2 === f.id ? '<i>P2</i>' : ''}`;
  });
  $('pick-summary').textContent = `P1: ${BY_ID.get(selected.p1).name} | P2: ${BY_ID.get(selected.p2).name}`;
}

function detail(f) {
  $('fighter-detail').innerHTML = `
    <h2>${f.name}</h2>
    <p><strong>${f.role}.</strong> ${f.style}</p>
    <p>Special: ${f.special}. Super: ${f.super}.</p>
    <div class="stats">
      ${['power', 'speed', 'reach', 'defense', 'technique'].map((k) => `<div><b>${k}</b><span><i style="width:${(f[k] || 5) * 10}%"></i></span></div>`).join('')}
    </div>
  `;
}

function bindInput() {
  addEventListener('resize', resize);
  addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape') togglePause();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('gamepadconnected', pads);
  addEventListener('gamepaddisconnected', pads);
  bindTouch();
}

function bindTouch() {
  if (matchMedia('(hover: none), (pointer: coarse)').matches) document.body.classList.add('touch');
  const stick = $('stick');
  const knob = stick.querySelector('i');
  let id = null;
  const set = (e) => {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const max = r.width * 0.35;
    const len = Math.hypot(dx, dy) || 1;
    const mag = Math.min(max, len);
    touch.x = clamp(dx / max, -1, 1);
    touch.z = clamp(dy / max, -1, 1);
    knob.style.transform = `translate(${dx / len * mag}px, ${dy / len * mag}px)`;
  };
  const clear = () => {
    id = null;
    touch.x = 0;
    touch.z = 0;
    knob.style.transform = 'translate(0,0)';
  };
  stick.addEventListener('pointerdown', (e) => { document.body.classList.add('touch'); id = e.pointerId; stick.setPointerCapture?.(id); set(e); audio(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
  stick.addEventListener('pointerup', clear);
  stick.addEventListener('pointercancel', clear);
  document.querySelectorAll('[data-touch]').forEach((b) => {
    const name = b.dataset.touch;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); document.body.classList.add('touch'); touch.buttons[name] = true; b.setPointerCapture?.(e.pointerId); audio(); });
    const up = () => { touch.buttons[name] = false; };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
  });
}

function pads() {
  const list = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
  $('pads').innerHTML = list.length ? list.map((p, i) => `<div>P${i + 1}: ${p.id}</div>`).join('') : 'No gamepads detected.';
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 720 ? 51 : 43;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}

function startMatch() {
  audio();
  cleanupFight();
  wins = { p1: 0, p2: 0 };
  roundNo = 1;
  arcadeIdx = 0;
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('pause-button').classList.remove('hidden');
  $('round-end').classList.add('hidden');
  closePause();
  newRound();
}

function opponentDef() {
  if (selectedMode === 'arcade') {
    const pool = FIGHTERS.filter((f) => f.id !== selected.p1);
    return pool[arcadeIdx % pool.length];
  }
  return BY_ID.get(selected.p2);
}

function newRound() {
  cleanupFight();
  p1 = new Fighter(BY_ID.get(selected.p1), 'p1', true);
  p2 = new Fighter(opponentDef(), 'p2', selectedMode === 'versus');
  if (selectedMode === 'training') {
    p1.meter = 100;
    p2.meter = 100;
  }
  running = true;
  paused = false;
  roundOver = false;
  freeze = 0;
  roundTime = settings.roundTime;
  $('p1-name').textContent = p1.def.name;
  $('p2-name').textContent = p2.def.name;
  $('round-label').textContent = `ROUND ${roundNo}`;
  $('mode-label').textContent = selectedMode.toUpperCase();
  drawRounds();
  updateHUD(true);
  banner(`ROUND ${roundNo}`, 850);
  setTimeout(() => banner('FIGHT', 600), 850);
  setTimeout(() => { if (p1 && p2 && !roundOver) { p1.state = 'idle'; p2.state = 'idle'; } }, 1120);
}

function cleanupFight() {
  for (const f of [p1, p2]) if (f?.model?.root) removeObj(f.model.root);
  p1 = null;
  p2 = null;
  for (const p of projectiles) removeObj(p.mesh);
  projectiles = [];
  for (const s of sparks) removeObj(s.mesh);
  sparks = [];
}

function raw(side, fighter) {
  const map = KEYS[side];
  const r = { x: 0, z: 0 };
  if (keys.has(map.left)) r.x -= 1;
  if (keys.has(map.right)) r.x += 1;
  if (keys.has(map.up)) r.z -= 1;
  if (keys.has(map.down)) r.z += 1;
  for (const k of ['block', 'light', 'heavy', 'kick', 'special', 'throw', 'super']) r[k] = keys.has(map[k]);
  const pad = navigator.getGamepads?.()[side === 'p1' ? 0 : 1];
  if (pad) {
    const dz = settings.deadzone;
    const ax = Math.abs(pad.axes[0] || 0) > dz ? pad.axes[0] : 0;
    const ay = Math.abs(pad.axes[1] || 0) > dz ? pad.axes[1] : 0;
    r.x = Math.abs(ax) > Math.abs(r.x) ? ax : r.x;
    r.z = Math.abs(ay) > Math.abs(r.z) ? ay : r.z;
    r.light ||= pad.buttons[2]?.pressed;
    r.heavy ||= pad.buttons[0]?.pressed;
    r.kick ||= pad.buttons[1]?.pressed;
    r.special ||= pad.buttons[3]?.pressed || pad.buttons[5]?.pressed;
    r.throw ||= pad.buttons[4]?.pressed;
    r.super ||= pad.buttons[6]?.pressed || pad.buttons[9]?.pressed;
    r.block ||= pad.buttons[7]?.value > 0.45 || pad.buttons[8]?.pressed;
  }
  if (side === 'p1') {
    r.x = clamp(r.x + touch.x, -1, 1);
    r.z = clamp(r.z + touch.z, -1, 1);
    for (const k of Object.keys(touch.buttons)) r[k] ||= touch.buttons[k];
  }
  return r;
}

function ai(f, t) {
  const d = DIFF[settings.difficulty];
  const dx = t.x - f.x;
  const dz = t.z - f.z;
  const dist = Math.hypot(dx, dz);
  f.ai.think--;
  f.ai.actT--;
  f.ai.blockT--;
  if (t.move && dist < 1.7 && f.ai.blockT <= 0 && Math.random() < d.block) {
    f.ai.act = 'block';
    f.ai.actT = Math.ceil(d.react * 60) + 12;
    f.ai.blockT = 28;
  }
  if (f.ai.think <= 0) {
    f.ai.think = Math.ceil((d.react + Math.random() * 0.18) * 60);
    if (dist > 3.4 && Math.random() < 0.35) f.ai.act = 'special';
    else if (dist > 1.35) f.ai.act = Math.random() < d.aggro ? 'approach' : 'side';
    else if (t.hitstun > 0 && Math.random() < d.combo) f.ai.act = Math.random() < 0.55 ? 'kick' : 'heavy';
    else f.ai.act = ['light', 'heavy', 'kick', 'throw', 'special'][Math.floor(Math.random() * 5)];
    if (Math.random() < d.mistake) f.ai.act = 'idle';
    f.ai.actT = 14 + Math.random() * 18;
  }
  const r = { x: 0, z: 0 };
  if (f.ai.act === 'approach') { r.x = Math.sign(dx); r.z = clamp(dz, -1, 1); }
  else if (f.ai.act === 'side') { r.z = dz > 0 ? -1 : 1; }
  else if (f.ai.act === 'block') { r.x = -f.facing; r.block = true; }
  else if (['light', 'heavy', 'kick', 'throw', 'special'].includes(f.ai.act)) r[f.ai.act] = f.ai.actT > 0;
  if (f.meter >= 100 && dist < 2.2 && Math.random() < 0.01 + d.aggro * 0.008) r.super = true;
  return r;
}

function tick() {
  frame++;
  if (freeze > 0) {
    freeze--;
    pose(p1);
    pose(p2);
    tickFx();
    return;
  }
  if (!running || paused || roundOver) {
    tickFx();
    return;
  }
  if (settings.roundTime && selectedMode !== 'training' && frame % 60 === 0) {
    roundTime--;
    if (roundTime <= 0) finish(p1.hp === p2.hp ? null : p1.hp > p2.hp ? 'p1' : 'p2', 'TIME');
  }
  stepFighter(p1, p2, raw('p1', p1));
  stepFighter(p2, p1, p2.human ? raw('p2', p2) : selectedMode === 'training' ? { x: 0, z: 0 } : ai(p2, p1));
  pushApart();
  projectiles = projectiles.filter((p) => p.tick());
  tickFx();
  if (selectedMode !== 'training') {
    if (p1.hp <= 0 && p2.hp <= 0) finish(null, 'DRAW');
    else if (p1.hp <= 0) finish('p2', p2.perfect ? 'PERFECT' : 'KO');
    else if (p2.hp <= 0) finish('p1', p1.perfect ? 'PERFECT' : 'KO');
  } else {
    if (p2.hp < 20) {
      p2.hp = 100;
      p2.white = 100;
      p2.meter = 100;
    }
    p1.meter = 100;
  }
  updateHUD();
}

function stepFighter(f, o, r) {
  if (!f) return;
  f.t++;
  f.invuln = Math.max(0, f.invuln - 1);
  f.throwInvuln = Math.max(0, f.throwInvuln - 1);
  f.hitstun = Math.max(0, f.hitstun - 1);
  f.blockstun = Math.max(0, f.blockstun - 1);
  f.knockdown = Math.max(0, f.knockdown - 1);
  f.comboT = Math.max(0, f.comboT - 1);
  if (f.comboT <= 0) { f.combo = 0; f.comboDamage = 0; }
  f.white = lerp(f.white, f.hp, 0.035);
  for (const k of Object.keys(f.buttons)) f.buttons[k].set(r[k]);
  if (f.hitstun || f.blockstun || f.knockdown || f.state === 'intro' || f.state === 'ko') {
    physics(f);
    pose(f);
    sync(f);
    return;
  }
  f.facing = o.x >= f.x ? 1 : -1;
  f.crouch = r.z > 0.7 && f.grounded && Math.abs(o.z - f.z) < 0.7;
  if (!f.move) {
    if (f.buttons.super.pressed && f.meter >= 100) startMove(f, MOVE.super, 'super');
    else if (f.buttons.throw.pressed) startMove(f, MOVE.throw, 'throw');
    else if (f.buttons.special.pressed) startMove(f, specialFor(f), 'special');
    else if (f.buttons.light.pressed) startMove(f, f.grounded ? MOVE.light : MOVE.air, 'attack');
    else if (f.buttons.heavy.pressed) startMove(f, f.crouch ? MOVE.crouch : MOVE.heavy, 'attack');
    else if (f.buttons.kick.pressed) startMove(f, f.grounded ? MOVE.kick : MOVE.air, 'attack');
  }
  if (f.move) attackTick(f, o);
  if (!f.move) moveFighter(f, r);
  physics(f);
  pose(f);
  sync(f);
}

function specialFor(f) {
  if (f.def.id === 'sora') return { ...MOVE.special, name: f.def.special, projectile: true, damage: 14, recovery: 23 };
  if (f.def.id === 'brakka') return { ...MOVE.throw, name: f.def.special, damage: 24, reach: 1.25, startup: 7, recovery: 32 };
  if (f.def.id === 'mira') return { ...MOVE.special, name: f.def.special, reach: 2.05, depth: 1.2, damage: 16, launch: 3.4 };
  return { ...MOVE.special, name: f.def.special };
}

function startMove(f, move, state) {
  if (!f.canAct()) return;
  f.move = { ...move };
  f.state = state;
  f.t = 0;
  f.hitDone = false;
  if (move === MOVE.super || state === 'super') {
    f.meter = 0;
    banner(f.def.super, 850);
    freeze = 16;
    aura(f, 42);
    sound('super');
  } else {
    sound(state === 'throw' ? 'grab' : 'whoosh');
  }
  if (state === 'special' && !f.move.projectile) {
    f.vx = f.facing * 2.6;
  }
}

function attackTick(f, o) {
  const m = f.move;
  if (f.t === m.startup && m.projectile) {
    projectiles.push(new Projectile(f, m));
    sound('projectile');
  }
  if (f.t >= m.startup && f.t < m.startup + m.active && !f.hitDone && !m.projectile) {
    const box = attackBox(f, m);
    if (overlap(box, o.box())) {
      if (m.unblockable || f.state === 'throw') {
        if (o.throwInvuln <= 0 && o.grounded) {
          hitThrow(f, o, m);
          f.hitDone = true;
        }
      } else {
        applyHit(f, o, m);
        f.hitDone = true;
      }
    }
  }
  if (f.t > m.startup + m.active + m.recovery) {
    f.move = null;
    f.state = f.grounded ? 'idle' : 'jump';
    f.t = 0;
  }
}

function attackBox(f, m) {
  return {
    x: f.x + f.facing * (0.48 + m.reach * 0.5),
    z: f.z,
    y: f.y + m.y * f.def.scale,
    w: m.width + m.reach,
    d: m.depth,
    h: m.height * f.def.scale
  };
}

function overlap(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.z - b.z) * 2 < a.d + b.d && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

function blocked(target, attacker, m) {
  const holding = target.buttons.block.now || target.vx * target.facing < -0.05;
  if (!holding && target.state !== 'block') return false;
  if (target.facing === attacker.facing) return false;
  if (m.low && !target.crouch && !target.buttons.block.now) return false;
  if (m.overhead && target.crouch && !target.buttons.block.now) return false;
  return true;
}

function applyHit(a, t, m) {
  if (t.invuln > 0 || t.state === 'ko') return;
  const counter = !!t.move;
  const isBlock = !m.unblockable && blocked(t, a, m);
  let dmg = m.damage + (counter ? m.counter || Math.ceil(m.damage * 0.22) : 0);
  if (isBlock) dmg = Math.max(m.chip || 0, Math.floor(dmg * 0.18));
  t.hp = clamp(t.hp - dmg, 0, 100);
  if (dmg) t.perfect = false;
  a.meter = clamp(a.meter + (m.meter || 10) + (isBlock ? 2 : 6), 0, 100);
  t.meter = clamp(t.meter + (isBlock ? 4 : 8), 0, 100);
  const push = (m.push || 2) / Math.max(0.8, t.def.weight);
  if (isBlock) {
    t.blockstun = m.block || 10;
    t.state = 'block';
    t.vx = a.facing * push * 0.5;
  } else {
    t.hitstun = m.hit || 24;
    t.state = m.knockdown ? 'down' : 'hit';
    t.knockdown = m.knockdown || 0;
    t.vx = a.facing * push;
    t.vz = (t.z - a.z) * 1.8;
    if (m.launch) {
      t.vy = Math.max(t.vy, m.launch);
      t.grounded = false;
    }
    a.combo = a.comboT > 0 ? a.combo + 1 : 1;
    a.comboDamage = a.comboT > 0 ? a.comboDamage + dmg : dmg;
    a.comboT = 90;
    if (a.combo > 1) combo(a.combo, a.comboDamage, counter);
  }
  burst(t.x, t.y + 1.05, t.z, a.def.accent, isBlock ? 10 : 22, isBlock ? 0.28 : 0.68);
  freeze = Math.max(freeze, isBlock ? 4 : m.name === 'Super' ? 16 : 8);
  screen(isBlock ? 0.08 : m.name === 'Super' ? 0.34 : 0.18, isBlock ? 7 : 13);
  sound(isBlock ? 'block' : 'hit');
  rumble(a.side, isBlock ? 0.18 : 0.44, isBlock ? 60 : 130);
}

function hitThrow(a, t, m) {
  t.hp = clamp(t.hp - m.damage, 0, 100);
  t.perfect = false;
  t.hitstun = m.hit;
  t.knockdown = m.knockdown;
  t.state = 'down';
  t.vx = a.facing * m.push;
  t.vy = 2.7;
  t.grounded = false;
  a.meter = clamp(a.meter + 16, 0, 100);
  burst(t.x, 0.8, t.z, a.def.accent, 28, 0.74);
  freeze = 10;
  screen(0.26, 15);
  sound('throw');
}

function moveFighter(f, r) {
  if (!f.canAct()) return;
  const back = r.x * f.facing < -0.55;
  if (r.block || back && Math.abs(r.x) > 0.6) f.state = 'block';
  else if (f.crouch) f.state = 'crouch';
  else if (Math.abs(r.x) > 0.12 || Math.abs(r.z) > 0.12) f.state = 'walk';
  else f.state = 'idle';
  if (f.grounded && r.z < -0.78 && Math.abs(r.x) < 0.25 && f.canAct()) {
    f.grounded = false;
    f.vy = f.def.jump;
    f.state = 'jump';
    sound('jump');
  }
  if (f.grounded) {
    f.vx = r.x * f.def.speed;
    f.vz = r.z * f.def.step;
  } else {
    f.vx += r.x * 0.05;
    f.vz += r.z * 0.04;
  }
}

function physics(f) {
  if (!f.grounded) f.vy -= 0.48;
  f.x += f.vx * STEP;
  f.z += f.vz * STEP;
  f.y += f.vy * STEP;
  if (f.y <= 0) {
    f.y = 0;
    f.vy = 0;
    f.grounded = true;
    if (f.state === 'jump') f.state = 'idle';
  }
  f.x = clamp(f.x, -ARENA_X, ARENA_X);
  f.z = clamp(f.z, -ARENA_Z, ARENA_Z);
  f.vx *= f.grounded ? 0.84 : 0.98;
  f.vz *= f.grounded ? 0.82 : 0.98;
}

function pushApart() {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const dist = Math.hypot(dx, dz) || 1;
  const min = 0.78;
  if (dist < min) {
    const ox = dx / dist * (min - dist) * 0.5;
    const oz = dz / dist * (min - dist) * 0.5;
    p1.x -= ox; p2.x += ox;
    p1.z -= oz; p2.z += oz;
  }
}

function pose(f) {
  if (!f) return;
  const m = f.model;
  const t = f.t;
  const walk = f.pose += (Math.abs(f.vx) + Math.abs(f.vz)) * 0.055 + 0.035;
  const bob = Math.sin(frame * 0.05 + f.pose) * 0.025;
  m.rig.rotation.set(0, 0, 0);
  m.torso.position.y = 1.34 + bob;
  m.head.position.y = 2.08 + bob;
  m.hair.position.y = 2.16 + bob;
  m.bangL.position.y = 2.02 + bob;
  m.bangR.position.y = 2.04 + bob;
  m.eye.position.y = 2.08 + bob;
  m.armL.group.rotation.set(-0.45, 0, 0.35);
  m.armR.group.rotation.set(-0.5, 0, -0.35);
  m.legL.group.rotation.set(0.08, 0, 0.04);
  m.legR.group.rotation.set(-0.08, 0, -0.04);
  m.armL.fore.rotation.set(0, 0, 0);
  m.armR.fore.rotation.set(0, 0, 0);
  m.legL.shin.rotation.set(0, 0, 0);
  m.legR.shin.rotation.set(0, 0, 0);
  m.coat.rotation.x = Math.sin(frame * 0.04) * 0.04;

  if (f.state === 'walk') {
    m.legL.group.rotation.x = Math.sin(walk) * 0.55;
    m.legR.group.rotation.x = -Math.sin(walk) * 0.55;
    m.armL.group.rotation.x = -0.45 - Math.sin(walk) * 0.25;
    m.armR.group.rotation.x = -0.5 + Math.sin(walk) * 0.25;
    m.rig.rotation.z = -f.facing * Math.sin(walk) * 0.035;
  }
  if (f.state === 'crouch') {
    m.rig.position.y = -0.16;
    m.legL.group.rotation.x = -0.85;
    m.legR.group.rotation.x = -0.58;
  } else {
    m.rig.position.y = 0;
  }
  if (!f.grounded) {
    m.legL.group.rotation.x = -0.5;
    m.legR.group.rotation.x = 0.4;
    m.armL.group.rotation.x = -1.05;
    m.armR.group.rotation.x = -0.95;
    m.rig.rotation.x = -0.12;
  }
  if (f.move) {
    const wind = clamp(t / Math.max(1, f.move.startup), 0, 1);
    const snap = Math.sin(clamp((t - f.move.startup) / Math.max(1, f.move.active), 0, 1) * Math.PI);
    m.rig.rotation.y = -f.facing * (0.18 * wind + 0.16 * snap);
    if (f.state === 'throw') {
      m.armL.group.rotation.x = -1.35 * wind;
      m.armR.group.rotation.x = -1.35 * wind;
      m.armL.group.rotation.z = 0.82;
      m.armR.group.rotation.z = -0.82;
    } else if (f.move.name.includes('Kick') || f.move === MOVE.kick || f.move === MOVE.crouch) {
      m.legR.group.rotation.x = -1.55 * snap;
      m.legR.group.rotation.y = -f.facing * 0.42 * snap;
      m.legR.group.rotation.z = -f.facing * 0.52 * snap;
      m.legR.shin.rotation.x = 0.58 * snap;
      m.rig.rotation.x = -0.16 * snap;
    } else if (f.state === 'super') {
      m.armR.group.rotation.x = -2.1 * snap;
      m.legR.group.rotation.x = -1.2 * snap;
      m.rig.rotation.y = -f.facing * (0.4 + 0.3 * snap);
      m.coat.rotation.y = Math.sin(frame * 0.4) * 0.35;
    } else {
      m.armR.group.rotation.x = -1.65 * snap - 0.5 * wind;
      m.armR.group.rotation.y = -f.facing * 0.35 * snap;
      m.armR.group.rotation.z = -0.7 * snap;
      m.armR.fore.rotation.x = -0.45 * snap;
    }
  }
  if (f.state === 'block') {
    m.armL.group.rotation.x = -1.35;
    m.armR.group.rotation.x = -1.35;
    m.armL.group.rotation.z = 0.68;
    m.armR.group.rotation.z = -0.68;
    m.rig.rotation.x = 0.08;
  } else if (f.state === 'hit') {
    m.rig.rotation.x = 0.22;
    m.head.rotation.x = 0.25;
  } else if (f.state === 'down' || f.state === 'ko') {
    m.rig.rotation.z = f.facing * 1.28;
    m.rig.rotation.x = 0.62;
    m.armL.group.rotation.x = 0.5;
    m.armR.group.rotation.x = 0.35;
  } else {
    m.head.rotation.x = 0;
  }
  m.aura.material.opacity = 0.22 + f.meter / 170 + Math.sin(frame * 0.08) * 0.05;
  m.aura.scale.setScalar(1 + f.meter / 230);
  m.shadow.scale.set(1 + f.y * 0.05, 0.68 + f.y * 0.02, 1);
}

function sync(f) {
  const m = f.model.root;
  m.position.set(f.x, f.y, f.z);
  m.scale.set(f.def.scale, f.def.scale, f.def.scale);
  const yaw = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
  m.rotation.y = lerpAngle(m.rotation.y || yaw, yaw, 0.42);
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % TAU) - Math.PI;
  return a + d * t;
}

function finish(winner, text) {
  if (roundOver) return;
  roundOver = true;
  running = false;
  if (winner) wins[winner]++;
  if (winner === 'p1') p1.state = 'victory';
  if (winner === 'p2') p2.state = 'victory';
  if (winner !== 'p1') p1.state = 'ko';
  if (winner !== 'p2') p2.state = 'ko';
  drawRounds();
  banner(text, 900);
  const match = wins.p1 >= 2 || wins.p2 >= 2;
  if (match && winner === 'p1' && selectedMode === 'arcade') arcadeIdx++;
  setTimeout(() => {
    $('end-kicker').textContent = match ? 'MATCH OVER' : 'ROUND OVER';
    $('end-title').textContent = text;
    $('end-copy').textContent = winner ? `${(winner === 'p1' ? p1 : p2).def.name} wins.` : 'The round is a draw.';
    $('continue-button').textContent = match ? 'Rematch' : 'Next Round';
    $('round-end').classList.remove('hidden');
  }, 850);
}

function continueRound() {
  $('round-end').classList.add('hidden');
  if (wins.p1 >= 2 || wins.p2 >= 2) {
    wins = { p1: 0, p2: 0 };
    roundNo = 1;
  } else {
    roundNo++;
  }
  newRound();
}

function backMenu() {
  running = false;
  roundOver = true;
  cleanupFight();
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('pause-button').classList.add('hidden');
  $('round-end').classList.add('hidden');
  closePause();
}

function togglePause() {
  if (!p1 || roundOver || !$('menu').classList.contains('hidden')) return;
  paused = !paused;
  $('pause').classList.toggle('hidden', !paused);
  $('pause-button').textContent = paused ? '>' : 'II';
}

function closePause() {
  paused = false;
  $('pause').classList.add('hidden');
  $('pause-button').textContent = 'II';
}

function drawRounds() {
  for (const side of ['p1', 'p2']) {
    const el = $(`${side}-rounds`);
    el.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const dot = document.createElement('i');
      dot.classList.toggle('win', i < wins[side]);
      el.appendChild(dot);
    }
  }
}

function updateHUD(force = false) {
  if (!p1 || !p2) return;
  $('p1-hp').style.width = `${p1.hp}%`;
  $('p2-hp').style.width = `${p2.hp}%`;
  $('p1-white').style.width = `${clamp(p1.white, p1.hp, 100)}%`;
  $('p2-white').style.width = `${clamp(p2.white, p2.hp, 100)}%`;
  $('p1-meter').style.width = `${p1.meter}%`;
  $('p2-meter').style.width = `${p2.meter}%`;
  $('timer').textContent = settings.roundTime === 0 || selectedMode === 'training' ? '∞' : String(Math.max(0, roundTime)).padStart(2, '0');
  if (force) {
    $('p1-white').style.transition = 'none';
    $('p2-white').style.transition = 'none';
    setTimeout(() => {
      $('p1-white').style.transition = '';
      $('p2-white').style.transition = '';
    }, 30);
  }
}

function combo(n, dmg, counter) {
  const el = $('combo');
  el.innerHTML = `${n}<small>${counter ? 'counter ' : ''}${dmg} damage</small>`;
  el.classList.add('show');
  clearTimeout(combo.t);
  combo.t = setTimeout(() => el.classList.remove('show'), 850);
}

function banner(txt, ms = 700) {
  const el = $('banner');
  el.textContent = txt;
  el.classList.add('show');
  clearTimeout(banner.t);
  banner.t = setTimeout(() => el.classList.remove('show'), ms);
}

function burst(x, y, z, color, count, power) {
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random() * 0.075, 8, 6), basic(color, 0.95));
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const a = Math.random() * TAU;
    sparks.push({
      mesh,
      life: 20 + Math.random() * 18,
      vx: Math.cos(a) * power * 0.07,
      vy: Math.random() * power * 0.11,
      vz: Math.sin(a) * power * 0.07
    });
  }
}

function aura(f, life) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 28, 14), basic(f.def.accent, 0.18));
  mesh.position.set(f.x, f.y + 1.1, f.z);
  scene.add(mesh);
  sparks.push({ mesh, life, aura: f });
}

function tickFx() {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life--;
    if (s.aura) {
      s.mesh.position.set(s.aura.x, s.aura.y + 1.1, s.aura.z);
      s.mesh.scale.multiplyScalar(1.018);
      s.mesh.material.opacity = s.life / 180;
    } else {
      s.mesh.position.x += s.vx;
      s.mesh.position.y += s.vy;
      s.mesh.position.z += s.vz;
      s.vy -= 0.006;
      s.mesh.material.opacity = clamp(s.life / 26, 0, 1);
    }
    if (s.life <= 0) {
      removeObj(s.mesh);
      sparks.splice(i, 1);
    }
  }
}

function screen(amp, t) {
  if (settings.shake) {
    shakeAmp = Math.max(shakeAmp, amp);
    shakeT = Math.max(shakeT, t);
  }
  $('flash').classList.add('on');
  clearTimeout(screen.t);
  screen.t = setTimeout(() => $('flash').classList.remove('on'), 45);
}

function cameraTick(dt) {
  if (!p1 || !p2) {
    camera.position.x = lerp(camera.position.x, 0, dt * 2);
    camera.position.y = lerp(camera.position.y, 3.1, dt * 2);
    camera.position.z = lerp(camera.position.z, 10.8, dt * 2);
    camera.lookAt(0, 1.2, 0);
    renderer.render(scene, camera);
    return;
  }
  const mx = (p1.x + p2.x) / 2;
  const mz = (p1.z + p2.z) / 2;
  const sep = Math.hypot(p2.x - p1.x, p2.z - p1.z);
  const target = {
    x: mx * 0.34,
    y: 3.05 + clamp(sep * 0.06, 0, 0.5),
    z: 8.2 + clamp(sep * 0.55, 0, 4.1)
  };
  camera.position.x = lerp(camera.position.x, target.x, dt * 3.8);
  camera.position.y = lerp(camera.position.y, target.y, dt * 3.2);
  camera.position.z = lerp(camera.position.z, target.z, dt * 3.6);
  if (shakeT > 0) {
    shakeT--;
    const k = shakeAmp * shakeT / 18;
    camera.position.x += (Math.random() - 0.5) * k;
    camera.position.y += (Math.random() - 0.5) * k;
  }
  camera.lookAt(mx * 0.24, 1.25 + Math.max(p1.y, p2.y) * 0.12, mz * 0.55);
  renderer.render(scene, camera);
}

function removeObj(obj) {
  if (!obj) return;
  obj.traverse?.((c) => {
    c.geometry?.dispose?.();
    if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
    else c.material?.dispose?.();
  });
  obj.parent?.remove(obj);
}

function audio() {
  if (!audioCtx) {
    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioClass) return;
      audioCtx = new AudioClass();
    } catch (_) {
      return;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(f, d, type = 'sine', gain = 0.08, slide = 0) {
  if (!settings.sound || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const vol = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
  vol.gain.setValueAtTime(0.0001, t);
  vol.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + d);
  osc.connect(vol);
  vol.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + d + 0.05);
}

function noise(d, gain = 0.12, hp = 800) {
  if (!settings.sound || !audioCtx) return;
  const t = audioCtx.currentTime;
  const buffer = audioCtx.createBuffer(1, Math.max(1, Math.floor(audioCtx.sampleRate * d)), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const vol = audioCtx.createGain();
  src.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = hp;
  vol.gain.setValueAtTime(gain, t);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(filter);
  filter.connect(vol);
  vol.connect(audioCtx.destination);
  src.start(t);
  src.stop(t + d + 0.03);
}

function sound(name) {
  if (!settings.sound) return;
  if (name === 'jump') tone(260, 0.08, 'triangle', 0.08, 120);
  if (name === 'whoosh') noise(0.08, 0.08, 1500);
  if (name === 'hit') { tone(110, 0.12, 'sawtooth', 0.16, -50); noise(0.08, 0.13, 550); }
  if (name === 'block') { tone(520, 0.05, 'square', 0.1, -180); noise(0.04, 0.07, 1800); }
  if (name === 'grab') tone(180, 0.08, 'square', 0.1, -40);
  if (name === 'throw') { tone(72, 0.18, 'sawtooth', 0.18, -25); noise(0.18, 0.2, 180); }
  if (name === 'projectile') tone(680, 0.11, 'triangle', 0.08, 220);
  if (name === 'super') { tone(880, 0.12, 'square', 0.12, -220); setTimeout(() => tone(440, 0.2, 'sawtooth', 0.14, -170), 90); }
}

function rumble(side, strength, duration) {
  if (!settings.rumble || !navigator.getGamepads) return;
  const pad = navigator.getGamepads()[side === 'p1' ? 0 : 1];
  pad?.vibrationActuator?.playEffect?.('dual-rumble', { duration, strongMagnitude: strength, weakMagnitude: strength * 0.55 }).catch?.(() => {});
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000 || STEP);
  last = now;
  accumulator += dt;
  let guard = 0;
  while (accumulator >= STEP && guard < 4) {
    tick();
    accumulator -= STEP;
    guard++;
  }
  if (frame % 60 === 0) pads();
  cameraTick(dt);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
