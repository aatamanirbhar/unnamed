(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const mini = $('mini');
  const miniCtx = mini.getContext('2d');
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  if (!window.THREE) {
    $('netStatus').textContent = 'Three.js failed to load. Check the network connection and reload.';
    return;
  }

  const THREE = window.THREE;
  const SCALE = 0.02;
  const MAP = { w: 3600 * SCALE, h: 2600 * SCALE };
  const ROOM_PREFIX = 'ombv-';
  const GAMEPAD_DEADZONE = 0.18;
  const COLORS = {
    pink: 0xff4fa3,
    aqua: 0x80ffd8,
    gold: 0xffd166,
    orange: 0xff8a3d,
    blue: 0x6fb6ff,
    red: 0xff415d,
    green: 0x6fffa5,
    cream: 0xfff3d0
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isTouch ? 1.35 : 1.7));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xff9868);
  scene.fog = new THREE.Fog(0xff9868, 22, 92);

  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 150);
  camera.position.set(5, 5, 5);

  const hemi = new THREE.HemisphereLight(0xfff3d0, 0x294662, 1.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd299, 2.35);
  sun.position.set(-22, 42, -18);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x80ffd8, 0.9);
  fill.position.set(24, 12, 20);
  scene.add(fill);

  const worldRoot = new THREE.Group();
  const actorRoot = new THREE.Group();
  const fxRoot = new THREE.Group();
  scene.add(worldRoot, actorRoot, fxRoot);

  const keys = Object.create(null);
  const players = new Map();
  const vehicles = [];
  const cops = [];
  const npcs = [];
  const projectiles = [];
  const particles = [];
  const floating = [];
  const fireZones = [];
  const jobMarkers = new Map();

  const input = {
    keyX: 0,
    keyZ: 0,
    stickX: 0,
    stickY: 0,
    lookDX: 0,
    lookDY: 0,
    lookStickX: 0,
    lookStickY: 0,
    gamepadX: 0,
    gamepadY: 0,
    boostButton: false,
    fireDown: false
  };

  const jobs = [
    makeJob('sandwich', 'Deliver the suspicious sandwich', 520, 2040, 3080, 690, 850, COLORS.gold),
    makeJob('yacht', 'Photograph yacht row evidence', 2960, 420, 3180, 410, 700, COLORS.aqua),
    makeJob('bike', 'Jump the canal on a bike', 1290, 920, 1750, 900, 900, COLORS.orange),
    makeJob('swamp', 'Grab swamp cash before it bites', 2820, 2060, 3180, 2230, 1100, COLORS.green)
  ];

  const BUILDINGS = [
    [180,170,430,320,0x21144a], [760,170,340,250,0x1b2450], [1280,160,510,300,0x241840],
    [2080,120,380,320,0x172d42], [2660,150,520,260,0x27304b], [160,710,410,330,0x2a1633],
    [780,660,300,390,0x1b3040], [2020,720,500,260,0x35172e], [2740,820,430,330,0x182d2a],
    [220,1280,500,270,0x2f243d], [960,1260,430,350,0x171d36], [1620,1260,340,280,0x332646],
    [2260,1320,330,360,0x1f2f38], [2860,1450,420,250,0x263719], [760,1960,500,290,0x251d31],
    [1500,2060,430,270,0x1d3240], [2220,2040,360,320,0x301b2a]
  ].map(b => ({ x: s(b[0]), z: s(b[1]), w: s(b[2]), d: s(b[3]), color: b[4] }));

  const WEAPONS = [
    { id:'pistol', name:'Pistol', type:'bullet', dmg:18, rate:0.28, range:10.4, speed:19.2, color:COLORS.gold },
    { id:'smg', name:'SMG', type:'bullet', dmg:10, rate:0.09, range:9.6, speed:19.6, color:COLORS.aqua },
    { id:'shotgun', name:'Shotgun', type:'spread', dmg:13, rate:0.65, range:6.0, speed:17.6, pellets:7, color:COLORS.orange },
    { id:'rifle', name:'Rifle', type:'bullet', dmg:24, rate:0.18, range:14.0, speed:22.0, color:COLORS.blue },
    { id:'sniper', name:'Sniper', type:'bullet', dmg:75, rate:1.0, range:19.6, speed:28.0, color:0xd7e7ff },
    { id:'revolver', name:'Revolver', type:'bullet', dmg:42, rate:0.5, range:11.2, speed:20.8, color:COLORS.cream },
    { id:'uzi', name:'Twin Uzi', type:'bullet', dmg:8, rate:0.06, range:8.6, speed:19.6, color:COLORS.pink },
    { id:'bat', name:'Bat', type:'melee', dmg:28, rate:0.48, range:1.18, color:COLORS.gold },
    { id:'knife', name:'Knife', type:'melee', dmg:38, rate:0.34, range:1.0, color:0xd7e7ff },
    { id:'katana', name:'Katana', type:'melee', dmg:62, rate:0.42, range:1.42, color:COLORS.aqua },
    { id:'chainsaw', name:'Chainsaw', type:'melee', dmg:75, rate:0.75, range:1.35, color:COLORS.orange },
    { id:'molotov', name:'Molotov', type:'firebomb', dmg:10, rate:0.9, range:8.6, speed:10.8, radius:2.6, color:COLORS.orange },
    { id:'flamethrower', name:'Flamer', type:'flame', dmg:16, rate:0.12, range:3.7, color:0xff5a1f },
    { id:'grenade', name:'Grenade', type:'bomb', dmg:90, rate:0.9, range:9.2, speed:11.2, radius:3.0, color:COLORS.green },
    { id:'sticky', name:'Sticky Bomb', type:'sticky', dmg:115, rate:0.75, range:8.6, speed:10.4, radius:3.4, color:COLORS.pink },
    { id:'rocket', name:'Rocket Launcher', type:'rocket', dmg:160, rate:1.2, range:17.0, speed:12.8, radius:4.2, color:COLORS.red },
    { id:'minigun', name:'Minigun', type:'bullet', dmg:12, rate:0.045, range:13.0, speed:23.6, color:COLORS.gold },
    { id:'taser', name:'Taser', type:'stun', dmg:6, rate:0.7, range:4.4, speed:17.2, color:COLORS.aqua },
    { id:'paintball', name:'Paint Gun', type:'paint', dmg:4, rate:0.11, range:8.0, speed:15.2, color:0xb66bff },
    { id:'watergun', name:'Water Cannon', type:'push', dmg:2, rate:0.08, range:5.0, speed:16.4, color:COLORS.blue },
    { id:'nailgun', name:'Nailgun', type:'bullet', dmg:15, rate:0.12, range:8.4, speed:18.6, color:0xd7e7ff },
    { id:'flare', name:'Flare Gun', type:'fireball', dmg:24, rate:0.6, range:10.4, speed:11.2, radius:1.7, color:COLORS.red },
    { id:'boomerang', name:'Boomerang', type:'boomerang', dmg:28, rate:0.8, range:7.2, speed:10.0, color:COLORS.gold },
    { id:'foam', name:'Foam Cannon', type:'foam', dmg:1, rate:0.18, range:6.0, speed:12.4, color:COLORS.cream }
  ];
  const weaponById = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

  let mode = 'menu';
  let localId = 'mason';
  let localRole = 'Mason Brick';
  let activeJob = jobs[0];
  let cameraYaw = -Math.PI / 4;
  let cameraPitch = 0.18;
  let mouseLocked = false;
  let toastT = 0;
  let last = performance.now();
  let peer = null;
  let hostConn = null;
  let conns = [];
  let roomCode = '';
  let isHost = false;
  let netT = 0;
  let beat = null;
  let beatOn = false;
  const hudCache = { stats: '', role: '', objective: '' };

  buildStaticWorld();
  bind();
  if (new URLSearchParams(location.search).get('autoplay') === 'solo') {
    setTimeout(startSolo, 250);
  }
  requestAnimationFrame(loop);

  function s(v) { return v * SCALE; }
  function makeJob(id, label, x, z, tx, tz, reward, color) {
    return { id, label, x: s(x), z: s(z), tx: s(tx), tz: s(tz), reward, color };
  }

  function buildStaticWorld() {
    disposeChildren(worldRoot);
    worldRoot.add(makePlane(MAP.w, MAP.h, 0x1a6946, MAP.w / 2, 0, MAP.h / 2));

    const sunset = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP.w, MAP.h),
      new THREE.MeshBasicMaterial({ color: 0xff4fa3, transparent: true, opacity: 0.09 })
    );
    sunset.rotation.x = -Math.PI / 2;
    sunset.position.set(MAP.w / 2, 0.012, MAP.h / 2);
    worldRoot.add(sunset);

    addWater(s(2650), 0, s(950), s(690));
    addWater(s(3000), s(430), s(560), s(260));
    addSwamp(s(2700), s(1850), s(900), s(750));
    addRoads();
    addBuildings();
    addDocksAndProps();
    addJobMarkers();
  }

  function makePlane(w, h, color, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.01 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    return mesh;
  }

  function addWater(x, z, w, h) {
    const water = makePlane(w, h, 0x168fc4, x + w / 2, 0.025, z + h / 2);
    water.material.transparent = true;
    water.material.opacity = 0.86;
    worldRoot.add(water);
    for (let i = 0; i < 12; i++) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.8, 0.025),
        new THREE.MeshBasicMaterial({ color: 0xbffaff, transparent: true, opacity: 0.32 })
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(x + w * 0.5, 0.04, z + h * (0.12 + i * 0.065));
      worldRoot.add(line);
    }
  }

  function addSwamp(x, z, w, h) {
    const swamp = makePlane(w, h, 0x17483e, x + w / 2, 0.03, z + h / 2);
    worldRoot.add(swamp);
    for (let i = 0; i < 24; i++) {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 + Math.random() * 0.25, 0.18, 0.04, 14),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0x6fffa5 : 0x2f934e, roughness: 1 })
      );
      pad.position.set(x + Math.random() * w, 0.07, z + Math.random() * h);
      worldRoot.add(pad);
    }
  }

  function addRoads() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x24324a, roughness: 0.88, metalness: 0.02 });
    const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.gold, transparent: true, opacity: 0.45 });
    for (let x = s(320); x < MAP.w; x += s(520)) {
      addRoadMesh(x, MAP.h / 2, s(72), MAP.h, roadMat);
      for (let z = 0.6; z < MAP.h; z += 1.2) addLane(x, z, 0.03, 0.58, lineMat);
    }
    for (let z = s(360); z < MAP.h; z += s(520)) {
      addRoadMesh(MAP.w / 2, z, MAP.w, s(72), roadMat);
      for (let x = 0.6; x < MAP.w; x += 1.2) addLane(x, z, 0.58, 0.03, lineMat);
    }
  }

  function addRoadMesh(x, z, w, h, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, h), mat);
    m.position.set(x, 0.045, z);
    worldRoot.add(m);
  }

  function addLane(x, z, w, h, mat) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.08, z);
    worldRoot.add(dash);
  }

  function addBuildings() {
    BUILDINGS.forEach((b, idx) => {
      const height = 1.4 + (idx % 5) * 0.48;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, height, b.d),
        new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.78, metalness: 0.02 })
      );
      mesh.position.set(b.x + b.w / 2, height / 2, b.z + b.d / 2);
      worldRoot.add(mesh);

      const edge = new THREE.EdgesGeometry(mesh.geometry);
      const outline = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: idx % 2 ? COLORS.aqua : COLORS.pink, transparent: true, opacity: 0.3 }));
      outline.position.copy(mesh.position);
      worldRoot.add(outline);

      const sign = makeTextSprite(idx % 3 ? 'VICE' : 'BRICK', idx % 2 ? '#80ffd8' : '#ff4fa3', '#090816', 96, 34);
      sign.position.set(b.x + b.w * 0.5, height + 0.45, b.z + b.d + 0.06);
      sign.scale.set(1.3, 0.46, 1);
      worldRoot.add(sign);
    });
  }

  function addDocksAndProps() {
    const palmMat = new THREE.MeshStandardMaterial({ color: 0x3b2718, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x50b35d, roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 34; i++) {
      const x = s(120 + (i * 311) % 3300);
      const z = s(140 + (i * 197) % 2300);
      if (insideBuilding(x, z, 0.3)) continue;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.25, 8), palmMat);
      trunk.position.set(x, 0.64, z);
      const leaves = new THREE.Group();
      for (let j = 0; j < 5; j++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.1), leafMat);
        leaf.position.y = 1.28;
        leaf.rotation.set(Math.PI / 4, j * Math.PI * 2 / 5, 0);
        leaves.add(leaf);
      }
      leaves.position.set(x, 0, z);
      worldRoot.add(trunk, leaves);
    }
    for (let i = 0; i < 6; i++) {
      const yacht = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.45), new THREE.MeshStandardMaterial({ color: 0xfff3d0, roughness: 0.45 }));
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.32), new THREE.MeshStandardMaterial({ color: 0x80ffd8, roughness: 0.25, transparent: true, opacity: 0.8 }));
      cabin.position.y = 0.25;
      yacht.add(hull, cabin);
      yacht.position.set(s(2870 + i * 105), 0.14, s(360 + (i % 2) * 95));
      yacht.rotation.y = -0.3;
      worldRoot.add(yacht);
    }
  }

  function addJobMarkers() {
    jobs.forEach(job => {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.78, 0.04, 8, 32),
        new THREE.MeshBasicMaterial({ color: job.color, transparent: true, opacity: 0.95 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.08;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.62, 4),
        new THREE.MeshBasicMaterial({ color: job.color })
      );
      cone.position.y = 0.72;
      cone.rotation.y = Math.PI / 4;
      const label = makeTextSprite(job.id.toUpperCase(), '#090816', colorHex(job.color), 160, 46);
      label.position.y = 1.38;
      label.scale.set(1.15, 0.35, 1);
      group.add(ring, cone, label);
      group.position.set(job.tx, 0, job.tz);
      group.userData.ring = ring;
      jobMarkers.set(job.id, group);
      worldRoot.add(group);
    });
  }

  function resetActors() {
    disposeChildren(actorRoot);
    disposeChildren(fxRoot);
    vehicles.length = 0;
    cops.length = 0;
    npcs.length = 0;
    projectiles.length = 0;
    particles.length = 0;
    floating.length = 0;
    fireZones.length = 0;
  }

  function seedActors() {
    resetActors();
    const carColors = [COLORS.pink, COLORS.aqua, COLORS.gold, COLORS.blue, COLORS.orange, 0xd7e7ff];
    const spots = [
      [610,1900,'car'],[910,1620,'car'],[1320,720,'bike'],[1730,880,'bike'],[2140,640,'car'],[2930,520,'car'],
      [3150,1070,'car'],[2540,1720,'car'],[3040,2180,'swamp'],[540,540,'car'],[1810,1910,'car'],[2160,2220,'bike']
    ];
    spots.forEach((spot, i) => {
      const vehicle = {
        id: 'v' + i,
        x: s(spot[0]),
        z: s(spot[1]),
        yaw: Math.random() * Math.PI * 2,
        type: spot[2],
        color: carColors[i % carColors.length],
        vx: 0,
        vz: 0,
        driverId: null,
        hp: 100,
        mesh: makeVehicleMesh(spot[2], carColors[i % carColors.length])
      };
      vehicles.push(vehicle);
      actorRoot.add(vehicle.mesh);
    });
    for (let i = 0; i < 42; i++) {
      const npc = {
        id: 'n' + i,
        x: s(200 + Math.random() * 3200),
        z: s(220 + Math.random() * 2100),
        yaw: Math.random() * Math.PI * 2,
        hp: 100,
        t: Math.random() * 3,
        panic: 0,
        burn: 0,
        stun: 0,
        foam: 0,
        dead: false,
        mesh: makeNpcMesh(i % 3 ? COLORS.cream : 0xffb6d8)
      };
      if (insideBuilding(npc.x, npc.z, 0.2)) npc.z += 2;
      npcs.push(npc);
      actorRoot.add(npc.mesh);
    }
    for (let i = 0; i < 5; i++) {
      const cop = {
        id: 'c' + i,
        x: s(200 + Math.random() * 3200),
        z: s(250 + Math.random() * 2100),
        yaw: Math.random() * Math.PI * 2,
        vx: 0,
        vz: 0,
        hp: 120,
        flash: Math.random(),
        burn: 0,
        stun: 0,
        dead: false,
        mesh: makeCopMesh()
      };
      cops.push(cop);
      actorRoot.add(cop.mesh);
    }
  }

  function makePlayer(id, name, x, z, color, local) {
    const p = {
      id,
      name,
      x,
      z,
      vx: 0,
      vz: 0,
      yaw: 0,
      hp: 100,
      cash: 0,
      stars: 0,
      wantedT: 0,
      color,
      local: !!local,
      vehicleId: null,
      cooldown: 0,
      weapons: ['pistol', 'bat', 'sticky'],
      weapon: 'pistol',
      mesh: makePlayerMesh(color, id === 'foccoia' ? COLORS.gold : COLORS.pink)
    };
    actorRoot.add(p.mesh);
    return p;
  }

  function makePlayerMesh(color, accent) {
    const group = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 });
    const shirt = new THREE.MeshStandardMaterial({ color: COLORS.cream, roughness: 0.78 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xffc08c, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.24), suit);
    body.position.y = 0.72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), skin);
    head.position.y = 1.22;
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.26), shirt);
    chest.position.set(0, 0.74, 0.01);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.28), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7 }));
    tie.position.set(0, 0.72, 0.025);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.44), new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.55, metalness: 0.2 }));
    gun.position.set(0.28, 0.84, 0.2);
    group.add(body, head, chest, tie, gun);
    return group;
  }

  function makeNpcMesh(color) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.48, 4, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.86 }));
    body.position.y = 0.42;
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.2), new THREE.MeshStandardMaterial({ color: 0x090816, roughness: 0.7 }));
    hat.position.y = 0.86;
    group.add(body, hat);
    return group;
  }

  function makeVehicleMesh(type, color) {
    const group = new THREE.Group();
    if (type === 'bike') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.16, 0.95), new THREE.MeshStandardMaterial({ color, roughness: 0.52, metalness: 0.08 }));
      frame.position.y = 0.28;
      group.add(frame);
      for (const z of [-0.43, 0.43]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0x07090e, roughness: 0.65 }));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0.18, z);
        group.add(wheel);
      }
    } else {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(type === 'swamp' ? 0.86 : 0.82, 0.28, type === 'swamp' ? 1.15 : 1.35),
        new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.12 })
      );
      body.position.y = 0.34;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.52), new THREE.MeshStandardMaterial({ color: 0xa5f6ff, transparent: true, opacity: 0.62, roughness: 0.22 }));
      cabin.position.set(0, 0.58, -0.12);
      group.add(body, cabin);
      for (const x of [-0.42, 0.42]) {
        for (const z of [-0.48, 0.48]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.11, 16), new THREE.MeshStandardMaterial({ color: 0x07090e, roughness: 0.65 }));
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x, 0.18, z);
          group.add(wheel);
        }
      }
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: COLORS.gold }));
      light.position.set(0, 0.39, 0.7);
      group.add(light);
    }
    return group;
  }

  function makeCopMesh() {
    const group = makeVehicleMesh('car', 0xe7f6ff);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.12), new THREE.MeshBasicMaterial({ color: COLORS.red }));
    bar.position.set(0, 0.84, -0.14);
    group.add(bar);
    group.userData.lightBar = bar;
    return group;
  }

  function bind() {
    addEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    document.addEventListener('pointerlockchange', () => {
      mouseLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('visibilitychange', () => { last = performance.now(); });
    canvas.addEventListener('click', () => {
      if (mode !== 'play' || isTouch) return;
      if (!mouseLocked) canvas.requestPointerLock?.();
    });
    canvas.addEventListener('mousemove', e => {
      if (mode !== 'play' || !mouseLocked) return;
      input.lookDX += e.movementX || 0;
      input.lookDY += e.movementY || 0;
    });
    canvas.addEventListener('mousedown', e => {
      if (mode !== 'play') return;
      if (!mouseLocked && !isTouch) {
        canvas.requestPointerLock?.();
        return;
      }
      if (e.button === 0) {
        input.fireDown = true;
        fireWeapon();
      }
      if (e.button === 2) action();
    });
    canvas.addEventListener('mouseup', e => {
      if (e.button === 0) input.fireDown = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (mode !== 'play') return;
      if (k === 'e') action();
      if (k === 'q') nextJob();
      if (k === 'h') honk();
      if (k === 'f' || k === ' ') fireWeapon();
      if (k === 'r') cycleCarry(1);
      if (k === 'tab') { e.preventDefault(); toggleWeaponWheel(); }
    });
    addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => {
      for (const k in keys) keys[k] = false;
      input.boostButton = false;
      input.fireDown = false;
    });

    $('soloBtn').addEventListener('click', startSolo);
    $('hostBtn').addEventListener('click', startHost);
    $('joinBtn').addEventListener('click', joinRoom);
    $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
    $('actBtn').addEventListener('pointerdown', e => { e.preventDefault(); action(); });
    $('fireBtn').addEventListener('pointerdown', e => { e.preventDefault(); input.fireDown = true; fireWeapon(); });
    $('fireBtn').addEventListener('pointerup', e => { e.preventDefault(); input.fireDown = false; });
    $('fireBtn').addEventListener('pointercancel', e => { e.preventDefault(); input.fireDown = false; });
    $('boostBtn').addEventListener('pointerdown', e => { e.preventDefault(); input.boostButton = true; });
    $('boostBtn').addEventListener('pointerup', e => { e.preventDefault(); input.boostButton = false; });
    $('boostBtn').addEventListener('pointercancel', e => { e.preventDefault(); input.boostButton = false; });
    $('hornBtn').addEventListener('pointerdown', e => { e.preventDefault(); honk(); });
    $('mapBtn').addEventListener('pointerdown', e => { e.preventDefault(); nextJob(); });
    $('weaponBtn').addEventListener('pointerdown', e => { e.preventDefault(); toggleWeaponWheel(); });
    $('weaponWheel').addEventListener('pointerdown', e => {
      if (e.target.id === 'weaponWheel') closeWeaponWheel();
    });
    bindStick($('moveStick'), $('moveStick').querySelector('.knob'), (x, y) => {
      input.stickX = x;
      input.stickY = y;
    });
    bindLookStick();
  }

  function startSolo() {
    startBeat();
    showLoading(() => {
      isHost = false;
      hostConn = null;
      conns = [];
      roomCode = '';
      localId = 'mason';
      localRole = 'Mason Brick';
      players.clear();
      seedActors();
      const p = makePlayer('mason', 'Mason Brick', s(460), s(2040), COLORS.pink, true);
      players.set('mason', p);
      activeJob = jobs[0];
      showGame();
      toast('Mason Brick is loose. Find a ride and do something questionable.');
    });
  }

  function startHost() {
    startBeat();
    if (typeof Peer === 'undefined') {
      $('netStatus').textContent = 'PeerJS failed to load. Solo still works.';
      return;
    }
    roomCode = genCode();
    $('netStatus').textContent = 'Room ' + roomCode + ' ready. Share it.';
    try {
      peer?.destroy?.();
      peer = new Peer(ROOM_PREFIX + roomCode);
      peer.on('connection', conn => {
        conns.push(conn);
        conn.on('data', msg => handleClient(msg, conn));
        conn.on('open', () => {
          let foc = players.get('foccoia');
          if (!foc) {
            foc = makePlayer('foccoia', 'Foccoia Bread', s(560), s(2010), COLORS.gold, false);
            players.set('foccoia', foc);
          }
          conn.send({ t: 'welcome', id: 'foccoia', world: packWorld(), players: packPlayers(), job: activeJob?.id || null });
          toast('Foccoia Bread joined the mess.');
        });
      });
      showLoading(() => {
        isHost = true;
        localId = 'mason';
        localRole = 'Mason Brick';
        players.clear();
        seedActors();
        players.set('mason', makePlayer('mason', 'Mason Brick', s(460), s(2040), COLORS.pink, true));
        activeJob = jobs[0];
        showGame();
        toast('Room ' + roomCode + '. Mason hosts the bad idea.');
      });
    } catch (err) {
      $('netStatus').textContent = 'Host failed: ' + err.message;
    }
  }

  function joinRoom() {
    startBeat();
    if (typeof Peer === 'undefined') {
      $('netStatus').textContent = 'PeerJS failed to load.';
      return;
    }
    const code = $('joinCode').value.trim().toUpperCase();
    if (code.length < 4) {
      $('netStatus').textContent = 'Enter a room code.';
      return;
    }
    try {
      peer?.destroy?.();
      peer = new Peer();
      peer.on('open', () => {
        hostConn = peer.connect(ROOM_PREFIX + code);
        hostConn.on('open', () => hostConn.send({ t: 'join' }));
        hostConn.on('data', handleHost);
      });
      $('netStatus').textContent = 'Connecting to ' + code + '...';
    } catch (err) {
      $('netStatus').textContent = 'Join failed: ' + err.message;
    }
  }

  function handleHost(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'welcome') {
      localId = msg.id;
      localRole = 'Foccoia Bread';
      isHost = false;
      roomCode = 'JOIN';
      seedActors();
      unpackWorld(msg.world);
      unpackPlayers(msg.players);
      activeJob = jobs.find(j => j.id === msg.job) || jobs[0];
      showLoading(() => {
        showGame();
        toast('Foccoia Bread joins. Try not to scratch the supercar.');
      });
    } else if (msg.t === 'snap') {
      unpackPlayers(msg.players);
      unpackVehicles(msg.vehicles);
      activeJob = jobs.find(j => j.id === msg.job) || activeJob;
    }
  }

  function handleClient(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'input' && msg.p) {
      applyRemotePlayer(msg.p);
    }
  }

  function showGame() {
    mode = 'play';
    $('menu').classList.add('hidden');
    $('hud').classList.remove('hidden');
    mini.classList.remove('hidden');
    $('center').classList.remove('hidden');
    buildWeaponWheel();
    hudCache.stats = '';
    hudCache.role = '';
    hudCache.objective = '';
  }

  function showLoading(done) {
    const load = $('loading');
    const bar = $('loadBar');
    const txt = $('loadText');
    const lines = ['loading neon mistakes', 'waxing stolen supercars', 'overpricing yacht fuel', 'feeding swamp lawyers', 'tuning hip hop beat'];
    load.classList.add('on');
    let p = 0;
    const timer = setInterval(() => {
      p = Math.min(100, p + 12 + Math.random() * 18);
      bar.style.width = p + '%';
      txt.textContent = lines[(Math.random() * lines.length) | 0];
      if (p >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          load.classList.remove('on');
          done();
        }, 160);
      }
    }, 90);
  }

  function update(dt) {
    const me = players.get(localId);
    if (!me) return;
    readInput(dt);
    updatePlayer(me, dt);
    if (isHost || !hostConn) {
      updateNpc(dt);
      updateCops(dt);
      updateJobs();
    }
    updateProjectiles(dt);
    updateFireZones(dt);
    updateParticles(dt);
    updateActors();
    updateCamera(dt);
    updateHud(me);
    updateNetwork(dt, me);
    if (toastT > 0) toastT -= dt;
    else $('toast').classList.remove('on');
    if (input.fireDown) fireWeapon();
  }

  function readInput(dt) {
    input.keyX = 0;
    input.keyZ = 0;
    if (keys.a || keys.arrowleft) input.keyX -= 1;
    if (keys.d || keys.arrowright) input.keyX += 1;
    if (keys.w || keys.arrowup) input.keyZ += 1;
    if (keys.s || keys.arrowdown) input.keyZ -= 1;
    readGamepad(dt);
    cameraYaw -= input.lookDX * 0.003;
    cameraPitch = clamp(cameraPitch - input.lookDY * 0.0014, -0.28, 0.52);
    input.lookDX = 0;
    input.lookDY = 0;
    const lookMul = keys.shift ? 0.8 : 1;
    cameraYaw -= input.lookStickX * dt * 2.8 * lookMul;
    cameraPitch = clamp(cameraPitch - input.lookStickY * dt * 1.35 * lookMul, -0.28, 0.52);
  }

  function updatePlayer(p, dt) {
    p.cooldown = Math.max(0, p.cooldown - dt);
    const moveX = input.keyX + input.stickX + input.gamepadX;
    const moveZ = input.keyZ - input.stickY - input.gamepadY;
    const boost = keys.shift || input.boostButton;
    const v = p.vehicleId ? vehicles.find(item => item.id === p.vehicleId) : null;
    if (v && !v.dead) {
      const turnPower = v.type === 'bike' ? 2.65 : 2.1;
      v.yaw -= clamp(moveX, -1, 1) * dt * turnPower * (Math.hypot(v.vx, v.vz) > 0.4 ? 1 : 0.45);
      const accel = clamp(moveZ, -1, 1) * (v.type === 'bike' ? 13.0 : v.type === 'swamp' ? 7.2 : 10.2) * (boost ? 1.65 : 1);
      v.vx += Math.sin(v.yaw) * accel * dt;
      v.vz += Math.cos(v.yaw) * accel * dt;
      const drag = Math.pow(v.type === 'swamp' ? 0.955 : 0.97, dt * 60);
      v.vx *= drag;
      v.vz *= drag;
      const max = (v.type === 'bike' ? 10.5 : v.type === 'swamp' ? 5.8 : 8.8) * (boost ? 1.25 : 1);
      limitVelocity(v, max);
      moveThing(v, v.vx * dt, v.vz * dt, v.type === 'bike' ? 0.32 : 0.45);
      p.x = v.x;
      p.z = v.z;
      p.yaw = v.yaw;
      p.vx = v.vx;
      p.vz = v.vz;
      if (boost && Math.random() < dt * 13) spark(v.x - Math.sin(v.yaw) * 0.7, v.z - Math.cos(v.yaw) * 0.7, COLORS.gold);
    } else {
      p.vehicleId = null;
      const len = Math.hypot(moveX, moveZ);
      let dx = 0;
      let dz = 0;
      if (len > 0.05) {
        const mx = moveX / Math.max(1, len);
        const mz = moveZ / Math.max(1, len);
        const forward = { x: Math.sin(cameraYaw), z: Math.cos(cameraYaw) };
        const right = { x: forward.z, z: -forward.x };
        dx = (right.x * mx + forward.x * mz);
        dz = (right.z * mx + forward.z * mz);
        const speed = 3.55 * (boost ? 1.35 : 1);
        p.yaw = Math.atan2(dx, dz);
        p.vx = dx * speed;
        p.vz = dz * speed;
        moveThing(p, p.vx * dt, p.vz * dt, 0.32);
      } else {
        p.vx = 0;
        p.vz = 0;
      }
    }
    p.wantedT = Math.max(0, p.wantedT - dt);
    if (p.wantedT <= 0) p.stars = Math.max(0, p.stars - dt * 0.08);
    if (p.hp <= 0) {
      p.hp = 100;
      p.x = s(460);
      p.z = s(2040);
      p.vehicleId = null;
      p.stars = Math.max(0, p.stars - 1.2);
      toast('Hospital says stop doing that.');
    }
  }

  function moveThing(o, dx, dz, r) {
    let nx = clamp(o.x + dx, 0.9, MAP.w - 0.9);
    for (const b of BUILDINGS) if (circleRect(nx, o.z, r, b)) nx = o.x;
    let nz = clamp(o.z + dz, 0.9, MAP.h - 0.9);
    for (const b of BUILDINGS) if (circleRect(nx, nz, r, b)) nz = o.z;
    if ((nx !== o.x || nz !== o.z) && (nx === o.x || nz === o.z)) {
      o.vx = (o.vx || 0) * -0.2;
      o.vz = (o.vz || 0) * -0.2;
    }
    o.x = nx;
    o.z = nz;
  }

  function updateNpc(dt) {
    for (const n of npcs) {
      if (n.dead) continue;
      n.panic = Math.max(0, n.panic - dt);
      n.stun = Math.max(0, n.stun - dt);
      n.foam = Math.max(0, n.foam - dt);
      if (n.burn > 0) {
        n.burn -= dt;
        damageActor(n, 12 * dt, 'fire', { x: n.x, z: n.z });
        if (Math.random() < dt * 16) spark(n.x, n.z, COLORS.orange);
        n.panic = Math.max(n.panic, 1.8);
      }
      if (n.stun > 0) continue;
      n.t -= dt;
      if (n.t <= 0 || n.panic > 0) {
        n.t = 0.35 + Math.random() * 1.2;
        n.yaw += (Math.random() - 0.5) * (n.panic > 0 ? 5 : 1.8);
      }
      const sp = (n.panic > 0 ? 2.0 : 0.55) * (n.foam > 0 ? 0.35 : 1);
      moveThing(n, Math.sin(n.yaw) * sp * dt, Math.cos(n.yaw) * sp * dt, 0.2);
    }
  }

  function updateCops(dt) {
    const target = [...players.values()].sort((a, b) => b.stars - a.stars)[0];
    for (const c of cops) {
      if (c.dead) continue;
      c.flash += dt * 8;
      c.stun = Math.max(0, c.stun - dt);
      if (c.burn > 0) {
        c.burn -= dt;
        damageActor(c, 10 * dt, 'fire', { x: c.x, z: c.z });
      }
      if (c.stun > 0) continue;
      if (target && target.stars > 0.2) {
        const dx = target.x - c.x;
        const dz = target.z - c.z;
        const d = Math.hypot(dx, dz) || 1;
        c.yaw = Math.atan2(dx, dz);
        c.vx += dx / d * 5.0 * dt;
        c.vz += dz / d * 5.0 * dt;
        if (d < 1.05) {
          target.hp = Math.max(0, target.hp - dt * 18);
          target.stars = Math.max(target.stars, 2);
          if (Math.random() < dt * 8) spark(target.x, target.z, COLORS.blue);
        }
      } else {
        c.yaw += Math.sin(performance.now() * 0.001 + c.x) * dt;
        c.vx += Math.sin(c.yaw) * 0.9 * dt;
        c.vz += Math.cos(c.yaw) * 0.9 * dt;
      }
      c.vx *= Math.pow(0.98, dt * 60);
      c.vz *= Math.pow(0.98, dt * 60);
      limitVelocity(c, 5.3);
      moveThing(c, c.vx * dt, c.vz * dt, 0.46);
    }
  }

  function updateJobs() {
    if (!activeJob) activeJob = jobs[0];
    for (const p of players.values()) {
      if (Math.hypot(p.x - activeJob.tx, p.z - activeJob.tz) < 1.35) {
        p.cash += activeJob.reward;
        p.stars = Math.min(5, p.stars + 0.8);
        p.wantedT = 12;
        floating.push(makeFloating(p.x, p.z, '+$' + activeJob.reward, activeJob.color));
        activeJob = jobs[(jobs.indexOf(activeJob) + 1) % jobs.length];
        toast(activeJob.label);
      }
    }
  }

  function updateActors() {
    for (const p of players.values()) {
      if (!p.mesh) continue;
      p.mesh.visible = !p.vehicleId;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.yaw;
    }
    for (const v of vehicles) {
      v.mesh.position.set(v.x, 0, v.z);
      v.mesh.rotation.y = v.yaw;
      v.mesh.visible = !v.dead;
    }
    for (const c of cops) {
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.yaw;
      c.mesh.visible = !c.dead;
      if (c.mesh.userData.lightBar) {
        c.mesh.userData.lightBar.material.color.setHex(Math.sin(c.flash) > 0 ? COLORS.red : COLORS.blue);
      }
    }
    for (const n of npcs) {
      n.mesh.position.set(n.x, n.dead ? 0.03 : 0, n.z);
      n.mesh.rotation.y = n.yaw;
      n.mesh.rotation.z = n.dead ? -Math.PI / 2 : 0;
    }
    for (const [id, marker] of jobMarkers) {
      const active = activeJob && activeJob.id === id;
      marker.visible = true;
      marker.userData.ring.material.opacity = active ? 1 : 0.28;
      marker.userData.ring.rotation.z += active ? 0.035 : 0.01;
      marker.scale.setScalar(active ? 1 + Math.sin(performance.now() * 0.006) * 0.07 : 0.72);
    }
  }

  function updateCamera(dt) {
    const me = players.get(localId);
    if (!me) return;
    const vehicle = me.vehicleId ? vehicles.find(v => v.id === me.vehicleId) : null;
    const targetYaw = vehicle && Math.hypot(vehicle.vx, vehicle.vz) > 1.2 ? vehicle.yaw : cameraYaw;
    if (vehicle && Math.abs(input.lookStickX) < 0.03 && Math.abs(input.lookDX) < 0.01) {
      cameraYaw = lerpAngle(cameraYaw, targetYaw, 1 - Math.pow(0.08, dt));
    }
    const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const back = vehicle ? 6.7 : 4.9;
    const height = vehicle ? 3.4 : 2.85;
    const target = new THREE.Vector3(me.x, 0.85, me.z);
    const desired = target.clone()
      .addScaledVector(forward, -back)
      .addScaledVector(right, 0.72)
      .add(new THREE.Vector3(0, height + cameraPitch * 2, 0));
    desired.x = clamp(desired.x, 0.5, MAP.w - 0.5);
    desired.z = clamp(desired.z, 0.5, MAP.h - 0.5);
    const t = 1 - Math.pow(0.002, dt);
    camera.position.lerp(desired, t);
    const look = target.clone().addScaledVector(forward, 4.5).add(new THREE.Vector3(0, 0.4 - cameraPitch, 0));
    look.x = clamp(look.x, 0.4, MAP.w - 0.4);
    look.z = clamp(look.z, 0.4, MAP.h - 0.4);
    camera.lookAt(look);
  }

  function fireWeapon() {
    const me = players.get(localId);
    if (!me || me.cooldown > 0) return;
    const w = weaponById[me.weapon] || weaponById.pistol;
    me.cooldown = w.rate;
    me.stars = Math.min(5, me.stars + (['rocket', 'bomb', 'sticky', 'firebomb', 'flame'].includes(w.type) ? 0.55 : 0.18));
    me.wantedT = 12;
    const origin = {
      x: me.x + Math.sin(me.yaw) * 0.55,
      z: me.z + Math.cos(me.yaw) * 0.55
    };
    if (w.type === 'melee') return meleeHit(me, w);
    if (w.type === 'flame') return flameBurst(me, w);
    if (w.type === 'spread') {
      for (let i = 0; i < (w.pellets || 6); i++) spawnProjectile(me, w, me.yaw + (Math.random() - 0.5) * 0.5, origin);
      return;
    }
    spawnProjectile(me, w, me.yaw, origin);
  }

  function spawnProjectile(owner, w, yaw, origin) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(w.type === 'rocket' ? 0.09 : 0.055, 10, 8),
      new THREE.MeshStandardMaterial({ color: w.color, emissive: w.color, emissiveIntensity: 0.35, roughness: 0.35 })
    );
    fxRoot.add(mesh);
    projectiles.push({
      x: origin.x,
      z: origin.z,
      ox: origin.x,
      oz: origin.z,
      vx: Math.sin(yaw) * (w.speed || 14),
      vz: Math.cos(yaw) * (w.speed || 14),
      yaw,
      t: 1.8,
      owner: owner.id,
      weapon: w.id,
      stuck: false,
      mesh
    });
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const w = weaponById[p.weapon];
      if (!w) {
        removeProjectile(i);
        continue;
      }
      p.t -= dt;
      if (p.stuck) {
        p.mesh.position.set(p.x, 0.18, p.z);
        if (p.t <= 0) {
          explode(p.x, p.z, w.radius || 2.8, w.dmg || 80, p.weapon);
          removeProjectile(i);
        }
        continue;
      }
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, 0.45, p.z);
      p.mesh.rotation.y = p.yaw;
      const travel = Math.hypot(p.x - p.ox, p.z - p.oz);
      if (travel > (w.range || 9) || p.t <= 0 || insideBuilding(p.x, p.z, 0.08)) {
        if (['rocket', 'bomb', 'firebomb', 'fireball'].includes(w.type)) explode(p.x, p.z, w.radius || 2.4, w.dmg || 50, p.weapon);
        if (w.type === 'sticky' && !insideBuilding(p.x, p.z, 0.08)) {
          p.stuck = true;
          p.vx = 0;
          p.vz = 0;
          p.t = 1.25;
          continue;
        }
        removeProjectile(i);
        continue;
      }
      const hit = hitActor(p.x, p.z, w.type === 'rocket' ? 0.52 : 0.28);
      if (hit) {
        if (['rocket', 'bomb', 'firebomb', 'fireball'].includes(w.type)) explode(p.x, p.z, w.radius || 2.4, w.dmg || 50, p.weapon);
        else if (w.type === 'sticky') {
          p.stuck = true;
          p.vx = 0;
          p.vz = 0;
          p.t = 1.05;
          continue;
        } else {
          damageActor(hit, w.dmg, w.type, p);
        }
        removeProjectile(i);
      } else if (w.type === 'rocket' && Math.random() < dt * 20) {
        spark(p.x, p.z, COLORS.orange);
      }
    }
  }

  function removeProjectile(i) {
    disposeObject(projectiles[i].mesh);
    projectiles.splice(i, 1);
  }

  function hitActor(x, z, r) {
    let best = null;
    let bd = r;
    for (const n of npcs) {
      if (n.dead) continue;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    for (const c of cops) {
      if (c.dead) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  function damageActor(a, dmg, kind, src) {
    if (!a || a.dead) return;
    a.hp -= dmg;
    a.panic = Math.max(a.panic || 0, kind === 'fire' ? 2.2 : 1.2);
    if (kind === 'fire' || kind === 'fireball') a.burn = Math.max(a.burn || 0, 2.6);
    if (kind === 'stun') a.stun = Math.max(a.stun || 0, 1.8);
    if (kind === 'foam') a.foam = Math.max(a.foam || 0, 3.0);
    if (kind === 'push' && src) {
      const dx = a.x - src.x;
      const dz = a.z - src.z;
      const d = Math.hypot(dx, dz) || 1;
      moveThing(a, dx / d * 0.5, dz / d * 0.5, 0.2);
    }
    if (src) {
      const dx = a.x - src.x;
      const dz = a.z - src.z;
      const d = Math.hypot(dx, dz) || 1;
      moveThing(a, dx / d * 0.18, dz / d * 0.18, 0.2);
    }
    spark(a.x, a.z, kind === 'fire' || kind === 'fireball' ? COLORS.orange : kind === 'stun' ? COLORS.aqua : kind === 'paint' ? 0xb66bff : COLORS.red);
    if (a.hp <= 0) {
      a.dead = true;
      floating.push(makeFloating(a.x, a.z, kind === 'fire' ? 'BURNED' : ['bomb', 'rocket', 'sticky'].includes(kind) ? 'BOOM' : 'DOWN', COLORS.red));
    }
  }

  function explode(x, z, radius, dmg, kind) {
    for (let i = 0; i < 38; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      spawnParticle(x, z, Math.sin(a) * (1.5 + r * 4), Math.cos(a) * (1.5 + r * 4), 0.5 + Math.random() * 0.5, i % 2 ? COLORS.orange : COLORS.gold);
    }
    for (const n of npcs) {
      if (n.dead) continue;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d < radius) damageActor(n, dmg * (1 - d / radius), kind === 'firebomb' ? 'fire' : kind, { x, z });
    }
    for (const c of cops) {
      if (c.dead) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < radius) damageActor(c, dmg * (1 - d / radius), kind === 'firebomb' ? 'fire' : kind, { x, z });
    }
    if (kind === 'molotov' || kind === 'flare') fireZones.push({ x, z, r: radius * 0.75, t: 4.2 });
  }

  function flameBurst(me, w) {
    for (let i = 0; i < 8; i++) {
      const yaw = me.yaw + (Math.random() - 0.5) * 0.46;
      const d = 0.8 + Math.random() * w.range;
      const x = me.x + Math.sin(yaw) * d;
      const z = me.z + Math.cos(yaw) * d;
      spawnParticle(me.x, me.z, Math.sin(yaw) * (3.5 + Math.random() * 4.8), Math.cos(yaw) * (3.5 + Math.random() * 4.8), 0.28 + Math.random() * 0.22, COLORS.orange);
      const hit = hitActor(x, z, 0.68);
      if (hit) damageActor(hit, w.dmg, 'fire', { x: me.x, z: me.z });
    }
  }

  function meleeHit(me, w) {
    let hit = null;
    let bd = w.range || 1.1;
    for (const n of npcs) {
      if (n.dead) continue;
      const d = Math.hypot(n.x - me.x, n.z - me.z);
      const dot = ((n.x - me.x) * Math.sin(me.yaw) + (n.z - me.z) * Math.cos(me.yaw)) / (d || 1);
      if (d < bd && dot > 0.35) {
        bd = d;
        hit = n;
      }
    }
    for (const c of cops) {
      if (c.dead) continue;
      const d = Math.hypot(c.x - me.x, c.z - me.z);
      const dot = ((c.x - me.x) * Math.sin(me.yaw) + (c.z - me.z) * Math.cos(me.yaw)) / (d || 1);
      if (d < bd && dot > 0.35) {
        bd = d;
        hit = c;
      }
    }
    if (hit) damageActor(hit, w.dmg, 'melee', { x: me.x, z: me.z });
    for (let i = 0; i < 8; i++) spark(me.x + Math.sin(me.yaw) * 0.7, me.z + Math.cos(me.yaw) * 0.7, w.color);
  }

  function updateFireZones(dt) {
    for (let i = fireZones.length - 1; i >= 0; i--) {
      const f = fireZones[i];
      f.t -= dt;
      if (Math.random() < dt * 20) spark(f.x + (Math.random() - 0.5) * f.r, f.z + (Math.random() - 0.5) * f.r, COLORS.orange);
      for (const n of npcs) if (!n.dead && Math.hypot(n.x - f.x, n.z - f.z) < f.r) damageActor(n, 10 * dt, 'fire', f);
      for (const c of cops) if (!c.dead && Math.hypot(c.x - f.x, c.z - f.z) < f.r) damageActor(c, 8 * dt, 'fire', f);
      if (f.t <= 0) fireZones.splice(i, 1);
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t -= dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;
      p.vy -= 3.5 * dt;
      p.mesh.position.set(p.x, Math.max(0.06, p.y), p.z);
      p.mesh.material.opacity = clamp(p.t * 2, 0, 1);
      if (p.t <= 0) {
        disposeObject(p.mesh);
        particles.splice(i, 1);
      }
    }
    for (let i = floating.length - 1; i >= 0; i--) {
      const f = floating[i];
      f.t -= dt;
      f.sprite.position.y += dt * 0.8;
      f.sprite.material.opacity = clamp(f.t, 0, 1);
      if (f.t <= 0) {
        disposeObject(f.sprite);
        floating.splice(i, 1);
      }
    }
  }

  function action() {
    const me = players.get(localId);
    if (!me) return;
    if (me.vehicleId) {
      const v = vehicles.find(item => item.id === me.vehicleId);
      if (v) v.driverId = null;
      me.vehicleId = null;
      me.x += Math.sin(me.yaw + Math.PI / 2) * 0.8;
      me.z += Math.cos(me.yaw + Math.PI / 2) * 0.8;
      toast(me.name + ' exits the ride.');
      return;
    }
    let best = null;
    let bd = 1.45;
    for (const v of vehicles) {
      if (v.driverId || v.dead) continue;
      const d = Math.hypot(me.x - v.x, me.z - v.z);
      if (d < bd) {
        bd = d;
        best = v;
      }
    }
    if (best) {
      me.vehicleId = best.id;
      best.driverId = me.id;
      me.stars = Math.min(5, me.stars + 0.35);
      me.wantedT = 8;
      toast(me.name + ' borrows a ' + (best.type === 'bike' ? 'bike' : best.type === 'swamp' ? 'swamp buggy' : 'supercar') + '.');
    } else if (activeJob) {
      toast(activeJob.label);
    }
  }

  function honk() {
    const me = players.get(localId);
    if (!me) return;
    me.stars = Math.min(5, me.stars + 0.1);
    me.wantedT = 5;
    toast('HONK. A tiny crime, emotionally.');
    for (let i = 0; i < 8; i++) spark(me.x, me.z, i % 2 ? COLORS.pink : COLORS.gold);
  }

  function nextJob() {
    activeJob = jobs[(jobs.indexOf(activeJob) + 1) % jobs.length];
    toast(activeJob.label);
  }

  function buildWeaponWheel() {
    const wheel = $('weaponWheelInner');
    wheel.querySelectorAll('.slot').forEach(n => n.remove());
    const me = players.get(localId);
    WEAPONS.forEach((w, i) => {
      const btn = document.createElement('button');
      btn.className = 'slot';
      btn.style.setProperty('--ang', (i / WEAPONS.length * 360) + 'deg');
      btn.innerHTML = `<b>${w.name}</b><small>${w.type.toUpperCase()}</small>`;
      if (me?.weapon === w.id) btn.classList.add('sel');
      if (me?.weapons?.includes(w.id)) btn.classList.add('carry');
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        chooseWeapon(w.id);
        closeWeaponWheel();
      });
      wheel.appendChild(btn);
    });
    updateWeaponHub();
  }

  function chooseWeapon(id) {
    const me = players.get(localId);
    if (!me || !weaponById[id]) return;
    if (!me.weapons.includes(id)) {
      while (me.weapons.length >= 3) me.weapons.shift();
      me.weapons.push(id);
    }
    me.weapon = id;
    toast('Equipped ' + weaponById[id].name + '.');
    buildWeaponWheel();
  }

  function cycleCarry(dir) {
    const me = players.get(localId);
    if (!me || !me.weapons.length) return;
    const i = me.weapons.indexOf(me.weapon);
    me.weapon = me.weapons[(i + dir + me.weapons.length) % me.weapons.length];
    toast('Equipped ' + weaponById[me.weapon].name + '.');
    buildWeaponWheel();
  }

  function updateWeaponHub() {
    const me = players.get(localId);
    const names = (me?.weapons || []).map(id => weaponById[id]?.name || id).join('<br>');
    $('weaponHub').innerHTML = `CARRY ${me?.weapons?.length || 0}/3<br>${names || 'SELECT TOOL'}`;
  }

  function toggleWeaponWheel() {
    if ($('weaponWheel').classList.contains('on')) closeWeaponWheel();
    else {
      buildWeaponWheel();
      $('weaponWheel').classList.add('on');
    }
  }

  function closeWeaponWheel() {
    $('weaponWheel').classList.remove('on');
  }

  function updateHud(me) {
    const role = localRole.toUpperCase();
    if (hudCache.role !== role) {
      hudCache.role = role;
      $('role').textContent = role;
    }
    const vehicle = me.vehicleId ? vehicles.find(v => v.id === me.vehicleId) : null;
    const stats = `CASH <b>$${Math.floor(me.cash)}</b>  HEAT <b>${me.stars.toFixed(1)}</b>  HP <b>${Math.floor(me.hp)}%</b><br>${vehicle ? 'RIDE <b>' + vehicle.type.toUpperCase() + '</b>' : 'ON FOOT'}  TOOL <b>${weaponById[me.weapon]?.name || me.weapon}</b>  ROOM <b>${roomCode || 'SOLO'}</b>`;
    if (hudCache.stats !== stats) {
      hudCache.stats = stats;
      $('stats').innerHTML = stats;
    }
    const objective = activeJob ? activeJob.label : 'Choose a job.';
    if (hudCache.objective !== objective) {
      hudCache.objective = objective;
      $('objective').textContent = objective;
    }
    drawMini();
  }

  function drawMini() {
    if (mini.classList.contains('hidden')) return;
    miniCtx.clearRect(0, 0, mini.width, mini.height);
    miniCtx.fillStyle = '#08101a';
    miniCtx.fillRect(0, 0, mini.width, mini.height);
    const sx = mini.width / MAP.w;
    const sz = mini.height / MAP.h;
    miniCtx.fillStyle = 'rgba(255,255,255,0.13)';
    for (const b of BUILDINGS) miniCtx.fillRect(b.x * sx, b.z * sz, b.w * sx, b.d * sz);
    if (activeJob) {
      miniCtx.fillStyle = colorHex(activeJob.color);
      miniCtx.fillRect(activeJob.tx * sx - 4, activeJob.tz * sz - 4, 8, 8);
    }
    for (const p of players.values()) {
      miniCtx.fillStyle = colorHex(p.color);
      miniCtx.fillRect(p.x * sx - 3, p.z * sz - 3, 6, 6);
    }
    miniCtx.fillStyle = '#6fb6ff';
    for (const c of cops) if (!c.dead) miniCtx.fillRect(c.x * sx - 2, c.z * sz - 2, 4, 4);
  }

  function readGamepad(dt) {
    input.gamepadX = 0;
    input.gamepadY = 0;
    let move = { x: 0, y: 0 };
    let look = { x: 0, y: 0 };
    const raw = readRawGamepad();
    if (raw?.rightJoyCon) {
      look = raw.primary;
    } else if (window.OmenlyGamepad) {
      const GP = window.OmenlyGamepad;
      GP.poll();
      move = GP.axis(0);
      look = GP.axis(1);
      if (GP.pressed('a')) action();
      if (GP.pressed('rt') || GP.pressed('x')) fireWeapon();
      if (GP.pressed('b')) cycleCarry(1);
      if (GP.pressed('y')) toggleWeaponWheel();
      if (GP.button('rb')) input.boostButton = true;
      if (GP.pressed('lb')) nextJob();
      if (GP.pressed('start')) honk();
    } else if (raw) {
      move = raw.primary;
      look = raw.secondary;
    }
    input.gamepadX = move.x || 0;
    input.gamepadY = move.y || 0;
    input.lookStickX += (look.x || 0) * dt * 18;
    input.lookStickY += (look.y || 0) * dt * 18;
    if (!look.x) input.lookStickX *= Math.pow(0.02, dt);
    if (!look.y) input.lookStickY *= Math.pow(0.02, dt);
    input.lookStickX = clamp(input.lookStickX, -1, 1);
    input.lookStickY = clamp(input.lookStickY, -1, 1);
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
    const primary = { x: applyGamepadDeadzone(a[0] || 0), y: applyGamepadDeadzone(a[1] || 0) };
    const secondary = { x: applyGamepadDeadzone(a[2] || 0), y: applyGamepadDeadzone(a[3] || 0) };
    return { id, primary, secondary, rightJoyCon: id.includes('joy-con') && id.includes('(r)') && a.length < 4 };
  }

  function bindStick(el, knob, cb) {
    let id = null;
    function set(x, y) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = x - cx;
      let dy = y - cy;
      const max = r.width * 0.38;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = dx / len * max;
        dy = dy / len * max;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      cb(dx / max, dy / max);
    }
    function end(e) {
      if (id !== e.pointerId) return;
      id = null;
      knob.style.transform = '';
      cb(0, 0);
    }
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      set(e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', e => {
      if (id !== e.pointerId) return;
      e.preventDefault();
      set(e.clientX, e.clientY);
    });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function bindLookStick() {
    const el = $('lookStick');
    const knob = el.querySelector('.knob');
    let id = null;
    let ox = 0;
    let oy = 0;
    const max = 42;
    function set(dx, dy) {
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = dx / len * max;
        dy = dy / len * max;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      input.lookStickX = dx / max;
      input.lookStickY = dy / max;
    }
    function end(e) {
      if (id !== e.pointerId) return;
      id = null;
      knob.style.transform = '';
      input.lookStickX = 0;
      input.lookStickY = 0;
    }
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      id = e.pointerId;
      ox = e.clientX;
      oy = e.clientY;
      el.setPointerCapture(e.pointerId);
      set(0, 0);
    });
    el.addEventListener('pointermove', e => {
      if (id !== e.pointerId) return;
      e.preventDefault();
      set(e.clientX - ox, e.clientY - oy);
    });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function updateNetwork(dt, me) {
    netT += dt;
    if (netT < 0.09) return;
    netT = 0;
    if (isHost) {
      broadcast({ t: 'snap', players: packPlayers(), vehicles: packVehicles(), job: activeJob?.id || null });
    } else if (hostConn?.open) {
      hostConn.send({ t: 'input', p: packPlayer(me) });
    }
  }

  function packPlayer(p) {
    return {
      id: p.id,
      name: p.name,
      x: p.x,
      z: p.z,
      vx: p.vx,
      vz: p.vz,
      yaw: p.yaw,
      hp: p.hp,
      cash: p.cash,
      stars: p.stars,
      wantedT: p.wantedT,
      color: p.color,
      vehicleId: p.vehicleId,
      weapons: p.weapons.slice(),
      weapon: p.weapon
    };
  }

  function packPlayers() {
    return [...players.values()].map(packPlayer);
  }

  function packVehicles() {
    return vehicles.map(v => ({ id: v.id, x: v.x, z: v.z, yaw: v.yaw, type: v.type, color: v.color, vx: v.vx, vz: v.vz, driverId: v.driverId, hp: v.hp }));
  }

  function packWorld() {
    return { vehicles: packVehicles() };
  }

  function unpackWorld(w) {
    if (w?.vehicles) unpackVehicles(w.vehicles);
  }

  function unpackPlayers(arr) {
    if (!Array.isArray(arr)) return;
    for (const data of arr) applyRemotePlayer(data);
  }

  function applyRemotePlayer(data) {
    let p = players.get(data.id);
    if (!p) {
      p = makePlayer(data.id, data.name || data.id, data.x || s(560), data.z || s(2010), data.color || COLORS.gold, data.id === localId);
      players.set(data.id, p);
    }
    const mesh = p.mesh;
    Object.assign(p, data);
    p.mesh = mesh;
    p.local = p.id === localId;
  }

  function unpackVehicles(arr) {
    if (!Array.isArray(arr) || !arr.length) return;
    for (const data of arr) {
      let v = vehicles.find(item => item.id === data.id);
      if (!v) {
        v = { ...data, mesh: makeVehicleMesh(data.type || 'car', data.color || COLORS.pink) };
        vehicles.push(v);
        actorRoot.add(v.mesh);
      }
      const mesh = v.mesh;
      Object.assign(v, data);
      v.mesh = mesh;
    }
  }

  function broadcast(msg) {
    for (const c of conns) {
      try {
        if (c.open) c.send(msg);
      } catch (_) {}
    }
  }

  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += chars[(Math.random() * chars.length) | 0];
    return out;
  }

  function startBeat() {
    if (beatOn) return;
    beatOn = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = beat || new AC();
      beat = ac;
      const master = ac.createGain();
      master.gain.value = 0.035;
      master.connect(ac.destination);
      let step = 0;
      function tick() {
        if (!beatOn) return;
        const t = ac.currentTime;
        const kick = ac.createOscillator();
        const kg = ac.createGain();
        kick.frequency.setValueAtTime(step % 4 === 0 ? 82 : 56, t);
        kick.frequency.exponentialRampToValueAtTime(32, t + 0.08);
        kg.gain.setValueAtTime(step % 4 === 0 ? 1.0 : 0.55, t);
        kg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        kick.connect(kg).connect(master);
        kick.start(t);
        kick.stop(t + 0.13);
        step++;
        setTimeout(tick, 165);
      }
      ac.resume?.();
      tick();
    } catch (_) {}
  }

  function makeTextSprite(text, color, bg, w = 240, h = 70) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg || 'rgba(9,8,22,0.82)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = color;
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(material);
  }

  function makeFloating(x, z, text, color) {
    const sprite = makeTextSprite(text, colorHex(color), 'rgba(9,8,22,0.55)', 160, 50);
    sprite.position.set(x, 1.3, z);
    sprite.scale.set(1.2, 0.38, 1);
    fxRoot.add(sprite);
    return { sprite, t: 1.4 };
  }

  function spark(x, z, color) {
    spawnParticle(x, z, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 2.2, 0.55, color);
  }

  function spawnParticle(x, z, vx, vz, t, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
    );
    mesh.position.set(x, 0.35, z);
    fxRoot.add(mesh);
    particles.push({ x, z, y: 0.35, vx, vz, vy: 1 + Math.random() * 2.3, t, mesh });
  }

  function insideBuilding(x, z, r) {
    return BUILDINGS.some(b => circleRect(x, z, r, b));
  }

  function circleRect(cx, cz, cr, r) {
    const x = clamp(cx, r.x, r.x + r.w);
    const z = clamp(cz, r.z, r.z + r.d);
    return Math.hypot(cx - x, cz - z) < cr;
  }

  function limitVelocity(v, max) {
    const sp = Math.hypot(v.vx, v.vz);
    if (sp > max) {
      v.vx = v.vx / sp * max;
      v.vz = v.vz / sp * max;
    }
  }

  function applyGamepadDeadzone(v) {
    if (Math.abs(v) < GAMEPAD_DEADZONE) return 0;
    const sign = v < 0 ? -1 : 1;
    return sign * (Math.abs(v) - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE);
  }

  function colorHex(color) {
    return '#' + color.toString(16).padStart(6, '0');
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function lerpAngle(a, b, t) {
    return a + wrapAngle(b - a) * t;
  }

  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isTouch ? 1.35 : 1.7));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }

  function disposeChildren(group) {
    for (const child of group.children.slice()) disposeObject(child);
  }

  function disposeObject(obj) {
    if (!obj) return;
    obj.traverse?.(node => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (node.material.map) node.material.map.dispose();
        if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
        else node.material.dispose();
      }
    });
    obj.parent?.remove(obj);
  }

  function toast(msg) {
    $('toast').textContent = msg;
    $('toast').classList.add('on');
    toastT = 2.4;
  }

  function loop(now) {
    let dt = Math.min(0.05, (now - last) / 1000 || 0);
    if (document.hidden) dt = 0;
    last = now;
    if (mode === 'play') update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
})();
