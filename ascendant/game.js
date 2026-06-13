const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const STEP = 1 / 60;
const ARENA_X = 7.4;
const ARENA_Z = 2.55;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

const SETTINGS_DEFAULT = {
  difficulty: 'medium',
  roundTime: 99,
  deadzone: 0.18,
  cameraShake: true,
  rumble: true,
  sound: true,
  brutal: true
};

const DIFFICULTY = {
  easy: { react: 34, aggro: 0.34, block: 0.22, combo: 0.18, throwTech: 0.2, mistake: 0.24 },
  medium: { react: 22, aggro: 0.52, block: 0.42, combo: 0.42, throwTech: 0.44, mistake: 0.13 },
  hard: { react: 14, aggro: 0.72, block: 0.63, combo: 0.68, throwTech: 0.62, mistake: 0.06 },
  nightmare: { react: 8, aggro: 0.9, block: 0.82, combo: 0.86, throwTech: 0.78, mistake: 0.02 }
};

const ROSTER = [
  { id: 'akio', name: 'Akio', role: 'Solar Duelist', color: 0xb9252f, accent: 0xffd36a, hair: 0x161016, skin: 0xd99b72, speed: 4.2, step: 3.4, jump: 8.2, weight: 1.0, power: 7, reach: 6, defense: 6, technique: 7, style: 'Balanced confirms, clean dragon-rise anti-air, reliable corner routes.', special: 'Sun Fang', super: 'Red Horizon' },
  { id: 'nyra', name: 'Nyra', role: 'Void Ninja', color: 0x27255f, accent: 0x68e8ff, hair: 0x07111a, skin: 0xd8a07a, speed: 5.25, step: 4.25, jump: 9.4, weight: 0.86, power: 5, reach: 6, defense: 4, technique: 10, style: 'Fastest dash, cross-up air kicks, long juggle extensions.', special: 'Phase Needle', super: 'No-Moon Execution' },
  { id: 'bront', name: 'Bront', role: 'Titan Grappler', color: 0x315f45, accent: 0xffb866, hair: 0x342016, skin: 0xc48660, speed: 3.12, step: 2.55, jump: 7.0, weight: 1.3, power: 10, reach: 4, defense: 10, technique: 4, style: 'Armored lariats, huge command throws, slow but terrifying.', special: 'Anvil Driver', super: 'World Breaker' },
  { id: 'seren', name: 'Seren', role: 'Arc Zoner', color: 0x6b44a7, accent: 0xff72cf, hair: 0xf2e5ff, skin: 0xca9470, speed: 3.72, step: 3.35, jump: 8.0, weight: 0.95, power: 6, reach: 10, defense: 5, technique: 8, style: 'Long plasma arcs, patient whiff punishes, strong guard damage.', special: 'Prism Arc', super: 'Nebula Verdict' },
  { id: 'vex', name: 'Vex', role: 'Rush Striker', color: 0xc85d25, accent: 0xffee70, hair: 0x631b13, skin: 0xd49a70, speed: 4.9, step: 3.8, jump: 8.6, weight: 0.93, power: 7, reach: 5, defense: 5, technique: 7, style: 'Plus pressure, brutal roundhouse routes, explosive wall carry.', special: 'Blitz Rail', super: 'Meteor Riot' },
  { id: 'mae', name: 'Mae', role: 'Combo Savant', color: 0x14877e, accent: 0x9dffb7, hair: 0x123b2c, skin: 0xdca57e, speed: 4.35, step: 3.85, jump: 8.5, weight: 0.96, power: 6, reach: 6, defense: 5, technique: 10, style: 'Cancel-heavy strings, trap-like back special, technical juggle loops.', special: 'Bloom Snare', super: 'Clockwork Bloom' },
  { id: 'riven', name: 'Riven', role: 'Blade Heir', color: 0x7b1f35, accent: 0xffffff, hair: 0xd8d8e8, skin: 0xd79a72, speed: 4.55, step: 3.45, jump: 8.35, weight: 0.98, power: 8, reach: 8, defense: 5, technique: 8, style: 'Sword normals, slicing finishers, strong mid-range control.', special: 'Silver Reap', super: 'Thousand Cut Dawn' },
  { id: 'kael', name: 'Kael', role: 'Thunder Monk', color: 0x244f8e, accent: 0x74f0ff, hair: 0x10151d, skin: 0xcb8f64, speed: 4.0, step: 3.2, jump: 8.0, weight: 1.05, power: 7, reach: 6, defense: 7, technique: 7, style: 'Guard crushing palms and electric counter-hit reward.', special: 'Storm Palm', super: 'Heaven Drum' },
  { id: 'iori', name: 'Iori', role: 'Blood Idol', color: 0x9e223e, accent: 0xff83a2, hair: 0x261018, skin: 0xdfaa86, speed: 4.7, step: 3.6, jump: 8.2, weight: 0.92, power: 7, reach: 5, defense: 4, technique: 9, style: 'Risky lifesteal strikes and vicious close-range conversions.', special: 'Scarlet Kiss', super: 'Curtain Call' },
  { id: 'ox', name: 'Ox', role: 'Chrome Brawler', color: 0x4e5968, accent: 0xff3d5a, hair: 0x0d0e12, skin: 0xb98562, speed: 3.45, step: 2.9, jump: 7.4, weight: 1.22, power: 9, reach: 5, defense: 9, technique: 5, style: 'Armored hooks, heavy stun, excellent comeback supers.', special: 'Chrome Knuckle', super: 'Iron Funeral' },
  { id: 'luma', name: 'Luma', role: 'Star Fencer', color: 0x335c9f, accent: 0xffe28a, hair: 0xffe0a8, skin: 0xe0aa82, speed: 4.45, step: 4.0, jump: 8.7, weight: 0.9, power: 6, reach: 9, defense: 5, technique: 9, style: 'Elegant long pokes, air mobility, precise whiff punishment.', special: 'Comet Pierce', super: 'Astral Checkmate' },
  { id: 'dread', name: 'Dread', role: 'Abyss Boss', color: 0x18151f, accent: 0xa872ff, hair: 0x050507, skin: 0x9f6d61, speed: 3.85, step: 3.0, jump: 7.8, weight: 1.12, power: 9, reach: 8, defense: 8, technique: 7, style: 'Boss-like reach, oppressive armored specials, punishing supers.', special: 'Abyss Maw', super: 'End Scripture' }
];

const BY_ID = new Map(ROSTER.map((f) => [f.id, f]));

const MOVE = {
  jab: { id: 'jab', name: 'Quick Jab', kind: 'normal', limb: 'punch', damage: 4, startup: 3, active: 4, recovery: 7, hit: 13, block: 5, reach: 0.72, width: 0.52, depth: 0.5, height: 0.55, y: 1.34, push: 0.7, meter: 4, cancelStart: 4, cancelEnd: 14, cancelTo: ['straight', 'lowKick', 'special1', 'special2', 'antiAir', 'super'] },
  straight: { id: 'straight', name: 'Straight', kind: 'normal', limb: 'punch', damage: 7, startup: 5, active: 4, recovery: 11, hit: 18, block: 7, reach: 0.98, width: 0.6, depth: 0.54, height: 0.66, y: 1.24, push: 1.08, meter: 6, cancelStart: 6, cancelEnd: 18, cancelTo: ['hook', 'launcher', 'special1', 'special2', 'antiAir', 'super'] },
  hook: { id: 'hook', name: 'Crushing Hook', kind: 'normal', limb: 'punch', damage: 11, startup: 8, active: 5, recovery: 16, hit: 24, block: 11, reach: 1.1, width: 0.72, depth: 0.66, height: 0.78, y: 1.14, push: 1.55, meter: 8, counter: 4, cancelStart: 10, cancelEnd: 22, cancelTo: ['special1', 'special2', 'antiAir', 'super'] },
  crouchJab: { id: 'crouchJab', name: 'Body Check', kind: 'normal', limb: 'punch', damage: 5, startup: 4, active: 4, recovery: 9, hit: 15, block: 6, reach: 0.82, width: 0.56, depth: 0.52, height: 0.36, y: 0.68, push: 0.82, meter: 4, cancelStart: 6, cancelEnd: 16, cancelTo: ['lowKick', 'sweep', 'special1', 'super'] },
  lowKick: { id: 'lowKick', name: 'Shin Kick', kind: 'normal', limb: 'kick', damage: 7, startup: 6, active: 5, recovery: 12, hit: 18, block: 8, reach: 1.06, width: 0.68, depth: 0.62, height: 0.34, y: 0.44, push: 1.1, meter: 6, low: true, cancelStart: 8, cancelEnd: 18, cancelTo: ['sweep', 'special1', 'special2', 'super'] },
  sweep: { id: 'sweep', name: 'Low Sweep', kind: 'normal', limb: 'kick', damage: 12, startup: 10, active: 7, recovery: 23, hit: 31, block: 13, reach: 1.32, width: 0.84, depth: 0.74, height: 0.34, y: 0.42, push: 2.1, meter: 9, low: true, knockdown: 42, counter: 4 },
  launcher: { id: 'launcher', name: 'Rising Launcher', kind: 'normal', limb: 'kick', damage: 13, startup: 12, active: 6, recovery: 24, hit: 30, block: 15, reach: 1.12, width: 0.74, depth: 0.7, height: 0.92, y: 1.0, push: 1.8, meter: 10, launch: 3.35, juggle: 1, cancelStart: 15, cancelEnd: 26, cancelTo: ['airPunch', 'special1', 'antiAir', 'super'] },
  roundhouse: { id: 'roundhouse', name: 'Roundhouse', kind: 'normal', limb: 'kick', damage: 15, startup: 13, active: 7, recovery: 24, hit: 32, block: 15, reach: 1.48, width: 0.9, depth: 0.78, height: 0.84, y: 1.02, push: 2.45, meter: 11, launch: 1.25, counter: 5 },
  airPunch: { id: 'airPunch', name: 'Air Fang', kind: 'air', limb: 'punch', damage: 8, startup: 5, active: 11, recovery: 8, hit: 24, block: 10, reach: 1.0, width: 0.66, depth: 0.66, height: 0.64, y: 1.08, push: 1.55, meter: 7, overhead: true, cancelStart: 8, cancelEnd: 17, cancelTo: ['airKick'] },
  airKick: { id: 'airKick', name: 'Dive Kick', kind: 'air', limb: 'kick', damage: 11, startup: 7, active: 13, recovery: 12, hit: 29, block: 13, reach: 1.15, width: 0.76, depth: 0.7, height: 0.72, y: 0.98, push: 2.0, meter: 9, overhead: true, knockdown: 30, velocity: 1.2 },
  throw: { id: 'throw', name: 'Throw', kind: 'throw', limb: 'throw', damage: 16, startup: 5, active: 5, recovery: 22, hit: 26, reach: 0.9, width: 0.82, depth: 0.76, height: 1.25, y: 1, push: 3.2, unblockable: true, knockdown: 50, techWindow: 10 },
  special1: { id: 'special1', name: 'Special', kind: 'special', limb: 'punch', damage: 18, startup: 9, active: 12, recovery: 25, hit: 35, block: 16, reach: 1.75, width: 0.95, depth: 0.85, height: 0.9, y: 1.05, push: 2.8, meter: 15, launch: 2.25, velocity: 2.2, cancelStart: 11, cancelEnd: 27, cancelTo: ['super'] },
  special2: { id: 'special2', name: 'Back Special', kind: 'special', limb: 'kick', damage: 15, startup: 12, active: 10, recovery: 24, hit: 31, block: 12, reach: 1.42, width: 0.92, depth: 1.04, height: 0.82, y: 0.96, push: 2.25, meter: 13, low: true, knockdown: 35, sideShift: 0.6 },
  antiAir: { id: 'antiAir', name: 'Dragon Rise', kind: 'special', limb: 'punch', damage: 17, startup: 5, active: 10, recovery: 31, hit: 38, block: 18, reach: 1.0, width: 0.76, depth: 0.72, height: 1.2, y: 1.22, push: 1.7, meter: 14, launch: 4.0, invuln: 8, velocityY: 3.2, antiAir: true },
  projectile: { id: 'projectile', name: 'Arc Shot', kind: 'special', limb: 'punch', damage: 13, startup: 13, active: 3, recovery: 26, hit: 28, block: 11, reach: 0.9, width: 0.6, depth: 0.6, height: 0.7, y: 1.08, push: 1.8, meter: 13, projectile: true, chip: 3 },
  charge: { id: 'charge', name: 'Charge Breaker', kind: 'special', limb: 'punch', damage: 20, startup: 14, active: 15, recovery: 27, hit: 38, block: 18, reach: 1.9, width: 1.05, depth: 0.86, height: 0.92, y: 1.02, push: 3.4, meter: 16, armor: 9, velocity: 3.5, wallBounce: true },
  super: { id: 'super', name: 'Super', kind: 'super', limb: 'super', damage: 42, startup: 7, active: 30, recovery: 42, hit: 50, block: 24, reach: 2.35, width: 1.32, depth: 1.08, height: 1.12, y: 1.05, push: 4.35, meter: 0, launch: 4.2, chip: 7, multi: 3, hitEvery: 7, invuln: 16, armorBreak: true }
};

const KEYMAP = {
  p1: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', stepL: 'KeyQ', stepR: 'KeyE', block: 'KeyU', light: 'KeyJ', heavy: 'KeyK', kick: 'KeyL', special: 'KeyI', throw: 'KeyO', super: 'KeyP' },
  p2: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', stepL: 'Numpad7', stepR: 'Numpad9', block: 'Numpad0', light: 'Numpad1', heavy: 'Numpad2', kick: 'Numpad3', special: 'Numpad4', throw: 'Numpad5', super: 'Numpad6' }
};

let scene;
let camera;
let renderer;
let p1;
let p2;
let frame = 0;
let last = 0;
let accumulator = 0;
let keys = new Set();
let settings = loadSettings();
let selectedMode = 'arcade';
let selectedSide = 'p1';
let selected = { p1: 'akio', p2: 'nyra' };
let wins = { p1: 0, p2: 0 };
let roundNo = 1;
let roundTime = settings.roundTime;
let arcadeIdx = 0;
let survival = { streak: 0, hp: 100, meter: 0 };
let running = false;
let paused = false;
let roundOver = false;
let freeze = 0;
let shakeT = 0;
let shakeAmp = 0;
let particles = [];
let projectiles = [];
let stageBits = [];
let touch = { x: 0, z: 0, buttons: {} };
let audioCtx = null;

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
    this.buttons = {};
    for (const k of ['light', 'heavy', 'kick', 'special', 'throw', 'super', 'block']) this.buttons[k] = new Latch();
    this.input = [];
    this.lastButtons = {};
    this.ai = { think: 0, act: 'idle', actT: 0, blockT: 0, burstT: 0 };
    this.model = createFighterModel(def);
    scene.add(this.model.root);
    this.reset(side === 'p1' ? -2.65 : 2.65);
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
    this.chip = 100;
    this.guard = 100;
    this.meter = this.meter || 0;
    this.state = 'intro';
    this.t = 0;
    this.move = null;
    this.chain = [];
    this.hitIds = new Set();
    this.hitstun = 0;
    this.blockstun = 0;
    this.knockdown = 0;
    this.wakeup = 0;
    this.invuln = 42;
    this.throwInvuln = 18;
    this.armor = 0;
    this.grounded = true;
    this.crouch = false;
    this.combo = 0;
    this.comboDamage = 0;
    this.comboT = 0;
    this.juggle = 0;
    this.perfect = true;
    this.brutalized = false;
    this.pose = Math.random() * TAU;
    sync(this);
  }

  box() {
    const h = this.crouch ? 1.08 : 1.92;
    return { x: this.x, z: this.z, y: this.y + h / 2, w: 0.68 * scaleOf(this), d: 0.56 * scaleOf(this), h: h * scaleOf(this) };
  }

  canAct() {
    return this.state !== 'intro' && this.state !== 'ko' && this.hitstun <= 0 && this.blockstun <= 0 && this.knockdown <= 0 && freeze <= 0;
  }
}

class Projectile {
  constructor(owner, move) {
    this.owner = owner;
    this.move = move;
    this.x = owner.x + owner.facing * 0.85;
    this.z = owner.z;
    this.y = 1.14;
    this.vx = owner.facing * (8.2 + owner.def.reach * 0.13);
    this.life = 76;
    this.hitId = `${owner.side}-orb-${frame}-${Math.random()}`;
    this.mesh = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 2), matBasic(owner.def.accent, 0.96));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.025, 8, 28), matBasic(owner.def.accent, 0.58));
    ring.rotation.y = Math.PI / 2;
    const light = new THREE.PointLight(owner.def.accent, 1.6, 5);
    this.mesh.add(core, ring, light);
    scene.add(this.mesh);
  }

  tick() {
    this.life--;
    this.x += this.vx * STEP;
    this.mesh.position.set(this.x, this.y + Math.sin(frame * 0.24) * 0.05, this.z);
    this.mesh.rotation.x += 0.18;
    this.mesh.rotation.y += 0.24;
    const target = this.owner === p1 ? p2 : p1;
    if (target && overlap({ x: this.x, z: this.z, y: this.y, w: 0.48, d: 0.48, h: 0.48 }, target.box())) {
      applyHit(this.owner, target, this.move, this.hitId);
      burst(this.x, this.y, this.z, this.owner.def.accent, 24, 0.62);
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

function scaleOf(f) {
  return 0.92 + f.def.weight * 0.08;
}

function loadSettings() {
  try {
    return { ...SETTINGS_DEFAULT, ...JSON.parse(localStorage.getItem('ascendant.settings') || '{}') };
  } catch (_) {
    return { ...SETTINGS_DEFAULT };
  }
}

function saveSettings() {
  try { localStorage.setItem('ascendant.settings', JSON.stringify(settings)); } catch (_) {}
}

function boot() {
  if (!window.THREE) {
    $('menu').innerHTML = '<div class="modal"><div><h2>Three.js failed to load</h2></div></div>';
    return;
  }
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050609);
  scene.fog = new THREE.Fog(0x050609, 18, 62);
  camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 3.25, 10.6);
  renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  buildLights();
  buildStage();
  bindUI();
  bindInput();
  fillRoster();
  applySettings();
  resize();
  requestAnimationFrame(loop);
}

function buildLights() {
  scene.add(new THREE.HemisphereLight(0xffe7d3, 0x161627, 0.7));
  const key = new THREE.DirectionalLight(0xffd36a, 2.7);
  key.position.set(-6, 10, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x68e8ff, 1.55);
  rim.position.set(7, 7, -8);
  scene.add(rim);
}

function buildStage() {
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(8.3, 8.3, 0.34, 128), matToon(0x161824));
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);
  stageBits.push(floor);
  const sigil = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.04, 128), matToon(0x282033));
  sigil.position.y = 0.0;
  sigil.receiveShadow = true;
  scene.add(sigil);
  stageBits.push(sigil);
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7 + i * 1.05, 0.018, 8, 128), matBasic(i % 2 ? 0xff3d5a : 0x68e8ff, 0.38));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04 + i * 0.005;
    scene.add(ring);
    stageBits.push(ring);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(70, 26), matBasic(0x080a12, 0.94));
  back.position.set(0, 8.4, -18);
  scene.add(back);
  stageBits.push(back);
  for (let i = -9; i <= 9; i++) {
    const tower = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 3.2 + Math.random() * 2.4, 8), matToon(i % 2 ? 0x241928 : 0x1a2030));
    base.position.y = base.geometry.parameters.height / 2;
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 5), matBasic(i % 2 ? 0xff3d5a : 0x68e8ff, 0.78));
    crystal.position.y = base.geometry.parameters.height + 0.55;
    crystal.castShadow = true;
    tower.add(base, crystal);
    tower.position.set(i * 1.35, 0, -11.5 - Math.random() * 3.5);
    tower.rotation.y = Math.random() * TAU;
    scene.add(tower);
    stageBits.push(tower);
  }
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * TAU;
    const color = i % 3 === 0 ? 0xff3d5a : i % 3 === 1 ? 0x68e8ff : 0xffd36a;
    const light = new THREE.PointLight(color, 1.25, 9, 2);
    light.position.set(Math.cos(a) * 8.2, 3.7 + Math.sin(i) * 0.4, Math.sin(a) * 5.2 - 1.2);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), matBasic(color, 0.9));
    orb.position.copy(light.position);
    scene.add(light, orb);
    stageBits.push(light, orb);
  }
}

function matToon(color) {
  return new THREE.MeshToonMaterial({ color });
}

function matBasic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
}

function matStandard(color, metalness = 0.1, roughness = 0.62) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function capsule(r, len, mat) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 7, 14), mat);
}

function outline(mesh, s = 1.055) {
  const clone = mesh.clone();
  clone.material = matBasic(0x040407, 0.9);
  clone.scale.multiplyScalar(s);
  clone.renderOrder = -1;
  return clone;
}

function createFighterModel(def) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const skin = matToon(def.skin);
  const cloth = matToon(def.color);
  const accent = matToon(def.accent);
  const dark = matToon(0x10131b);
  const hairMat = matToon(def.hair);
  const metal = matStandard(def.accent, 0.38, 0.42);
  const parts = [];

  function add(mesh, parent = rig, os = 1.055) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    const out = outline(mesh, os);
    parent.add(out);
    parts.push(mesh);
    return mesh;
  }

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 42), matBasic(0x000000, 0.34));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.013;
  root.add(shadow);

  const pelvis = add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.44), dark));
  pelvis.position.y = 0.82;
  const torso = add(capsule(0.35, 0.78, cloth));
  torso.position.y = 1.34;
  torso.scale.set(1.08, 1, 0.78);
  const chest = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.08), accent));
  chest.position.set(0, 1.48, 0.33);
  const waist = add(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.46), accent));
  waist.position.y = 1.0;
  const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.16, 12), skin));
  neck.position.y = 1.86;
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 14), skin));
  head.position.y = 2.08;
  head.scale.set(0.92, 1.05, 0.9);
  const hair = add(new THREE.Mesh(new THREE.SphereGeometry(0.31, 18, 10, 0, TAU, 0, Math.PI / 1.55), hairMat));
  hair.position.set(0, 2.16, -0.02);
  hair.rotation.x = -0.12;
  const bangL = add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), hairMat));
  bangL.position.set(-0.12, 2.02, 0.19);
  bangL.rotation.z = -0.35;
  const bangR = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34, 6), hairMat));
  bangR.position.set(0.13, 2.04, 0.2);
  bangR.rotation.z = 0.32;
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.02), matBasic(0x050507, 1));
  eye.position.set(0, 2.08, 0.245);
  rig.add(eye);
  const scarf = add(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.16), accent));
  scarf.position.set(0, 1.82, 0.08);

  const armL = limbArm(-1, cloth, skin, accent, add);
  const armR = limbArm(1, cloth, skin, accent, add);
  const legL = limbLeg(-1, dark, accent, add);
  const legR = limbLeg(1, dark, accent, add);
  rig.add(armL.group, armR.group, legL.group, legR.group);

  let blade = null;
  if (['riven', 'luma', 'dread'].includes(def.id)) {
    blade = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.92, 0.035), metal), armR.group, 1.08);
    blade.position.set(0.02, -1.22, 0.06);
    blade.rotation.x = 0.2;
  }
  const coat = add(new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.78, 5, 1, true), cloth));
  coat.position.y = 0.82;
  coat.rotation.y = Math.PI / 5;
  coat.scale.z = 0.55;
  const aura = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.025, 8, 54), matBasic(def.accent, 0.52));
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.035;
  root.add(aura);

  const model = { root, rig, pelvis, torso, chest, waist, neck, head, hair, bangL, bangR, eye, scarf, armL, armR, legL, legR, coat, aura, shadow, parts, blade };
  root.userData.model = model;
  return model;
}

function limbArm(side, cloth, skin, accent, add) {
  const group = new THREE.Group();
  group.position.set(side * 0.47, 1.7, 0.02);
  const upper = add(capsule(0.086, 0.42, cloth), group);
  upper.position.y = -0.25;
  const fore = add(capsule(0.075, 0.4, skin), group);
  fore.position.y = -0.68;
  const fist = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), accent), group);
  fist.position.y = -0.94;
  return { group, upper, fore, fist };
}

function limbLeg(side, dark, accent, add) {
  const group = new THREE.Group();
  group.position.set(side * 0.18, 0.82, 0);
  const thigh = add(capsule(0.108, 0.5, dark), group);
  thigh.position.y = -0.29;
  const shin = add(capsule(0.094, 0.52, dark), group);
  shin.position.y = -0.84;
  const foot = add(new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.12, 0.45), accent), group);
  foot.position.set(0, -1.13, 0.14);
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
  $('end-menu-button').addEventListener('click', backMenu);
  $('continue-button').addEventListener('click', continueRound);
  $('difficulty').addEventListener('change', (e) => { settings.difficulty = e.target.value; saveSettings(); });
  $('round-time').addEventListener('change', (e) => { settings.roundTime = Number(e.target.value); saveSettings(); });
  $('deadzone').addEventListener('input', (e) => { settings.deadzone = Number(e.target.value); saveSettings(); });
  for (const id of ['cameraShake', 'rumble', 'sound', 'brutal']) {
    $(id).addEventListener('change', (e) => { settings[id] = e.target.checked; saveSettings(); });
  }
}

function applySettings() {
  $('difficulty').value = settings.difficulty;
  $('round-time').value = String(settings.roundTime);
  $('deadzone').value = String(settings.deadzone);
  $('cameraShake').checked = settings.cameraShake;
  $('rumble').checked = settings.rumble;
  $('sound').checked = settings.sound;
  $('brutal').checked = settings.brutal;
}

function fillRoster() {
  const grid = $('roster-grid');
  grid.innerHTML = '';
  for (const f of ROSTER) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fighter';
    btn.style.setProperty('--color', hex(f.color));
    btn.style.setProperty('--accent', hex(f.accent));
    btn.style.setProperty('--glow', hex(f.accent));
    btn.innerHTML = `<div class="portrait"></div><b>${f.name}</b><span>${f.role}</span><div class="tags"></div>`;
    btn.addEventListener('click', () => {
      selected[selectedSide] = f.id;
      if (selected.p1 === selected.p2) selected[selectedSide === 'p1' ? 'p2' : 'p1'] = ROSTER.find((x) => x.id !== f.id).id;
      markRoster();
      detail(f);
    });
    grid.appendChild(btn);
  }
  markRoster();
  detail(BY_ID.get(selected.p1));
}

function markRoster() {
  [...document.querySelectorAll('.fighter')].forEach((el, i) => {
    const f = ROSTER[i];
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
    audio();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape') togglePause();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('gamepadconnected', () => { pads(); toastPad(); });
  addEventListener('gamepaddisconnected', pads);
  bindTouch();
}

function bindTouch() {
  if (matchMedia('(hover: none), (pointer: coarse)').matches) document.body.classList.add('touch');
  const stick = $('touch-stick');
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
  $('gamepad-list').innerHTML = list.length ? list.map((p, i) => `<div>P${i + 1}: ${p.id}</div>`).join('') : 'No gamepads detected.';
  $('pads-status').textContent = list.length ? `${list.length} pad${list.length > 1 ? 's' : ''} connected` : '';
}

function toastPad() {
  $('pads-status').textContent = 'Gamepad connected';
  clearTimeout(toastPad.t);
  toastPad.t = setTimeout(pads, 1600);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 720 ? 52 : 43;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}

function startMatch() {
  audio();
  cleanupFight();
  wins = { p1: 0, p2: 0 };
  roundNo = 1;
  arcadeIdx = 0;
  survival = { streak: 0, hp: 100, meter: 0 };
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('pause-button').classList.remove('hidden');
  $('round-end').classList.add('hidden');
  closePause();
  newRound();
}

function opponentDef() {
  if (selectedMode === 'arcade') {
    const pool = ROSTER.filter((f) => f.id !== selected.p1);
    return pool[arcadeIdx % pool.length];
  }
  if (selectedMode === 'survival') {
    const pool = ROSTER.filter((f) => f.id !== selected.p1);
    return pool[survival.streak % pool.length];
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
  if (selectedMode === 'survival') {
    p1.hp = survival.hp;
    p1.chip = survival.hp;
    p1.meter = survival.meter;
    p2.hp = Math.min(125, 92 + survival.streak * 4);
    p2.chip = p2.hp;
    p2.meter = Math.min(85, survival.streak * 10);
  }
  running = true;
  paused = false;
  roundOver = false;
  freeze = 0;
  roundTime = selectedMode === 'training' ? 0 : settings.roundTime;
  $('p1-name').textContent = p1.def.name;
  $('p1-role').textContent = p1.def.role;
  $('p2-name').textContent = p2.def.name;
  $('p2-role').textContent = p2.def.role;
  $('round-label').textContent = selectedMode === 'survival' ? `STREAK ${survival.streak + 1}` : `ROUND ${roundNo}`;
  $('mode-label').textContent = selectedMode.toUpperCase();
  drawRounds();
  updateHUD(true);
  banner(selectedMode === 'survival' ? `FIGHT ${survival.streak + 1}` : `ROUND ${roundNo}`, 850);
  setTimeout(() => banner('FIGHT', 580), 850);
  setTimeout(() => { if (p1 && p2 && !roundOver) { p1.state = 'idle'; p2.state = 'idle'; } }, 1120);
}

function cleanupFight() {
  for (const f of [p1, p2]) if (f?.model?.root) removeObj(f.model.root);
  p1 = null;
  p2 = null;
  for (const p of projectiles) removeObj(p.mesh);
  projectiles = [];
  for (const s of particles) removeObj(s.mesh);
  particles = [];
}

function raw(side) {
  const map = KEYMAP[side];
  const r = { x: 0, z: 0 };
  if (keys.has(map.left)) r.x -= 1;
  if (keys.has(map.right)) r.x += 1;
  if (keys.has(map.up)) r.z -= 1;
  if (keys.has(map.down)) r.z += 1;
  if (keys.has(map.stepL)) r.stepL = true;
  if (keys.has(map.stepR)) r.stepR = true;
  for (const k of ['block', 'light', 'heavy', 'kick', 'special', 'throw', 'super']) r[k] = keys.has(map[k]);

  const pad = navigator.getGamepads?.()[side === 'p1' ? 0 : 1];
  if (pad) {
    const dz = settings.deadzone;
    const ax = Math.abs(pad.axes[0] || 0) > dz ? pad.axes[0] : 0;
    const ay = Math.abs(pad.axes[1] || 0) > dz ? pad.axes[1] : 0;
    r.x = Math.abs(ax) > Math.abs(r.x) ? ax : r.x;
    r.z = Math.abs(ay) > Math.abs(r.z) ? ay : r.z;
    const dpadX = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
    const dpadY = (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
    if (dpadX) r.x = dpadX;
    if (dpadY) r.z = dpadY;
    r.light ||= pad.buttons[2]?.pressed;
    r.heavy ||= pad.buttons[0]?.pressed;
    r.kick ||= pad.buttons[1]?.pressed;
    r.special ||= pad.buttons[3]?.pressed;
    r.throw ||= pad.buttons[4]?.pressed;
    r.super ||= pad.buttons[5]?.pressed || pad.buttons[9]?.pressed;
    r.block ||= pad.buttons[6]?.value > 0.45 || pad.buttons[7]?.value > 0.45 || pad.buttons[8]?.pressed;
  }

  if (side === 'p1') {
    r.x = clamp(r.x + touch.x, -1, 1);
    r.z = clamp(r.z + touch.z, -1, 1);
    for (const k of Object.keys(touch.buttons)) r[k] ||= touch.buttons[k];
  }
  return r;
}

function recordInput(f, r) {
  const dir = directionCode(r.x, r.z, f.facing);
  if (f.input.length === 0 || f.input[f.input.length - 1].dir !== dir || frame - f.input[f.input.length - 1].frame > 4) {
    f.input.push({ dir, frame });
    if (f.input.length > 18) f.input.shift();
  }
  for (const b of ['light', 'heavy', 'kick', 'special', 'throw', 'super', 'block']) {
    if (r[b] && !f.lastButtons[b]) f.input.push({ button: b, dir, frame });
    f.lastButtons[b] = !!r[b];
  }
  f.input = f.input.filter((i) => frame - i.frame < 44);
}

function directionCode(x, z, facing) {
  const fb = x * facing;
  if (z > 0.55 && fb > 0.35) return 'df';
  if (z > 0.55 && fb < -0.35) return 'db';
  if (z < -0.55 && fb > 0.35) return 'uf';
  if (z < -0.55 && fb < -0.35) return 'ub';
  if (z > 0.55) return 'd';
  if (z < -0.55) return 'u';
  if (fb > 0.45) return 'f';
  if (fb < -0.45) return 'b';
  return 'n';
}

function hasMotion(f, seq) {
  let at = f.input.length - 1;
  for (let i = seq.length - 1; i >= 0; i--) {
    while (at >= 0 && f.input[at].dir !== seq[i]) at--;
    if (at < 0) return false;
    at--;
  }
  return true;
}

function ai(f, t) {
  const d = DIFFICULTY[settings.difficulty];
  const dx = t.x - f.x;
  const dz = t.z - f.z;
  const dist = Math.hypot(dx, dz);
  f.ai.think--;
  f.ai.actT--;
  f.ai.blockT--;
  if (t.move && dist < 2.0 && f.ai.blockT <= 0 && Math.random() < d.block) {
    f.ai.act = 'block';
    f.ai.actT = d.react + 12;
    f.ai.blockT = 30;
  }
  if (f.ai.think <= 0) {
    f.ai.think = Math.ceil(d.react + Math.random() * 16);
    if (!t.grounded && dist < 2.1) f.ai.act = 'antiAir';
    else if (dist > 4.0 && f.def.reach >= 8 && Math.random() < 0.5) f.ai.act = 'projectile';
    else if (dist > 1.45) f.ai.act = Math.random() < d.aggro ? 'approach' : 'side';
    else if (t.hitstun > 0 && Math.random() < d.combo) f.ai.act = ['light', 'heavy', 'kick', 'special'][Math.floor(Math.random() * 4)];
    else f.ai.act = ['light', 'heavy', 'kick', 'throw', 'special', 'low'][Math.floor(Math.random() * 6)];
    if (Math.random() < d.mistake) f.ai.act = 'idle';
    f.ai.actT = 11 + Math.random() * 20;
  }
  const r = { x: 0, z: 0 };
  if (f.ai.act === 'approach') { r.x = Math.sign(dx); r.z = clamp(dz, -1, 1); }
  else if (f.ai.act === 'side') { r.z = dz > 0 ? -1 : 1; }
  else if (f.ai.act === 'block') { r.x = -f.facing; r.block = true; }
  else if (f.ai.act === 'antiAir') { r.x = Math.sign(dx); r.z = 0.8; r.special = f.ai.actT > 0; }
  else if (f.ai.act === 'projectile') { r.z = 0.8; r.special = f.ai.actT > 0; }
  else if (f.ai.act === 'low') { r.z = 0.85; r.kick = f.ai.actT > 0; }
  else if (['light', 'heavy', 'kick', 'throw', 'special'].includes(f.ai.act)) r[f.ai.act] = f.ai.actT > 0;
  if (f.meter >= 100 && dist < 2.35 && Math.random() < 0.012 + d.aggro * 0.01) r.super = true;
  return r;
}

function tick() {
  frame++;
  animateStage();
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
  if (roundTime && frame % 60 === 0) {
    roundTime--;
    if (roundTime <= 0) finish(p1.hp === p2.hp ? null : p1.hp > p2.hp ? 'p1' : 'p2', 'TIME');
  }
  stepFighter(p1, p2, raw('p1'));
  stepFighter(p2, p1, p2.human ? raw('p2') : selectedMode === 'training' ? trainingDummy(p2, p1) : ai(p2, p1));
  pushApart();
  projectiles = projectiles.filter((p) => p.tick());
  tickFx();
  if (selectedMode !== 'training') {
    if (p1.hp <= 0 && p2.hp <= 0) finish(null, 'DRAW');
    else if (p1.hp <= 0) finish('p2', p2.perfect ? 'PERFECT' : 'KO');
    else if (p2.hp <= 0) finish('p1', p1.perfect ? 'PERFECT' : 'KO');
  } else {
    if (p2.hp < 12 || p2.guard < 12) {
      p2.hp = 100;
      p2.chip = 100;
      p2.guard = 100;
      p2.meter = 100;
    }
    p1.meter = 100;
  }
  updateHUD();
}

function trainingDummy(f, t) {
  const r = { x: 0, z: 0 };
  if (t.move && Math.hypot(t.x - f.x, t.z - f.z) < 1.8) r.block = true;
  return r;
}

function stepFighter(f, o, r) {
  if (!f || !o) return;
  f.t++;
  recordInput(f, r);
  f.invuln = Math.max(0, f.invuln - 1);
  f.throwInvuln = Math.max(0, f.throwInvuln - 1);
  f.armor = Math.max(0, f.armor - 1);
  f.hitstun = Math.max(0, f.hitstun - 1);
  f.blockstun = Math.max(0, f.blockstun - 1);
  f.knockdown = Math.max(0, f.knockdown - 1);
  f.wakeup = Math.max(0, f.wakeup - 1);
  f.comboT = Math.max(0, f.comboT - 1);
  f.guard = clamp(f.guard + 0.07, 0, 100);
  if (f.comboT <= 0) { f.combo = 0; f.comboDamage = 0; f.juggle = 0; }
  f.chip = lerp(f.chip, f.hp, 0.035);
  for (const k of Object.keys(f.buttons)) f.buttons[k].set(r[k]);
  if (f.hitstun || f.blockstun || f.knockdown || f.state === 'intro' || f.state === 'ko') {
    if (f.knockdown === 1) {
      f.wakeup = 22;
      f.invuln = 12;
      f.throwInvuln = 20;
    }
    physics(f);
    pose(f);
    sync(f);
    return;
  }
  f.facing = o.x >= f.x ? 1 : -1;
  f.crouch = r.z > 0.58 && f.grounded && Math.abs(o.z - f.z) < 0.95;

  const next = resolveMove(f, o, r);
  if (next) {
    if (!f.move || canCancel(f, next)) startMove(f, tuneMove(f, next));
  }
  if (f.move) attackTick(f, o);
  if (!f.move) moveFighter(f, r);
  physics(f);
  pose(f);
  sync(f);
}

function resolveMove(f, o, r) {
  if (!f.canAct() && !f.move) return null;
  if (f.buttons.super.pressed && f.meter >= 100) return MOVE.super;
  if (f.buttons.throw.pressed) return MOVE.throw;
  if (f.buttons.special.pressed) {
    if (hasMotion(f, ['f', 'd', 'df'])) return MOVE.antiAir;
    if (hasMotion(f, ['d', 'df', 'f'])) return specialFor(f, 1);
    if (hasMotion(f, ['d', 'db', 'b'])) return specialFor(f, 2);
    if (f.def.reach >= 8 && Math.hypot(o.x - f.x, o.z - f.z) > 2.6) return specialFor(f, 3);
    return specialFor(f, 1);
  }
  if (f.buttons.light.pressed) {
    if (!f.grounded) return MOVE.airPunch;
    return f.crouch ? MOVE.crouchJab : f.chain.includes('jab') ? MOVE.straight : MOVE.jab;
  }
  if (f.buttons.heavy.pressed) {
    if (!f.grounded) return MOVE.airKick;
    return f.crouch ? MOVE.launcher : f.chain.includes('straight') ? MOVE.hook : MOVE.straight;
  }
  if (f.buttons.kick.pressed) {
    if (!f.grounded) return MOVE.airKick;
    if (f.crouch) return f.chain.includes('lowKick') ? MOVE.sweep : MOVE.lowKick;
    return Math.abs(o.x - f.x) < 1.35 ? MOVE.launcher : MOVE.roundhouse;
  }
  return null;
}

function canCancel(f, next) {
  if (!f.move) return true;
  const m = f.move;
  const hitOrBlock = m.hitLanded || m.blocked;
  const inWindow = f.t >= (m.cancelStart || 999) && f.t <= (m.cancelEnd || -1);
  return hitOrBlock && inWindow && (m.cancelTo || []).includes(next.id);
}

function tuneMove(f, move) {
  const m = { ...move };
  const power = f.def.power / 7;
  const reach = f.def.reach / 6;
  const technique = f.def.technique / 7;
  m.damage = Math.max(2, Math.round(m.damage * (0.86 + power * 0.14)));
  m.reach *= 0.88 + reach * 0.12;
  m.recovery = Math.max(5, Math.round(m.recovery * (1.08 - technique * 0.04)));
  m.characterName = m.kind === 'super' ? f.def.super : m.kind === 'special' ? f.def.special : m.name;
  if (['riven', 'luma', 'dread'].includes(f.def.id) && m.kind !== 'throw') {
    m.reach *= 1.12;
    m.limb = 'blade';
    m.slice = true;
  }
  if (f.def.id === 'bront' || f.def.id === 'ox' || f.def.id === 'dread') {
    if (m.kind === 'special') m.armor = Math.max(m.armor || 0, 8);
    if (m.id === 'throw') m.damage += 4;
  }
  if (f.def.id === 'seren' && m.id === 'special1') return { ...m, ...MOVE.projectile, characterName: f.def.special };
  return m;
}

function specialFor(f, slot) {
  if (slot === 3 || f.def.id === 'seren') return MOVE.projectile;
  if (slot === 2) return MOVE.special2;
  if (['bront', 'ox', 'dread'].includes(f.def.id)) return MOVE.charge;
  return MOVE.special1;
}

function startMove(f, move) {
  if (!f.move && !f.canAct()) return;
  if (f.move) {
    f.move = null;
    f.t = 0;
  }
  f.move = { ...move, hitLanded: false, blocked: false };
  f.state = move.kind === 'throw' ? 'throw' : move.kind === 'super' ? 'super' : move.kind === 'special' ? 'special' : 'attack';
  f.t = 0;
  f.hitIds.clear();
  f.chain.push(move.id);
  if (f.chain.length > 4) f.chain.shift();
  if (move.invuln) f.invuln = Math.max(f.invuln, move.invuln);
  if (move.armor) f.armor = Math.max(f.armor, move.armor);
  if (move.velocity) f.vx = f.facing * move.velocity;
  if (move.sideShift) f.vz += (f.side === 'p1' ? 1 : -1) * move.sideShift;
  if (move.velocityY) {
    f.vy = Math.max(f.vy, move.velocityY);
    f.grounded = false;
  }
  if (move.kind === 'super') {
    f.meter = 0;
    banner(move.characterName || f.def.super, 900);
    freeze = 14;
    aura(f, 46);
    sound('super');
  } else {
    sound(move.kind === 'throw' ? 'grab' : 'whoosh');
  }
}

function attackTick(f, o) {
  const m = f.move;
  if (!m) return;
  if (f.t === m.startup && m.projectile) {
    projectiles.push(new Projectile(f, m));
    sound('projectile');
  }
  const active = f.t >= m.startup && f.t < m.startup + m.active;
  if (active && !m.projectile) {
    if (m.multi && f.t % (m.hitEvery || 6) !== m.startup % (m.hitEvery || 6)) {
      // multi-hit supers pulse hitboxes on a beat
    } else {
      const hitId = `${f.side}-${m.id}-${Math.floor((f.t - m.startup) / (m.hitEvery || 99))}`;
      if (!f.hitIds.has(hitId) && overlap(attackBox(f, m), o.box())) {
        f.hitIds.add(hitId);
        if (m.kind === 'throw') hitThrow(f, o, m);
        else applyHit(f, o, m, hitId);
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
    y: f.y + m.y * scaleOf(f),
    w: m.width + m.reach,
    d: m.depth,
    h: m.height * scaleOf(f)
  };
}

function overlap(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.z - b.z) * 2 < a.d + b.d && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

function blocked(target, attacker, m) {
  if (target.guard <= 0 || m.unblockable) return false;
  const holding = target.buttons.block.now || target.vx * target.facing < -0.08;
  if (!holding && target.state !== 'block') return false;
  if (target.facing === attacker.facing) return false;
  if (m.low && !target.crouch && !target.buttons.block.now) return false;
  if (m.overhead && target.crouch && !target.buttons.block.now) return false;
  return true;
}

function applyHit(a, t, m, hitId) {
  if (t.invuln > 0 || t.state === 'ko') return;
  const counter = !!t.move && !t.armor;
  const armored = t.armor > 0 && !m.armorBreak;
  const isBlock = !armored && blocked(t, a, m);
  let dmg = m.damage + (counter ? m.counter || Math.ceil(m.damage * 0.22) : 0);
  if (armored) dmg = Math.ceil(dmg * 0.42);
  if (isBlock) dmg = Math.max(m.chip || 0, Math.floor(dmg * 0.18));
  t.hp = clamp(t.hp - dmg, 0, 125);
  if (dmg) t.perfect = false;
  a.meter = clamp(a.meter + (m.meter || 8) + (isBlock ? 2 : 7), 0, 100);
  t.meter = clamp(t.meter + (isBlock ? 5 : 9), 0, 100);
  const push = (m.push || 2) / Math.max(0.82, t.def.weight);
  if (isBlock) {
    t.guard = clamp(t.guard - (m.damage * 1.25 + (m.kind === 'super' ? 16 : 0)), 0, 100);
    t.blockstun = m.block || 10;
    t.state = t.guard <= 0 ? 'hit' : 'block';
    t.vx = a.facing * push * (t.guard <= 0 ? 1.1 : 0.5);
    if (t.guard <= 0) {
      t.hitstun = 38;
      banner('GUARD BREAK', 650);
      sound('break');
    }
    m.blocked = true;
  } else {
    t.hitstun = armored ? Math.min(10, m.hit || 18) : m.hit || 24;
    t.state = m.knockdown ? 'down' : 'hit';
    t.knockdown = armored ? 0 : m.knockdown || 0;
    t.vx = a.facing * push;
    t.vz = (t.z - a.z) * 1.8;
    if (m.launch && !armored) {
      const scale = Math.max(0.35, 1 - t.juggle * 0.13);
      t.vy = Math.max(t.vy, m.launch * scale);
      t.grounded = false;
      t.juggle++;
    }
    a.combo = a.comboT > 0 ? a.combo + 1 : 1;
    a.comboDamage = a.comboT > 0 ? a.comboDamage + dmg : dmg;
    a.comboT = 100;
    if (a.combo > 1) combo(a.combo, a.comboDamage, counter);
    m.hitLanded = true;
  }
  const color = isBlock ? 0x68e8ff : a.def.accent;
  burst(t.x, t.y + 1.05, t.z, color, isBlock ? 13 : m.kind === 'super' ? 34 : 24, isBlock ? 0.3 : 0.72);
  slashArc(a, t, m);
  freeze = Math.max(freeze, isBlock ? 4 : m.kind === 'super' ? 14 : counter ? 10 : 7);
  screen(isBlock ? 0.08 : m.kind === 'super' ? 0.36 : 0.2, isBlock ? 7 : 13);
  sound(isBlock ? 'block' : armored ? 'armor' : 'hit');
  rumble(a.side, isBlock ? 0.18 : 0.5, isBlock ? 60 : 140);
}

function hitThrow(a, t, m) {
  if (t.throwInvuln > 0 || !t.grounded) return;
  const tech = t.buttons.throw.now || (t.human && DIFFICULTY[settings.difficulty].throwTech > Math.random() && !t.hitstun);
  if (tech && Math.hypot(a.x - t.x, a.z - t.z) < 1.25) {
    t.throwInvuln = 30;
    a.throwInvuln = 20;
    a.vx = -a.facing * 1.2;
    t.vx = a.facing * 1.2;
    burst((a.x + t.x) / 2, 1.0, (a.z + t.z) / 2, 0x68e8ff, 20, 0.42);
    banner('THROW TECH', 500);
    sound('block');
    return;
  }
  t.hp = clamp(t.hp - m.damage, 0, 125);
  t.perfect = false;
  t.hitstun = m.hit;
  t.knockdown = m.knockdown;
  t.state = 'down';
  t.vx = a.facing * m.push;
  t.vy = 2.7;
  t.grounded = false;
  a.meter = clamp(a.meter + 16, 0, 100);
  a.move.hitLanded = true;
  burst(t.x, 0.8, t.z, a.def.accent, 30, 0.76);
  freeze = 10;
  screen(0.28, 15);
  sound('throw');
}

function moveFighter(f, r) {
  if (!f.canAct()) return;
  const back = r.x * f.facing < -0.55;
  if (r.block || back && Math.abs(r.x) > 0.6) f.state = 'block';
  else if (f.crouch) f.state = 'crouch';
  else if (Math.abs(r.x) > 0.12 || Math.abs(r.z) > 0.12 || r.stepL || r.stepR) f.state = 'walk';
  else f.state = 'idle';
  if (f.grounded && r.z < -0.78 && f.canAct()) {
    f.grounded = false;
    f.vy = f.def.jump;
    f.state = 'jump';
    sound('jump');
  }
  if (f.grounded) {
    const dash = f.wakeup > 0 && r.x * f.facing > 0.6 ? 1.4 : 1;
    f.vx = r.x * f.def.speed * dash;
    const stepInput = (r.stepR ? 1 : 0) - (r.stepL ? 1 : 0);
    f.vz = (r.z * 0.75 + stepInput) * f.def.step;
  } else {
    f.vx += r.x * 0.055;
    f.vz += r.z * 0.045;
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
  if (!p1 || !p2) return;
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const dist = Math.hypot(dx, dz) || 1;
  const min = 0.8;
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
    m.legL.group.rotation.x = Math.sin(walk) * 0.56;
    m.legR.group.rotation.x = -Math.sin(walk) * 0.56;
    m.armL.group.rotation.x = -0.45 - Math.sin(walk) * 0.25;
    m.armR.group.rotation.x = -0.5 + Math.sin(walk) * 0.25;
    m.rig.rotation.z = -f.facing * Math.sin(walk) * 0.035;
  }
  if (f.state === 'crouch') {
    m.rig.position.y = -0.17;
    m.legL.group.rotation.x = -0.86;
    m.legR.group.rotation.x = -0.6;
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
    m.rig.rotation.y = -f.facing * (0.18 * wind + 0.18 * snap);
    if (f.state === 'throw') {
      m.armL.group.rotation.x = -1.35 * wind;
      m.armR.group.rotation.x = -1.35 * wind;
      m.armL.group.rotation.z = 0.82;
      m.armR.group.rotation.z = -0.82;
    } else if (f.move.limb === 'kick') {
      m.legR.group.rotation.x = -1.6 * snap;
      m.legR.group.rotation.y = -f.facing * 0.44 * snap;
      m.legR.group.rotation.z = -f.facing * 0.54 * snap;
      m.legR.shin.rotation.x = 0.58 * snap;
      m.rig.rotation.x = -0.16 * snap;
    } else if (f.state === 'super') {
      m.armR.group.rotation.x = -2.1 * snap;
      m.legR.group.rotation.x = -1.2 * snap;
      m.rig.rotation.y = -f.facing * (0.45 + 0.42 * snap);
      m.coat.rotation.y = Math.sin(frame * 0.4) * 0.38;
    } else {
      m.armR.group.rotation.x = -1.7 * snap - 0.5 * wind;
      m.armR.group.rotation.y = -f.facing * 0.38 * snap;
      m.armR.group.rotation.z = -0.72 * snap;
      m.armR.fore.rotation.x = -0.48 * snap;
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
    m.rig.rotation.z = f.facing * 1.3;
    m.rig.rotation.x = 0.64;
    m.armL.group.rotation.x = 0.5;
    m.armR.group.rotation.x = 0.35;
  } else {
    m.head.rotation.x = 0;
  }
  m.aura.material.opacity = 0.18 + f.meter / 165 + Math.sin(frame * 0.08) * 0.05;
  m.aura.scale.setScalar(1 + f.meter / 220);
  m.shadow.scale.set(1 + f.y * 0.05, 0.68 + f.y * 0.02, 1);
}

function sync(f) {
  const s = scaleOf(f);
  const m = f.model.root;
  m.position.set(f.x, f.y, f.z);
  m.scale.set(s, s, s);
  const yaw = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
  m.rotation.y = lerpAngle(m.rotation.y || yaw, yaw, 0.42);
}

function lerpAngle(a, b, t) {
  const d = ((b - a + Math.PI) % TAU) - Math.PI;
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
  if (winner && settings.brutal && text !== 'TIME' && text !== 'DRAW') brutalFinish(winner === 'p1' ? p1 : p2, winner === 'p1' ? p2 : p1);
  drawRounds();
  banner(text, 900);
  let match = wins.p1 >= 2 || wins.p2 >= 2;
  if (selectedMode === 'survival') match = winner !== 'p1';
  if (selectedMode === 'arcade' && match && winner === 'p1') arcadeIdx++;
  setTimeout(() => {
    $('end-kicker').textContent = match ? 'MATCH OVER' : 'ROUND OVER';
    $('end-title').textContent = selectedMode === 'survival' && winner === 'p1' ? `STREAK ${survival.streak + 1}` : text;
    $('end-copy').textContent = endCopy(winner, match);
    $('continue-button').textContent = continueLabel(winner, match);
    $('round-end').classList.remove('hidden');
  }, 850);
}

function endCopy(winner, match) {
  if (!winner) return 'The round is a draw.';
  if (selectedMode === 'survival') {
    if (winner === 'p1') return `${p1.def.name} survived ${survival.streak + 1} opponent${survival.streak ? 's' : ''}.`;
    return `${p1.def.name} fell after ${survival.streak} win${survival.streak === 1 ? '' : 's'}.`;
  }
  const f = winner === 'p1' ? p1 : p2;
  if (match && selectedMode === 'arcade' && winner === 'p1' && arcadeIdx >= 5) return `${f.def.name} rules the Ascendant circuit.`;
  return `${f.def.name} wins.`;
}

function continueLabel(winner, match) {
  if (selectedMode === 'survival' && winner === 'p1') return 'Next Opponent';
  if (match) return selectedMode === 'arcade' && winner === 'p1' && arcadeIdx < 5 ? 'Next Rival' : 'Rematch';
  return 'Next Round';
}

function continueRound() {
  $('round-end').classList.add('hidden');
  if (selectedMode === 'survival') {
    if (p1.hp > 0) {
      survival.streak++;
      survival.hp = clamp(p1.hp + 18, 18, 100);
      survival.meter = p1.meter;
      newRound();
    } else {
      survival = { streak: 0, hp: 100, meter: 0 };
      startMatch();
    }
    return;
  }
  if (wins.p1 >= 2 || wins.p2 >= 2) {
    if (selectedMode === 'arcade' && wins.p1 >= 2 && arcadeIdx < 5) {
      wins = { p1: 0, p2: 0 };
      roundNo = 1;
    } else {
      wins = { p1: 0, p2: 0 };
      roundNo = 1;
    }
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
    const count = selectedMode === 'survival' ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('i');
      dot.classList.toggle('win', selectedMode === 'survival' ? i < Math.min(3, survival.streak) : i < wins[side]);
      el.appendChild(dot);
    }
  }
}

function updateHUD(force = false) {
  if (!p1 || !p2) return;
  $('p1-hp').style.width = `${clamp(p1.hp, 0, 100)}%`;
  $('p2-hp').style.width = `${clamp(p2.hp, 0, 100)}%`;
  $('p1-chip').style.width = `${clamp(p1.chip, p1.hp, 125)}%`;
  $('p2-chip').style.width = `${clamp(p2.chip, p2.hp, 125)}%`;
  $('p1-guard').style.width = `${p1.guard}%`;
  $('p2-guard').style.width = `${p2.guard}%`;
  $('p1-meter').style.width = `${p1.meter}%`;
  $('p2-meter').style.width = `${p2.meter}%`;
  $('timer').textContent = !roundTime ? '∞' : String(Math.max(0, roundTime)).padStart(2, '0');
  if (force) {
    for (const id of ['p1-chip', 'p2-chip']) $(id).style.transition = 'none';
    setTimeout(() => {
      for (const id of ['p1-chip', 'p2-chip']) $(id).style.transition = '';
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
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random() * 0.08, 8, 6), matBasic(color, 0.95));
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const a = Math.random() * TAU;
    particles.push({
      mesh,
      life: 20 + Math.random() * 18,
      vx: Math.cos(a) * power * 0.08,
      vy: Math.random() * power * 0.12,
      vz: Math.sin(a) * power * 0.08
    });
  }
}

function slashArc(a, t, m) {
  if (!m.slice && m.limb !== 'blade' && m.kind !== 'super') return;
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.018, 8, 48, Math.PI * 1.25), matBasic(a.def.accent, 0.72));
  mesh.position.set(t.x, t.y + 1.05, t.z);
  mesh.rotation.set(Math.PI / 2, 0, a.facing > 0 ? -0.6 : 0.6);
  scene.add(mesh);
  particles.push({ mesh, life: 16, spin: 0.16, fade: true });
}

function aura(f, life) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.25, 28, 14), matBasic(f.def.accent, 0.18));
  mesh.position.set(f.x, f.y + 1.1, f.z);
  scene.add(mesh);
  particles.push({ mesh, life, aura: f });
}

function brutalFinish(winner, loser) {
  if (loser.brutalized) return;
  loser.brutalized = true;
  banner('ASCENDANT FINISH', 900);
  const color = winner.def.accent;
  for (let i = 0; i < 5; i++) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.06 + Math.random() * 0.04, 0.55, 5), matBasic(color, 0.86));
    shard.position.set(loser.x + (Math.random() - 0.5) * 0.6, 0.75 + Math.random() * 1.0, loser.z + (Math.random() - 0.5) * 0.4);
    shard.rotation.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
    scene.add(shard);
    particles.push({ mesh: shard, life: 70, vx: (Math.random() - 0.5) * 0.08, vy: 0.05 + Math.random() * 0.08, vz: (Math.random() - 0.5) * 0.08, spin: 0.22, fade: true });
  }
  burst(loser.x, 1.05, loser.z, 0xff2442, 46, 0.86);
  screen(0.42, 26);
  rumble(winner.side, 0.8, 260);
}

function tickFx() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const s = particles[i];
    s.life--;
    if (s.aura) {
      s.mesh.position.set(s.aura.x, s.aura.y + 1.1, s.aura.z);
      s.mesh.scale.multiplyScalar(1.018);
      s.mesh.material.opacity = s.life / 180;
    } else {
      s.mesh.position.x += s.vx || 0;
      s.mesh.position.y += s.vy || 0;
      s.mesh.position.z += s.vz || 0;
      if (s.vy !== undefined) s.vy -= 0.006;
      if (s.spin) {
        s.mesh.rotation.x += s.spin;
        s.mesh.rotation.y += s.spin * 0.7;
      }
      if (s.mesh.material && s.mesh.material.opacity !== undefined) s.mesh.material.opacity = clamp(s.life / 30, 0, 1);
    }
    if (s.life <= 0) {
      removeObj(s.mesh);
      particles.splice(i, 1);
    }
  }
}

function screen(amp, t) {
  if (settings.cameraShake) {
    shakeAmp = Math.max(shakeAmp, amp);
    shakeT = Math.max(shakeT, t);
  }
  $('flash').classList.add('on');
  clearTimeout(screen.t);
  screen.t = setTimeout(() => $('flash').classList.remove('on'), 45);
}

function animateStage() {
  for (const obj of stageBits) {
    if (obj.geometry?.type === 'TorusGeometry') obj.rotation.z += 0.0015;
  }
}

function cameraTick(dt) {
  if (!p1 || !p2) {
    camera.position.x = lerp(camera.position.x, 0, dt * 2);
    camera.position.y = lerp(camera.position.y, 3.25, dt * 2);
    camera.position.z = lerp(camera.position.z, 10.6, dt * 2);
    camera.lookAt(0, 1.2, 0);
    renderer.render(scene, camera);
    return;
  }
  const mx = (p1.x + p2.x) / 2;
  const mz = (p1.z + p2.z) / 2;
  const sep = Math.hypot(p2.x - p1.x, p2.z - p1.z);
  const target = { x: mx * 0.36, y: 3.1 + clamp(sep * 0.06, 0, 0.55), z: 8.1 + clamp(sep * 0.55, 0, 4.4) };
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
  if (name === 'hit') { tone(106, 0.12, 'sawtooth', 0.16, -48); noise(0.08, 0.13, 550); }
  if (name === 'armor') { tone(86, 0.1, 'square', 0.13, -20); noise(0.05, 0.09, 300); }
  if (name === 'break') { tone(280, 0.14, 'square', 0.14, -180); noise(0.16, 0.16, 900); }
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
