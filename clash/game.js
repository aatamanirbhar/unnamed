const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (id) => document.getElementById(id);

const DEFAULT_SETTINGS = {
  difficulty: 'medium',
  timer: 99,
  deadzone: 0.18,
  profile: 'arcade',
  shake: true,
  vibration: true,
  music: true,
  sfx: true
};

const MODE_LABELS = {
  arcade: 'ARCADE',
  versus: 'VS LOCAL',
  cpu: 'CPU BATTLE',
  training: 'TRAINING',
  survival: 'SURVIVAL'
};

const DIFFICULTY = {
  easy: { name: 'Easy', reaction: 0.38, aggression: 0.34, defense: 0.22, combo: 0.22, punish: 0.22, error: 0.2 },
  medium: { name: 'Medium', reaction: 0.24, aggression: 0.52, defense: 0.42, combo: 0.42, punish: 0.42, error: 0.12 },
  hard: { name: 'Hard', reaction: 0.14, aggression: 0.68, defense: 0.62, combo: 0.66, punish: 0.64, error: 0.06 },
  nightmare: { name: 'Nightmare', reaction: 0.075, aggression: 0.82, defense: 0.78, combo: 0.84, punish: 0.82, error: 0.025 }
};

const FIGHTERS = [
  {
    id: 'kael',
    name: 'Kael',
    role: 'Balanced Martial Artist',
    color: 0xd8483d,
    accent: 0xffd089,
    glow: '#ffb96b',
    skin: 0xd6a174,
    scale: 1,
    speed: 4.15,
    dash: 8.4,
    jump: 8.6,
    weight: 1,
    walkAnim: 1,
    guard: 1,
    throwRange: 1.05,
    superName: 'Solar Dragon',
    trait: 'Clean links from light into medium and a reliable rising anti-air.',
    stats: { power: 6, speed: 6, range: 5, defense: 6, technique: 6 },
    specials: [
      { id: 'qcf', name: 'Sun Palm', input: 'QCF + Punch', type: 'projectile', damage: 13, startup: 12, active: 44, recovery: 21, speed: 8.8, meter: 13, chip: 3, hitstun: 34, blockstun: 15 },
      { id: 'qcb', name: 'Wheel Kick', input: 'QCB + Kick', type: 'dashStrike', damage: 16, startup: 10, active: 13, recovery: 24, range: 1.45, travel: 3.1, meter: 15, launch: 2.2 },
      { id: 'dp', name: 'Rising Ember', input: 'DP + Punch', type: 'uppercut', damage: 17, startup: 6, active: 12, recovery: 33, range: 1.15, invuln: 8, meter: 18, launch: 4.1 }
    ],
    super: { damage: 36, startup: 8, active: 24, recovery: 42, range: 2.4, cinematic: 44 }
  },
  {
    id: 'mako',
    name: 'Mako',
    role: 'Heavy Grappler',
    color: 0x3b6a49,
    accent: 0xf0c66c,
    glow: '#f0c66c',
    skin: 0xc58d68,
    scale: 1.15,
    speed: 3.35,
    dash: 6.7,
    jump: 7.5,
    weight: 1.25,
    walkAnim: 0.75,
    guard: 1.18,
    throwRange: 1.32,
    superName: 'Iron Avalanche',
    trait: 'Slow walk, brutal command grabs, armor on heavy pressure.',
    stats: { power: 9, speed: 3, range: 4, defense: 8, technique: 5 },
    specials: [
      { id: 'qcf', name: 'Crusher Lariat', input: 'QCF + Punch', type: 'armorStrike', damage: 19, startup: 14, active: 15, recovery: 28, range: 1.55, armor: 18, meter: 16, hitstun: 35, blockstun: 19 },
      { id: 'qcb', name: 'Titan Driver', input: 'QCB + Kick', type: 'commandThrow', damage: 24, startup: 7, active: 8, recovery: 35, range: 1.45, meter: 20 },
      { id: 'charge', name: 'Wall Breaker', input: 'Charge Back, Forward + Punch', type: 'rush', damage: 17, startup: 16, active: 24, recovery: 30, range: 1.4, travel: 4.8, armor: 20, meter: 15, wallBounce: true }
    ],
    super: { damage: 43, startup: 5, active: 14, recovery: 48, range: 1.65, cinematic: 54, throw: true }
  },
  {
    id: 'nyx',
    name: 'Nyx',
    role: 'Fast Ninja',
    color: 0x242b66,
    accent: 0x69f0ff,
    glow: '#69f0ff',
    skin: 0xd2a17e,
    scale: 0.92,
    speed: 5.05,
    dash: 10.2,
    jump: 9.6,
    weight: 0.88,
    walkAnim: 1.35,
    guard: 0.9,
    throwRange: 0.95,
    superName: 'Moonless Cut',
    trait: 'Fastest dash, tricky side switches, high combo routing.',
    stats: { power: 5, speed: 10, range: 5, defense: 4, technique: 8 },
    specials: [
      { id: 'qcf', name: 'Needle Fan', input: 'QCF + Punch', type: 'multiProjectile', damage: 8, startup: 9, active: 38, recovery: 18, speed: 10.5, meter: 11, shots: 3 },
      { id: 'qcb', name: 'Shadow Step', input: 'QCB + Kick', type: 'teleport', damage: 14, startup: 12, active: 9, recovery: 21, range: 1.2, meter: 15, crossup: true },
      { id: 'dp', name: 'Fox Spiral', input: 'DP + Punch', type: 'uppercut', damage: 15, startup: 5, active: 14, recovery: 31, range: 1.05, invuln: 10, meter: 18, launch: 4.5 }
    ],
    super: { damage: 34, startup: 6, active: 28, recovery: 38, range: 2.1, cinematic: 52, crossup: true }
  },
  {
    id: 'sable',
    name: 'Sable',
    role: 'Projectile Zoner',
    color: 0x704bb5,
    accent: 0xff72d2,
    glow: '#ff72d2',
    skin: 0xc99272,
    scale: 0.98,
    speed: 3.85,
    dash: 7.4,
    jump: 8,
    weight: 0.95,
    walkAnim: 0.92,
    guard: 0.98,
    throwRange: 0.95,
    superName: 'Prism Storm',
    trait: 'Controls space with angled bolts and meter-efficient beams.',
    stats: { power: 6, speed: 5, range: 10, defense: 5, technique: 7 },
    specials: [
      { id: 'qcf', name: 'Prism Bolt', input: 'QCF + Punch', type: 'projectile', damage: 12, startup: 10, active: 55, recovery: 18, speed: 9.7, meter: 14, chip: 4 },
      { id: 'qcb', name: 'Gravity Snare', input: 'QCB + Kick', type: 'trap', damage: 12, startup: 17, active: 90, recovery: 18, range: 3.2, meter: 18, snare: 30 },
      { id: 'charge', name: 'Star Lance', input: 'Charge Back, Forward + Punch', type: 'beam', damage: 18, startup: 18, active: 10, recovery: 31, range: 12, meter: 17, chip: 5 }
    ],
    super: { damage: 37, startup: 9, active: 54, recovery: 40, range: 12, cinematic: 56, beam: true }
  },
  {
    id: 'vex',
    name: 'Vex',
    role: 'Rushdown Striker',
    color: 0xe06f2d,
    accent: 0xfff06a,
    glow: '#fff06a',
    skin: 0xd39b71,
    scale: 0.96,
    speed: 4.72,
    dash: 10.7,
    jump: 8.9,
    weight: 0.93,
    walkAnim: 1.2,
    guard: 0.92,
    throwRange: 0.98,
    superName: 'Blitz Engine',
    trait: 'Plus frames, fierce corner carry, and a pressure rekka.',
    stats: { power: 7, speed: 9, range: 4, defense: 5, technique: 7 },
    specials: [
      { id: 'qcf', name: 'Blitz Knuckle', input: 'QCF + Punch', type: 'rush', damage: 15, startup: 8, active: 14, recovery: 23, range: 1.35, travel: 3.7, meter: 16, hitstun: 34, blockstun: 18 },
      { id: 'qcb', name: 'Heel Break', input: 'QCB + Kick', type: 'overhead', damage: 16, startup: 15, active: 9, recovery: 22, range: 1.2, meter: 13, overhead: true },
      { id: 'dp', name: 'Spark Upper', input: 'DP + Punch', type: 'uppercut', damage: 16, startup: 6, active: 11, recovery: 32, range: 1.1, invuln: 7, meter: 16, launch: 3.9 }
    ],
    super: { damage: 39, startup: 7, active: 34, recovery: 38, range: 2.45, cinematic: 50, rush: true }
  },
  {
    id: 'ori',
    name: 'Ori',
    role: 'Technical Combo Fighter',
    color: 0x1d8a8a,
    accent: 0xa7ffb7,
    glow: '#a7ffb7',
    skin: 0xd8a57d,
    scale: 0.99,
    speed: 4.25,
    dash: 8.9,
    jump: 8.75,
    weight: 0.96,
    walkAnim: 1.05,
    guard: 0.98,
    throwRange: 1,
    superName: 'Clockwork Bloom',
    trait: 'Long cancel windows, traps, and meter-heavy confirms.',
    stats: { power: 6, speed: 7, range: 6, defense: 5, technique: 10 },
    specials: [
      { id: 'qcf', name: 'Gear Palm', input: 'QCF + Punch', type: 'dashStrike', damage: 14, startup: 9, active: 12, recovery: 20, range: 1.35, travel: 2.4, meter: 17, hitstun: 37 },
      { id: 'qcb', name: 'Bloom Trap', input: 'QCB + Kick', type: 'trap', damage: 14, startup: 12, active: 82, recovery: 16, range: 2.25, meter: 18, snare: 24 },
      { id: 'dp', name: 'Vector Rise', input: 'DP + Punch', type: 'uppercut', damage: 14, startup: 5, active: 13, recovery: 29, range: 1.05, invuln: 8, meter: 17, launch: 4.4 }
    ],
    super: { damage: 35, startup: 6, active: 44, recovery: 36, range: 2.75, cinematic: 58, trapBurst: true }
  },
  {
    id: 'jin',
    name: 'Jin',
    role: 'Blade Duelist',
    color: 0xbfbfc9,
    accent: 0xff5f6d,
    glow: '#ff5f6d',
    skin: 0xd0a076,
    scale: 1.02,
    speed: 4.05,
    dash: 8.2,
    jump: 8.2,
    weight: 1,
    walkAnim: 0.95,
    guard: 1.05,
    throwRange: 1,
    sword: true,
    superName: 'Seven-Frame Draw',
    trait: 'Long pokes, whiff punishes, and precise counter-hit damage.',
    stats: { power: 8, speed: 6, range: 8, defense: 6, technique: 8 },
    specials: [
      { id: 'qcf', name: 'Steel Arc', input: 'QCF + Punch', type: 'slash', damage: 17, startup: 11, active: 10, recovery: 23, range: 1.85, meter: 16, hitstun: 36 },
      { id: 'qcb', name: 'Reverse Draw', input: 'QCB + Kick', type: 'counter', damage: 21, startup: 4, active: 34, recovery: 28, range: 1.7, meter: 18, counter: true },
      { id: 'dp', name: 'Sky Splitter', input: 'DP + Punch', type: 'uppercut', damage: 18, startup: 7, active: 11, recovery: 34, range: 1.4, invuln: 7, meter: 19, launch: 4.2 }
    ],
    super: { damage: 42, startup: 4, active: 18, recovery: 42, range: 3.1, cinematic: 56, slash: true }
  }
];

const FIGHTER_BY_ID = new Map(FIGHTERS.map((fighter) => [fighter.id, fighter]));

const NORMALS = {
  light: {
    name: 'Light',
    damage: 6,
    startup: 4,
    active: 5,
    recovery: 10,
    hitstun: 18,
    blockstun: 8,
    range: 0.92,
    width: 0.52,
    height: 0.7,
    offsetY: 1.28,
    cancelFrom: 7,
    meter: 5,
    push: 1.45,
    chip: 0
  },
  medium: {
    name: 'Medium',
    damage: 9,
    startup: 7,
    active: 6,
    recovery: 15,
    hitstun: 23,
    blockstun: 11,
    range: 1.06,
    width: 0.6,
    height: 0.78,
    offsetY: 1.2,
    cancelFrom: 10,
    meter: 8,
    push: 1.9,
    chip: 0
  },
  heavy: {
    name: 'Heavy',
    damage: 14,
    startup: 10,
    active: 7,
    recovery: 22,
    hitstun: 30,
    blockstun: 15,
    range: 1.25,
    width: 0.72,
    height: 0.86,
    offsetY: 1.08,
    cancelFrom: 14,
    meter: 11,
    push: 2.5,
    chip: 1,
    counterBonus: 5
  },
  crouchLight: {
    name: 'Crouch Light',
    damage: 5,
    startup: 4,
    active: 4,
    recovery: 10,
    hitstun: 17,
    blockstun: 8,
    range: 0.94,
    width: 0.56,
    height: 0.34,
    offsetY: 0.5,
    cancelFrom: 7,
    meter: 5,
    push: 1.25,
    low: true
  },
  crouchHeavy: {
    name: 'Sweep',
    damage: 12,
    startup: 9,
    active: 8,
    recovery: 24,
    hitstun: 32,
    blockstun: 13,
    range: 1.36,
    width: 0.78,
    height: 0.36,
    offsetY: 0.42,
    meter: 10,
    push: 2.2,
    knockdown: true,
    low: true
  },
  airLight: {
    name: 'Air Jab',
    damage: 7,
    startup: 5,
    active: 12,
    recovery: 8,
    hitstun: 22,
    blockstun: 10,
    range: 0.94,
    width: 0.62,
    height: 0.62,
    offsetY: 1.2,
    meter: 7,
    push: 1.6,
    air: true,
    overhead: true
  },
  airHeavy: {
    name: 'Air Crush',
    damage: 12,
    startup: 8,
    active: 12,
    recovery: 13,
    hitstun: 29,
    blockstun: 13,
    range: 1.08,
    width: 0.74,
    height: 0.7,
    offsetY: 1.02,
    meter: 10,
    push: 2.1,
    air: true,
    overhead: true,
    launch: 1.6
  }
};

const KEY_BINDINGS = {
  p1: {
    left: ['KeyA'],
    right: ['KeyD'],
    up: ['KeyW'],
    down: ['KeyS'],
    block: ['KeyU'],
    light: ['KeyJ'],
    medium: ['KeyK'],
    heavy: ['KeyL'],
    special: ['KeyI'],
    throw: ['KeyO'],
    super: ['KeyP']
  },
  p2: {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    block: ['Numpad0'],
    light: ['Numpad1'],
    medium: ['Numpad2'],
    heavy: ['Numpad3'],
    special: ['Numpad4'],
    throw: ['Numpad5'],
    super: ['Numpad6']
  }
};

class ButtonLatch {
  constructor() {
    this.prev = false;
    this.now = false;
  }

  update(value) {
    this.prev = this.now;
    this.now = !!value;
  }

  get pressed() {
    return this.now && !this.prev;
  }
}

class InputState {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.buttons = {
      light: new ButtonLatch(),
      medium: new ButtonLatch(),
      heavy: new ButtonLatch(),
      special: new ButtonLatch(),
      throw: new ButtonLatch(),
      super: new ButtonLatch(),
      block: new ButtonLatch()
    };
    this.raw = {};
    this.dirBuffer = [];
    this.chargeBackFrames = 0;
    this.chargeDownFrames = 0;
    this.chargeBackReady = 0;
    this.chargeDownReady = 0;
    this.lastDir = '5';
  }

  update(raw, facing) {
    this.raw = raw;
    this.x = clamp(raw.x || 0, -1, 1);
    this.y = clamp(raw.y || 0, -1, 1);
    for (const name of Object.keys(this.buttons)) {
      this.buttons[name].update(raw[name]);
    }

    const backHeld = this.x * facing < -0.45;
    const downHeld = this.y > 0.45;
    if (backHeld) {
      this.chargeBackFrames++;
      if (this.chargeBackFrames >= 36) this.chargeBackReady = 20;
    } else {
      this.chargeBackFrames = 0;
      this.chargeBackReady = Math.max(0, this.chargeBackReady - 1);
    }
    if (downHeld) {
      this.chargeDownFrames++;
      if (this.chargeDownFrames >= 36) this.chargeDownReady = 20;
    } else {
      this.chargeDownFrames = 0;
      this.chargeDownReady = Math.max(0, this.chargeDownReady - 1);
    }

    const dir = this.direction(facing);
    if (dir !== this.lastDir) {
      this.dirBuffer.push({ dir, frame: game.frame });
      if (this.dirBuffer.length > 28) this.dirBuffer.shift();
      this.lastDir = dir;
    }
    const cutoff = game.frame - 42;
    while (this.dirBuffer.length && this.dirBuffer[0].frame < cutoff) this.dirBuffer.shift();
  }

  direction(facing) {
    const toward = this.x * facing > 0.45;
    const back = this.x * facing < -0.45;
    const down = this.y > 0.45;
    const up = this.y < -0.45;
    if (down && toward) return '3';
    if (down && back) return '1';
    if (up && toward) return '9';
    if (up && back) return '7';
    if (toward) return '6';
    if (back) return '4';
    if (down) return '2';
    if (up) return '8';
    return '5';
  }

  hasMotion(sequence, windowFrames = 30) {
    let idx = sequence.length - 1;
    let newestFrame = Infinity;
    for (let i = this.dirBuffer.length - 1; i >= 0 && idx >= 0; i--) {
      const entry = this.dirBuffer[i];
      if (entry.frame > newestFrame) continue;
      if (entry.dir === sequence[idx]) {
        newestFrame = entry.frame;
        idx--;
      }
    }
    if (idx >= 0) return false;
    const first = this.dirBuffer.find((entry) => entry.dir === sequence[0]);
    const last = [...this.dirBuffer].reverse().find((entry) => entry.dir === sequence[sequence.length - 1]);
    return first && last && last.frame - first.frame <= windowFrames;
  }

  consumeMotion() {
    this.dirBuffer.length = 0;
    this.lastDir = '5';
    this.chargeBackFrames = 0;
    this.chargeDownFrames = 0;
    this.chargeBackReady = 0;
    this.chargeDownReady = 0;
  }
}

class Combatant {
  constructor(def, side, x, controller) {
    this.def = def;
    this.side = side;
    this.controller = controller;
    this.input = new InputState();
    this.root = buildFighterModel(def);
    this.root.position.set(x, 0, 0);
    scene.add(this.root);
    this.resetForRound(x);
  }

  resetForRound(x) {
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = x < 0 ? 1 : -1;
    this.hp = 100;
    this.whiteHp = 100;
    this.meter = this.meter || 0;
    this.state = 'intro';
    this.stateFrame = 0;
    this.hitStop = 0;
    this.hitStun = 0;
    this.blockStun = 0;
    this.knockdown = 0;
    this.wakeup = 0;
    this.invuln = 54;
    this.armor = 0;
    this.grounded = true;
    this.crouching = false;
    this.guardHeld = false;
    this.throwInvuln = 18;
    this.currentMove = null;
    this.hasHit = false;
    this.cancelWindow = false;
    this.comboCount = 0;
    this.comboDamage = 0;
    this.comboTimer = 0;
    this.perfect = true;
    this.lastHitBy = null;
    this.ai = { think: 0, action: 'idle', actionT: 0, blockT: 0, jumpT: 0 };
    this.pose = { walk: Math.random() * TAU, attack: 0, breathe: Math.random() * TAU };
    this.root.visible = true;
    this.root.scale.x = this.facing * this.def.scale;
    this.root.scale.y = this.def.scale;
    this.root.scale.z = this.def.scale;
    setModelAccent(this.root, this.def.accent);
  }

  hurtbox() {
    const width = this.crouching ? 0.72 : 0.66;
    const height = this.crouching ? 1.02 : 1.82;
    const centerY = this.y + height / 2;
    return { x: this.x, y: centerY, w: width * this.def.scale, h: height * this.def.scale };
  }

  canAct() {
    return this.hitStop <= 0 && this.hitStun <= 0 && this.blockStun <= 0 && this.knockdown <= 0 && this.wakeup <= 0 && this.state !== 'ko' && this.state !== 'intro' && !round.freeze;
  }

  canCancel() {
    return this.currentMove && this.cancelWindow && this.state === 'attack';
  }
}

class Projectile {
  constructor(owner, options) {
    this.owner = owner;
    this.x = options.x;
    this.y = options.y;
    this.vx = options.vx;
    this.life = options.life || 90;
    this.radius = options.radius || 0.24;
    this.move = options.move;
    this.hit = false;
    this.mesh = createProjectileMesh(owner.def, options.kind);
    this.mesh.position.set(this.x, this.y, 0);
    scene.add(this.mesh);
  }

  update() {
    this.life--;
    this.x += this.vx / 60;
    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y + Math.sin(game.frame * 0.28) * 0.05;
    this.mesh.rotation.x += 0.18;
    this.mesh.rotation.y += 0.28;
    if (this.life <= 0 || Math.abs(this.x) > ARENA_LIMIT + 3 || this.hit) {
      disposeObject(this.mesh);
      return false;
    }
    const target = this.owner === p1 ? p2 : p1;
    if (target && target.state !== 'ko' && intersects({ x: this.x, y: this.y, w: this.radius * 2.2, h: this.radius * 2.2 }, target.hurtbox())) {
      applyHit(this.owner, target, this.move, { projectile: true });
      this.hit = true;
      spawnBurst(this.x, this.y, this.owner.def.accent, 14, 0.45);
      disposeObject(this.mesh);
      return false;
    }
    return true;
  }
}

class Trap {
  constructor(owner, options) {
    this.owner = owner;
    this.x = options.x;
    this.y = 0.08;
    this.life = options.life || 110;
    this.armed = options.armed || 12;
    this.move = options.move;
    this.mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.54, 30),
      new THREE.MeshBasicMaterial({ color: owner.def.accent, transparent: true, opacity: 0.74, side: THREE.DoubleSide })
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(this.x, this.y, 0);
    scene.add(this.mesh);
  }

  update() {
    this.life--;
    this.armed--;
    this.mesh.rotation.z += 0.035;
    this.mesh.scale.setScalar(1 + Math.sin(game.frame * 0.13) * 0.1);
    this.mesh.material.opacity = clamp(this.life / 40, 0.15, 0.74);
    const target = this.owner === p1 ? p2 : p1;
    if (this.armed <= 0 && target && Math.abs(target.x - this.x) < 0.68 && target.y < 0.45 && target.state !== 'ko') {
      applyHit(this.owner, target, this.move, { trap: true, forceGround: true });
      spawnColumn(this.x, this.owner.def.accent);
      disposeObject(this.mesh);
      return false;
    }
    if (this.life <= 0) {
      disposeObject(this.mesh);
      return false;
    }
    return true;
  }
}

const ARENA_LIMIT = 6.85;
const SIM_FPS = 60;
let canvas;
let scene;
let camera;
let renderer;
let clock;
let p1;
let p2;
let lastTime = 0;
let accumulator = 0;
let audioCtx = null;
let music = null;
let screenShake = { t: 0, amp: 0 };
let cameraBase = { x: 0, y: 3.2, z: 10.4 };
let connectedPads = [];
let touchVector = { x: 0, y: 0 };
let touchButtons = {};
let selectedMode = 'arcade';
let selectedSide = 'p1';
let selected = { p1: 'kael', p2: 'nyx' };
let arcadeIndex = 0;
let survivalIndex = 0;
let survivalCarryHp = 100;
let keys = new Set();
let prevKeys = new Set();
let fx = [];
let projectiles = [];
let traps = [];

const game = {
  frame: 0,
  running: false,
  paused: false,
  matchOver: false,
  visible: true,
  mode: 'arcade',
  wins: { p1: 0, p2: 0 },
  roundNumber: 1
};

const round = {
  timer: 99,
  freeze: 0,
  over: false,
  result: null,
  nextAction: 'next'
};

let settings = loadSettings();

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem('clash.settings') || '{}');
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem('clash.settings', JSON.stringify(settings));
}

function boot() {
  if (!window.THREE) {
    showFatal('Three.js failed to load. Check your connection and refresh.');
    return;
  }
  initRenderer();
  initUI();
  initInput();
  buildArena();
  populateFighters();
  applySettingsToUI();
  updateGamepadList();
  $('announce').textContent = '';
  requestAnimationFrame(loop);
}

function showFatal(message) {
  const menu = $('menu');
  menu.innerHTML = `<div class="modal-card"><div class="kicker">CLASH</div><h2>Load Error</h2><p>${message}</p></div>`;
}

function initRenderer() {
  canvas = $('scene');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08060d);
  scene.fog = new THREE.Fog(0x08060d, 18, 52);

  camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(cameraBase.x, cameraBase.y, cameraBase.z);
  camera.lookAt(0, 1.25, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  clock = new THREE.Clock();
  window.addEventListener('resize', resize);
  resize();
}

function resize() {
  if (!renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.fov = w < 720 ? 52 : 46;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function buildArena() {
  const amb = new THREE.HemisphereLight(0xe5d7ff, 0x08060d, 0.75);
  scene.add(amb);

  const key = new THREE.DirectionalLight(0xffd9a8, 2.25);
  key.position.set(-5, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 25;
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x67dfff, 1.1);
  rim.position.set(6, 5, -6);
  scene.add(rim);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x17151e,
    roughness: 0.58,
    metalness: 0.18
  });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(7.35, 7.35, 0.38, 96), floorMat);
  ring.position.y = -0.2;
  ring.receiveShadow = true;
  scene.add(ring);

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(5.8, 5.8, 0.405, 96),
    new THREE.MeshStandardMaterial({ color: 0x211927, roughness: 0.5, metalness: 0.12 })
  );
  inner.position.y = -0.185;
  inner.receiveShadow = true;
  scene.add(inner);

  for (let i = 0; i < 4; i++) {
    const radius = i % 2 ? 4.1 : 6.28;
    const rope = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.035, 8, 128),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x68e6ff : 0xffd089, transparent: true, opacity: 0.72 })
    );
    rope.rotation.x = Math.PI / 2;
    rope.position.y = -0.005 + i * 0.008;
    scene.add(rope);
  }

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 25, 1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x11101b,
      transparent: true,
      opacity: 0.98
    })
  );
  backWall.position.set(0, 8, -15.5);
  scene.add(backWall);

  const gridMat = new THREE.MeshBasicMaterial({ color: 0xffd089, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
  for (let i = -9; i <= 9; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 16), gridMat);
    line.position.set(i * 1.2, 4.9, -15.38);
    scene.add(line);
  }
  for (let j = 0; j < 9; j++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.018), gridMat);
    line.position.set(0, 1 + j * 1.35, -15.36);
    scene.add(line);
  }

  for (let i = 0; i < 22; i++) {
    const x = -13 + i * 1.25;
    const h = 0.5 + Math.sin(i * 1.72) * 0.25 + Math.random() * 0.5;
    const crowd = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11 + Math.random() * 0.05, h, 4, 8),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((i * 0.071) % 1, 0.42, 0.42), roughness: 0.8 })
    );
    crowd.position.set(x, 0.28 + h * 0.5, -8.8 - Math.random() * 1.8);
    crowd.castShadow = true;
    scene.add(crowd);
    fx.push({
      mesh: crowd,
      life: Infinity,
      update: () => {
        crowd.position.y += Math.sin(game.frame * 0.04 + i) * 0.0018;
      }
    });
  }

  const sideColors = [0xffd089, 0x68e6ff, 0xff5d42, 0xa7ffb7];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * TAU;
    const x = Math.cos(angle) * 8.7;
    const z = Math.sin(angle) * 5.7 - 1.2;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.08, 4.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x20202b, roughness: 0.7 })
    );
    pole.position.set(x, 2.25, z);
    pole.castShadow = true;
    scene.add(pole);
    const lamp = new THREE.PointLight(sideColors[i % sideColors.length], 1.6, 10, 2);
    lamp.position.set(x, 4.7, z);
    scene.add(lamp);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 8),
      new THREE.MeshBasicMaterial({ color: sideColors[i % sideColors.length] })
    );
    bulb.position.copy(lamp.position);
    scene.add(bulb);
  }

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 32),
    new THREE.MeshStandardMaterial({ color: 0x0c0b12, roughness: 0.8, metalness: 0.05 })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, -0.42, -3);
  runway.receiveShadow = true;
  scene.add(runway);
}

function makeMat(color, roughness = 0.58, metalness = 0.08) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function buildFighterModel(def) {
  const root = new THREE.Group();
  root.name = def.name;

  const skin = makeMat(def.skin, 0.68, 0.02);
  const suit = makeMat(def.color, 0.5, 0.12);
  const accent = makeMat(def.accent, 0.38, 0.2);
  const dark = makeMat(0x111018, 0.8, 0.03);
  const cloth = makeMat(new THREE.Color(def.color).multiplyScalar(0.65), 0.74, 0.02);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 34),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.name = 'shadow';
  root.add(shadow);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.28, 0.34), dark);
  hips.position.y = 0.83;
  hips.castShadow = true;
  root.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.78, 8, 14), suit);
  torso.position.y = 1.36;
  torso.scale.set(1.0, 1.0, 0.72);
  torso.castShadow = true;
  root.add(torso);

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.055), accent);
  chestPlate.position.set(0, 1.48, 0.26);
  chestPlate.castShadow = true;
  root.add(chestPlate);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.095, 0.4), accent);
  belt.position.y = 1.0;
  belt.castShadow = true;
  root.add(belt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.18, 12), skin);
  neck.position.y = 1.89;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.255, 18, 12), skin);
  head.position.y = 2.08;
  head.castShadow = true;
  root.add(head);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.045, 0.035), dark);
  brow.position.set(0, 2.09, 0.225);
  root.add(brow);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.267, 18, 9, 0, TAU, 0, Math.PI / 2.1), cloth);
  hair.position.y = 2.15;
  hair.rotation.x = -0.08;
  root.add(hair);

  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.075, 0.12), accent);
  scarf.position.set(0, 1.84, 0.06);
  scarf.castShadow = true;
  root.add(scarf);

  const parts = { root, hips, torso, chestPlate, belt, neck, head, brow, hair, scarf, shadow, accentPieces: [chestPlate, belt, scarf] };

  parts.armL = makeArm(-1, suit, skin, accent);
  parts.armR = makeArm(1, suit, skin, accent);
  root.add(parts.armL.group);
  root.add(parts.armR.group);

  parts.legL = makeLeg(-1, cloth, accent);
  parts.legR = makeLeg(1, cloth, accent);
  root.add(parts.legL.group);
  root.add(parts.legR.group);

  if (def.sword) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 1.2), makeMat(0xcfd2dd, 0.24, 0.75));
    blade.position.set(0.36, 1.24, -0.42);
    blade.rotation.x = 0.4;
    blade.rotation.z = -0.35;
    root.add(blade);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.08), accent);
    hilt.position.set(0.19, 1.08, 0.25);
    root.add(hilt);
    parts.sword = blade;
    parts.accentPieces.push(hilt);
  }

  const aura = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 0.86, 48),
    new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.035;
  root.add(aura);
  parts.aura = aura;

  root.userData.parts = parts;
  root.traverse((obj) => {
    if (obj.isMesh && obj !== shadow && obj !== aura) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return root;
}

function makeArm(side, suit, skin, accent) {
  const group = new THREE.Group();
  group.position.set(side * 0.44, 1.72, 0.02);
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), suit);
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.42, 6, 10), suit);
  upper.position.y = -0.26;
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), skin);
  elbow.position.y = -0.48;
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.38, 6, 10), skin);
  fore.position.y = -0.68;
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), accent);
  fist.position.y = -0.91;
  group.add(shoulder, upper, elbow, fore, fist);
  return { group, shoulder, upper, elbow, fore, fist };
}

function makeLeg(side, cloth, accent) {
  const group = new THREE.Group();
  group.position.set(side * 0.18, 0.84, 0);
  const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.46, 6, 10), cloth);
  thigh.position.y = -0.27;
  const knee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), accent);
  knee.position.y = -0.52;
  const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.46, 6, 10), cloth);
  shin.position.y = -0.77;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.36), accent);
  foot.position.set(0, -1.03, 0.08);
  foot.rotation.x = 0.08;
  group.add(thigh, knee, shin, foot);
  return { group, thigh, knee, shin, foot };
}

function setModelAccent(root, color) {
  const parts = root.userData.parts;
  if (!parts) return;
  parts.aura.material.color.setHex(color);
  for (const obj of parts.accentPieces) obj.material.color.setHex(color);
}

function initUI() {
  document.querySelectorAll('.menu-tabs button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.menu-tabs button').forEach((b) => b.classList.toggle('on', b === button));
      document.querySelectorAll('.menu-panel').forEach((panel) => panel.classList.toggle('on', panel.id === `screen-${button.dataset.screen}`));
    });
  });

  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedMode = button.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('selected', b === button));
      startMatch(selectedMode);
    });
  });
  const firstMode = document.querySelector('[data-mode="arcade"]');
  if (firstMode) firstMode.classList.add('selected');
  $('start-featured').addEventListener('click', () => startMatch(selectedMode));

  document.querySelectorAll('[data-select-side]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedSide = button.dataset.selectSide;
      document.querySelectorAll('[data-select-side]').forEach((b) => b.classList.toggle('on', b === button));
      renderFighterDetail(FIGHTER_BY_ID.get(selected[selectedSide]));
    });
  });

  $('pause-button').addEventListener('click', togglePause);
  $('resume-button').addEventListener('click', togglePause);
  $('restart-button').addEventListener('click', () => {
    closePause();
    startMatch(game.mode);
  });
  $('pause-menu-button').addEventListener('click', backToMenu);
  $('round-menu').addEventListener('click', backToMenu);
  $('round-next').addEventListener('click', continueAfterRound);

  $('setting-difficulty').addEventListener('change', (e) => {
    settings.difficulty = e.target.value;
    saveSettings();
  });
  $('setting-timer').addEventListener('change', (e) => {
    settings.timer = Number(e.target.value);
    saveSettings();
  });
  $('setting-deadzone').addEventListener('input', (e) => {
    settings.deadzone = Number(e.target.value);
    saveSettings();
  });
  $('setting-profile').addEventListener('change', (e) => {
    settings.profile = e.target.value;
    saveSettings();
  });
  for (const id of ['shake', 'vibration', 'music', 'sfx']) {
    $(`setting-${id}`).addEventListener('change', (e) => {
      settings[id] = e.target.checked;
      saveSettings();
      if (id === 'music') updateMusic();
    });
  }
}

function applySettingsToUI() {
  $('setting-difficulty').value = settings.difficulty;
  $('setting-timer').value = String(settings.timer);
  $('setting-deadzone').value = String(settings.deadzone);
  $('setting-profile').value = settings.profile;
  for (const id of ['shake', 'vibration', 'music', 'sfx']) {
    $(`setting-${id}`).checked = !!settings[id];
  }
}

function populateFighters() {
  const grid = $('fighter-grid');
  grid.innerHTML = '';
  for (const fighter of FIGHTERS) {
    const button = document.createElement('button');
    button.className = 'fighter-card';
    button.type = 'button';
    button.style.setProperty('--fighter-color', `#${fighter.color.toString(16).padStart(6, '0')}`);
    button.style.setProperty('--fighter-accent', `#${fighter.accent.toString(16).padStart(6, '0')}`);
    button.style.setProperty('--fighter-glow', fighter.glow);
    button.style.setProperty('--fighter-bg', `linear-gradient(145deg, rgba(255,255,255,.09), rgba(0,0,0,.34)), #${fighter.color.toString(16).padStart(6, '0')}`);
    button.innerHTML = `
      <div class="portrait"></div>
      <div>
        <b>${fighter.name}</b>
        <span>${fighter.role}</span>
      </div>
      <div class="picked-tags"></div>
    `;
    button.addEventListener('click', () => {
      selected[selectedSide] = fighter.id;
      if (selected.p1 === selected.p2) {
        const fallback = FIGHTERS.find((f) => f.id !== fighter.id);
        selected[selectedSide === 'p1' ? 'p2' : 'p1'] = fallback.id;
      }
      updateFighterSelection();
      renderFighterDetail(fighter);
    });
    grid.appendChild(button);
  }
  updateFighterSelection();
  renderFighterDetail(FIGHTER_BY_ID.get(selected.p1));
}

function updateFighterSelection() {
  const cards = [...document.querySelectorAll('.fighter-card')];
  cards.forEach((card, i) => {
    const fighter = FIGHTERS[i];
    card.classList.toggle('p1', selected.p1 === fighter.id);
    card.classList.toggle('p2', selected.p2 === fighter.id);
    const tags = card.querySelector('.picked-tags');
    tags.innerHTML = '';
    if (selected.p1 === fighter.id) tags.insertAdjacentHTML('beforeend', '<i>P1</i>');
    if (selected.p2 === fighter.id) tags.insertAdjacentHTML('beforeend', '<i>P2</i>');
  });
  $('selected-p1').textContent = `P1: ${FIGHTER_BY_ID.get(selected.p1).name}`;
  $('selected-p2').textContent = `P2: ${FIGHTER_BY_ID.get(selected.p2).name}`;
}

function renderFighterDetail(fighter) {
  const detail = $('fighter-detail');
  detail.innerHTML = `
    <h2>${fighter.name}</h2>
    <p><strong>${fighter.role}.</strong> ${fighter.trait}</p>
    <p>${fighter.specials.map((sp) => `${sp.input}: ${sp.name}`).join(' | ')} | Super: ${fighter.superName}</p>
    <div class="stat-bars">
      ${Object.entries(fighter.stats).map(([name, value]) => `
        <div><b>${name}</b><span><i style="width:${value * 10}%"></i></span></div>
      `).join('')}
    </div>
  `;
}

function initInput() {
  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (event.code === 'Escape') togglePause();
    if (event.code === 'Enter' && !game.running && !$('menu').classList.contains('hidden')) startMatch(selectedMode);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  document.addEventListener('visibilitychange', () => {
    game.visible = !document.hidden;
    if (document.hidden) {
      keys.clear();
      if (game.running && !game.paused) togglePause();
    }
  });
  window.addEventListener('gamepadconnected', updateGamepadList);
  window.addEventListener('gamepaddisconnected', updateGamepadList);
  initTouch();
}

function initTouch() {
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (coarse) document.body.classList.add('touch-ready');

  const stick = $('touch-stick');
  const knob = stick.querySelector('span');
  let pointerId = null;
  const setStick = (event) => {
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const max = rect.width * 0.34;
    const len = Math.hypot(dx, dy) || 1;
    const mag = Math.min(max, len);
    const nx = dx / len;
    const ny = dy / len;
    touchVector.x = clamp(dx / max, -1, 1);
    touchVector.y = clamp(dy / max, -1, 1);
    knob.style.transform = `translate(${nx * mag}px, ${ny * mag}px)`;
  };
  const release = () => {
    pointerId = null;
    touchVector.x = 0;
    touchVector.y = 0;
    knob.style.transform = 'translate(0, 0)';
  };
  stick.addEventListener('pointerdown', (event) => {
    document.body.classList.add('touch-ready');
    ensureAudio();
    pointerId = event.pointerId;
    stick.setPointerCapture?.(pointerId);
    setStick(event);
  });
  stick.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointerId) setStick(event);
  });
  stick.addEventListener('pointerup', release);
  stick.addEventListener('pointercancel', release);

  document.querySelectorAll('[data-touch]').forEach((button) => {
    const name = button.dataset.touch;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      document.body.classList.add('touch-ready');
      ensureAudio();
      touchButtons[name] = true;
      button.setPointerCapture?.(event.pointerId);
    });
    const up = () => {
      touchButtons[name] = false;
    };
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('pointerleave', up);
  });
}

function updateGamepadList() {
  connectedPads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
  const el = $('device-list');
  if (!el) return;
  if (!connectedPads.length) {
    el.textContent = 'No gamepads detected. Plug in an Xbox, PlayStation, or generic controller; Clash will map it automatically.';
  } else {
    el.innerHTML = connectedPads.map((pad, i) => `<div>P${i + 1}: ${pad.id}</div>`).join('');
  }
}

function startMatch(mode) {
  ensureAudio();
  game.mode = mode;
  selectedMode = mode;
  arcadeIndex = mode === 'arcade' ? 0 : arcadeIndex;
  survivalIndex = mode === 'survival' ? 0 : survivalIndex;
  survivalCarryHp = 100;
  game.wins = { p1: 0, p2: 0 };
  game.roundNumber = 1;
  game.matchOver = false;
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('pause-button').classList.remove('hidden');
  $('round-end').classList.add('hidden');
  closePause();
  startRound(true);
  updateMusic();
}

function chooseOpponent() {
  if (game.mode === 'versus') return FIGHTER_BY_ID.get(selected.p2);
  const pool = FIGHTERS.filter((fighter) => fighter.id !== selected.p1);
  if (game.mode === 'arcade') return pool[arcadeIndex % pool.length];
  if (game.mode === 'survival') return pool[survivalIndex % pool.length];
  if (game.mode === 'training') return FIGHTER_BY_ID.get(selected.p2);
  return FIGHTER_BY_ID.get(selected.p2);
}

function startRound(freshModels = false) {
  clearActors();
  const def1 = FIGHTER_BY_ID.get(selected.p1);
  const def2 = chooseOpponent();
  p1 = new Combatant(def1, 'p1', -2.35, 'human1');
  p2 = new Combatant(def2, 'p2', 2.35, game.mode === 'versus' ? 'human2' : game.mode === 'training' ? 'dummy' : 'cpu');
  if (game.mode === 'survival') p1.hp = survivalCarryHp;
  if (game.mode === 'training') {
    p1.meter = 100;
    p2.meter = 100;
  }
  game.running = true;
  game.paused = false;
  round.over = false;
  round.result = null;
  round.freeze = 0;
  round.timer = settings.timer || 0;
  $('p1-name').textContent = p1.def.name;
  $('p2-name').textContent = p2.def.name;
  $('round-label').textContent = `ROUND ${game.roundNumber}`;
  $('mode-label').textContent = MODE_LABELS[game.mode] || 'CLASH';
  renderRoundPips();
  updateHUD(true);
  announce(`ROUND ${game.roundNumber}`, 850);
  setTimeout(() => announce('FIGHT', 620), 900);
  setTimeout(() => {
    if (p1 && p2 && !round.over) {
      p1.state = 'idle';
      p2.state = 'idle';
    }
  }, 1180);
}

function clearActors() {
  for (const actor of [p1, p2]) {
    if (actor?.root) disposeObject(actor.root);
  }
  p1 = null;
  p2 = null;
  for (const proj of projectiles) disposeObject(proj.mesh);
  for (const trap of traps) disposeObject(trap.mesh);
  projectiles = [];
  traps = [];
  for (let i = fx.length - 1; i >= 0; i--) {
    const item = fx[i];
    if (item.life !== Infinity) {
      disposeObject(item.mesh);
      fx.splice(i, 1);
    }
  }
}

function endRound(winner, reason = 'KO') {
  if (round.over) return;
  round.over = true;
  game.running = false;
  if (winner === 'p1') game.wins.p1++;
  if (winner === 'p2') game.wins.p2++;
  const winnerActor = winner === 'p1' ? p1 : winner === 'p2' ? p2 : null;
  const loserActor = winner === 'p1' ? p2 : winner === 'p2' ? p1 : null;
  if (winnerActor) {
    winnerActor.state = 'victory';
    winnerActor.invuln = 999;
  }
  if (loserActor) {
    loserActor.state = 'ko';
    loserActor.vx = 0;
  }
  renderRoundPips();
  updateHUD();
  hitFreeze(20, 0.16);
  announce(reason, 900);
  const matchWinner = game.wins.p1 >= 2 ? 'p1' : game.wins.p2 >= 2 ? 'p2' : null;
  let title = reason;
  let copy = winnerActor ? `${winnerActor.def.name} takes the round.` : 'No one could finish the fight.';
  round.nextAction = 'next';
  if (matchWinner || game.mode === 'training') {
    round.nextAction = 'match';
    if (matchWinner === 'p1' && p1.perfect) title = 'PERFECT';
    if (matchWinner === null && game.mode !== 'training') title = 'DRAW';
    copy = matchWinner ? `${(matchWinner === 'p1' ? p1 : p2).def.name} wins the match.` : 'Training reset is ready.';
    handleModeProgress(matchWinner);
  }
  setTimeout(() => {
    $('round-end-kicker').textContent = matchWinner ? 'MATCH OVER' : 'ROUND OVER';
    $('round-end-title').textContent = title;
    $('round-end-copy').textContent = copy;
    $('round-next').textContent = round.nextAction === 'match' ? modeContinueLabel(matchWinner) : 'Next Round';
    $('round-end').classList.remove('hidden');
  }, 900);
}

function modeContinueLabel(matchWinner) {
  if (game.mode === 'arcade' && matchWinner === 'p1' && arcadeIndex < FIGHTERS.length - 1) return 'Next Rival';
  if (game.mode === 'survival' && matchWinner === 'p1') return 'Next Opponent';
  if (game.mode === 'training') return 'Reset';
  return 'Rematch';
}

function handleModeProgress(matchWinner) {
  if (game.mode === 'survival') survivalCarryHp = Math.max(20, p1.hp + 18);
  if (matchWinner !== 'p1') return;
  if (game.mode === 'arcade') arcadeIndex++;
  if (game.mode === 'survival') survivalIndex++;
}

function continueAfterRound() {
  $('round-end').classList.add('hidden');
  if (round.nextAction === 'next') {
    game.roundNumber++;
    startRound();
    return;
  }
  if (game.mode === 'arcade' && game.wins.p1 >= 2 && arcadeIndex < FIGHTERS.length - 1) {
    game.wins = { p1: 0, p2: 0 };
    game.roundNumber = 1;
    startRound();
    return;
  }
  if (game.mode === 'survival' && game.wins.p1 >= 2) {
    game.wins = { p1: 0, p2: 0 };
    game.roundNumber = 1;
    startRound();
    return;
  }
  game.wins = { p1: 0, p2: 0 };
  game.roundNumber = 1;
  startRound();
}

function backToMenu() {
  game.running = false;
  game.paused = false;
  round.over = true;
  clearActors();
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('pause-button').classList.add('hidden');
  $('round-end').classList.add('hidden');
  closePause();
  stopMusic();
}

function togglePause() {
  if (!p1 || !p2 || round.over || $('menu').classList.contains('hidden') === false) return;
  ensureAudio();
  game.paused = !game.paused;
  $('pause-menu').classList.toggle('hidden', !game.paused);
  $('pause-button').textContent = game.paused ? '>' : 'II';
  updateMusic();
}

function closePause() {
  game.paused = false;
  $('pause-menu').classList.add('hidden');
  $('pause-button').textContent = 'II';
}

function rawKeyboard(side) {
  const map = KEY_BINDINGS[side];
  const raw = { x: 0, y: 0 };
  if (map.left.some((code) => keys.has(code))) raw.x -= 1;
  if (map.right.some((code) => keys.has(code))) raw.x += 1;
  if (map.up.some((code) => keys.has(code))) raw.y -= 1;
  if (map.down.some((code) => keys.has(code))) raw.y += 1;
  for (const button of ['light', 'medium', 'heavy', 'special', 'throw', 'super', 'block']) {
    raw[button] = map[button].some((code) => keys.has(code));
  }
  return raw;
}

function rawGamepad(index) {
  const pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
  const pad = pads[index];
  if (!pad) return null;
  const dead = settings.deadzone;
  const axisX = Math.abs(pad.axes[0] || 0) > dead ? pad.axes[0] : 0;
  const axisY = Math.abs(pad.axes[1] || 0) > dead ? pad.axes[1] : 0;
  const dpadX = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
  const dpadY = (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
  const raw = {
    x: dpadX || axisX,
    y: dpadY || axisY,
    light: !!pad.buttons[2]?.pressed,
    medium: !!pad.buttons[0]?.pressed,
    heavy: !!pad.buttons[1]?.pressed || (pad.buttons[7]?.value || 0) > 0.45,
    special: !!pad.buttons[3]?.pressed || !!pad.buttons[5]?.pressed,
    throw: !!pad.buttons[4]?.pressed,
    super: !!pad.buttons[6]?.pressed || !!pad.buttons[9]?.pressed,
    block: (pad.buttons[6]?.value || 0) > 0.45 || !!pad.buttons[8]?.pressed
  };
  if (settings.profile === 'southpaw') {
    raw.light = !!pad.buttons[0]?.pressed;
    raw.medium = !!pad.buttons[1]?.pressed;
    raw.heavy = !!pad.buttons[2]?.pressed;
  }
  return raw;
}

function collectInput(actor) {
  if (actor.controller === 'cpu') return aiInput(actor, actor === p1 ? p2 : p1);
  if (actor.controller === 'dummy') return trainingDummyInput(actor);
  const side = actor.controller === 'human2' ? 'p2' : 'p1';
  const keyRaw = rawKeyboard(side);
  const padRaw = rawGamepad(side === 'p1' ? 0 : 1);
  const raw = { ...keyRaw };
  if (padRaw) mergeRaw(raw, padRaw);
  if (side === 'p1') {
    raw.x = clamp(raw.x + touchVector.x, -1, 1);
    raw.y = clamp(raw.y + touchVector.y, -1, 1);
    for (const button of Object.keys(touchButtons)) raw[button] = raw[button] || touchButtons[button];
  }
  return raw;
}

function mergeRaw(base, add) {
  base.x = Math.abs(add.x) > Math.abs(base.x) ? add.x : base.x;
  base.y = Math.abs(add.y) > Math.abs(base.y) ? add.y : base.y;
  for (const key of ['light', 'medium', 'heavy', 'special', 'throw', 'super', 'block']) {
    base[key] = base[key] || add[key];
  }
}

function trainingDummyInput(actor) {
  const raw = { x: 0, y: 0 };
  raw.block = false;
  if (actor.hp < 25) {
    actor.hp = 100;
    actor.meter = 100;
  }
  return raw;
}

function aiInput(actor, target) {
  const d = DIFFICULTY[settings.difficulty] || DIFFICULTY.medium;
  const dist = Math.abs(target.x - actor.x);
  const dir = Math.sign(target.x - actor.x) || actor.facing;
  const raw = { x: 0, y: 0 };
  actor.ai.think--;
  actor.ai.actionT--;
  actor.ai.blockT--;
  actor.ai.jumpT--;

  if (target.state === 'attack' && dist < 1.65 && actor.ai.blockT <= 0 && Math.random() < d.defense) {
    actor.ai.action = 'block';
    actor.ai.actionT = Math.ceil(d.reaction * 60) + 10;
    actor.ai.blockT = 26;
  }

  if (actor.ai.think <= 0) {
    actor.ai.think = Math.ceil((d.reaction + Math.random() * 0.18) * 60);
    if (dist > 3.7 && Math.random() < 0.32 && actor.def.specials.some((sp) => sp.type.includes('projectile') || sp.type === 'beam')) {
      actor.ai.action = 'special';
      actor.ai.actionT = 20;
    } else if (dist > 1.55) {
      actor.ai.action = Math.random() < d.aggression ? 'approach' : 'shimmy';
      actor.ai.actionT = 26 + Math.random() * 26;
    } else if (target.hitStun > 0 && Math.random() < d.combo) {
      actor.ai.action = Math.random() < 0.5 ? 'medium' : 'heavy';
      actor.ai.actionT = 10;
    } else if (target.state === 'attack' && Math.random() < d.punish) {
      actor.ai.action = Math.random() < 0.45 && actor.meter >= 100 ? 'super' : 'heavy';
      actor.ai.actionT = 10;
    } else if (dist < 1.05 && Math.random() < 0.22 + d.aggression * 0.22) {
      actor.ai.action = 'throw';
      actor.ai.actionT = 8;
    } else {
      const roll = Math.random();
      actor.ai.action = roll < 0.38 ? 'light' : roll < 0.66 ? 'medium' : roll < 0.84 ? 'heavy' : 'special';
      actor.ai.actionT = 9;
    }
  }

  if (Math.random() < d.error) actor.ai.action = 'idle';

  switch (actor.ai.action) {
    case 'approach':
      raw.x = dir;
      break;
    case 'shimmy':
      raw.x = dist < 2.1 ? -dir : dir;
      break;
    case 'block':
      raw.x = -dir;
      raw.block = true;
      break;
    case 'light':
    case 'medium':
    case 'heavy':
    case 'throw':
    case 'special':
    case 'super':
      raw[actor.ai.action] = actor.ai.actionT > 0;
      if (actor.ai.action === 'special') {
        raw.x = dir;
        raw.y = actor.ai.actionT > 12 ? 1 : 0;
      }
      break;
    default:
      break;
  }

  if (target.y > 0.9 && actor.ai.jumpT <= 0 && dist < 1.8 && Math.random() < d.punish) {
    raw.heavy = true;
    actor.ai.jumpT = 34;
  }
  return raw;
}

function simulationStep() {
  game.frame++;
  if (round.freeze > 0) {
    round.freeze--;
    updateActorsVisualOnly();
    updateFX();
    return;
  }
  if (game.running && !game.paused && !round.over) {
    for (const actor of [p1, p2]) {
      const raw = collectInput(actor);
      actor.input.update(raw, actor.facing);
    }
    updateRoundTimer();
    updateCombatant(p1, p2);
    updateCombatant(p2, p1);
    resolvePush();
    projectiles = projectiles.filter((projectile) => projectile.update());
    traps = traps.filter((trap) => trap.update());
    checkRoundEnd();
    updateHUD();
  }
  updateFX();
  prevKeys = new Set(keys);
}

function updateRoundTimer() {
  if (game.mode === 'training' || settings.timer === 0) return;
  if (game.frame % SIM_FPS === 0 && round.timer > 0) {
    round.timer--;
    if (round.timer <= 0) {
      if (p1.hp > p2.hp) endRound('p1', 'TIME');
      else if (p2.hp > p1.hp) endRound('p2', 'TIME');
      else endRound(null, 'DRAW');
    }
  }
}

function updateCombatant(actor, opponent) {
  if (!actor || actor.state === 'ko') {
    poseFighter(actor);
    return;
  }

  actor.stateFrame++;
  actor.throwInvuln = Math.max(0, actor.throwInvuln - 1);
  actor.invuln = Math.max(0, actor.invuln - 1);
  actor.armor = Math.max(0, actor.armor - 1);
  actor.hitStop = Math.max(0, actor.hitStop - 1);
  actor.comboTimer = Math.max(0, actor.comboTimer - 1);
  if (actor.comboTimer <= 0) {
    actor.comboCount = 0;
    actor.comboDamage = 0;
  }
  actor.whiteHp = lerp(actor.whiteHp, actor.hp, 0.035);

  if (actor.hitStop > 0) {
    poseFighter(actor);
    syncModel(actor);
    return;
  }

  if (actor.hitStun > 0) actor.hitStun--;
  if (actor.blockStun > 0) actor.blockStun--;
  if (actor.knockdown > 0) {
    actor.knockdown--;
    if (actor.knockdown <= 0) {
      actor.wakeup = 28;
      actor.invuln = 20;
      actor.state = 'recovery';
      actor.stateFrame = 0;
    }
  }
  if (actor.wakeup > 0) {
    actor.wakeup--;
    if (actor.wakeup <= 0) {
      actor.state = 'idle';
      actor.stateFrame = 0;
    }
  }

  if (actor.hitStun > 0 || actor.blockStun > 0 || actor.knockdown > 0 || actor.wakeup > 0) {
    applyPhysics(actor);
    poseFighter(actor);
    syncModel(actor);
    return;
  }

  faceOpponent(actor, opponent);
  handleActionInput(actor, opponent);
  updateAttack(actor, opponent);
  if (actor.state !== 'attack' && actor.state !== 'throw' && actor.state !== 'super') handleMovement(actor);
  applyPhysics(actor);
  poseFighter(actor);
  syncModel(actor);
}

function updateActorsVisualOnly() {
  for (const actor of [p1, p2]) {
    if (!actor) continue;
    actor.hitStop = Math.max(0, actor.hitStop - 1);
    poseFighter(actor);
    syncModel(actor);
  }
}

function faceOpponent(actor, opponent) {
  if (!opponent || actor.state === 'attack' || actor.state === 'throw' || actor.state === 'super') return;
  actor.facing = opponent.x >= actor.x ? 1 : -1;
}

function handleMovement(actor) {
  if (!actor.canAct()) return;
  const input = actor.input;
  actor.crouching = input.y > 0.45 && actor.grounded;
  actor.guardHeld = input.buttons.block.now || input.x * actor.facing < -0.62;

  if (actor.guardHeld && actor.grounded && !actor.crouching) {
    actor.state = 'block';
  } else if (actor.crouching) {
    actor.state = 'crouch';
  } else if (actor.grounded) {
    actor.state = Math.abs(input.x) > 0.2 ? 'walk' : 'idle';
  }

  if (actor.grounded && input.y < -0.52) {
    actor.grounded = false;
    actor.vy = actor.def.jump;
    actor.vx = input.x * actor.def.speed * 0.72;
    actor.state = 'jump';
    actor.stateFrame = 0;
    sfx('jump');
  } else if (actor.grounded && Math.abs(input.x) > 0.14) {
    const dashPressed = actor.input.dirBuffer.slice(-3).filter((entry) => entry.dir === (input.x * actor.facing > 0 ? '6' : '4'));
    const dashBoost = dashPressed.length >= 2 && game.frame - dashPressed[0].frame < 16;
    actor.vx = input.x * (dashBoost ? actor.def.dash : actor.def.speed);
    if (dashBoost) actor.state = 'dash';
  } else if (actor.grounded) {
    actor.vx *= 0.72;
    if (Math.abs(actor.vx) < 0.02) actor.vx = 0;
  }
}

function handleActionInput(actor, opponent) {
  if (!actor.canAct() && !actor.canCancel()) return;
  const buttons = actor.input.buttons;
  const cancel = actor.canCancel();
  if (actor.state === 'attack' && !cancel) return;

  if (buttons.super.pressed && actor.meter >= 100) {
    startSuper(actor);
    actor.input.consumeMotion();
    return;
  }

  if (buttons.throw.pressed && actor.grounded) {
    startThrow(actor);
    return;
  }

  if (buttons.special.pressed) {
    startSpecial(actor, detectSpecial(actor));
    return;
  }

  const punchPressed = buttons.light.pressed || buttons.medium.pressed;
  const kickPressed = buttons.heavy.pressed;
  if (punchPressed && actor.input.hasMotion(['2', '3', '6'])) {
    startSpecial(actor, 'qcf');
    return;
  }
  if (kickPressed && actor.input.hasMotion(['2', '1', '4'])) {
    startSpecial(actor, 'qcb');
    return;
  }
  if (punchPressed && actor.input.hasMotion(['6', '2', '3'], 34)) {
    startSpecial(actor, 'dp');
    return;
  }
  if (punchPressed && actor.input.chargeBackReady > 0 && actor.input.direction(actor.facing) === '6') {
    startSpecial(actor, 'charge');
    return;
  }

  if (buttons.light.pressed) startNormal(actor, actor.grounded ? (actor.crouching ? 'crouchLight' : 'light') : 'airLight');
  else if (buttons.medium.pressed) startNormal(actor, actor.grounded ? 'medium' : 'airLight');
  else if (buttons.heavy.pressed) startNormal(actor, actor.grounded ? (actor.crouching ? 'crouchHeavy' : 'heavy') : 'airHeavy');
}

function detectSpecial(actor) {
  const defs = actor.def.specials;
  if (actor.input.hasMotion(['6', '2', '3'], 36) && defs.some((sp) => sp.id === 'dp')) return 'dp';
  if (actor.input.hasMotion(['2', '1', '4'], 34) && defs.some((sp) => sp.id === 'qcb')) return 'qcb';
  if (actor.input.hasMotion(['2', '3', '6'], 34) && defs.some((sp) => sp.id === 'qcf')) return 'qcf';
  if (actor.input.chargeBackReady > 0 && actor.input.direction(actor.facing) === '6' && defs.some((sp) => sp.id === 'charge')) return 'charge';
  return defs[0].id;
}

function startNormal(actor, key) {
  const move = { ...NORMALS[key], id: key, kind: key, type: 'normal' };
  startMove(actor, move);
}

function startSpecial(actor, specialId) {
  const special = actor.def.specials.find((sp) => sp.id === specialId) || actor.def.specials[0];
  const move = {
    ...special,
    kind: special.id,
    type: special.type,
    hitstun: special.hitstun || 30,
    blockstun: special.blockstun || 14,
    push: special.push || 2.5,
    chip: special.chip || 2,
    cancelFrom: special.startup + 2,
    width: special.width || 0.75,
    height: special.height || 0.82,
    offsetY: special.offsetY || 1.08
  };
  startMove(actor, move);
  actor.input.consumeMotion();
}

function startSuper(actor) {
  const superDef = actor.def.super;
  const move = {
    id: 'super',
    name: actor.def.superName,
    type: 'super',
    damage: superDef.damage,
    startup: superDef.startup,
    active: superDef.active,
    recovery: superDef.recovery,
    range: superDef.range,
    hitstun: 48,
    blockstun: 25,
    push: 4.2,
    chip: 6,
    width: 1,
    height: 1.15,
    offsetY: 1.05,
    cinematic: superDef.cinematic,
    superData: superDef
  };
  actor.meter = 0;
  startMove(actor, move, 'super');
  hitFreeze(18, 0.18);
  announce(actor.def.superName, 880);
  spawnAura(actor, actor.def.accent, 36);
  sfx('super');
  vibrate(actor.side, 0.55, 160);
}

function startThrow(actor) {
  const move = {
    id: 'throw',
    name: 'Throw',
    type: 'throw',
    damage: 13 + Math.round(actor.def.stats.power * 0.6),
    startup: 5,
    active: 5,
    recovery: 24,
    range: actor.def.throwRange,
    hitstun: 26,
    blockstun: 0,
    push: 3.3,
    chip: 0,
    width: 0.78,
    height: 1.2,
    offsetY: 1,
    unblockable: true,
    knockdown: true
  };
  startMove(actor, move, 'throw');
}

function startMove(actor, move, state = 'attack') {
  if (actor.hitStun > 0 || actor.blockStun > 0 || actor.knockdown > 0 || actor.wakeup > 0) return;
  actor.state = state;
  actor.stateFrame = 0;
  actor.currentMove = move;
  actor.hasHit = false;
  actor.cancelWindow = false;
  actor.crouching = move.low || move.id?.startsWith('crouch');
  actor.armor = move.armor || 0;
  actor.invuln = Math.max(actor.invuln, move.invuln || 0);
  if (move.type === 'rush' || move.type === 'dashStrike' || move.type === 'armorStrike') {
    actor.vx = actor.facing * (move.travel || 2.2) * 1.15;
  }
  if (move.type === 'teleport') {
    actor.root.visible = false;
    actor.invuln = Math.max(actor.invuln, move.startup + 4);
  }
  sfx(move.type === 'slash' ? 'slash' : move.type === 'throw' ? 'grab' : 'whoosh');
}

function updateAttack(actor, opponent) {
  const move = actor.currentMove;
  if (!move) return;
  const f = actor.stateFrame;
  actor.cancelWindow = f >= (move.cancelFrom || move.startup + move.active);

  if (move.type === 'teleport' && f === move.startup) {
    const side = move.crossup ? -opponent.facing : actor.facing;
    actor.x = clamp(opponent.x + side * 0.95, -ARENA_LIMIT, ARENA_LIMIT);
    actor.facing = opponent.x >= actor.x ? 1 : -1;
    actor.root.visible = true;
    spawnVanish(actor.x, actor.y + 1, actor.def.accent);
  }

  if (f === move.startup) {
    if (move.type === 'projectile') spawnProjectile(actor, move);
    if (move.type === 'multiProjectile') {
      for (let i = 0; i < (move.shots || 3); i++) {
        setTimeout(() => {
          if (actor && !round.over) spawnProjectile(actor, { ...move, damage: move.damage, speed: move.speed + i * 0.7 });
        }, i * 90);
      }
    }
    if (move.type === 'trap') spawnTrap(actor, move);
    if (move.type === 'beam' || move.superData?.beam) resolveBeam(actor, opponent, move);
  }

  if (f >= move.startup && f < move.startup + move.active && !actor.hasHit) {
    if (!['projectile', 'multiProjectile', 'trap', 'beam'].includes(move.type) && !move.superData?.beam) {
      const box = attackBox(actor, move);
      if (intersects(box, opponent.hurtbox())) {
        if (move.type === 'throw' || move.type === 'commandThrow' || move.superData?.throw) {
          if (opponent.throwInvuln <= 0 && Math.abs(actor.y - opponent.y) < 0.35 && opponent.grounded) {
            applyThrow(actor, opponent, move);
            actor.hasHit = true;
          }
        } else {
          applyHit(actor, opponent, move);
          actor.hasHit = true;
        }
      }
    }
  }

  const total = move.startup + move.active + move.recovery;
  if (f > total) {
    actor.currentMove = null;
    actor.cancelWindow = false;
    actor.hasHit = false;
    actor.state = actor.grounded ? 'idle' : 'jump';
    actor.stateFrame = 0;
  }
}

function attackBox(actor, move) {
  const range = (move.range || 1) * actor.def.scale;
  return {
    x: actor.x + actor.facing * (0.42 + range * 0.5),
    y: actor.y + (move.offsetY || 1.05) * actor.def.scale,
    w: (move.width || 0.7) + range,
    h: (move.height || 0.7) * actor.def.scale
  };
}

function intersects(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

function applyHit(attacker, target, move, context = {}) {
  if (target.invuln > 0 || target.state === 'ko') {
    spawnGuardSpark(target.x, target.y + 1.2, 0x8defff);
    return;
  }

  const counter = target.state === 'attack' || target.state === 'throw' || target.state === 'super';
  const blocked = !move.unblockable && isBlocking(target, attacker, move);
  const armor = target.armor > 0 && !move.unblockable && !move.superData;
  let damage = move.damage || 0;
  if (counter) damage += move.counterBonus || Math.ceil(damage * 0.22);
  if (blocked) damage = Math.max(move.chip || 0, Math.floor(damage * 0.18));
  if (armor) damage = Math.floor(damage * 0.45);
  damage = Math.max(0, damage);

  target.hp = clamp(target.hp - damage, 0, 100);
  if (damage > 0) target.perfect = false;
  attacker.meter = clamp(attacker.meter + (move.meter || 10) + (blocked ? 2 : 6), 0, 100);
  target.meter = clamp(target.meter + (blocked ? 4 : 8), 0, 100);

  const push = (move.push || 2) / Math.max(0.8, target.def.weight);
  if (!blocked) {
    target.hitStun = Math.max(1, move.hitstun || 24);
    target.blockStun = 0;
    target.state = move.knockdown ? 'knockdown' : 'hit';
    target.knockdown = move.knockdown ? 46 : 0;
    target.vx = attacker.facing * push;
    if (move.launch || context.projectile && move.type !== 'projectile') {
      target.vy = Math.max(target.vy, move.launch || 2.4);
      target.grounded = false;
    }
    if (move.wallBounce && Math.abs(target.x) > ARENA_LIMIT - 0.5) {
      target.vx *= -0.7;
      target.vy = 3.2;
    }
    target.lastHitBy = attacker;
    attacker.comboCount = attacker.comboTimer > 0 ? attacker.comboCount + 1 : 1;
    attacker.comboDamage = attacker.comboTimer > 0 ? attacker.comboDamage + damage : damage;
    attacker.comboTimer = 92;
    if (attacker.comboCount > 1) showCombo(attacker.comboCount, attacker.comboDamage, counter);
  } else {
    target.blockStun = Math.max(1, move.blockstun || 10);
    target.hitStun = 0;
    target.state = 'block';
    target.vx = attacker.facing * push * 0.55;
    attacker.vx -= attacker.facing * 0.12;
  }

  if (move.snare && !blocked) {
    target.hitStun = Math.max(target.hitStun, move.snare);
    target.vx *= 0.25;
  }

  if (move.superData?.crossup) {
    attacker.x = clamp(target.x + attacker.facing * 0.9, -ARENA_LIMIT, ARENA_LIMIT);
  }

  spawnHitFx(target.x, target.y + (blocked ? 1.2 : 1.05), blocked, move, attacker.def.accent);
  hitFreeze(blocked ? 5 : move.superData ? 14 : 8, blocked ? 0.04 : 0.08);
  shake(blocked ? 0.06 : move.superData ? 0.32 : 0.18, blocked ? 8 : 13);
  sfx(blocked ? 'block' : move.type === 'slash' || move.superData?.slash ? 'slashHit' : 'hit');
  vibrate(attacker.side, blocked ? 0.18 : 0.38, blocked ? 60 : 110);
  updateHUD();
}

function isBlocking(target, attacker, move) {
  if (!target.grounded && !move.air) return false;
  const holdingBack = target.input.x * target.facing < -0.45 || target.input.buttons.block.now;
  if (!holdingBack && !target.guardHeld && target.state !== 'block') return false;
  const facingAttack = target.facing !== attacker.facing;
  if (!facingAttack) return false;
  if (move.low && !target.crouching && !target.input.buttons.block.now) return false;
  if (move.overhead && target.crouching && !target.input.buttons.block.now) return false;
  return true;
}

function applyThrow(attacker, target, move) {
  target.hp = clamp(target.hp - move.damage, 0, 100);
  target.perfect = false;
  target.hitStun = move.hitstun || 26;
  target.knockdown = 54;
  target.state = 'knockdown';
  target.vx = attacker.facing * (move.push || 3.4);
  target.vy = 2.6;
  target.grounded = false;
  attacker.meter = clamp(attacker.meter + 16, 0, 100);
  target.meter = clamp(target.meter + 8, 0, 100);
  attacker.comboCount = attacker.comboTimer > 0 ? attacker.comboCount + 1 : 1;
  attacker.comboDamage = attacker.comboTimer > 0 ? attacker.comboDamage + move.damage : move.damage;
  attacker.comboTimer = 80;
  spawnSlam(target.x, attacker.def.accent);
  hitFreeze(move.superData ? 18 : 10, 0.12);
  shake(move.superData ? 0.38 : 0.22, 15);
  sfx('throw');
  vibrate(attacker.side, 0.52, 150);
}

function spawnProjectile(actor, move) {
  const projectile = new Projectile(actor, {
    x: actor.x + actor.facing * 0.74,
    y: actor.y + 1.18,
    vx: actor.facing * (move.speed || 8),
    life: move.active || 60,
    radius: 0.26,
    kind: move.type,
    move
  });
  projectiles.push(projectile);
  sfx('projectile');
}

function spawnTrap(actor, move) {
  traps.push(new Trap(actor, {
    x: clamp(actor.x + actor.facing * (move.range || 2), -ARENA_LIMIT + 0.5, ARENA_LIMIT - 0.5),
    move,
    life: move.active || 80
  }));
  sfx('trap');
}

function resolveBeam(actor, opponent, move) {
  spawnBeamFx(actor.x, actor.facing, actor.def.accent);
  const dx = (opponent.x - actor.x) * actor.facing;
  if (dx > 0 && dx < (move.range || 12) && Math.abs(opponent.y - actor.y) < 1.3) {
    applyHit(actor, opponent, move);
    actor.hasHit = true;
  }
}

function applyPhysics(actor) {
  if (!actor.grounded) {
    actor.vy -= 0.52;
  }
  actor.x += actor.vx / SIM_FPS;
  actor.y += actor.vy / SIM_FPS;
  if (actor.y <= 0) {
    actor.y = 0;
    actor.vy = 0;
    actor.grounded = true;
    if (actor.state === 'jump') actor.state = 'idle';
  }
  if (actor.grounded && (actor.state === 'hit' || actor.state === 'block')) {
    actor.vx *= 0.88;
  } else {
    actor.vx *= actor.grounded ? 0.9 : 0.985;
  }
  actor.x = clamp(actor.x, -ARENA_LIMIT, ARENA_LIMIT);
}

function resolvePush() {
  if (!p1 || !p2) return;
  const minDist = 0.68;
  const dx = p2.x - p1.x;
  const overlap = minDist - Math.abs(dx);
  if (overlap > 0) {
    const dir = dx >= 0 ? 1 : -1;
    p1.x -= dir * overlap * 0.5;
    p2.x += dir * overlap * 0.5;
    p1.x = clamp(p1.x, -ARENA_LIMIT, ARENA_LIMIT);
    p2.x = clamp(p2.x, -ARENA_LIMIT, ARENA_LIMIT);
  }
}

function checkRoundEnd() {
  if (round.over || game.mode === 'training') return;
  if (p1.hp <= 0 && p2.hp <= 0) endRound(null, 'DRAW');
  else if (p2.hp <= 0) endRound('p1', p1.perfect ? 'PERFECT' : 'KO');
  else if (p1.hp <= 0) endRound('p2', p2.perfect ? 'PERFECT' : 'KO');
}

function poseFighter(actor) {
  if (!actor?.root) return;
  const parts = actor.root.userData.parts;
  actor.pose.breathe += 0.035;
  const t = actor.stateFrame;
  const walk = actor.pose.walk += (Math.abs(actor.vx) * 0.07 + 0.06) * actor.def.walkAnim;
  const bob = Math.sin(actor.pose.breathe) * 0.025;

  parts.torso.rotation.set(0, 0, 0);
  parts.hips.rotation.set(0, 0, 0);
  parts.head.rotation.set(0, 0, 0);
  parts.armL.group.rotation.set(-0.42, 0, 0.32);
  parts.armR.group.rotation.set(-0.48, 0, -0.32);
  parts.legL.group.rotation.set(0.1, 0, 0.05);
  parts.legR.group.rotation.set(-0.1, 0, -0.05);
  parts.armL.fore.rotation.set(0, 0, 0);
  parts.armR.fore.rotation.set(0, 0, 0);
  parts.legL.shin.rotation.set(0, 0, 0);
  parts.legR.shin.rotation.set(0, 0, 0);

  if (actor.state === 'walk' || actor.state === 'dash') {
    const amp = actor.state === 'dash' ? 0.62 : 0.38;
    parts.legL.group.rotation.x = Math.sin(walk) * amp;
    parts.legR.group.rotation.x = -Math.sin(walk) * amp;
    parts.armL.group.rotation.x = -0.35 - Math.sin(walk) * amp * 0.45;
    parts.armR.group.rotation.x = -0.45 + Math.sin(walk) * amp * 0.45;
    parts.torso.rotation.z = -actor.facing * Math.sin(walk) * 0.035;
  } else if (actor.state === 'crouch') {
    parts.torso.position.y = 1.22 + bob;
    parts.head.position.y = 1.92 + bob;
    parts.legL.group.rotation.x = -0.75;
    parts.legR.group.rotation.x = -0.55;
  } else {
    parts.torso.position.y = 1.36 + bob;
    parts.head.position.y = 2.08 + bob;
  }

  if (!actor.grounded) {
    parts.legL.group.rotation.x = -0.45;
    parts.legR.group.rotation.x = 0.3;
    parts.armL.group.rotation.x = -0.95;
    parts.armR.group.rotation.x = -0.85;
    parts.torso.rotation.x = -0.1;
  }

  if (actor.currentMove) {
    const move = actor.currentMove;
    const progress = clamp((t - move.startup) / Math.max(1, move.active), 0, 1);
    const wind = clamp(t / Math.max(1, move.startup), 0, 1);
    const snap = Math.sin(progress * Math.PI);
    parts.torso.rotation.y = -actor.facing * 0.12 * wind;
    if (move.id === 'light' || move.id === 'medium' || move.type === 'projectile' || move.type === 'beam') {
      parts.armR.group.rotation.x = -1.45 * snap - 0.55 * wind;
      parts.armR.group.rotation.z = -0.72 * snap;
      parts.armR.fore.rotation.x = -0.4 * snap;
    } else if (move.id === 'heavy' || move.id === 'crouchHeavy' || move.type === 'overhead') {
      parts.legR.group.rotation.x = -1.35 * snap;
      parts.legR.group.rotation.z = -0.35 * actor.facing * snap;
      parts.torso.rotation.x = -0.16 * snap;
    } else if (move.type === 'uppercut') {
      parts.armR.group.rotation.x = -2.1 * snap;
      parts.torso.rotation.x = -0.22 * snap;
      parts.legR.group.rotation.x = -0.65;
    } else if (move.type === 'slash' || move.superData?.slash) {
      parts.armR.group.rotation.z = -1.2 * snap;
      parts.armR.group.rotation.x = -1.0 * snap;
      if (parts.sword) parts.sword.rotation.z = -0.35 - 1.4 * snap;
    } else if (move.type === 'throw' || move.type === 'commandThrow') {
      parts.armL.group.rotation.x = -1.25 * wind;
      parts.armR.group.rotation.x = -1.25 * wind;
      parts.armL.group.rotation.z = 0.8;
      parts.armR.group.rotation.z = -0.8;
    } else {
      parts.armR.group.rotation.x = -1.2 * snap;
      parts.legR.group.rotation.x = -0.85 * snap;
    }
  }

  if (actor.state === 'block') {
    parts.armL.group.rotation.x = -1.3;
    parts.armR.group.rotation.x = -1.35;
    parts.armL.group.rotation.z = 0.65;
    parts.armR.group.rotation.z = -0.65;
    parts.torso.rotation.x = 0.08;
  } else if (actor.state === 'hit') {
    parts.torso.rotation.x = 0.24;
    parts.head.rotation.x = 0.26;
    parts.armL.group.rotation.x = -0.15;
    parts.armR.group.rotation.x = -0.2;
  } else if (actor.state === 'knockdown' || actor.state === 'ko') {
    parts.torso.rotation.z = actor.facing * 1.25;
    parts.torso.rotation.x = 0.7;
    parts.head.rotation.z = actor.facing * 0.5;
    parts.armL.group.rotation.x = 0.45;
    parts.armR.group.rotation.x = 0.3;
    parts.legL.group.rotation.x = 0.8;
    parts.legR.group.rotation.x = 0.5;
  } else if (actor.state === 'victory') {
    parts.armR.group.rotation.x = -2.45;
    parts.armL.group.rotation.x = -0.5;
    parts.torso.rotation.z = Math.sin(game.frame * 0.06) * 0.05;
  }

  const meterPulse = 0.22 + actor.meter / 180 + Math.sin(game.frame * 0.06) * 0.04;
  parts.aura.material.opacity = clamp(meterPulse, 0.12, 0.86);
  parts.aura.scale.setScalar(1 + actor.meter / 260 + Math.sin(game.frame * 0.08) * 0.025);
  parts.shadow.scale.set(1 + Math.abs(actor.y) * 0.04, 0.65 + Math.abs(actor.y) * 0.02, 1);
  if (actor.invuln > 0 && game.frame % 6 < 3) {
    actor.root.visible = actor.state !== 'intro';
  } else if (!actor.currentMove || actor.currentMove.type !== 'teleport' || actor.stateFrame >= actor.currentMove.startup) {
    actor.root.visible = true;
  }
}

function syncModel(actor) {
  actor.root.position.set(actor.x, actor.y, 0);
  actor.root.scale.x = actor.facing * actor.def.scale;
  actor.root.scale.y = actor.def.scale;
  actor.root.scale.z = actor.def.scale;
}

function updateCamera(dt) {
  if (!p1 || !p2) {
    camera.position.x = lerp(camera.position.x, 0, dt * 2);
    camera.position.y = lerp(camera.position.y, 3.2, dt * 2);
    camera.position.z = lerp(camera.position.z, 10.6, dt * 2);
    camera.lookAt(0, 1.2, 0);
    renderer.render(scene, camera);
    return;
  }
  const mid = (p1.x + p2.x) / 2;
  const sep = Math.abs(p1.x - p2.x);
  cameraBase.x = mid * 0.34;
  cameraBase.y = 3.05 + clamp(sep * 0.04, 0, 0.45);
  cameraBase.z = 8.6 + clamp(sep * 0.55, 0, 4.4);
  camera.position.x = lerp(camera.position.x, cameraBase.x, dt * 4);
  camera.position.y = lerp(camera.position.y, cameraBase.y, dt * 3.2);
  camera.position.z = lerp(camera.position.z, cameraBase.z, dt * 3.8);
  if (screenShake.t > 0 && settings.shake) {
    screenShake.t--;
    const k = screenShake.amp * screenShake.t / 18;
    camera.position.x += (Math.random() - 0.5) * k;
    camera.position.y += (Math.random() - 0.5) * k;
  }
  camera.lookAt(mid * 0.25, 1.25 + Math.max(p1.y, p2.y) * 0.12, 0);
  renderer.render(scene, camera);
}

function renderRoundPips() {
  const make = (el, wins) => {
    el.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const pip = document.createElement('span');
      pip.classList.toggle('win', i < wins);
      el.appendChild(pip);
    }
  };
  make($('p1-rounds'), game.wins.p1);
  make($('p2-rounds'), game.wins.p2);
}

function updateHUD(force = false) {
  if (!p1 || !p2) return;
  const h1 = clamp(p1.hp, 0, 100);
  const h2 = clamp(p2.hp, 0, 100);
  $('p1-health').style.width = `${h1}%`;
  $('p2-health').style.width = `${h2}%`;
  $('p1-chip').style.width = `${clamp(p1.whiteHp, h1, 100)}%`;
  $('p2-chip').style.width = `${clamp(p2.whiteHp, h2, 100)}%`;
  $('p1-meter').style.width = `${p1.meter}%`;
  $('p2-meter').style.width = `${p2.meter}%`;
  $('timer').textContent = settings.timer === 0 || game.mode === 'training' ? '∞' : String(Math.max(0, Math.ceil(round.timer))).padStart(2, '0');
  if (force) {
    $('p1-chip').style.transition = 'none';
    $('p2-chip').style.transition = 'none';
    setTimeout(() => {
      $('p1-chip').style.transition = '';
      $('p2-chip').style.transition = '';
    }, 30);
  }
}

function showCombo(count, damage, counter) {
  const el = $('combo-readout');
  el.innerHTML = `${count}<small>${counter ? 'counter ' : ''}${damage} damage</small>`;
  el.classList.add('show');
  clearTimeout(showCombo.t);
  showCombo.t = setTimeout(() => el.classList.remove('show'), 820);
}

function announce(text, ms = 700) {
  const el = $('announce');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(announce.t);
  announce.t = setTimeout(() => el.classList.remove('show'), ms);
}

function hitFreeze(frames, flashAlpha = 0.08) {
  round.freeze = Math.max(round.freeze, frames);
  const flash = $('screen-flash');
  flash.style.background = `rgba(255, 240, 196, ${flashAlpha + 0.2})`;
  flash.classList.add('on');
  clearTimeout(hitFreeze.t);
  hitFreeze.t = setTimeout(() => flash.classList.remove('on'), 45);
}

function shake(amp, frames) {
  if (!settings.shake) return;
  screenShake.amp = Math.max(screenShake.amp, amp);
  screenShake.t = Math.max(screenShake.t, frames);
}

function createProjectileMesh(def, kind) {
  const group = new THREE.Group();
  const color = def.accent;
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(kind === 'multiProjectile' ? 0.16 : 0.23, 1),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94 })
  );
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.34, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, side: THREE.DoubleSide })
  );
  halo.rotation.y = Math.PI / 2;
  group.add(core, halo);
  return group;
}

function spawnHitFx(x, y, blocked, move, color) {
  if (blocked) {
    spawnGuardSpark(x, y, color);
    return;
  }
  const count = move.superData ? 32 : 18;
  spawnBurst(x, y, color, count, move.superData ? 0.85 : 0.55);
  if (move.type === 'slash' || move.superData?.slash) spawnSlashFx(x, y, color);
}

function spawnBurst(x, y, color, count = 16, power = 0.5) {
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.96 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random() * 0.07, 8, 6), mat);
    mesh.position.set(x, y, (Math.random() - 0.5) * 0.25);
    scene.add(mesh);
    const a = Math.random() * TAU;
    const sp = (0.05 + Math.random() * power);
    fx.push({
      mesh,
      life: 24 + Math.random() * 18,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp + 0.04,
      vz: (Math.random() - 0.5) * sp,
      update(item) {
        item.mesh.position.x += item.vx;
        item.mesh.position.y += item.vy;
        item.mesh.position.z += item.vz;
        item.vy -= 0.012;
        item.mesh.material.opacity = clamp(item.life / 28, 0, 1);
      }
    });
  }
}

function spawnGuardSpark(x, y, color) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  );
  mesh.position.set(x, y, 0.28);
  scene.add(mesh);
  fx.push({
    mesh,
    life: 16,
    update(item) {
      item.mesh.scale.multiplyScalar(1.08);
      item.mesh.material.opacity = item.life / 16;
      item.mesh.rotation.z += 0.13;
    }
  });
}

function spawnSlashFx(x, y, color) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.18),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  );
  mesh.position.set(x, y, 0.34);
  mesh.rotation.z = -0.55;
  scene.add(mesh);
  fx.push({
    mesh,
    life: 14,
    update(item) {
      item.mesh.scale.x += 0.22;
      item.mesh.scale.y *= 0.94;
      item.mesh.material.opacity = item.life / 14;
    }
  });
}

function spawnSlam(x, color) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.34, 36),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.05, 0);
  scene.add(mesh);
  fx.push({
    mesh,
    life: 30,
    update(item) {
      item.mesh.scale.multiplyScalar(1.13);
      item.mesh.material.opacity = item.life / 30;
    }
  });
}

function spawnBeamFx(x, facing, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.18, 0.18),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86 })
  );
  mesh.position.set(x + facing * 6, 1.18, 0.08);
  scene.add(mesh);
  fx.push({
    mesh,
    life: 16,
    update(item) {
      item.mesh.material.opacity = item.life / 16;
      item.mesh.scale.y = 1 + Math.sin(game.frame * 0.55) * 0.35;
    }
  });
}

function spawnColumn(x, color) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.5, 2.7, 24, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, side: THREE.DoubleSide })
  );
  mesh.position.set(x, 1.35, 0);
  scene.add(mesh);
  fx.push({
    mesh,
    life: 24,
    update(item) {
      item.mesh.scale.x += 0.03;
      item.mesh.scale.z += 0.03;
      item.mesh.material.opacity = item.life / 48;
    }
  });
}

function spawnAura(actor, color, life) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 32, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.24, wireframe: true })
  );
  mesh.position.set(actor.x, actor.y + 1.1, 0);
  scene.add(mesh);
  fx.push({
    mesh,
    life,
    update(item) {
      item.mesh.position.set(actor.x, actor.y + 1.1, 0);
      item.mesh.rotation.y += 0.09;
      item.mesh.scale.multiplyScalar(1.018);
      item.mesh.material.opacity = item.life / (life * 4);
    }
  });
}

function spawnVanish(x, y, color) {
  for (let i = 0; i < 12; i++) spawnBurst(x + (Math.random() - 0.5) * 0.2, y, color, 1, 0.35);
}

function updateFX() {
  for (let i = fx.length - 1; i >= 0; i--) {
    const item = fx[i];
    item.update?.(item);
    if (item.life !== Infinity) {
      item.life--;
      if (item.life <= 0) {
        disposeObject(item.mesh);
        fx.splice(i, 1);
      }
    }
  }
}

function disposeObject(object) {
  if (!object) return;
  object.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose?.());
      else child.material.dispose?.();
    }
  });
  object.parent?.remove(object);
}

function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      return;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  updateMusic();
}

function tone(freq, dur, type = 'sine', gain = 0.08, slide = 0) {
  if (!audioCtx || !settings.sfx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const vol = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  vol.gain.setValueAtTime(0.0001, t);
  vol.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(vol);
  vol.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur, gain = 0.12, filter = 800) {
  if (!audioCtx || !settings.sfx) return;
  const t = audioCtx.currentTime;
  const buffer = audioCtx.createBuffer(1, Math.max(1, Math.floor(audioCtx.sampleRate * dur)), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  const hp = audioCtx.createBiquadFilter();
  const vol = audioCtx.createGain();
  src.buffer = buffer;
  hp.type = 'highpass';
  hp.frequency.value = filter;
  vol.gain.setValueAtTime(gain, t);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(hp);
  hp.connect(vol);
  vol.connect(audioCtx.destination);
  src.start(t);
  src.stop(t + dur + 0.04);
}

function sfx(name) {
  if (!settings.sfx) return;
  switch (name) {
    case 'jump':
      tone(260, 0.08, 'triangle', 0.08, 120);
      break;
    case 'whoosh':
      noise(0.08, 0.08, 1500);
      break;
    case 'hit':
      tone(115, 0.12, 'sawtooth', 0.16, -50);
      noise(0.08, 0.13, 550);
      break;
    case 'slashHit':
      tone(950, 0.04, 'sine', 0.1, 260);
      noise(0.06, 0.15, 2400);
      break;
    case 'block':
      tone(520, 0.05, 'square', 0.1, -180);
      noise(0.04, 0.07, 1800);
      break;
    case 'grab':
      tone(180, 0.08, 'square', 0.1, -40);
      break;
    case 'throw':
      tone(72, 0.18, 'sawtooth', 0.18, -25);
      noise(0.18, 0.2, 180);
      break;
    case 'projectile':
      tone(680, 0.11, 'triangle', 0.08, 220);
      break;
    case 'trap':
      tone(420, 0.16, 'sine', 0.08, -120);
      break;
    case 'slash':
      noise(0.08, 0.12, 2200);
      break;
    case 'super':
      tone(880, 0.12, 'square', 0.12, -220);
      setTimeout(() => tone(440, 0.2, 'sawtooth', 0.14, -170), 90);
      break;
    default:
      break;
  }
}

function updateMusic() {
  if (!audioCtx || !settings.music || game.paused || $('menu').classList.contains('hidden') === false) {
    stopMusic();
    return;
  }
  if (music) return;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.035;
  const bass = audioCtx.createOscillator();
  const pulse = audioCtx.createOscillator();
  bass.type = 'sawtooth';
  pulse.type = 'square';
  bass.frequency.value = 55;
  pulse.frequency.value = 110;
  bass.connect(gain);
  pulse.connect(gain);
  gain.connect(audioCtx.destination);
  bass.start();
  pulse.start();
  music = { gain, bass, pulse, started: audioCtx.currentTime };
}

function stopMusic() {
  if (!music) return;
  try {
    music.bass.stop();
    music.pulse.stop();
  } catch (_) {}
  music.gain.disconnect();
  music = null;
}

function vibrate(side, strength, duration) {
  if (!settings.vibration || !navigator.getGamepads) return;
  const pad = navigator.getGamepads()[side === 'p1' ? 0 : 1];
  const actuator = pad?.vibrationActuator;
  if (!actuator?.playEffect) return;
  try {
    actuator.playEffect('dual-rumble', {
      duration,
      strongMagnitude: strength,
      weakMagnitude: strength * 0.55
    });
  } catch (_) {}
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastTime) / 1000 || clock.getDelta());
  lastTime = now;
  updateGamepadListThrottled();
  accumulator += dt;
  const step = 1 / SIM_FPS;
  let guard = 0;
  while (accumulator >= step && guard < 4) {
    simulationStep();
    accumulator -= step;
    guard++;
  }
  updateCamera(dt);
}

function updateGamepadListThrottled() {
  if (game.frame % 60 === 0) updateGamepadList();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
