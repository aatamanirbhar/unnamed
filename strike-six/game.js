(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const STEP = 1 / 60;
  const ARENA_X = 7.2;
  const ARENA_Z = 3.1;
  const BEST_OF = 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

  const ROSTER = [
    {
      id: 'kael', name: 'Kael', role: 'Flux Boxer', color: 0x155a73, accent: 0x7df5ff,
      skin: 0xd99b72, hair: 0x111018, speed: 4.7, step: 4.9, power: 7, reach: 6, guard: 7,
      build: 'athletic', outfit: 'open jacket, neon wraps, chrome gloves', hairStyle: 'spikes',
      specialType: 'rush', special: 'Ion Rush', super: 'Six-Gate Breaker'
    },
    {
      id: 'vanta', name: 'Vanta', role: 'Void Kicker', color: 0x2a214e, accent: 0xff5bd6,
      skin: 0xdca17a, hair: 0x08070c, speed: 5.35, step: 5.55, power: 6, reach: 8, guard: 5,
      build: 'sleek', outfit: 'asymmetric bodysuit, thigh armor, ribbon coat', hairStyle: 'long',
      specialType: 'spin', special: 'Shadow Wheel', super: 'No-Light Tempest'
    },
    {
      id: 'sol', name: 'Sol', role: 'Solar Bruiser', color: 0x8f2a1f, accent: 0xffe56f,
      skin: 0xc98a62, hair: 0x5b1d12, speed: 4.05, step: 3.7, power: 9, reach: 5, guard: 9,
      build: 'heavy', outfit: 'cropped battle vest, plated belt, molten boots', hairStyle: 'wild',
      specialType: 'armor', special: 'Cinder Knuckle', super: 'Sunfall Driver'
    },
    {
      id: 'mira', name: 'Mira', role: 'Arc Blade', color: 0x22634f, accent: 0x7dff9f,
      skin: 0xe0aa82, hair: 0xe8eef2, speed: 4.85, step: 5.15, power: 6, reach: 10, guard: 5,
      build: 'tall', outfit: 'silk combat coat, crystal bracers, high boots', hairStyle: 'tail',
      specialType: 'blade', special: 'Glass Crescent', super: 'Mirror Rain'
    },
    {
      id: 'thane', name: 'Thane', role: 'Iron Grappler', color: 0x4c5660, accent: 0xffa24d,
      skin: 0xb98562, hair: 0x101010, speed: 3.45, step: 3.2, power: 10, reach: 5, guard: 10,
      build: 'massive', outfit: 'forge harness, steel gauntlets, heavyweight boots', hairStyle: 'mohawk',
      specialType: 'grapple', special: 'Foundry Crash', super: 'Earth Chain'
    },
    {
      id: 'nyx', name: 'Nyx', role: 'Star Zoner', color: 0x25366f, accent: 0xaed6ff,
      skin: 0xd7a17a, hair: 0x0c1428, speed: 4.25, step: 4.55, power: 6, reach: 10, guard: 6,
      build: 'lean', outfit: 'astral cape, luminous corset armor, comet heels', hairStyle: 'bob',
      specialType: 'projectile', special: 'Orbit Spear', super: 'Event Horizon'
    },
    {
      id: 'sable', name: 'Sable', role: 'Velvet Rush', color: 0x451a32, accent: 0xff396d,
      skin: 0xc98966, hair: 0x2a0618, speed: 5.55, step: 5.75, power: 6, reach: 7, guard: 5,
      build: 'sleek', outfit: 'runway fight suit, cropped cape, blade stilettos', hairStyle: 'long',
      specialType: 'feint', special: 'Crimson Afterimage', super: 'Velvet Guillotine'
    },
    {
      id: 'orion', name: 'Orion', role: 'Comet Duelist', color: 0x1d5660, accent: 0x95ffcc,
      skin: 0xe3a982, hair: 0xf2d26b, speed: 4.9, step: 4.8, power: 7, reach: 8, guard: 6,
      build: 'athletic', outfit: 'street hakama, halo belt, neon handwraps', hairStyle: 'swept',
      specialType: 'blade', special: 'Meteor Palm', super: 'Heaven Splitter'
    }
  ];

  const MOVES = {
    light: { id: 'light', name: 'Light', damage: 5, startup: 4, active: 4, recovery: 8, hit: 14, block: 6, reach: 0.82, width: 0.76, depth: 0.58, y: 1.18, push: 0.72, meter: 7, cancel: ['heavy', 'kick', 'sweep', 'special', 'super'] },
    crouchLight: { id: 'crouchLight', name: 'Low Jab', damage: 4, startup: 4, active: 4, recovery: 9, hit: 12, block: 6, reach: 0.74, width: 0.72, depth: 0.56, y: 0.76, push: 0.55, low: true, meter: 6, cancel: ['sweep', 'special'] },
    heavy: { id: 'heavy', name: 'Heavy', damage: 10, startup: 7, active: 5, recovery: 15, hit: 22, block: 10, reach: 1.08, width: 0.9, depth: 0.68, y: 1.14, push: 1.45, meter: 11, cancel: ['kick', 'special', 'super'] },
    kick: { id: 'kick', name: 'Launcher', damage: 12, startup: 10, active: 6, recovery: 20, hit: 30, block: 13, reach: 1.26, width: 0.88, depth: 0.72, y: 0.98, push: 1.85, launch: 4.25, meter: 12, cancel: ['special', 'super'] },
    sweep: { id: 'sweep', name: 'Sweep', damage: 11, startup: 9, active: 6, recovery: 22, hit: 26, block: 14, reach: 1.16, width: 0.92, depth: 0.72, y: 0.42, push: 1.35, low: true, knockdown: 34, meter: 10, cancel: ['super'] },
    air: { id: 'air', name: 'Air Strike', damage: 9, startup: 5, active: 7, recovery: 16, hit: 22, block: 9, reach: 1.08, width: 0.86, depth: 0.78, y: 1.08, push: 1.4, launch: 1.4, meter: 9, cancel: ['special'] },
    special: { id: 'special', name: 'Special', damage: 18, startup: 9, active: 12, recovery: 24, hit: 34, block: 15, reach: 1.75, width: 1.08, depth: 0.94, y: 1.02, push: 2.75, launch: 2.0, velocity: 2.3, meter: 18, cancel: ['super'] },
    throw: { id: 'throw', name: 'Throw', damage: 16, startup: 5, active: 5, recovery: 24, hit: 26, reach: 0.62, width: 0.78, depth: 0.78, y: 1.0, push: 3.6, unblockable: true, knockdown: 48, meter: 10 },
    super: { id: 'super', name: 'Super', damage: 44, startup: 7, active: 28, recovery: 42, hit: 50, block: 24, reach: 2.35, width: 1.48, depth: 1.15, y: 1.05, push: 4.4, launch: 4.6, invuln: 20, multi: 3 }
  };

  const KEY = {
    left: 'KeyA', right: 'KeyD', jump: 'KeyW', crouch: 'KeyS', stepL: 'KeyQ', stepR: 'KeyE',
    block: 'KeyU', light: 'KeyJ', heavy: 'KeyK', kick: 'KeyL', special: 'KeyI', throw: 'KeyO', super: 'KeyP'
  };

  let scene, camera, renderer, p1, p2;
  let selected = 'kael';
  let rival = 'vanta';
  let mode = 'arcade';
  let arcadeFight = 1;
  let round = 1;
  let score = { p1: 0, p2: 0 };
  let timer = 99;
  let running = false;
  let paused = false;
  let over = false;
  let frame = 0;
  let last = 0;
  let acc = 0;
  let freeze = 0;
  let shake = 0;
  let slow = 0;
  let particles = [];
  let projectiles = [];
  let stageBits = { rings: [], panels: [], crowd: [], beams: [], drones: [], sparks: [] };
  let keys = new Set();
  let touch = { x: 0, y: 0, buttons: {} };
  let audioCtx = null;
  let cinematic = { t: 0, actor: null, target: null, power: 0 };

  class Latch {
    constructor() { this.now = false; this.prev = false; }
    set(v) { this.prev = this.now; this.now = !!v; }
    get pressed() { return this.now && !this.prev; }
  }

  class Fighter {
    constructor(def, side, human) {
      this.def = def;
      this.side = side;
      this.human = human;
      this.buttons = {};
      for (const k of ['light', 'heavy', 'kick', 'special', 'throw', 'super', 'block']) this.buttons[k] = new Latch();
      this.model = fighterModel(def);
      scene.add(this.model.root);
      this.reset(side === 'p1' ? -2.65 : 2.65);
    }
    reset(x) {
      this.x = x; this.y = 0; this.z = this.side === 'p1' ? 0.25 : -0.25;
      this.vx = 0; this.vy = 0; this.vz = 0;
      this.facing = x < 0 ? 1 : -1;
      this.hp = 100; this.meter = mode === 'training' ? 100 : 0; this.guard = 100;
      this.state = 'intro'; this.t = 0; this.move = null; this.chain = [];
      this.hitstun = 0; this.blockstun = 0; this.knockdown = 0; this.invuln = 36; this.armor = 0;
      this.grounded = true; this.crouch = false; this.combo = 0; this.comboT = 0; this.comboDamage = 0; this.hitIds = new Set();
      this.ai = { think: 0, act: 'idle', t: 0, patience: Math.random() };
      this.pose = Math.random() * TAU;
      this.afterimages = 0;
      sync(this);
    }
    box() {
      const crouched = this.crouch || this.state === 'crouch';
      return { x: this.x, y: this.y + (crouched ? 0.72 : 1.02), z: this.z, w: crouched ? 0.78 : 0.72, h: crouched ? 1.28 : 1.9, d: 0.58 };
    }
    canAct() {
      return running && !over && this.state !== 'intro' && this.state !== 'ko' &&
        this.hitstun <= 0 && this.blockstun <= 0 && this.knockdown <= 0 && freeze <= 0;
    }
  }

  function boot() {
    if (!window.THREE) {
      $('menu').innerHTML = '<main><div class="help"><article><h2>Three.js failed to load</h2><p>Check your connection and reload.</p></article></div></main>';
      return;
    }
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090d);
    scene.fog = new THREE.Fog(0x07090d, 18, 68);
    camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 3.1, 9.6);
    renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    lights();
    arena();
    ui();
    input();
    resize();
    requestAnimationFrame(loop);
  }

  function lights() {
    scene.add(new THREE.HemisphereLight(0xcdefff, 0x1a0e10, 0.7));
    const key = new THREE.DirectionalLight(0xffe56f, 2.55);
    key.position.set(-5, 10, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -13; key.shadow.camera.right = 13; key.shadow.camera.top = 13; key.shadow.camera.bottom = -13;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7df5ff, 2.2);
    rim.position.set(8, 5.6, -8);
    scene.add(rim);
    const hot = new THREE.PointLight(0xff396d, 1.65, 16, 2);
    hot.position.set(0, 3.5, 4.8);
    scene.add(hot);
  }

  function arena() {
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.6, 0.32, 160), standard(0x141b22, 0.22, 0.42));
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gloss = new THREE.Mesh(new THREE.CircleGeometry(7.9, 160), standard(0x17232b, 0.42, 0.22));
    gloss.rotation.x = -Math.PI / 2;
    gloss.position.y = -0.015;
    gloss.receiveShadow = true;
    scene.add(gloss);

    for (let i = 0; i < 8; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15 + i * 0.82, 0.018, 8, 140), glow(i % 2 ? 0x7df5ff : 0xffe56f, 0.38));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.018 + i * 0.001;
      stageBits.rings.push(ring);
      scene.add(ring);
    }

    for (let i = -6; i <= 6; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 6.1), glow(i % 2 ? 0xff396d : 0x7df5ff, 0.22));
      strip.position.set(i * 1.1, 0.025, 0);
      scene.add(strip);
    }

    const railMat = standard(0x0b0f18, 0.25, 0.5);
    for (const z of [-ARENA_Z - 0.42, ARENA_Z + 0.42]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.32, 0.16), railMat);
      rail.position.set(0, 0.28, z);
      rail.castShadow = true;
      scene.add(rail);
    }
    for (const x of [-ARENA_X - 0.3, ARENA_X + 0.3]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.24, 7.0), railMat);
      wall.position.set(x, 0.62, 0);
      wall.castShadow = true;
      scene.add(wall);
    }

    const back = new THREE.Mesh(new THREE.PlaneGeometry(72, 28), glow(0x061019, 0.98));
    back.position.set(0, 7.6, -18.5);
    scene.add(back);

    const mainScreen = ledPanel('STRIKE SIX', 0x7df5ff, 0xffe56f, 780, 220);
    mainScreen.position.set(0, 6.4, -12.2);
    mainScreen.scale.set(6.8, 1.9, 1);
    scene.add(mainScreen);
    stageBits.panels.push(mainScreen);

    for (let i = 0; i < 7; i++) {
      const sign = ledPanel(i % 2 ? 'OVERDRIVE' : 'RUSH', i % 2 ? 0xff396d : 0x7dff9f, 0xffffff, 360, 140);
      sign.position.set(-9 + i * 3, 4.3 + Math.sin(i) * 0.35, -11.7 - Math.abs(i - 3) * 0.45);
      sign.rotation.y = (i - 3) * -0.055;
      sign.scale.set(1.72, 0.72, 1);
      scene.add(sign);
      stageBits.panels.push(sign);
    }

    for (let tier = 0; tier < 4; tier++) {
      for (let i = -18; i <= 18; i++) {
        if (Math.random() < 0.18) continue;
        const g = new THREE.Group();
        const bodyColor = [0x18212b, 0x22162a, 0x142626, 0x2b2018][(Math.random() * 4) | 0];
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.36, 4, 6), standard(bodyColor, 0.04, 0.7));
        body.position.y = 0.28;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), glow(Math.random() < 0.5 ? 0x7df5ff : 0xffe56f, 0.68));
        head.position.y = 0.55;
        g.add(body, head);
        const side = i < 0 ? -1 : 1;
        g.position.set(i * 0.44, 0.65 + tier * 0.42, -7.2 - tier * 0.95 - Math.abs(i) * 0.035);
        g.rotation.y = side * 0.18;
        scene.add(g);
        stageBits.crowd.push(g);
      }
    }

    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU;
      const color = i % 3 === 0 ? 0x7df5ff : i % 3 === 1 ? 0xff396d : 0xffe56f;
      const light = new THREE.PointLight(color, 1.05, 8.5, 2.1);
      light.position.set(Math.cos(a) * 8.4, 3.5 + Math.sin(i * 1.7) * 0.4, Math.sin(a) * 4.9 - 0.3);
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), glow(color, 0.9));
      orb.position.copy(light.position);
      scene.add(light, orb);
      stageBits.drones.push({ light, orb, a, r: 8.4, color });
    }

    for (let i = 0; i < 24; i++) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.06, 6.5, 8, 1, true), glow(i % 2 ? 0x7df5ff : 0xff396d, 0.12));
      beam.position.set(-10 + Math.random() * 20, 3.4, -9 - Math.random() * 7);
      beam.rotation.z = (Math.random() - 0.5) * 0.25;
      scene.add(beam);
      stageBits.beams.push(beam);
    }

    for (let i = 0; i < 70; i++) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.018 + Math.random() * 0.025, 6, 4), glow(Math.random() < 0.5 ? 0x7df5ff : 0xffe56f, 0.55));
      spark.position.set(-9 + Math.random() * 18, 1 + Math.random() * 8, -12 + Math.random() * 15);
      scene.add(spark);
      stageBits.sparks.push({ mesh: spark, base: spark.position.clone(), speed: 0.4 + Math.random() * 1.2 });
    }
  }

  function toon(color) { return new THREE.MeshToonMaterial({ color }); }
  function standard(color, metalness = 0.08, roughness = 0.62, emissive = 0x000000, strength = 0) {
    return new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: strength });
  }
  function glow(color, opacity = 1) {
    return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity > 0.45 });
  }

  function ledPanel(text, color, sub, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#061019';
    ctx.fillRect(0, 0, w, h);
    const grd = ctx.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, hex(color));
    grd.addColorStop(0.55, '#fff6cf');
    grd.addColorStop(1, hex(sub));
    ctx.globalAlpha = 0.24;
    for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 3, h);
    for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 2);
    ctx.globalAlpha = 1;
    ctx.font = `900 ${Math.floor(h * 0.42)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = hex(color);
    ctx.shadowBlur = 18;
    ctx.fillStyle = grd;
    ctx.fillText(text, w / 2, h * 0.47);
    ctx.font = `900 ${Math.floor(h * 0.12)}px Arial, sans-serif`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#f7efe4';
    ctx.fillText('NEON CIRCUIT', w / 2, h * 0.76);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  }

  function fighterModel(def) {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);

    const scale = proportions(def.build);
    const skin = toon(def.skin);
    const cloth = standard(def.color, 0.08, 0.56, def.color, 0.02);
    const clothDark = standard(darken(def.color, 0.42), 0.05, 0.68);
    const accent = standard(def.accent, 0.34, 0.28, def.accent, 0.22);
    const hot = glow(def.accent, 0.72);
    const dark = standard(0x0c0e14, 0.12, 0.62);
    const hair = toon(def.hair);
    const metal = standard(0xc8d6de, 0.56, 0.28, def.accent, 0.03);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.88 * scale.width, 42), glow(0x000000, 0.34));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    root.add(shadow);

    const torso = mesh(new THREE.CapsuleGeometry(0.34 * scale.width, 0.76 * scale.height, 9, 18), cloth, rig);
    torso.position.y = 1.34 * scale.height;
    torso.scale.set(1.08 * scale.chest, 1, 0.72);
    const ribs = mesh(new THREE.BoxGeometry(0.76 * scale.chest, 0.18, 0.1), accent, rig);
    ribs.position.set(0, 1.57 * scale.height, 0.29);
    const waist = mesh(new THREE.BoxGeometry(0.58 * scale.waist, 0.24, 0.42), dark, rig);
    waist.position.y = 0.86 * scale.height;
    const belt = mesh(new THREE.TorusGeometry(0.36 * scale.waist, 0.035, 8, 28), metal, rig);
    belt.position.y = 0.98 * scale.height;
    belt.rotation.x = Math.PI / 2;
    belt.scale.z = 0.62;
    const buckle = mesh(new THREE.BoxGeometry(0.18, 0.12, 0.07), accent, rig);
    buckle.position.set(0, 0.99 * scale.height, 0.28);

    const neck = mesh(new THREE.CapsuleGeometry(0.12, 0.12, 6, 10), skin, rig);
    neck.position.y = 1.86 * scale.height;
    const head = mesh(new THREE.SphereGeometry(0.26 * scale.head, 24, 16), skin, rig);
    head.position.y = 2.1 * scale.height;
    head.scale.set(0.88, 1.05, 0.82);
    const jaw = mesh(new THREE.BoxGeometry(0.28 * scale.head, 0.08, 0.18), skin, rig);
    jaw.position.set(0, 2.0 * scale.height, 0.11);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.018), glow(def.accent, 0.96));
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.075, 2.11 * scale.height, 0.22);
    eyeR.position.set(0.075, 2.11 * scale.height, 0.22);
    rig.add(eyeL, eyeR);
    const brow = mesh(new THREE.BoxGeometry(0.34, 0.035, 0.025), dark, rig);
    brow.position.set(0, 2.145 * scale.height, 0.226);
    brow.rotation.z = 0.02;

    const hairCap = mesh(new THREE.SphereGeometry(0.3 * scale.head, 20, 12, 0, TAU, 0, Math.PI / 1.55), hair, rig);
    hairCap.position.y = 2.18 * scale.height;
    hairCap.scale.set(1.02, 0.72, 0.98);
    const hairBits = makeHair(def, hair, rig, scale);

    const coat = new THREE.Group();
    rig.add(coat);
    const lapelL = mesh(new THREE.BoxGeometry(0.18, 0.74, 0.045), clothDark, coat);
    const lapelR = mesh(new THREE.BoxGeometry(0.18, 0.74, 0.045), clothDark, coat);
    lapelL.position.set(-0.27 * scale.chest, 1.36 * scale.height, 0.34);
    lapelR.position.set(0.27 * scale.chest, 1.36 * scale.height, 0.34);
    lapelL.rotation.z = -0.18; lapelR.rotation.z = 0.18;
    const tailL = mesh(new THREE.BoxGeometry(0.26, 0.78, 0.055), cloth, coat);
    const tailR = mesh(new THREE.BoxGeometry(0.26, 0.78, 0.055), cloth, coat);
    tailL.position.set(-0.22, 0.65 * scale.height, -0.2);
    tailR.position.set(0.22, 0.65 * scale.height, -0.2);
    tailL.rotation.x = -0.12; tailR.rotation.x = -0.12;
    const sash = mesh(new THREE.BoxGeometry(0.85 * scale.waist, 0.08, 0.08), accent, coat);
    sash.position.set(0, 0.88 * scale.height, 0.31);
    sash.rotation.z = -0.14;

    const shoulderL = mesh(new THREE.SphereGeometry(0.16 * scale.arm, 14, 10), accent, rig);
    const shoulderR = mesh(new THREE.SphereGeometry(0.16 * scale.arm, 14, 10), accent, rig);
    shoulderL.position.set(-0.49 * scale.chest, 1.68 * scale.height, 0.02);
    shoulderR.position.set(0.49 * scale.chest, 1.68 * scale.height, 0.02);
    shoulderL.scale.set(1.2, 0.72, 0.88); shoulderR.scale.copy(shoulderL.scale);

    const armL = limbArm(-1, cloth, skin, accent, dark, rig, scale);
    const armR = limbArm(1, cloth, skin, accent, dark, rig, scale);
    const legL = limbLeg(-1, clothDark, accent, metal, rig, scale);
    const legR = limbLeg(1, clothDark, accent, metal, rig, scale);

    const aura = new THREE.Mesh(new THREE.TorusGeometry(0.95 * scale.width, 0.026, 8, 64), glow(def.accent, 0.52));
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.035;
    root.add(aura);
    const outline = new THREE.Mesh(new THREE.TorusGeometry(0.55 * scale.width, 0.015, 8, 42), glow(0xffffff, 0.12));
    outline.rotation.x = Math.PI / 2;
    outline.position.y = 1.05;
    rig.add(outline);

    const model = { root, rig, scale, torso, ribs, waist, belt, buckle, neck, head, jaw, eyeL, eyeR, brow, hairCap, hairBits, coat, lapelL, lapelR, tailL, tailR, sash, shoulderL, shoulderR, armL, armR, legL, legR, aura, outline, shadow };
    root.userData.model = model;
    return model;
  }

  function proportions(build) {
    const map = {
      sleek: { width: 0.9, chest: 0.92, waist: 0.78, height: 1.02, arm: 0.9, leg: 1.08, head: 0.96 },
      lean: { width: 0.92, chest: 0.95, waist: 0.82, height: 1.05, arm: 0.92, leg: 1.1, head: 0.96 },
      tall: { width: 0.96, chest: 1, waist: 0.86, height: 1.1, arm: 0.96, leg: 1.16, head: 0.94 },
      athletic: { width: 1.04, chest: 1.12, waist: 0.92, height: 1.03, arm: 1.08, leg: 1.04, head: 0.96 },
      heavy: { width: 1.15, chest: 1.26, waist: 1.05, height: 1.02, arm: 1.22, leg: 1.02, head: 0.98 },
      massive: { width: 1.26, chest: 1.44, waist: 1.16, height: 1.08, arm: 1.36, leg: 1.06, head: 1.0 }
    };
    return map[build] || map.athletic;
  }

  function darken(color, amount) {
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    return ((r * amount) << 16) | ((g * amount) << 8) | (b * amount);
  }

  function makeHair(def, mat, parent, scale) {
    const bits = [];
    const count = def.hairStyle === 'spikes' || def.hairStyle === 'wild' ? 8 : 5;
    for (let i = 0; i < count; i++) {
      const spike = mesh(new THREE.ConeGeometry(0.055 + Math.random() * 0.035, 0.34 + Math.random() * 0.22, 6), mat, parent);
      const a = -0.8 + i * (1.6 / Math.max(1, count - 1));
      spike.position.set(Math.sin(a) * 0.22, 2.34 * scale.height + Math.random() * 0.04, 0.06 + Math.cos(a) * 0.11);
      spike.rotation.z = -a * 0.5;
      spike.rotation.x = 0.34 + Math.random() * 0.22;
      bits.push(spike);
    }
    if (def.hairStyle === 'long' || def.hairStyle === 'tail') {
      const tail = mesh(new THREE.CapsuleGeometry(0.085, def.hairStyle === 'tail' ? 0.8 : 0.62, 6, 10), mat, parent);
      tail.position.set(0, 1.82 * scale.height, -0.24);
      tail.rotation.x = -0.2;
      bits.push(tail);
    }
    if (def.hairStyle === 'mohawk') {
      for (let i = 0; i < 5; i++) {
        const blade = mesh(new THREE.ConeGeometry(0.06, 0.26, 5), mat, parent);
        blade.position.set(0, 2.18 * scale.height + i * 0.035, -0.1 + i * 0.055);
        blade.rotation.x = -0.45;
        bits.push(blade);
      }
    }
    return bits;
  }

  function mesh(geo, mat, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function limbArm(side, cloth, skin, accent, dark, parent, scale) {
    const g = new THREE.Group();
    g.position.set(side * 0.48 * scale.chest, 1.66 * scale.height, 0.02);
    parent.add(g);
    const upper = mesh(new THREE.CapsuleGeometry(0.095 * scale.arm, 0.44, 8, 14), cloth, g);
    upper.position.y = -0.25;
    const elbow = mesh(new THREE.SphereGeometry(0.092 * scale.arm, 10, 8), accent, g);
    elbow.position.y = -0.51;
    const fore = mesh(new THREE.CapsuleGeometry(0.085 * scale.arm, 0.44, 8, 14), skin, g);
    fore.position.y = -0.72;
    const band = mesh(new THREE.TorusGeometry(0.09 * scale.arm, 0.018, 6, 18), dark, g);
    band.position.y = -0.83;
    band.rotation.x = Math.PI / 2;
    const fist = mesh(new THREE.SphereGeometry(0.135 * scale.arm, 14, 10), accent, g);
    fist.position.y = -1.0;
    fist.scale.set(1.05, 0.82, 1.16);
    return { g, upper, elbow, fore, band, fist };
  }

  function limbLeg(side, dark, accent, metal, parent, scale) {
    const g = new THREE.Group();
    g.position.set(side * 0.2 * scale.waist, 0.86 * scale.height, 0);
    parent.add(g);
    const thigh = mesh(new THREE.CapsuleGeometry(0.12 * scale.width, 0.54 * scale.leg, 8, 14), dark, g);
    thigh.position.y = -0.32 * scale.leg;
    const knee = mesh(new THREE.SphereGeometry(0.11 * scale.width, 10, 8), accent, g);
    knee.position.y = -0.64 * scale.leg;
    knee.scale.set(1, 0.65, 1.1);
    const shin = mesh(new THREE.CapsuleGeometry(0.1 * scale.width, 0.56 * scale.leg, 8, 14), dark, g);
    shin.position.y = -0.96 * scale.leg;
    const boot = mesh(new THREE.BoxGeometry(0.22 * scale.width, 0.16, 0.5), accent, g);
    boot.position.set(0, -1.27 * scale.leg, 0.15);
    const heel = mesh(new THREE.BoxGeometry(0.13 * scale.width, 0.12, 0.18), metal, g);
    heel.position.set(0, -1.33 * scale.leg, -0.08);
    return { g, thigh, knee, shin, boot, heel };
  }

  function ui() {
    const roster = $('roster');
    roster.innerHTML = '';
    for (const f of ROSTER) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fighter';
      b.style.setProperty('--color', hex(f.color));
      b.style.setProperty('--accent', hex(f.accent));
      b.innerHTML = `<div class="portrait"><i></i></div><b>${f.name}</b><span>${f.role}<br>${f.outfit}<br>${f.special} / ${f.super}</span><div class="stats"><em style="--w:${f.power * 10}%"></em><em style="--w:${f.speed * 18}%"></em><em style="--w:${f.reach * 10}%"></em></div>`;
      b.addEventListener('click', () => { selected = f.id; if (rival === selected) pickRival(true); markRoster(); });
      roster.appendChild(b);
    }
    document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      document.querySelectorAll('.mode').forEach((x) => x.classList.toggle('on', x === b));
    }));
    $('start').addEventListener('click', start);
    $('random').addEventListener('click', () => { pickRival(true); markRoster(); });
    $('pause').addEventListener('click', () => { paused = !paused; $('pause').textContent = paused ? '>' : 'II'; });
    markRoster();
  }

  function markRoster() {
    [...document.querySelectorAll('.fighter')].forEach((el, i) => {
      const on = ROSTER[i].id === selected;
      const rivalOn = ROSTER[i].id === rival;
      el.classList.toggle('on', on);
      el.classList.toggle('rival', rivalOn && !on);
    });
  }

  function pickRival(force = false) {
    const pool = ROSTER.filter((f) => f.id !== selected);
    if (mode === 'arcade' && !force) {
      rival = pool[(arcadeFight - 1) % pool.length].id;
      return;
    }
    if (force || !pool.some((f) => f.id === rival)) rival = pool[(Math.random() * pool.length) | 0].id;
  }

  function start() {
    audio();
    cleanup();
    pickRival();
    score = { p1: 0, p2: 0 };
    round = 1;
    const p1Def = ROSTER.find((f) => f.id === selected) || ROSTER[0];
    const pool = ROSTER.filter((f) => f.id !== selected);
    const p2Def = mode === 'arcade' ? pool[(arcadeFight - 1) % pool.length] : ROSTER.find((f) => f.id === rival) || pool[0];
    p1 = new Fighter(p1Def, 'p1', true);
    p2 = new Fighter(p2Def, 'p2', false);
    running = true; paused = false; over = false; freeze = 0; slow = 0; cinematic.t = 0;
    $('menu').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('pause').classList.remove('hidden');
    $('p1-name').textContent = p1.def.name; $('p1-role').textContent = p1.def.role;
    $('p2-name').textContent = p2.def.name; $('p2-role').textContent = p2.def.role;
    updateMoveList();
    beginRound();
  }

  function beginRound() {
    over = false; running = false; freeze = 0; slow = 0;
    p1.reset(-2.65); p2.reset(2.65);
    timer = mode === 'training' ? 0 : 99;
    for (const p of projectiles) scene.remove(p.mesh);
    projectiles = [];
    $('round').textContent = mode === 'arcade' ? `FIGHT ${arcadeFight} / ROUND ${round}` : mode === 'training' ? 'TRAINING' : `ROUND ${round}`;
    hud();
    banner('ROUND ' + round, 760);
    sound('round');
    setTimeout(() => banner('FIGHT', 540), 800);
    setTimeout(() => {
      if (!p1 || !p2 || paused) return;
      running = true;
      p1.state = 'idle'; p2.state = 'idle';
    }, 1120);
  }

  function cleanup() {
    for (const f of [p1, p2]) if (f?.model?.root) scene.remove(f.model.root);
    p1 = p2 = null;
    for (const p of particles) scene.remove(p.mesh);
    for (const p of projectiles) scene.remove(p.mesh);
    particles = [];
    projectiles = [];
  }

  function input() {
    addEventListener('keydown', (e) => {
      keys.add(e.code);
      if (e.code === 'Enter' && !running && $('menu') && !$('menu').classList.contains('hidden')) start();
      if (e.code === 'Escape' && p1 && p2) { paused = !paused; $('pause').textContent = paused ? '>' : 'II'; }
    });
    addEventListener('keyup', (e) => keys.delete(e.code));
    addEventListener('resize', resize);
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
    const stick = $('stick'), knob = stick.querySelector('i');
    let id = null;
    const set = (e) => {
      const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy, max = r.width * 0.36, len = Math.hypot(dx, dy) || 1, mag = Math.min(max, len);
      touch.x = clamp(dx / max, -1, 1);
      touch.y = clamp(dy / max, -1, 1);
      knob.style.transform = `translate(${dx / len * mag}px, ${dy / len * mag}px)`;
    };
    const clear = () => { id = null; touch.x = 0; touch.y = 0; knob.style.transform = 'translate(0,0)'; };
    stick.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; stick.setPointerCapture?.(id); set(e); audio(); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
    stick.addEventListener('pointerup', clear);
    stick.addEventListener('pointercancel', clear);
    document.querySelectorAll('[data-touch]').forEach((b) => {
      const k = b.dataset.touch;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); touch.buttons[k] = true; b.setPointerCapture?.(e.pointerId); audio(); });
      const up = () => { touch.buttons[k] = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
  }

  function raw() {
    const r = { x: 0, z: 0, jump: false, crouch: false };
    if (keys.has(KEY.left)) r.x -= 1; if (keys.has(KEY.right)) r.x += 1;
    if (keys.has(KEY.jump)) r.jump = true; if (keys.has(KEY.crouch)) r.crouch = true;
    if (keys.has(KEY.stepL)) r.stepL = true; if (keys.has(KEY.stepR)) r.stepR = true;
    for (const k of ['block', 'light', 'heavy', 'kick', 'special', 'throw', 'super']) r[k] = keys.has(KEY[k]);
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      const ax = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0;
      const ay = Math.abs(pad.axes[1] || 0) > 0.18 ? pad.axes[1] : 0;
      if (Math.abs(ax) > Math.abs(r.x)) r.x = ax;
      r.jump ||= ay < -0.64 || pad.buttons[12]?.pressed;
      r.crouch ||= ay > 0.64 || pad.buttons[13]?.pressed;
      r.stepL ||= pad.buttons[14]?.pressed;
      r.stepR ||= pad.buttons[15]?.pressed;
      r.light ||= pad.buttons[2]?.pressed; r.heavy ||= pad.buttons[0]?.pressed; r.kick ||= pad.buttons[1]?.pressed;
      r.special ||= pad.buttons[3]?.pressed; r.throw ||= pad.buttons[4]?.pressed; r.super ||= pad.buttons[5]?.pressed || pad.buttons[9]?.pressed;
      r.block ||= pad.buttons[6]?.value > 0.45 || pad.buttons[7]?.value > 0.45;
    }
    r.x = clamp(r.x + touch.x, -1, 1);
    r.jump ||= touch.y < -0.62;
    r.crouch ||= touch.y > 0.62;
    for (const k of Object.keys(touch.buttons)) r[k] ||= touch.buttons[k];
    return r;
  }

  function ai(f, t) {
    const dx = t.x - f.x, dz = t.z - f.z, d = Math.hypot(dx, dz);
    f.ai.think--; f.ai.t--;
    if (f.ai.think <= 0) {
      f.ai.think = 8 + Math.random() * 17;
      const pressure = t.hitstun > 0 || t.blockstun > 0;
      const threatened = t.move && d < 2.15 && Math.random() < 0.64;
      if (threatened) f.ai.act = Math.random() < 0.72 ? 'block' : 'side';
      else if (d > 2.25) f.ai.act = Math.random() < 0.74 ? 'approach' : (f.def.specialType === 'projectile' ? 'special' : 'side');
      else if (pressure) f.ai.act = ['light', 'heavy', 'kick', 'special'][Math.floor(Math.random() * 4)];
      else f.ai.act = ['light', 'heavy', 'sweep', 'kick', 'throw', 'special', 'side', 'shimmy'][Math.floor(Math.random() * 8)];
      if (f.meter >= 100 && d < 2.55 && Math.random() < 0.42) f.ai.act = 'super';
      f.ai.t = 10 + Math.random() * 20;
    }
    const r = { x: 0, z: 0, jump: false, crouch: false };
    if (f.ai.act === 'approach') { r.x = Math.sign(dx); if (Math.abs(dz) > 0.25) r.stepR = dz > 0; r.stepL = dz < 0; }
    else if (f.ai.act === 'side') { r.stepR = dz <= 0; r.stepL = dz > 0; }
    else if (f.ai.act === 'block') { r.block = true; r.x = -f.facing * 0.35; if (Math.random() < 0.25) r.crouch = true; }
    else if (f.ai.act === 'shimmy') r.x = -f.facing;
    else if (f.ai.act === 'sweep') { r.crouch = true; r.kick = f.ai.t > 0; }
    else if (['light', 'heavy', 'kick', 'throw', 'special', 'super'].includes(f.ai.act)) r[f.ai.act] = f.ai.t > 0;
    return r;
  }

  function step(f, o, r) {
    for (const k of Object.keys(f.buttons)) f.buttons[k].set(r[k]);
    f.t++;
    f.invuln = Math.max(0, f.invuln - 1);
    f.armor = Math.max(0, f.armor - 1);
    f.hitstun = Math.max(0, f.hitstun - 1);
    f.blockstun = Math.max(0, f.blockstun - 1);
    f.knockdown = Math.max(0, f.knockdown - 1);
    f.comboT = Math.max(0, f.comboT - 1);
    f.afterimages = Math.max(0, f.afterimages - 1);
    if (f.guard < 100 && !f.buttons.block.now && f.hitstun <= 0 && f.blockstun <= 0) f.guard = clamp(f.guard + 0.22, 0, 100);
    if (f.comboT <= 0) { f.combo = 0; f.comboDamage = 0; }

    if (f.hitstun || f.blockstun || f.knockdown || f.state === 'intro' || f.state === 'ko') {
      physics(f); pose(f); sync(f); return;
    }
    f.facing = o.x >= f.x ? 1 : -1;
    const next = resolve(f, r);
    if (next && (!f.move || cancel(f, next))) startMove(f, tune(f, next));
    if (f.move) attack(f, o);
    if (!f.move) move(f, r);
    physics(f);
    pose(f);
    sync(f);
  }

  function resolve(f, r) {
    if (!f.canAct() && !f.move) return null;
    if (f.buttons.super.pressed && f.meter >= 100) return MOVES.super;
    if (f.buttons.throw.pressed) return MOVES.throw;
    if (f.buttons.special.pressed) return MOVES.special;
    if (!f.grounded && (f.buttons.light.pressed || f.buttons.heavy.pressed || f.buttons.kick.pressed)) return MOVES.air;
    if (f.buttons.kick.pressed && r.crouch) return MOVES.sweep;
    if (f.buttons.light.pressed && r.crouch) return MOVES.crouchLight;
    if (f.buttons.kick.pressed) return MOVES.kick;
    if (f.buttons.heavy.pressed) return MOVES.heavy;
    if (f.buttons.light.pressed) return MOVES.light;
    return null;
  }

  function tune(f, move) {
    const m = { ...move };
    m.damage = Math.round(m.damage * (0.82 + f.def.power / 40));
    m.reach *= 0.88 + f.def.reach / 55;
    m.name = move.id === 'special' ? f.def.special : move.id === 'super' ? f.def.super : move.name;
    if (move.id === 'special') {
      if (f.def.specialType === 'projectile') {
        m.damage = Math.max(12, m.damage - 3); m.reach = 0.8; m.velocity = 0; m.projectile = true; m.recovery += 4; m.launch = 1.0;
      } else if (f.def.specialType === 'rush') {
        m.velocity = 3.6; m.multi = 2; m.active += 4; m.damage -= 2;
      } else if (f.def.specialType === 'spin') {
        m.depth *= 1.55; m.width *= 1.25; m.multi = 2; m.velocity = 1.6;
      } else if (f.def.specialType === 'armor') {
        m.damage += 4; m.invuln = 4; m.armor = 18; m.velocity = 2.15; m.push += 0.8;
      } else if (f.def.specialType === 'grapple') {
        m.unblockable = true; m.reach = 1.0; m.damage += 8; m.knockdown = 54; m.velocity = 1.1;
      } else if (f.def.specialType === 'feint') {
        m.velocity = 3.1; m.multi = 2; m.invuln = 8; m.damage -= 1; f.afterimages = 24;
      } else if (f.def.specialType === 'blade') {
        m.reach *= 1.35; m.width *= 1.25; m.damage += 1; m.slash = true;
      }
    }
    if (f.def.id === 'thane' && move.id === 'throw') m.damage += 7;
    if (f.def.id === 'sable' && move.id === 'sweep') { m.startup -= 2; m.recovery -= 3; }
    return m;
  }

  function cancel(f, next) {
    if (!f.move) return true;
    return (f.move.landed || f.move.blocked) && f.t > f.move.startup &&
      f.t < f.move.startup + f.move.active + 8 && (f.move.cancel || []).includes(next.id);
  }

  function startMove(f, move) {
    f.move = { ...move, landed: false, blocked: false, spawned: false };
    f.state = move.id === 'throw' ? 'throw' : move.id === 'super' ? 'super' : move.id === 'special' ? 'special' : move.id === 'sweep' ? 'sweep' : 'attack';
    f.t = 0; f.hitIds.clear(); f.chain.push(move.id); if (f.chain.length > 6) f.chain.shift();
    if (move.invuln) f.invuln = Math.max(f.invuln, move.invuln);
    if (move.armor) f.armor = Math.max(f.armor, move.armor);
    if (move.velocity) f.vx = f.facing * move.velocity;
    if (move.id === 'super') {
      f.meter = 0;
      cinematic = { t: 96, actor: f, target: f === p1 ? p2 : p1, power: 1 };
      document.body.classList.add('cinematic');
      banner(move.name, 960);
      freeze = 14; slow = 36; shake = Math.max(shake, 0.18);
      aura(f, 1.45, 0.24);
      sound('super');
    } else sound(move.id === 'throw' ? 'grab' : 'whoosh');
  }

  function attack(f, o) {
    const m = f.move;
    const active = f.t >= m.startup && f.t < m.startup + m.active;
    if (m.projectile && !m.spawned && f.t >= m.startup) {
      m.spawned = true;
      projectile(f, m);
      flash(f.x + f.facing * 0.65, f.y + 1.1, f.z, f.def.accent, 0.5);
    }
    if (active && !m.projectile) {
      const pulse = m.multi ? Math.floor((f.t - m.startup) / 7) : 0;
      const id = `${m.id}-${pulse}`;
      if (!f.hitIds.has(id) && overlap(boxFor(f, m), o.box())) {
        f.hitIds.add(id);
        hit(f, o, m);
      }
    }
    if (f.t > m.startup + m.active + m.recovery) { f.move = null; f.state = f.grounded ? 'idle' : 'jump'; f.t = 0; }
  }

  function boxFor(f, m) {
    return { x: f.x + f.facing * (0.42 + m.reach * 0.5), y: f.y + m.y, z: f.z, w: m.width + m.reach, h: 0.84, d: m.depth };
  }
  function overlap(a, b) {
    return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h && Math.abs(a.z - b.z) * 2 < a.d + b.d;
  }

  function blocked(t, a, m) {
    if (m.unblockable) return false;
    const holding = t.buttons.block.now || t.state === 'block';
    const walkingBack = t.vx * t.facing < -0.18;
    const lowReady = !m.low || t.crouch || holding;
    return (holding || walkingBack) && lowReady && t.facing !== a.facing;
  }

  function hit(a, t, m) {
    if (t.invuln > 0 || t.state === 'ko') return;
    const counter = !!t.move && t.t < (t.move.startup || 0) + 2;
    const armored = t.armor > 0 && !m.unblockable && m.id !== 'super';
    const isBlock = blocked(t, a, m) && !armored;
    let dmg = isBlock ? Math.max(1, Math.floor(m.damage * 0.15)) : m.damage;
    if (counter) dmg = Math.round(dmg * 1.18);
    if (armored) dmg = Math.max(1, Math.floor(dmg * 0.38));
    t.hp = clamp(t.hp - dmg, 0, 100);
    a.meter = clamp(a.meter + (m.meter || 8) + (isBlock ? 2 : 8), 0, 100);
    t.meter = clamp(t.meter + (isBlock ? 6 : 10), 0, 100);
    if (isBlock) {
      t.guard = clamp(t.guard - m.damage * 1.1, 0, 100);
      t.blockstun = m.block || 9;
      t.state = t.guard <= 0 ? 'break' : 'block';
      if (t.guard <= 0) { t.blockstun = 42; t.guard = 36; banner('GUARD BREAK', 580); burst(t.x, t.y + 1.05, t.z, 0xffe56f, 34, 0.7); }
      t.vx = a.facing * (m.push || 1.5) * 0.35;
      m.blocked = true;
    } else {
      t.hitstun = armored ? 8 : (m.hit || 20);
      t.state = m.knockdown ? 'down' : 'hit';
      t.knockdown = armored ? 0 : (m.knockdown || 0);
      t.vx = a.facing * (m.push || 1.5);
      t.vz = (t.z - a.z) * 1.7;
      if (m.launch && !armored) { t.vy = Math.max(t.vy, m.launch); t.grounded = false; }
      a.combo = a.comboT > 0 ? a.combo + 1 : 1;
      a.comboDamage = a.comboT > 0 ? a.comboDamage + dmg : dmg;
      a.comboT = 108;
      if (a.combo > 1) combo(a.combo, a.comboDamage, counter);
      if (counter && a.combo === 1) banner('COUNTER', 420);
      m.landed = true;
    }
    burst(t.x, t.y + (m.low ? 0.55 : 1.08), t.z, isBlock ? 0x7df5ff : a.def.accent, isBlock ? 14 : m.id === 'super' ? 52 : 28, isBlock ? 0.28 : 0.75);
    slashArc(a, m, isBlock);
    freeze = Math.max(freeze, isBlock ? 4 : m.id === 'super' ? 15 : 7);
    shake = Math.max(shake, isBlock ? 0.08 : m.id === 'super' ? 0.34 : 0.2);
    sound(isBlock ? 'block' : (m.id === 'super' ? 'superHit' : 'hit'));
  }

  function move(f, r) {
    const back = r.x * f.facing < -0.55;
    f.crouch = f.grounded && r.crouch;
    if (f.grounded && r.jump && f.canAct() && !f.crouch) {
      f.grounded = false; f.vy = 8.25; f.state = 'jump'; f.crouch = false; sound('jump');
    } else if (f.crouch) f.state = r.block || back ? 'block' : 'crouch';
    else if (r.block || back && Math.abs(r.x) > 0.6) f.state = 'block';
    else if (Math.abs(r.x) > 0.12 || r.stepL || r.stepR) f.state = 'walk';
    else f.state = 'idle';
    if (f.grounded) {
      const step = (r.stepR ? 1 : 0) - (r.stepL ? 1 : 0);
      const crouchMul = f.crouch ? 0.35 : 1;
      f.vx = r.x * f.def.speed * crouchMul;
      f.vz = step * f.def.step * 1.35;
      if (step) { f.invuln = Math.max(f.invuln, 4); afterimage(f); }
    } else {
      f.vx += r.x * 0.055; f.vz += ((r.stepR ? 1 : 0) - (r.stepL ? 1 : 0)) * 0.09;
    }
  }

  function physics(f) {
    if (!f.grounded) f.vy -= 0.48;
    f.x += f.vx * STEP; f.y += f.vy * STEP; f.z += f.vz * STEP;
    if (f.y <= 0) { f.y = 0; f.vy = 0; f.grounded = true; if (f.state === 'jump') f.state = 'idle'; }
    f.x = clamp(f.x, -ARENA_X, ARENA_X);
    const oldZ = f.z;
    f.z = clamp(f.z, -ARENA_Z, ARENA_Z);
    if (oldZ !== f.z && Math.abs(f.vz) > 1.8) { f.vz *= -0.35; if (f.state === 'hit' || f.state === 'down') wallBounce(f); }
    f.vx *= f.grounded ? (f.crouch ? 0.78 : 0.84) : 0.985;
    f.vz *= f.grounded ? 0.78 : 0.985;
  }

  function wallBounce(f) {
    f.hitstun = Math.max(f.hitstun, 14);
    burst(f.x, f.y + 0.9, f.z, f.def.accent, 18, 0.36);
    shake = Math.max(shake, 0.16);
  }

  function pushApart() {
    const dx = p2.x - p1.x, dz = p2.z - p1.z, d = Math.hypot(dx, dz) || 1;
    if (d < 0.78) {
      const ox = dx / d * (0.78 - d) * 0.5, oz = dz / d * (0.78 - d) * 0.5;
      p1.x -= ox; p2.x += ox; p1.z -= oz; p2.z += oz;
    }
  }

  function pose(f) {
    const m = f.model;
    const walk = f.pose += (Math.abs(f.vx) + Math.abs(f.vz)) * 0.055 + 0.034;
    const bob = Math.sin(frame * 0.06 + f.pose) * 0.026;
    m.rig.rotation.set(0, 0, 0); m.rig.position.y = 0;
    const crouchY = f.crouch || f.state === 'crouch' || f.state === 'block' && f.crouch ? -0.18 : 0;
    m.torso.position.y = 1.34 * m.scale.height + bob + crouchY;
    m.ribs.position.y = 1.57 * m.scale.height + bob + crouchY;
    m.waist.position.y = 0.86 * m.scale.height + crouchY;
    m.belt.position.y = 0.98 * m.scale.height + crouchY;
    m.buckle.position.y = 0.99 * m.scale.height + crouchY;
    m.neck.position.y = 1.86 * m.scale.height + bob + crouchY;
    m.head.position.y = 2.1 * m.scale.height + bob + crouchY;
    m.jaw.position.y = 2.0 * m.scale.height + bob + crouchY;
    m.eyeL.position.y = 2.11 * m.scale.height + bob + crouchY;
    m.eyeR.position.y = 2.11 * m.scale.height + bob + crouchY;
    m.brow.position.y = 2.145 * m.scale.height + bob + crouchY;
    m.hairCap.position.y = 2.18 * m.scale.height + bob + crouchY;
    for (const h of m.hairBits) h.position.y += Math.sin(frame * 0.05 + f.pose) * 0.0008;
    m.coat.rotation.set(Math.sin(frame * 0.04) * 0.035, 0, 0);
    m.armL.g.rotation.set(-0.48, 0, 0.34); m.armR.g.rotation.set(-0.54, 0, -0.34);
    m.legL.g.rotation.set(0.1, 0, 0.04); m.legR.g.rotation.set(-0.1, 0, -0.04);
    m.armL.fore.rotation.set(0, 0, 0); m.armR.fore.rotation.set(0, 0, 0);
    m.legL.shin.rotation.set(0, 0, 0); m.legR.shin.rotation.set(0, 0, 0);
    if (f.state === 'walk') {
      m.legL.g.rotation.x = Math.sin(walk) * 0.58; m.legR.g.rotation.x = -Math.sin(walk) * 0.58;
      m.armL.g.rotation.x = -0.48 - Math.sin(walk) * 0.28; m.armR.g.rotation.x = -0.54 + Math.sin(walk) * 0.28;
      m.coat.rotation.x += Math.sin(walk) * 0.08;
    }
    if (f.crouch || f.state === 'crouch') {
      m.rig.position.y = -0.06;
      m.legL.g.rotation.x = -0.72; m.legR.g.rotation.x = -0.45;
      m.legL.shin.rotation.x = 0.75; m.legR.shin.rotation.x = 0.55;
      m.armL.g.rotation.x = -0.95; m.armR.g.rotation.x = -0.9;
    }
    if (!f.grounded) {
      m.legL.g.rotation.x = -0.66; m.legR.g.rotation.x = 0.42;
      m.armL.g.rotation.x = -1.08; m.armR.g.rotation.x = -0.96;
      m.rig.rotation.x = -0.13;
      m.coat.rotation.x = -0.3;
    }
    if (f.move) {
      const snap = Math.sin(clamp((f.t - f.move.startup) / Math.max(1, f.move.active), 0, 1) * Math.PI);
      m.rig.rotation.y = -f.facing * (0.18 + 0.32 * snap);
      if (f.move.id === 'kick' || f.move.id === 'air') {
        m.legR.g.rotation.x = -1.65 * snap; m.legR.g.rotation.z = -f.facing * 0.58 * snap; m.legR.shin.rotation.x = 0.32 * snap;
        m.armL.g.rotation.x = -1.15;
      } else if (f.move.id === 'sweep') {
        m.rig.rotation.x = 0.12; m.legR.g.rotation.x = -1.28 * snap; m.legR.g.rotation.z = -f.facing * 1.15 * snap; m.legR.shin.rotation.x = -0.35 * snap;
      } else if (f.move.id === 'throw') {
        m.armL.g.rotation.x = -1.8 * snap; m.armR.g.rotation.x = -1.82 * snap; m.rig.rotation.x = -0.18 * snap;
      } else if (f.move.id === 'super') {
        m.armR.g.rotation.x = -2.2 * snap; m.armR.g.rotation.z = -1.05 * snap; m.legR.g.rotation.x = -1.05 * snap;
        m.coat.rotation.y = Math.sin(frame * 0.48) * 0.42; m.outline.scale.setScalar(1 + 0.28 * snap);
      } else if (f.move.id === 'special' && f.move.projectile) {
        m.armR.g.rotation.x = -1.75 * snap - 0.4; m.armL.g.rotation.x = -1.15; m.rig.rotation.y *= 0.5;
      } else {
        m.armR.g.rotation.x = -1.72 * snap - 0.45; m.armR.g.rotation.z = -0.78 * snap;
        m.armL.g.rotation.x = -0.82 - 0.2 * snap;
      }
    }
    if (f.state === 'block' || f.state === 'break') {
      m.armL.g.rotation.x = -1.35; m.armR.g.rotation.x = -1.35; m.rig.rotation.x = -0.05;
    }
    if (f.state === 'hit') m.rig.rotation.x = 0.24;
    if (f.state === 'down' || f.state === 'ko') { m.rig.rotation.z = f.facing * 1.32; m.rig.rotation.x = 0.62; m.rig.position.y = -0.62; }
    if (f.state === 'victory') { m.armR.g.rotation.x = -2.45; m.armR.g.rotation.z = -0.35; m.rig.position.y = Math.sin(frame * 0.08) * 0.04; }
    m.aura.material.opacity = clamp(0.14 + f.meter / 150 + Math.sin(frame * 0.08) * 0.05, 0.08, 0.86);
    m.aura.scale.setScalar(1 + f.meter / 215);
    m.outline.material.opacity = 0.08 + (f.afterimages > 0 ? 0.32 : 0) + f.meter / 420;
  }

  function sync(f) {
    const root = f.model.root;
    root.position.set(f.x, f.y, f.z);
    const yaw = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.rotation.y = lerpAngle(root.rotation.y || yaw, yaw, 0.42);
  }

  function lerpAngle(a, b, t) { const d = ((b - a + Math.PI) % TAU) - Math.PI; return a + d * t; }

  function tick() {
    frame++;
    stageTick();
    if (cinematic.t > 0) {
      cinematic.t--;
      if (cinematic.t <= 0) document.body.classList.remove('cinematic');
    }
    if (freeze > 0) { freeze--; if (p1 && p2) { pose(p1); pose(p2); } fx(); projectileTick(); return; }
    if (slow > 0 && frame % 2 === 0) { slow--; fx(); projectileTick(); return; }
    if (!p1 || !p2 || paused || over) { fx(); projectileTick(); return; }
    if (running && timer && frame % 60 === 0) {
      timer--;
      if (timer <= 0) finish(p1.hp >= p2.hp ? 'p1' : 'p2', 'TIME');
    }
    step(p1, p2, raw());
    step(p2, p1, mode === 'training' ? dummy(p2, p1) : ai(p2, p1));
    pushApart();
    projectileTick();
    fx();
    if (mode !== 'training') {
      if (p1.hp <= 0) finish('p2', 'KO');
      else if (p2.hp <= 0) finish('p1', p1.hp > 95 ? 'PERFECT' : 'KO');
    } else {
      p1.meter = 100; p2.meter = 100; if (p2.hp < 10) p2.hp = 100;
    }
    hud();
  }

  function dummy(f, t) {
    return { x: 0, z: 0, crouch: false, block: !!t.move && Math.hypot(t.x - f.x, t.z - f.z) < 1.9 };
  }

  function finish(winner, text) {
    if (over) return;
    over = true; running = false;
    score[winner]++;
    p1.state = winner === 'p1' ? 'victory' : 'ko';
    p2.state = winner === 'p2' ? 'victory' : 'ko';
    banner(text, 920);
    slow = 30; shake = Math.max(shake, 0.16);
    sound(text === 'PERFECT' ? 'perfect' : 'roundEnd');
    hud();
    const matchWon = score[winner] >= BEST_OF;
    setTimeout(() => {
      if (!p1 || !p2) return;
      if (matchWon) {
        banner(winner === 'p1' ? 'YOU WIN' : 'RIVAL WINS', 900);
        if (winner === 'p1' && mode === 'arcade') arcadeFight = arcadeFight >= 6 ? 1 : arcadeFight + 1;
        setTimeout(returnMenu, 980);
      } else {
        round++;
        beginRound();
      }
    }, 1350);
  }

  function returnMenu() {
    running = false; over = false;
    $('menu').classList.remove('hidden');
    $('hud').classList.add('hidden');
    $('pause').classList.add('hidden');
    document.body.classList.remove('cinematic');
    pickRival();
    markRoster();
  }

  function hud() {
    if (!p1 || !p2) return;
    $('p1-hp').style.width = `${clamp(p1.hp, 0, 100)}%`; $('p2-hp').style.width = `${clamp(p2.hp, 0, 100)}%`;
    $('p1-meter').style.width = `${p1.meter}%`; $('p2-meter').style.width = `${p2.meter}%`;
    const p1Guard = $('p1-guard'), p2Guard = $('p2-guard');
    if (p1Guard) p1Guard.style.width = `${p1.guard}%`;
    if (p2Guard) p2Guard.style.width = `${p2.guard}%`;
    $('timer').textContent = timer ? String(timer).padStart(2, '0') : '∞';
    updatePips('p1-wins', score.p1);
    updatePips('p2-wins', score.p2);
  }

  function updatePips(id, n) {
    const el = $(id);
    if (!el) return;
    [...el.children].forEach((p, i) => p.classList.toggle('on', i < n));
  }

  function updateMoveList() {
    const f = ROSTER.find((x) => x.id === selected) || ROSTER[0];
    const el = $('moveList');
    if (!el) return;
    el.innerHTML = `<b>${f.name}</b><span>J jab -> K heavy -> L launch -> I ${f.special}</span><span>S+L sweep | O throw | P ${f.super}</span>`;
  }

  function banner(txt, ms = 650) {
    const el = $('banner');
    el.textContent = txt;
    el.classList.add('on');
    clearTimeout(banner.t);
    banner.t = setTimeout(() => el.classList.remove('on'), ms);
  }

  function combo(n, dmg, counter) {
    const el = $('combo');
    el.innerHTML = `${n}<small>${counter ? 'counter ' : ''}${dmg} damage</small>`;
    el.classList.add('on');
    clearTimeout(combo.t);
    combo.t = setTimeout(() => el.classList.remove('on'), 900);
  }

  function projectile(f, m) {
    const geo = new THREE.SphereGeometry(0.16, 18, 10);
    const mesh = new THREE.Mesh(geo, glow(f.def.accent, 0.9));
    mesh.position.set(f.x + f.facing * 0.78, f.y + 1.05, f.z);
    scene.add(mesh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 6, 28), glow(f.def.accent, 0.55));
    ring.rotation.y = Math.PI / 2;
    mesh.add(ring);
    projectiles.push({ owner: f, mesh, life: 96, vx: f.facing * 0.18, vz: 0, move: { ...m, projectile: false, id: 'projectile', damage: m.damage, hit: 25, block: 12, push: 1.8, launch: 0.8 } });
    sound('projectile');
  }

  function projectileTick() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life--;
      p.mesh.position.x += p.vx;
      p.mesh.rotation.x += 0.18; p.mesh.rotation.y += 0.22;
      const target = p.owner === p1 ? p2 : p1;
      if (target && overlap({ x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z, w: 0.42, h: 0.42, d: 0.42 }, target.box())) {
        hit(p.owner, target, p.move);
        flash(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z, p.owner.def.accent, 0.8);
        scene.remove(p.mesh); projectiles.splice(i, 1); continue;
      }
      if (p.life <= 0 || Math.abs(p.mesh.position.x) > ARENA_X + 2) { scene.remove(p.mesh); projectiles.splice(i, 1); }
    }
  }

  function burst(x, y, z, color, count, power) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.07, 8, 6), glow(color, 0.92));
      m.position.set(x, y, z); scene.add(m);
      const a = Math.random() * TAU;
      particles.push({ mesh: m, life: 20 + Math.random() * 18, vx: Math.cos(a) * power * 0.085, vy: Math.random() * power * 0.13, vz: Math.sin(a) * power * 0.085 });
    }
  }

  function aura(f, size = 1.25, opacity = 0.18) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 16), glow(f.def.accent, opacity));
    m.position.set(f.x, f.y + 1.08, f.z); scene.add(m);
    particles.push({ mesh: m, life: 52, aura: f });
  }

  function flash(x, y, z, color, size) {
    const m = new THREE.Mesh(new THREE.RingGeometry(size * 0.3, size, 32), glow(color, 0.5));
    m.position.set(x, y, z);
    m.rotation.y = Math.PI / 2;
    scene.add(m);
    particles.push({ mesh: m, life: 18, spin: 0.28 });
  }

  function slashArc(f, m, blockedHit) {
    const color = blockedHit ? 0x7df5ff : f.def.accent;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.62 + (m.id === 'super' ? 0.4 : 0), 0.025, 6, 48, Math.PI * 1.25), glow(color, blockedHit ? 0.38 : 0.58));
    arc.position.set(f.x + f.facing * 0.9, f.y + (m.low ? 0.5 : 1.1), f.z);
    arc.rotation.set(Math.PI / 2, 0, f.facing > 0 ? -0.55 : Math.PI + 0.55);
    scene.add(arc);
    particles.push({ mesh: arc, life: 12, spin: f.facing * 0.2 });
  }

  function afterimage(f) {
    if (frame % 3) return;
    const ghost = f.model.root.clone(true);
    ghost.position.copy(f.model.root.position);
    ghost.rotation.copy(f.model.root.rotation);
    ghost.traverse((o) => {
      if (o.isMesh) o.material = glow(f.def.accent, 0.12);
    });
    scene.add(ghost);
    particles.push({ mesh: ghost, life: 14 });
  }

  function fx() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life--;
      if (p.aura) { p.mesh.position.set(p.aura.x, p.aura.y + 1.1, p.aura.z); p.mesh.scale.multiplyScalar(1.018); }
      else {
        p.mesh.position.x += p.vx || 0; p.mesh.position.y += p.vy || 0; p.mesh.position.z += p.vz || 0;
        if (p.vy !== undefined) p.vy -= 0.006;
        if (p.spin) p.mesh.rotation.z += p.spin;
      }
      p.mesh.traverse?.((o) => {
        if (o.material?.opacity !== undefined) o.material.opacity = Math.min(o.material.opacity, clamp(p.life / 26, 0, 1));
      });
      if (p.mesh.material?.opacity !== undefined) p.mesh.material.opacity = clamp(p.life / 32, 0, 1);
      if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    }
  }

  function stageTick() {
    for (let i = 0; i < stageBits.rings.length; i++) {
      const r = stageBits.rings[i];
      r.rotation.z += 0.0012 * (i % 2 ? 1 : -1);
      r.material.opacity = 0.24 + Math.sin(frame * 0.025 + i) * 0.08;
    }
    for (let i = 0; i < stageBits.panels.length; i++) {
      stageBits.panels[i].material.opacity = 0.8 + Math.sin(frame * 0.02 + i) * 0.08;
    }
    for (let i = 0; i < stageBits.crowd.length; i++) {
      const c = stageBits.crowd[i];
      c.position.y += Math.sin(frame * 0.06 + i) * 0.0014;
    }
    for (let i = 0; i < stageBits.beams.length; i++) {
      const b = stageBits.beams[i];
      b.rotation.z = Math.sin(frame * 0.01 + i) * 0.18;
      b.material.opacity = 0.08 + Math.sin(frame * 0.022 + i) * 0.045;
    }
    for (let i = 0; i < stageBits.drones.length; i++) {
      const d = stageBits.drones[i], a = d.a + frame * 0.0025;
      d.light.position.x = Math.cos(a) * d.r;
      d.light.position.z = Math.sin(a) * 4.8 - 0.2;
      d.orb.position.copy(d.light.position);
      d.orb.rotation.y += 0.04;
    }
    for (const s of stageBits.sparks) {
      s.mesh.position.y -= 0.012 * s.speed;
      if (s.mesh.position.y < 0.35) s.mesh.position.copy(s.base).add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, 0));
      s.mesh.material.opacity = 0.2 + Math.sin(frame * 0.04 * s.speed) * 0.18;
    }
  }

  function cameraTick(dt) {
    if (!p1 || !p2) {
      camera.position.x = lerp(camera.position.x, 0, dt * 2);
      camera.position.y = lerp(camera.position.y, 3.15, dt * 2);
      camera.position.z = lerp(camera.position.z, 9.4, dt * 2);
      camera.lookAt(0, 1.25, 0);
      renderer.render(scene, camera);
      return;
    }
    const mx = (p1.x + p2.x) / 2, mz = (p1.z + p2.z) / 2, sep = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    let tx = mx * 0.26, ty = 3.0 + clamp(sep * 0.07, 0, 0.7), tz = 7.6 + clamp(sep * 0.5, 0, 3.9);
    let lookY = 1.24 + Math.max(p1.y, p2.y) * 0.16;
    if (cinematic.t > 0 && cinematic.actor) {
      const a = cinematic.actor;
      tx = a.x - a.facing * (1.45 + Math.sin(cinematic.t * 0.08) * 0.22);
      ty = 2.0 + Math.sin(cinematic.t * 0.05) * 0.18;
      tz = a.z + 3.15;
      lookY = 1.42;
    }
    camera.position.x = lerp(camera.position.x, tx, dt * 4.4);
    camera.position.y = lerp(camera.position.y, ty, dt * 3.8);
    camera.position.z = lerp(camera.position.z, tz, dt * 4.2);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake *= 0.88;
    }
    camera.lookAt(mx * 0.25, lookY, mz * 0.45);
    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = innerWidth < 720 ? 52 : 44;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  }

  function audio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(f, d, type = 'sine', gain = 0.08, slide = 0) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime, osc = audioCtx.createOscillator(), vol = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t); if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    vol.gain.setValueAtTime(0.0001, t); vol.gain.exponentialRampToValueAtTime(gain, t + 0.01); vol.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(vol); vol.connect(audioCtx.destination); osc.start(t); osc.stop(t + d + 0.04);
  }

  function noise(d, gain = 0.1, hp = 800) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime, b = audioCtx.createBuffer(1, Math.max(1, Math.floor(audioCtx.sampleRate * d)), audioCtx.sampleRate), data = b.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource(), filter = audioCtx.createBiquadFilter(), vol = audioCtx.createGain();
    src.buffer = b; filter.type = 'highpass'; filter.frequency.value = hp; vol.gain.setValueAtTime(gain, t); vol.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(filter); filter.connect(vol); vol.connect(audioCtx.destination); src.start(t); src.stop(t + d + 0.03);
  }

  function sound(name) {
    if (name === 'round') { tone(330, 0.1, 'triangle', 0.06, 180); setTimeout(() => tone(660, 0.12, 'triangle', 0.07, -120), 100); }
    if (name === 'jump') tone(260, 0.08, 'triangle', 0.08, 120);
    if (name === 'whoosh') noise(0.08, 0.08, 1500);
    if (name === 'hit') { tone(106, 0.12, 'sawtooth', 0.16, -48); noise(0.08, 0.13, 550); }
    if (name === 'superHit') { tone(78, 0.18, 'sawtooth', 0.2, -26); noise(0.13, 0.18, 420); }
    if (name === 'block') { tone(520, 0.05, 'square', 0.1, -180); noise(0.04, 0.07, 1800); }
    if (name === 'grab') tone(180, 0.08, 'square', 0.1, -40);
    if (name === 'projectile') { tone(720, 0.08, 'triangle', 0.07, 180); noise(0.05, 0.05, 2500); }
    if (name === 'super') { tone(880, 0.12, 'square', 0.12, -220); setTimeout(() => tone(440, 0.22, 'sawtooth', 0.14, -170), 90); }
    if (name === 'roundEnd') tone(220, 0.18, 'sawtooth', 0.13, -80);
    if (name === 'perfect') { tone(880, 0.14, 'triangle', 0.1, 220); setTimeout(() => tone(660, 0.18, 'triangle', 0.11, -180), 110); }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000 || STEP);
    last = now; acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 4) { tick(); acc -= STEP; guard++; }
    cameraTick(dt);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
