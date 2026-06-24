// The Revenge — Yaari Town. Iqbal must lose a limb, then the rest.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────
const STREET_LEN  = 220;
const STREET_WIDE = 16;
const HERO_SPEED  = 5.2;
const HERO_RUN    = 8.6;
const HERO_MAX_HP = 120;
const GOON_HP     = 35;
const GOON_DMG    = 8;
const BOSS_HP     = 600;
const BOSS_DMG    = 18;
const AK_DMG      = 18;
const AK_RPM      = 720;
const AK_MAG      = 30;
const AK_RANGE    = 120;
const SICKLE_DMG  = 55;
const SICKLE_SPEED = 38;
const SICKLE_RANGE = 60;
const DYN_DMG     = 95;
const DYN_RADIUS  = 9;
const DYN_FUSE    = 2.4;
const CIG_DUR     = 60.0;
const CIG_COOLDOWN = 25.0;
const CIG_SLOW    = 0.4;

// ─────────────────────────────────────────────────────────────────────────
// Asset paths
// ─────────────────────────────────────────────────────────────────────────
const ASSETS = {
  hero: 'assets/hero.glb',
  iqbalBefore: 'assets/iqbalbeforesickle.glb',
  iqbalAfter: 'assets/iqbalaftersickle.glb',
  goon: 'assets/normalgoon.glb',
  ak47: 'assets/ak47.glb',
  sickle: 'assets/sickletool.glb',
  dynamite: 'assets/dynamite.glb',
  cig: 'assets/cigerette.glb'
};

const FBX_ANIMS = {
  walk: 'assets/heroWalkinganimation.fbx',
  walkGun: 'assets/hero_walk_gun.fbx',
  throwDyn: 'assets/hero_throw_dyn.fbx',
  throwGrenade: 'assets/grenade_throw.fbx'
};

// ─────────────────────────────────────────────────────────────────────────
// DOM
// ─────────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const canvas = $('game');
let loading, loadText, menu, hud, weaponBar, comms, crosshair, promptEl, toastEl, damageVignette, slowmoVignette;
let pauseModal, completeModal, failedModal, introOverlay, introA, introB, skipIntroBtn;
let healthFill, bossBar, bossFill, cigBar, cigFill, statsEl, objectiveList, bgm;

// Resolve after DOM ready
function resolveDOM() {
  loading = $('loading'); loadText = $('loadText');
  menu = $('menu'); hud = $('hud'); weaponBar = $('weaponBar');
  comms = $('comms'); crosshair = $('crosshair'); promptEl = $('prompt');
  toastEl = $('toast'); damageVignette = $('damageVignette');
  slowmoVignette = $('slowmoVignette');
  pauseModal = $('pause'); completeModal = $('complete'); failedModal = $('failed');
  introOverlay = $('intro'); introA = $('introA'); introB = $('introB');
  skipIntroBtn = $('skipIntro');
  healthFill = $('healthFill'); bossBar = $('bossBar'); bossFill = $('bossFill');
  cigBar = $('cigBar'); cigFill = $('cigFill');
  statsEl = $('stats'); objectiveList = $('objectiveList');
  bgm = $('bgm');
}
resolveDOM();

const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches || ('ontouchstart' in window) || innerWidth <= 820;
if (isTouch) document.body.classList.add('touch');

// ─────────────────────────────────────────────────────────────────────────
// Renderer / scene / camera
// ─────────────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.38;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd0ff);
scene.fog = new THREE.Fog(0xbfe9ff, 140, 420);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
camera.position.set(0, 6, -10);

function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', onResize); onResize();

// ─────────────────────────────────────────────────────────────────────────
// Lights
// ─────────────────────────────────────────────────────────────────────────
const hemi = new THREE.HemisphereLight(0xffffff, 0x8fb06a, 1.85);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff4c7, 3.0);
sun.position.set(-45, 95, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
sun.shadow.bias = -0.0008;
scene.add(sun);

const amber = new THREE.PointLight(0xffffff, 0.18, 50, 2);
amber.position.set(0, 8, 0);
scene.add(amber);

// ─────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────
const v3 = (x,y,z) => new THREE.Vector3(x,y,z);
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const lerp = (a,b,t)=>a+(b-a)*t;
const rand = (a,b)=>a+Math.random()*(b-a);

function makeCanvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function showToast(msg, ms=2200) {
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(()=>toastEl.classList.remove('on'), ms);
}

function showPrompt(msg) {
  if (msg) { promptEl.textContent = msg; promptEl.classList.add('on'); }
  else promptEl.classList.remove('on');
}

function flashDamage() {
  damageVignette.style.opacity = '1';
  setTimeout(()=>damageVignette.style.opacity = '0', 220);
}

// Procedural audio keeps the build self-contained when no SFX files are supplied.
let audioCtx = null;
function getAudioCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  return audioCtx;
}

function playTone({ freq = 220, endFreq = freq, type = 'sine', duration = 0.2, gain = 0.08, when = 0, detune = 0, attack = 0.005 }) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.03);
}

function playNoise({ duration = 0.12, gain = 0.08, when = 0, lowpass = 3000 }) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(lowpass, t);
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.buffer = buffer;
  src.connect(filter).connect(amp).connect(ctx.destination);
  src.start(t);
  src.stop(t + duration);
}

function playGunshot() {
  playNoise({ duration: 0.07, gain: 0.11, lowpass: 5200 });
  playTone({ freq: 90, endFreq: 42, type: 'square', duration: 0.08, gain: 0.05 });
}

function playEnemyMoan() {
  playTone({ freq: rand(165, 210), endFreq: rand(62, 86), type: 'sawtooth', duration: 0.65, gain: 0.06 });
  playTone({ freq: rand(95, 120), endFreq: rand(42, 58), type: 'triangle', duration: 0.8, gain: 0.045, when: 0.05 });
}

function playSickleSound() {
  playNoise({ duration: 0.18, gain: 0.035, lowpass: 7400 });
  playTone({ freq: 920, endFreq: 260, type: 'sine', duration: 0.24, gain: 0.045 });
}

function playSickleCatchSound() {
  playTone({ freq: 360, endFreq: 210, type: 'triangle', duration: 0.1, gain: 0.035 });
}

function playIqbalCutScream() {
  playTone({ freq: 520, endFreq: 180, type: 'sawtooth', duration: 1.15, gain: 0.09 });
  playTone({ freq: 760, endFreq: 220, type: 'triangle', duration: 0.85, gain: 0.055, when: 0.04, detune: -18 });
  playNoise({ duration: 0.55, gain: 0.045, when: 0.08, lowpass: 1800 });
}

function pulseReticle() {
  if (!crosshair) return;
  crosshair.classList.remove('fire');
  void crosshair.offsetWidth;
  crosshair.classList.add('fire');
}

// ─────────────────────────────────────────────────────────────────────────
// Loaders
// ─────────────────────────────────────────────────────────────────────────
const glLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

function loadGLB(key) {
  return new Promise((res, rej) => {
    glLoader.load(ASSETS[key], gltf => res(gltf), undefined, err => rej(err));
  });
}

function loadFBX(key) {
  return new Promise((res, rej) => {
    fbxLoader.load(FBX_ANIMS[key], obj => res(obj), undefined, err => rej(err));
  });
}

async function loadAllGLBs() {
  const keys = Object.keys(ASSETS);
  loadText.textContent = 'Loading assets…';
  const out = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    loadText.textContent = `Loading ${k}… (${i+1}/${keys.length})`;
    try { out[k] = await loadGLB(k); }
    catch (e) { console.warn('asset failed', k, e); out[k] = null; }
  }
  return out;
}

async function loadAllFBXs() {
  const keys = Object.keys(FBX_ANIMS);
  loadText.textContent = 'Loading animations…';
  const out = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    loadText.textContent = `Loading FBX ${k}… (${i+1}/${keys.length})`;
    try { out[k] = await loadFBX(k); }
    catch (e) { console.warn('fbx failed', k, e); out[k] = null; }
  }
  return out;
}

async function loadFBXKeys(keys, label='Loading animations') {
  const out = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    loadText.textContent = `${label}: ${k}... (${i+1}/${keys.length})`;
    try { out[k] = await loadFBX(k); }
    catch (e) { console.warn('fbx failed', k, e); out[k] = null; }
  }
  return out;
}

async function loadDeferredAnimationKeys(keys) {
  for (const k of keys) {
    if (fbxRigs[k]) continue;
    try {
      const fbx = await loadFBX(k);
      fbxRigs[k] = fbx;
      const clip = extractClips({ [k]: fbx })[k];
      if (!clip) continue;
      animClips[k] = clip;
      if (hero) hero.addAnimationClip(k, clip);
    } catch (e) {
      console.warn('deferred fbx failed', k, e);
    }
  }
}

function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ]);
}

// Extract animation clips from loaded FBX objects
function extractClips(fbxAnims) {
  const clips = {};
  for (const [key, fbx] of Object.entries(fbxAnims)) {
    if (!fbx || !fbx.animations || !fbx.animations.length) continue;
    // Take the first animation clip from each FBX
    clips[key] = fbx.animations[0].clone();
    console.log(`Animation "${key}" → clip "${fbx.animations[0].name}" (${fbx.animations[0].duration.toFixed(1)}s)`);
  }
  return clips;
}

// Clone / helper
function cloneObject3D(obj, opts={}) {
  if (!obj) return null;
  const root = findSkinnedMeshes(obj).length ? cloneSkeleton(obj) : obj.clone(true);
  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      if (opts.clone_materials) {
        if (Array.isArray(o.material)) o.material = o.material.map(m=>m.clone());
        else o.material = o.material.clone();
      }
    }
  });
  return root;
}

function cloneGLBScene(gltf, opts={}) {
  if (!gltf || !gltf.scene) return null;
  return cloneObject3D(gltf.scene, opts);
}

function fitHeight(obj, targetH) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  if (size.y <= 0.0001) return;
  const s = targetH / size.y;
  obj.scale.multiplyScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box2.min.y;
}

// ─────────────────────────────────────────────────────────────────────────
// Skeleton / bone utilities
// ─────────────────────────────────────────────────────────────────────────
function findSkinnedMeshes(obj, out=[]) {
  obj.traverse(o => { if (o.isSkinnedMesh) out.push(o); });
  return out;
}

function findBone(obj, namePart) {
  // search by partial name match (case-insensitive)
  let found = null;
  obj.traverse(o => {
    if (!found && o.isBone && o.name.toLowerCase().includes(namePart.toLowerCase())) {
      found = o;
    }
  });
  return found;
}

function findSkeleton(obj) {
  const skins = findSkinnedMeshes(obj);
  if (skins.length) return skins[0].skeleton;
  return null;
}

function logBones(obj) {
  const bones = [];
  obj.traverse(o => { if (o.isBone) bones.push(o.name); });
  console.log('Bones found:', bones);
  return bones;
}

function cleanBoneName(name) {
  return String(name || '')
    .replace(/^.*\|/, '')
    .replace(/^.*:/, '')
    .replace(/^mixamorig/i, '')
    .replace(/^armature/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function buildRigBoneMap(root) {
  const map = new Map();
  root.traverse(o => {
    if (!o.isBone) return;
    const names = [
      o.name,
      o.name.replace(/^mixamorig[:_]?/i, ''),
      o.name.replace(/^.*:/, ''),
      o.name.replace(/^.*\|/, '')
    ];
    for (const n of names) {
      const key = cleanBoneName(n);
      if (key && !map.has(key)) map.set(key, o);
    }
  });
  return map;
}

function remapClipToRig(clip, rigRoot) {
  const boneMap = buildRigBoneMap(rigRoot);
  const tracks = [];
  let remapped = 0;
  let kept = 0;
  let dropped = 0;

  for (const track of clip.tracks) {
    const dot = track.name.lastIndexOf('.');
    if (dot === -1) {
      tracks.push(track.clone());
      kept++;
      continue;
    }

    const nodeName = track.name.slice(0, dot);
    const propertyName = track.name.slice(dot + 1);
    const bone = boneMap.get(cleanBoneName(nodeName));

    if (bone) {
      const cloned = track.clone();
      cloned.name = `${bone.name}.${propertyName}`;
      tracks.push(cloned);
      remapped++;
      continue;
    }

    if (propertyName === 'scale') {
      dropped++;
      continue;
    }

    tracks.push(track.clone());
    kept++;
  }

  const out = new THREE.AnimationClip(clip.name || 'fbx', clip.duration, tracks);
  out.userData = { source: clip.name, remapped, kept, dropped };
  console.log(`Rig clip "${clip.name}" tracks: ${remapped} remapped, ${kept} kept, ${dropped} dropped`);
  return out;
}

function prepareRigClips(animClips, rigRoot) {
  const clips = {};
  for (const [key, clip] of Object.entries(animClips || {})) {
    clips[key] = remapClipToRig(clip, rigRoot);
  }
  return clips;
}

function selectHeroBody(gltfHero) {
  if (gltfHero && gltfHero.scene && findSkeleton(gltfHero.scene)) {
    console.log('Using rigged hero.glb body');
    return gltfHero.scene;
  }

  const rigSource = fbxRigs.walkGun || fbxRigs.walk || fbxRigs.throwDyn || fbxRigs.throwGrenade;
  if (rigSource && findSkeleton(rigSource)) {
    console.warn('hero.glb has no skeleton/skin; using rigged FBX hero body for animation.');
    return cloneObject3D(rigSource);
  }

  console.warn('No rigged hero body found; using fallback humanoid.');
  return makeFallbackHumanoid(0x2f6f5e);
}

// ─────────────────────────────────────────────────────────────────────────
// World: Yaari Town
// ─────────────────────────────────────────────────────────────────────────
const world = new THREE.Group();
scene.add(world);

const colliders = [];
function addCollider(minX, maxX, minZ, maxZ) {
  colliders.push({ minX, maxX, minZ, maxZ });
}
function collidesAt(x, z, r=0.6) {
  for (const c of colliders) {
    if (x+r > c.minX && x-r < c.maxX && z+r > c.minZ && z-r < c.maxZ) return c;
  }
  return null;
}

function makeStreetMaterial() {
  const tex = makeCanvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#77705f'; g.fillRect(0,0,w,h);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random()*w, y = Math.random()*h;
      const r = 2 + Math.random()*3.5;
      g.fillStyle = `rgba(${110+Math.random()*60},${96+Math.random()*48},${72+Math.random()*38},${0.32+Math.random()*0.28})`;
      g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
    }
    g.fillStyle = '#e7d277';
    for (let y = 0; y < h; y += 80) g.fillRect(w/2-3, y+25, 6, 30);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 30);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
}

function makeUrduMural() {
  return makeCanvasTexture(1024, 512, (g, w, h) => {
    g.fillStyle = '#2c5f7f'; g.fillRect(0,0,w,h);
    const grad = g.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,'#3b7393'); grad.addColorStop(1,'#1f4358');
    g.fillStyle = grad; g.fillRect(0,0,w,h);
    g.strokeStyle = '#f0d3a0'; g.fillStyle = '#f0d3a0'; g.lineWidth = 4;
    function boat(cx, cy, scale) {
      g.beginPath();
      g.moveTo(cx-50*scale, cy);
      g.quadraticCurveTo(cx, cy+24*scale, cx+50*scale, cy);
      g.lineTo(cx+38*scale, cy+8*scale);
      g.lineTo(cx-38*scale, cy+8*scale);
      g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy-60*scale); g.stroke();
      g.beginPath();
      g.moveTo(cx+2, cy-60*scale);
      g.lineTo(cx+44*scale, cy-10*scale);
      g.lineTo(cx+2, cy-10*scale);
      g.closePath(); g.fill();
    }
    boat(160, 360, 1); boat(420, 380, 0.8); boat(620, 360, 0.9);
    g.strokeStyle = 'rgba(240,211,160,0.5)'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(80, 410+i*8);
      g.bezierCurveTo(280, 405+i*8, 520, 415+i*8, 740, 410+i*8);
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(60, 50, 360, 90);
    g.fillStyle = '#f0d3a0';
    g.font = 'italic bold 42px Georgia, serif';
    g.fillText('YAARI', 90, 105);
    g.font = 'italic 22px Georgia, serif';
    g.fillText('HAMARI PEHCHAAN', 90, 132);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(0,0,0,${0.04+Math.random()*0.08})`;
      g.beginPath();
      g.arc(Math.random()*w, Math.random()*h, 18+Math.random()*48, 0, Math.PI*2);
      g.fill();
    }
  });
}

function makeShutterMaterial(hue=22) {
  const tex = makeCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = `hsl(${hue}, 35%, 36%)`; g.fillRect(0,0,w,h);
    for (let y = 0; y < h; y += 12) {
      g.fillStyle = `hsl(${hue}, 35%, ${24+Math.sin(y*0.4)*4}%)`;
      g.fillRect(0, y, w, 6);
    }
    for (let i = 0; i < 20; i++) {
      g.strokeStyle = 'rgba(0,0,0,0.15)';
      g.beginPath();
      g.moveTo(Math.random()*w, Math.random()*h);
      g.lineTo(Math.random()*w, Math.random()*h);
      g.stroke();
    }
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
}

function buildGround() {
  const g = new THREE.PlaneGeometry(400, 400);
  const m = new THREE.MeshStandardMaterial({ color: 0x7f7a4f, roughness: 1 });
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -Math.PI/2;
  mesh.receiveShadow = true;
  world.add(mesh);
}

function buildStreet() {
  const g = new THREE.PlaneGeometry(STREET_WIDE, STREET_LEN);
  const mesh = new THREE.Mesh(g, makeStreetMaterial());
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(0, 0.01, STREET_LEN/2 - 10);
  mesh.receiveShadow = true;
  world.add(mesh);
  const swG = new THREE.BoxGeometry(2.5, 0.25, STREET_LEN);
  const swM = new THREE.MeshStandardMaterial({ color: 0x8a7f67, roughness: 1 });
  const swL = new THREE.Mesh(swG, swM); swL.position.set(-STREET_WIDE/2 - 1.25, 0.125, STREET_LEN/2 - 10); swL.receiveShadow = true; world.add(swL);
  const swR = new THREE.Mesh(swG, swM); swR.position.set( STREET_WIDE/2 + 1.25, 0.125, STREET_LEN/2 - 10); swR.receiveShadow = true; world.add(swR);
}

const PAK_FLAG_TEX = makeCanvasTexture(128, 80, (g, w, h) => {
  g.fillStyle = '#0d6b3a'; g.fillRect(0,0,w,h);
  g.fillStyle = '#ffffff'; g.fillRect(0,0,w*0.22,h);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(w*0.62, h/2, h*0.32, 0, Math.PI*2); g.fill();
  g.fillStyle = '#0d6b3a';
  g.beginPath(); g.arc(w*0.66, h/2, h*0.28, 0, Math.PI*2); g.fill();
  g.fillStyle = '#ffffff';
  g.save(); g.translate(w*0.78, h*0.46);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI/2 + i * Math.PI/5;
    const r = i%2===0 ? h*0.14 : h*0.06;
    g[i===0?'moveTo':'lineTo'](Math.cos(a)*r, Math.sin(a)*r);
  }
  g.closePath(); g.fill();
  g.restore();
});

function makeFlag(x, z, y=4) {
  const grp = new THREE.Group();
  const poleG = new THREE.CylinderGeometry(0.05, 0.05, y+1.4, 8);
  const poleM = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.4 });
  const pole = new THREE.Mesh(poleG, poleM);
  pole.position.set(0, (y+1.4)/2, 0);
  pole.castShadow = true;
  grp.add(pole);
  const fG = new THREE.PlaneGeometry(1.6, 1.0, 6, 4);
  const fM = new THREE.MeshStandardMaterial({ map: PAK_FLAG_TEX, side: THREE.DoubleSide, roughness: 0.85 });
  const flag = new THREE.Mesh(fG, fM);
  flag.position.set(0.85, y+0.3, 0);
  flag.castShadow = true;
  grp.add(flag);
  flag.userData.wave = true;
  grp.position.set(x, 0, z);
  world.add(grp);
  return flag;
}

const wavingFlags = [];

function buildShopFacades() {
  const hueCycle = [22, 8, 200, 40, 14, 30, 4];
  const muralTex = makeUrduMural();
  const muralMat = new THREE.MeshStandardMaterial({ map: muralTex, roughness: 0.95 });
  let z = 6;
  let muralPlaced = false;
  while (z < STREET_LEN - 30) {
    for (const side of [-1, 1]) {
      const w = 6;
      const h = rand(4.6, 5.6);
      const d = 5;
      const x = side * (STREET_WIDE/2 + 2.5 + d/2);
      const facadeG = new THREE.BoxGeometry(w, h, d);
      const wallMat = new THREE.MeshStandardMaterial({
        map: makeCanvasTexture(512,512,(gx,W,H)=>{
          const col = `hsl(${30+Math.random()*26}, 34%, ${56+Math.random()*12}%)`;
          gx.fillStyle = col; gx.fillRect(0,0,W,H);
          for (let yy=0;yy<H;yy+=24){
            const off=(yy/24)%2===0?0:28;
            for(let xx=-off;xx<W;xx+=56){gx.strokeStyle='rgba(0,0,0,0.18)';gx.lineWidth=1;gx.strokeRect(xx,yy,54,22);}
          }
        }),
        roughness: 1
      });
      const facade = new THREE.Mesh(facadeG, wallMat);
      facade.position.set(x, h/2, z + w/2);
      facade.castShadow = true; facade.receiveShadow = true;
      world.add(facade);
      addCollider(facade.position.x - d/2, facade.position.x + d/2,
                  facade.position.z - w/2, facade.position.z + w/2);
      const sw = 2.6, sh = 2.6;
      const shutterG = new THREE.PlaneGeometry(sw, sh);
      const shutter = new THREE.Mesh(shutterG, makeShutterMaterial(hueCycle[Math.floor(Math.random()*hueCycle.length)]));
      shutter.position.set(x - side * (d/2 + 0.01), sh/2 + 0.05, z + w/2);
      shutter.rotation.y = side > 0 ? Math.PI/2 : -Math.PI/2;
      world.add(shutter);
      const awnG = new THREE.BoxGeometry(w*0.9, 0.1, 1.6);
      const awnM = new THREE.MeshStandardMaterial({ color: 0x9c3a2b, roughness: 0.85 });
      const awn = new THREE.Mesh(awnG, awnM);
      awn.position.set(x - side * (d/2 + 0.8), sh + 0.6, z + w/2);
      awn.rotation.y = side > 0 ? Math.PI/2 : -Math.PI/2;
      awn.castShadow = true; world.add(awn);
      if (side < 0 && !muralPlaced && z > 18 && z < 40) {
        const mG = new THREE.PlaneGeometry(7.6, 4.4);
        const m = new THREE.Mesh(mG, muralMat);
        m.position.set(x + d/2 + 0.02, 2.6, z + w/2);
        m.rotation.y = Math.PI/2;
        world.add(m);
        muralPlaced = true;
      }
    }
    if (Math.random() < 0.55) {
      wavingFlags.push(makeFlag((Math.random()<0.5?-1:1) * (STREET_WIDE/2 + 0.8), z + 3, rand(4, 5.5)));
    }
    z += 6 + rand(0, 1.5);
  }
}

function buildWelcomeSign() {
  const grp = new THREE.Group();
  const baseG = new THREE.BoxGeometry(10, 0.6, 1.2);
  const baseM = new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 1 });
  const base = new THREE.Mesh(baseG, baseM); base.position.set(0, 0.3, 0); base.castShadow = true; base.receiveShadow = true;
  grp.add(base);
  for (const x of [-4.6, 4.6]) {
    const bG = new THREE.CylinderGeometry(0.32, 0.4, 1.5, 16);
    const b = new THREE.Mesh(bG, baseM);
    b.position.set(x, 0.75, 0); b.castShadow = true; grp.add(b);
  }
  const tex = makeCanvasTexture(512, 320, (g, w, h) => {
    g.fillStyle = '#e6d8b6'; g.fillRect(0,0,w,h);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = `rgba(0,0,0,${0.03+Math.random()*0.06})`;
      g.beginPath(); g.arc(Math.random()*w, Math.random()*h, 6+Math.random()*22, 0, Math.PI*2); g.fill();
    }
    g.fillStyle = '#1a1410';
    g.fillRect(w/2-44, 22, 88, 38);
    g.beginPath(); g.arc(w/2, 22, 30, Math.PI, 0); g.fill();
    g.fillStyle = '#e6d8b6';
    g.fillRect(w/2-6, 8, 12, 24);
    g.fillStyle = '#1a1410';
    g.font = 'bold 36px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('WELCOME TO', w/2, 110);
    g.font = 'bold 80px Georgia, serif';
    g.fillText('YAARI TOWN', w/2, 200);
    g.strokeStyle = '#1a1410'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(w*0.3, 240); g.lineTo(w*0.7, 240); g.stroke();
    g.beginPath(); g.arc(w/2, 240, 6, 0, Math.PI*2); g.fillStyle = '#1a1410'; g.fill();
  });
  const tabG = new THREE.PlaneGeometry(8.6, 5.4);
  const tabM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  const tab = new THREE.Mesh(tabG, tabM);
  tab.position.set(0, 3.4, 0.02);
  tab.castShadow = true;
  grp.add(tab);
  const fG = new THREE.BoxGeometry(9, 6, 0.25);
  const fM = new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 1 });
  const frame = new THREE.Mesh(fG, fM);
  frame.position.set(0, 3.4, -0.05);
  frame.castShadow = true; frame.receiveShadow = true;
  grp.add(frame);
  grp.position.set(0, 0, 2);
  world.add(grp);
  addCollider(-5, 5, 1, 3.5);
  wavingFlags.push(makeFlag(-5.6, 2, 4.5));
  wavingFlags.push(makeFlag( 5.6, 2, 4.5));
}

function buildMinaretsAndSkyline() {
  for (let i = 0; i < 6; i++) {
    const x = rand(-90, 90);
    const z = rand(-20, STREET_LEN);
    if (Math.abs(x) < STREET_WIDE/2 + 8) continue;
    const h = rand(8, 22);
    const w = rand(4, 9);
    const g = new THREE.BoxGeometry(w, h, w);
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.07+Math.random()*0.04, 0.25, 0.18+Math.random()*0.1), roughness: 1 });
    const bld = new THREE.Mesh(g, m);
    bld.position.set(x, h/2, z);
    bld.castShadow = true; bld.receiveShadow = true;
    world.add(bld);
    addCollider(x-w/2, x+w/2, z-w/2, z+w/2);
  }
  for (const side of [-1, 1]) {
    const x = side * 45;
    const z = rand(30, 100);
    const baseG = new THREE.CylinderGeometry(1.8, 2.2, 14, 16);
    const baseM = new THREE.MeshStandardMaterial({ color: 0xc9b78a, roughness: 0.9 });
    const base = new THREE.Mesh(baseG, baseM);
    base.position.set(x, 7, z); base.castShadow = true; world.add(base);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.0, 4, 16), new THREE.MeshStandardMaterial({ color: 0x2c5f7f, roughness: 0.7 }));
    top.position.set(x, 16, z); top.castShadow = true; world.add(top);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.2, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0xe9b44c, roughness: 0.4, metalness: 0.6 }));
    spire.position.set(x, 19, z); spire.castShadow = true; world.add(spire);
    addCollider(x-2, x+2, z-2, z+2);
  }
}

function buildBossArena() {
  const cz = STREET_LEN - 10;
  const g = new THREE.CircleGeometry(20, 32);
  const tex = makeCanvasTexture(512, 512, (gx, w, h) => {
    gx.fillStyle = '#382818'; gx.fillRect(0,0,w,h);
    for (let r = 60; r < 250; r += 28) {
      gx.strokeStyle = 'rgba(0,0,0,0.35)';
      gx.lineWidth = 2;
      gx.beginPath(); gx.arc(256, 256, r, 0, Math.PI*2); gx.stroke();
    }
    gx.fillStyle = 'rgba(120,20,12,0.7)';
    gx.beginPath(); gx.arc(280, 240, 80, 0, Math.PI*2); gx.fill();
    gx.beginPath(); gx.arc(260, 280, 40, 0, Math.PI*2); gx.fill();
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  const arena = new THREE.Mesh(g, m);
  arena.rotation.x = -Math.PI/2;
  arena.position.set(0, 0.02, cz);
  arena.receiveShadow = true;
  world.add(arena);
  const bw = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 1), new THREE.MeshStandardMaterial({ color: 0x8d7458, roughness: 1 }));
  bw.position.set(0, 4, cz + 18);
  bw.castShadow = true; bw.receiveShadow = true;
  world.add(bw);
  addCollider(-20, 20, cz+17.4, cz+18.6);
  for (const x of [-12, 12]) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.4, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1 }));
    bowl.position.set(x, 1.4, cz - 6);
    world.add(bowl);
    const flame = new THREE.PointLight(0xffd080, 0.45, 12, 2);
    flame.position.set(x, 2.4, cz - 6);
    world.add(flame);
    flame.userData.flicker = true;
    flickerLights.push(flame);
  }
  bossSpawn.set(0, 0, cz + 8);
}

const flickerLights = [];
const bossSpawn = v3(0,0,0);

// ─────────────────────────────────────────────────────────────────────────
// Entities
// ─────────────────────────────────────────────────────────────────────────
const entities = { goons: [], boss: null };

// ─────────────────────────────────────────────────────────────────────────
// Hero — uses rigged skeleton from hero.glb + FBX animation clips
// ─────────────────────────────────────────────────────────────────────────
class Hero {
  constructor(gltfHero, animClips) {
    this.animClips = animClips || {};
    this.group = new THREE.Group();

    this.body = selectHeroBody(gltfHero);
    // Ensure all meshes cast shadows
    this.body.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    fitHeight(this.body, 1.85);
    this.body.rotation.y = Math.PI;   // model faces -Z by default; our facing=0 is +Z
    this.group.add(this.body);
    scene.add(this.group);

    // Find skeleton / bones
    this.skeleton = findSkeleton(this.body);
    this.bones = {};
    if (this.skeleton) {
      console.log('Hero skeleton found with', this.skeleton.bones.length, 'bones');
      logBones(this.body);
      // Try to find common bone names
      this.bones.rightHand = findBone(this.body, 'hand_r') || findBone(this.body, 'righthand') || findBone(this.body, 'right_hand') || findBone(this.body, 'handright');
      this.bones.leftHand  = findBone(this.body, 'hand_l') || findBone(this.body, 'lefthand') || findBone(this.body, 'left_hand') || findBone(this.body, 'handleft');
      this.bones.head      = findBone(this.body, 'head');
      this.bones.spine     = findBone(this.body, 'spine') || findBone(this.body, 'spine1');
      this.bones.hips      = findBone(this.body, 'hips') || findBone(this.body, 'mixamorig_hips');
      console.log('Mapped bones:', Object.entries(this.bones).filter(([_,v])=>v).map(([k,v])=>`${k}=${v.name}`));
    }

    this.animClips = prepareRigClips(this.animClips, this.body);

    // Animation mixer
    this.mixer = new THREE.AnimationMixer(this.body);

    // Map animation clips to actions
    this.actions = {};
    for (const [key, clip] of Object.entries(this.animClips)) {
      this.actions[key] = this.mixer.clipAction(clip);
    }

    // Determine which clip to use for walk vs walk-with-gun
    this.walkClip = this.actions.walkGun || this.actions.walk;
    this.throwClip = this.actions.throwDyn || this.actions.throwGrenade;

    // Weapon mount points (will be bone-attached if bones found)
    this.rightHandMount = new THREE.Group();
    this.leftHandMount  = new THREE.Group();
    this.mouthMount     = new THREE.Group();
    this.mouthMount.position.set(0, 1.6, 0.18);
    this.group.add(this.mouthMount);

    // Attach mounts to bones or fallback positions
    if (this.bones.rightHand) {
      this.bones.rightHand.add(this.rightHandMount);
    } else {
      this.rightHandMount.position.set(0.45, 1.2, 0.25);
      this.group.add(this.rightHandMount);
      console.warn('No right hand bone found — using fallback mount');
    }
    if (this.bones.leftHand) {
      this.bones.leftHand.add(this.leftHandMount);
    } else {
      this.leftHandMount.position.set(-0.35, 1.45, 0.05);
      this.group.add(this.leftHandMount);
    }

    this.pos = v3(0, 0, -22);
    this.facing = 0;
    this.aimYaw = 0;
    this.aimPitch = 0;
    this.hp = HERO_MAX_HP;
    this.alive = true;
    this.moving = false;
    this.running = false;
    this.equipped = 'ak';
    this.lastShot = 0;
    this.ammo = AK_MAG;
    this.reserve = 120;
    this.reloading = false;
    this.sickleInFlight = false;
    this.dynamiteCount = 4;
    this.cigState = 'idle';
    this.cigT = 0;
    this.weapons = {};
    this.lastDamageT = 0;
    this.currentAction = null;
  }

  addAnimationClip(name, clip) {
    const prepared = remapClipToRig(clip, this.body);
    this.animClips[name] = prepared;
    this.actions[name] = this.mixer.clipAction(prepared);
    this.walkClip = this.actions.walkGun || this.actions.walk;
    this.throwClip = this.actions.throwDyn || this.actions.throwGrenade;
  }

  playAction(name, fadeIn=0.15, speed=1) {
    const action = this.actions[name];
    if (!action) return;
    if (this.currentAction === action) {
      action.timeScale = speed;
      return;
    }
    if (this.currentAction) this.currentAction.crossFadeTo(action, fadeIn, false);
    action.reset().setEffectiveTimeScale(speed).fadeIn(fadeIn).play();
    this.currentAction = action;
  }

  stopAction(fadeOut=0.1) {
    if (this.currentAction) {
      this.currentAction.fadeOut(fadeOut);
      this.currentAction = null;
    }
  }

  takeDamage(d) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - d);
    flashDamage();
    this.lastDamageT = clock;
    if (this.hp <= 0) {
      this.alive = false;
      this.group.rotation.x = -Math.PI/2;
      onGameOver(false, 'Iqbal still walks Yaari.');
    }
  }

  update(dt, realDt) {
    // Update animation mixer with scaled dt (respects slow-mo via dt)
    // For hero animation we use dt so walk cycle slows with world during cig
    // But hero movement uses realDt so he moves at full speed
    this.mixer.update(dt);

    // Movement
    if (this.alive && !cinemaActive) {
      const fwd = v3(0,0,0); const rgt = v3(0,0,0);
      const f = (input.up ? 1 : 0) - (input.down ? 1 : 0) + (touchStick.y || 0);
      const r = (input.right ? 1 : 0) - (input.left ? 1 : 0) + (touchStick.x || 0);
      const speed = (input.run ? HERO_RUN : HERO_SPEED);
      fwd.set(Math.sin(this.facing), 0, Math.cos(this.facing));
      rgt.set(Math.cos(this.facing), 0, -Math.sin(this.facing));
      const move = v3(0,0,0);
      move.addScaledVector(fwd, f);
      move.addScaledVector(rgt, r);
      const mag = move.length();
      this.moving = mag > 0.02;
      this.running = this.moving && (input.run || mag > 0.9);
      if (this.moving) move.normalize().multiplyScalar(speed * realDt);
      const nx = this.pos.x + move.x;
      if (!collidesAt(nx, this.pos.z, 0.55)) this.pos.x = nx;
      const nz = this.pos.z + move.z;
      if (!collidesAt(this.pos.x, nz, 0.55)) this.pos.z = nz;
    }
    this.group.position.copy(this.pos);

    if (this.alive) {
      const target = this.aimYaw;
      let diff = target - this.facing;
      while (diff > Math.PI) diff -= Math.PI*2;
      while (diff < -Math.PI) diff += Math.PI*2;
      this.facing += diff * Math.min(1, realDt * 8);
      this.group.rotation.y = this.facing;
    }

    // Animation state
    if (this.alive) {
      if (this.moving) {
        const speed = this.running ? 1.6 : 1.0;
        if (this.equipped === 'ak' && this.actions.walkGun) {
          this.playAction('walkGun', 0.15, speed);
        } else if (this.actions.walk) {
          this.playAction('walk', 0.15, speed);
        }
      } else {
        // Idle — slow action to near-zero or just stop
        if (this.currentAction) {
          this.currentAction.timeScale = 0.05;
        }
      }
    }

    // Cigarette state machine
    if (this.cigState === 'lighting') {
      this.cigT += realDt;
      if (this.cigT > 1.0) {
        this.cigState = 'smoking';
        this.cigT = 0;
        slowmoVignette.style.opacity = '1';
        showToast('Bullet time engaged. 60 seconds of clarity.');
      }
    } else if (this.cigState === 'smoking') {
      this.cigT += realDt;
      if (Math.random() < realDt * 4)
        spawnSmokePuff(this.mouthMount.getWorldPosition(tmpV).clone());
      if (this.cigT >= CIG_DUR) {
        this.cigState = 'cooldown';
        this.cigT = 0;
        slowmoVignette.style.opacity = '0';
        showToast('Cigarette done. Catch your breath.');
        if (cigVisual) cigVisual.visible = false;
      }
    } else if (this.cigState === 'cooldown') {
      this.cigT += realDt;
      if (this.cigT >= CIG_COOLDOWN) {
        this.cigState = 'idle';
      }
    }

    // Weapon visibility
    if (this.weapons.ak) this.weapons.ak.visible = this.equipped === 'ak' && !this.sickleInFlight;
    if (this.weapons.sickle) this.weapons.sickle.visible = this.equipped === 'sickle' && !this.sickleInFlight;
    if (this.weapons.dynamite) this.weapons.dynamite.visible = this.equipped === 'dynamite';

    if (this.reloading) this.lastShot = clock;
  }
}

function makeFallbackHumanoid(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), mat);
  torso.position.y = 1.0; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat);
  head.position.y = 1.65; head.castShadow = true; g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.32), mat);
  legs.position.y = 0.45; legs.castShadow = true; g.add(legs);
  return g;
}

function makeFallbackAK() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.55, metalness: 0.25 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.78), metal);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 10), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.62;
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.34), wood);
  stock.position.z = -0.48;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.12), wood);
  grip.position.set(0, -0.18, -0.1);
  g.add(body, barrel, stock, grip);
  return g;
}

function makeFallbackSickle() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.72, 10),
    new THREE.MeshStandardMaterial({ color: 0x5b321c, roughness: 0.8 })
  );
  handle.rotation.z = 0.22;
  const blade = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.025, 8, 28, Math.PI * 1.35),
    new THREE.MeshStandardMaterial({ color: 0xd9d0ba, roughness: 0.32, metalness: 0.65 })
  );
  blade.position.set(0.08, 0.34, 0);
  blade.rotation.set(0, 0, -0.8);
  g.add(handle, blade);
  return g;
}

function makeFallbackDynamite() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xb52b20, roughness: 0.7 });
  for (const x of [-0.08, 0.08]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.44, 12), mat);
    stick.rotation.x = Math.PI / 2;
    stick.position.x = x;
    g.add(stick);
  }
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.05, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1f1b16, roughness: 0.7 })
  );
  g.add(band);
  return g;
}

function makeFallbackCigarette() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.22, 10),
    new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.8 })
  );
  body.rotation.z = Math.PI / 2;
  const ember = new THREE.Mesh(
    new THREE.SphereGeometry(0.021, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7a30 })
  );
  ember.position.x = 0.12;
  g.add(body, ember);
  return g;
}

// ─────────────────────────────────────────────────────────────────────────
// Goons
// ─────────────────────────────────────────────────────────────────────────
class Goon {
  constructor(gltfGoon, pos, patrol) {
    this.body = cloneGLBScene(gltfGoon) || makeFallbackHumanoid(0x655545);
    fitHeight(this.body, 1.78);
    this.body.rotation.y = Math.PI;
    this.group = new THREE.Group();
    this.group.add(this.body);
    scene.add(this.group);
    this.pos = pos.clone();
    this.group.position.copy(this.pos);
    this.hp = GOON_HP;
    this.alive = true;
    this.state = 'patrol';
    this.patrol = patrol;
    this.target = 0;
    this.lastShot = 0;
    this.facing = 0;
    this.animT = Math.random() * 10;
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x222018, roughness: 0.5 }));
    rifle.position.set(0.3, 1.1, 0.35);
    this.group.add(rifle);
    this.rifle = rifle;
  }
  takeDamage(d) {
    if (!this.alive) return;
    this.hp -= d;
    if (this.hp <= 0) this.die();
  }
  die() {
    this.alive = false;
    this.state = 'dead';
    this.deathT = 0;
    playEnemyMoan();
  }
  update(dt, realDt) {
    if (!this.alive) {
      this.deathT = (this.deathT||0) + realDt;
      this.group.rotation.x = Math.min(Math.PI/2, this.deathT * 4);
      this.group.position.y = Math.max(-0.4, -this.deathT * 0.5);
      return;
    }
    const dx = hero.pos.x - this.pos.x, dz = hero.pos.z - this.pos.z;
    const distSq = dx*dx + dz*dz;
    const sees = distSq < 40*40 && hero.alive;
    if (sees) this.state = (distSq < 14*14 ? 'shoot' : 'chase');
    else if (this.state !== 'patrol') this.state = 'patrol';

    let move = v3(0,0,0);
    if (this.state === 'patrol' && this.patrol.length) {
      const t = this.patrol[this.target];
      const ddx = t.x - this.pos.x, ddz = t.z - this.pos.z;
      const d = Math.hypot(ddx, ddz);
      if (d < 0.6) this.target = (this.target+1)%this.patrol.length;
      else { move.set(ddx/d, 0, ddz/d).multiplyScalar(1.8 * dt); }
      this.facing = Math.atan2(ddx, ddz);
    } else if (this.state === 'chase') {
      const d = Math.hypot(dx, dz);
      move.set(dx/d, 0, dz/d).multiplyScalar(3.0 * dt);
      this.facing = Math.atan2(dx, dz);
    } else if (this.state === 'shoot') {
      this.facing = Math.atan2(dx, dz);
      const now = clock;
      if (now - this.lastShot > 1.2) {
        this.lastShot = now;
        const origin = this.pos.clone(); origin.y = 1.5;
        spawnMuzzleFlash(origin, this.facing);
        const aimError = 0.12 + Math.random()*0.2;
        const hit = Math.random() < (0.55 - aimError);
        spawnTracer(origin, hero.pos.clone().add(v3(0,1.3,0)).add(v3(rand(-1,1)*aimError*5, rand(-0.3,0.3), rand(-1,1)*aimError*5)));
        if (hit) hero.takeDamage(GOON_DMG);
      }
    }
    const nx = this.pos.x + move.x;
    if (!collidesAt(nx, this.pos.z, 0.5)) this.pos.x = nx;
    const nz = this.pos.z + move.z;
    if (!collidesAt(this.pos.x, nz, 0.5)) this.pos.z = nz;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.facing;
    this.animT += realDt * (this.state === 'patrol' ? 4 : 6);
    this.body.position.y = Math.abs(Math.sin(this.animT)) * 0.05;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Boss
// ─────────────────────────────────────────────────────────────────────────
class Boss {
  constructor(beforeGltf, afterGltf) {
    this.beforeGltf = beforeGltf;
    this.afterGltf = afterGltf;
    this.body = cloneGLBScene(beforeGltf) || makeFallbackHumanoid(0x4d2a20);
    fitHeight(this.body, 2.1);
    this.body.scale.multiplyScalar(1.2);
    this.body.rotation.y = Math.PI;
    this.group = new THREE.Group();
    this.group.add(this.body);
    scene.add(this.group);
    this.pos = bossSpawn.clone();
    this.group.position.copy(this.pos);
    this.hp = BOSS_HP;
    this.maxHp = BOSS_HP;
    this.alive = true;
    this.phase = 1;
    this.state = 'idle';
    this.timer = 0;
    this.lastShot = 0;
    this.activated = false;
    this.deathT = 0;
  }
  activate() {
    if (this.activated) return;
    this.activated = true;
    bossBar.classList.remove('hidden');
    setComms('Brigadier Iqbal: "You walked into your own grave."');
    showToast('IQBAL — BRIGADIER OF YAARI');
  }
  triggerSickleCut() {
    if (this.phase !== 1) return;
    this.phase = 2;
    this.state = 'stagger';
    this.timer = 0;
    this.group.remove(this.body);
    this.body = cloneGLBScene(this.afterGltf) || makeFallbackHumanoid(0x4d2a20);
    fitHeight(this.body, 2.05);
    this.body.scale.multiplyScalar(1.2);
    this.body.rotation.y = Math.PI;
    this.group.add(this.body);
    spawnBloodBurst(this.pos.clone().add(v3(0, 1.4, 0)));
    spawnFlyingLimb(this.pos.clone().add(v3(0, 1.5, 0)));
    playIqbalCutScream();
    showToast('SICKLE CONNECTS — IQBAL LOSES THE ARM');
    setComms('Iqbal screams. The sickle did its work. Finish him.');
    this.hp = Math.min(this.hp, this.maxHp * 0.5);
  }
  takeDamage(d) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - d);
    if (this.hp <= 0) this.die();
  }
  die() {
    this.alive = false;
    this.state = 'dead';
    showToast('IQBAL DOWN. YAARI IS YOURS.');
    setTimeout(()=>onGameOver(true, 'Yaari Town is free. The sickle remembers.'), 1200);
  }
  update(dt, realDt) {
    if (!this.alive) {
      this.deathT += realDt;
      this.group.rotation.x = Math.min(Math.PI/2, this.deathT * 3);
      this.group.position.y = Math.max(-0.4, -this.deathT * 0.4);
      return;
    }
    if (!this.activated) {
      const d = this.pos.distanceTo(hero.pos);
      if (d < 32) this.activate();
      else return;
    }
    const dx = hero.pos.x - this.pos.x, dz = hero.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const facing = Math.atan2(dx, dz);
    this.group.rotation.y = facing;
    this.timer += dt;
    if (this.state === 'stagger') {
      if (this.timer > 2.0) { this.state = 'idle'; this.timer = 0; }
      this.group.position.y = Math.sin(this.timer * 8) * 0.05;
      return;
    }
    if (this.state === 'idle' && this.timer > 0.9) {
      this.state = dist > 9 ? 'charge' : 'shoot';
      this.timer = 0;
    }
    if (this.state === 'charge') {
      const sp = (this.phase === 1 ? 4.5 : 3.0) * dt;
      const nx = this.pos.x + (dx/dist)*sp;
      const nz = this.pos.z + (dz/dist)*sp;
      if (!collidesAt(nx, this.pos.z, 0.9)) this.pos.x = nx;
      if (!collidesAt(this.pos.x, nz, 0.9)) this.pos.z = nz;
      if (dist < 9) { this.state = 'shoot'; this.timer = 0; }
    } else if (this.state === 'shoot') {
      const now = clock;
      if (now - this.lastShot > (this.phase===1 ? 0.6 : 0.9)) {
        this.lastShot = now;
        const origin = this.pos.clone(); origin.y = 1.7;
        spawnMuzzleFlash(origin, facing);
        for (let i = 0; i < 3; i++) {
          const aimError = 0.16;
          const target = hero.pos.clone().add(v3(0,1.4,0)).add(v3(rand(-1,1)*aimError*5, rand(-0.4,0.2), rand(-1,1)*aimError*5));
          spawnTracer(origin, target);
          if (Math.random() < 0.42) hero.takeDamage(BOSS_DMG);
        }
        if (this.timer > 1.6) { this.state = 'idle'; this.timer = 0; }
      }
    }
    this.group.position.copy(this.pos);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Projectiles & FX
// ─────────────────────────────────────────────────────────────────────────
const projectiles = [];
const tracers = [];
const flashes = [];
const smokes = [];
const blood = [];
const flyingLimbs = [];
const explosions = [];
const casings = [];

function spawnTracer(from, to) {
  const g = new THREE.BufferGeometry().setFromPoints([from, to]);
  const m = new THREE.LineBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(g, m);
  scene.add(line);
  tracers.push({ line, t: 0, life: 0.08 });
}

function spawnMuzzleFlash(origin, facing) {
  const g = new THREE.SphereGeometry(0.16, 8, 8);
  const m = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 1 });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(origin);
  mesh.position.x += Math.sin(facing) * 0.4;
  mesh.position.z += Math.cos(facing) * 0.4;
  scene.add(mesh);
  const light = new THREE.PointLight(0xffd980, 2, 6, 2);
  light.position.copy(mesh.position);
  scene.add(light);
  flashes.push({ mesh, light, t: 0, life: 0.06 });
  playGunshot();
}

function spawnShellCasing(origin, facing) {
  const g = new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8);
  const m = new THREE.MeshStandardMaterial({ color: 0xd8a44c, roughness: 0.35, metalness: 0.55 });
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.copy(origin);
  scene.add(mesh);
  const right = v3(Math.cos(facing), 0, -Math.sin(facing));
  casings.push({
    mesh,
    t: 0,
    life: 1.4,
    vel: right.multiplyScalar(rand(1.8, 2.8)).add(v3(rand(-0.25,0.25), rand(1.4,2.2), rand(-0.25,0.25))),
    spin: v3(rand(8,16), rand(6,12), rand(8,16))
  });
}

function spawnSmokePuff(pos) {
  const g = new THREE.SphereGeometry(0.08 + Math.random()*0.06, 8, 8);
  const m = new THREE.MeshBasicMaterial({ color: 0xcbb59a, transparent: true, opacity: 0.6 });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(pos);
  scene.add(mesh);
  smokes.push({ mesh, t: 0, life: 2.6, vel: v3(rand(-0.05,0.05), rand(0.4,0.7), rand(-0.05,0.05)) });
}

function spawnBloodBurst(pos) {
  for (let i = 0; i < 30; i++) {
    const g = new THREE.SphereGeometry(0.06 + Math.random()*0.06, 5, 5);
    const m = new THREE.MeshBasicMaterial({ color: 0x9b2018 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.copy(pos);
    scene.add(mesh);
    blood.push({ mesh, t: 0, life: 1.2 + Math.random()*0.8, vel: v3(rand(-3,3), rand(2, 6), rand(-3,3)) });
  }
}

function spawnFlyingLimb(pos) {
  const g = new THREE.CapsuleGeometry(0.16, 0.7, 6, 12);
  const m = new THREE.MeshStandardMaterial({ color: 0x6e3a2a, roughness: 0.9 });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(pos);
  mesh.castShadow = true;
  scene.add(mesh);
  flyingLimbs.push({
    mesh, t: 0, life: 3,
    vel: v3(rand(2, 4) * (Math.random()<0.5?-1:1), 5.5, rand(-1, 1)),
    spin: v3(rand(-6,6), rand(-6,6), rand(-6,6))
  });
}

function spawnExplosion(pos) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffaa44, side: THREE.DoubleSide, transparent: true, opacity: 1 }));
  ring.position.copy(pos); ring.position.y = 0.3;
  ring.rotation.x = -Math.PI/2;
  scene.add(ring);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 1 }));
  ball.position.copy(pos);
  scene.add(ball);
  const light = new THREE.PointLight(0xffaa50, 6, 20, 2);
  light.position.copy(pos);
  scene.add(light);
  explosions.push({ ring, ball, light, t: 0, life: 0.7 });
  for (const g of entities.goons) {
    if (!g.alive) continue;
    if (g.pos.distanceTo(pos) < DYN_RADIUS) g.takeDamage(DYN_DMG);
  }
  if (entities.boss && entities.boss.alive) {
    if (entities.boss.pos.distanceTo(pos) < DYN_RADIUS + 1) {
      entities.boss.takeDamage(DYN_DMG * 0.6);
    }
  }
  if (hero.alive && hero.pos.distanceTo(pos) < DYN_RADIUS) {
    const d = hero.pos.distanceTo(pos);
    hero.takeDamage(DYN_DMG * (1 - d/DYN_RADIUS) * 0.6);
  }
}

function throwSickle() {
  if (hero.sickleInFlight) return;
  if (!sickleVisual) return;
  hero.sickleInFlight = true;
  playSickleSound();
  const start = hero.rightHandMount.getWorldPosition(tmpV).clone();
  const dir = v3(Math.sin(hero.aimYaw), 0, Math.cos(hero.aimYaw)).normalize();
  scene.add(sickleVisual);
  sickleVisual.position.copy(start);
  sickleVisual.visible = true;
  projectiles.push({
    kind: 'sickle', mesh: sickleVisual, pos: start.clone(), vel: dir.clone().multiplyScalar(SICKLE_SPEED),
    t: 0, returning: false, spin: 0, hitSet: new Set(),
    maxReach: SICKLE_RANGE
  });
}

function throwDynamite() {
  if (hero.dynamiteCount <= 0) { showToast('No dynamite left.'); return; }
  hero.dynamiteCount--;
  const start = hero.rightHandMount.getWorldPosition(tmpV).clone();
  const dir = v3(Math.sin(hero.aimYaw), 0.6, Math.cos(hero.aimYaw)).normalize();
  let mesh;
  if (assets.dynamite) mesh = cloneGLBScene(assets.dynamite);
  if (!mesh) mesh = makeFallbackDynamite();
  fitHeight(mesh, 0.45);
  mesh.position.copy(start);
  scene.add(mesh);
  projectiles.push({
    kind: 'dynamite', mesh, pos: start.clone(), vel: dir.clone().multiplyScalar(16),
    t: 0, fuse: DYN_FUSE, spin: 8
  });
  if (hero.actions.throwDyn) hero.playAction('throwDyn', 0.08, 1.1);
  else if (hero.actions.throwGrenade) hero.playAction('throwGrenade', 0.08, 1.1);
}

function shootAK() {
  if (hero.reloading) return;
  if (hero.ammo <= 0) { reloadAK(); return; }
  const now = clock;
  if (now - hero.lastShot < 60 / AK_RPM) return;
  hero.lastShot = now;
  hero.ammo--;
  const origin = hero.rightHandMount.getWorldPosition(tmpV).clone();
  origin.y = lerp(origin.y, hero.pos.y + 1.55, 0.5);
  const dir = v3(Math.sin(hero.aimYaw), -hero.aimPitch*0.6, Math.cos(hero.aimYaw)).normalize();
  spawnMuzzleFlash(origin, hero.aimYaw);
  spawnShellCasing(origin.clone().add(v3(0, 0.02, 0)), hero.aimYaw);
  pulseReticle();
  const ray = new THREE.Raycaster(origin, dir, 0.5, AK_RANGE);
  const targets = [];
  entities.goons.forEach(g => { if (g.alive) targets.push(g.body); });
  if (entities.boss && entities.boss.alive) targets.push(entities.boss.body);
  const intersects = ray.intersectObjects(targets, true);
  let end = origin.clone().addScaledVector(dir, AK_RANGE);
  if (intersects.length) {
    const i = intersects[0];
    end = i.point;
    const ent = findEntity(i.object);
    if (ent === entities.boss) entities.boss.takeDamage(AK_DMG);
    else if (ent && ent.takeDamage) ent.takeDamage(AK_DMG);
  }
  spawnTracer(origin, end);
  if (hero.ammo === 0) reloadAK();
}

function findEntity(mesh) {
  let o = mesh;
  while (o) {
    if (o.userData && o.userData.ent) return o.userData.ent;
    o = o.parent;
  }
  return null;
}

function reloadAK() {
  if (hero.reloading || hero.reserve <= 0) return;
  hero.reloading = true;
  showToast('Reloading…', 1500);
  setTimeout(() => {
    const need = AK_MAG - hero.ammo;
    const give = Math.min(need, hero.reserve);
    hero.ammo += give;
    hero.reserve -= give;
    hero.reloading = false;
  }, 1400);
}

// ─────────────────────────────────────────────────────────────────────────
// Cigarette
// ─────────────────────────────────────────────────────────────────────────
let cigVisual = null;
let cigEmber = null;

function lightCigarette() {
  if (hero.cigState !== 'idle') {
    if (hero.cigState === 'cooldown') showToast(`Cigarette cooldown: ${Math.ceil(CIG_COOLDOWN - hero.cigT)}s`);
    return;
  }
  hero.cigState = 'lighting';
  hero.cigT = 0;
  if (cigVisual) { cigVisual.visible = true; cigEmber.visible = true; }
  showToast('Lighting up…');
}

// ─────────────────────────────────────────────────────────────────────────
// Camera
// ─────────────────────────────────────────────────────────────────────────
const camRig = { yaw: 0, pitch: 0.18, dist: 5.5 };

function updateCamera(realDt) {
  if (cinemaActive) return;
  const target = hero.pos.clone(); target.y += 1.4;
  camRig.yaw = lerp(camRig.yaw, hero.aimYaw + Math.PI, realDt * 8);
  const cy = camRig.yaw;
  const cp = camRig.pitch;
  const dist = camRig.dist;
  const off = v3(
    Math.sin(cy) * Math.cos(cp) * dist,
    Math.sin(cp) * dist + 0.4,
    Math.cos(cy) * Math.cos(cp) * dist
  );
  const desired = target.clone().add(off);
  camera.position.lerp(desired, Math.min(1, realDt * 10));
  camera.lookAt(target);
}

// ─────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────
const input = { up:false, down:false, left:false, right:false, run:false, fire:false };
let mouseLocked = false;
let fireHeld = false;
const touchStick = { x: 0, y: 0 };
const touchLook  = { x: 0, y: 0, active:false };

addEventListener('keydown', e => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = true;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = true;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = true;
  if (e.code === 'Digit1') switchWeapon('ak');
  if (e.code === 'Digit2') switchWeapon('sickle');
  if (e.code === 'Digit3') switchWeapon('dynamite');
  if (e.code === 'KeyR') reloadAK();
  if (e.code === 'KeyC') lightCigarette();
  if (e.code === 'Space' || e.code === 'KeyF') {
    e.preventDefault();
    beginFire();
  }
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
});
addEventListener('keyup', e => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = false;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = false;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = false;
  if (e.code === 'Space' || e.code === 'KeyF') {
    e.preventDefault();
    endFire();
  }
});

function beginFire() {
  if (!playing || paused || cinemaActive || !hero || !hero.alive) return;
  if (fireHeld && hero.equipped !== 'ak') return;
  fireHeld = true;
  if (hero.equipped === 'ak') input.fire = true;
  else if (hero.equipped === 'sickle') throwSickle();
  else if (hero.equipped === 'dynamite') throwDynamite();
  const fireBtn = $('fireBtn');
  if (fireBtn) fireBtn.classList.add('holding');
}

function endFire() {
  fireHeld = false;
  input.fire = false;
  const fireBtn = $('fireBtn');
  if (fireBtn) fireBtn.classList.remove('holding');
}

canvas.addEventListener('mousedown', e => {
  if (!playing) return;
  if (!mouseLocked) canvas.requestPointerLock();
  if (e.button === 0) beginFire();
});
addEventListener('mouseup', e => { if (e.button === 0) endFire(); });
document.addEventListener('pointerlockchange', () => {
  mouseLocked = document.pointerLockElement === canvas;
});
addEventListener('mousemove', e => {
  if (!mouseLocked) return;
  hero.aimYaw   -= e.movementX * 0.0025;
  hero.aimPitch -= e.movementY * 0.002;
  hero.aimPitch = clamp(hero.aimPitch, -0.6, 0.6);
});

// Touch joysticks
function setupTouch() {
  const stick = $('stick'); const stickKnob = $('stickKnob');
  const look = $('look'); const lookKnob = $('lookKnob');
  let stickId = null, lookId = null;
  let stickCx = 0, stickCy = 0, lookLastX = 0, lookLastY = 0;
  const maxR = 50;
  function move(knob, dx, dy) {
    const d = Math.hypot(dx, dy);
    const k = d > maxR ? maxR / d : 1;
    knob.style.transform = `translate(${dx*k - 24}px, ${dy*k - 24}px)`;
  }
  function reset(knob) { knob.style.transform = 'translate(-50%, -50%)'; }

  stick.addEventListener('pointerdown', e => {
    e.preventDefault();
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    const r = stick.getBoundingClientRect();
    stickCx = r.left + r.width / 2;
    stickCy = r.top + r.height / 2;
  });
  stick.addEventListener('pointermove', e => {
    if (e.pointerId !== stickId) return;
    e.preventDefault();
    const dx = e.clientX - stickCx;
    const dy = e.clientY - stickCy;
    move(stickKnob, dx, dy);
    touchStick.x = clamp(dx / maxR, -1, 1);
    touchStick.y = -clamp(dy / maxR, -1, 1);
  });
  function endStick(e) {
    if (e.pointerId !== stickId) return;
    stickId = null;
    touchStick.x = 0;
    touchStick.y = 0;
    reset(stickKnob);
  }
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  look.addEventListener('pointerdown', e => {
    e.preventDefault();
    lookId = e.pointerId;
    look.setPointerCapture(e.pointerId);
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    touchLook.active = true;
  });
  look.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId || !hero) return;
    e.preventDefault();
    const dx = e.clientX - lookLastX;
    const dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    move(lookKnob, e.clientX - (look.getBoundingClientRect().left + look.offsetWidth / 2), e.clientY - (look.getBoundingClientRect().top + look.offsetHeight / 2));
    hero.aimYaw   -= dx * 0.008;
    hero.aimPitch -= dy * 0.006;
    hero.aimPitch = clamp(hero.aimPitch, -0.6, 0.6);
  });
  function endLook(e) {
    if (e.pointerId !== lookId) return;
    lookId = null;
    touchLook.active = false;
    touchLook.x = 0;
    touchLook.y = 0;
    reset(lookKnob);
  }
  look.addEventListener('pointerup', endLook);
  look.addEventListener('pointercancel', endLook);
}

// ─────────────────────────────────────────────────────────────────────────
// Weapon button wiring
// ─────────────────────────────────────────────────────────────────────────
function switchWeapon(w) {
  hero.equipped = w;
  for (const id of ['akBtn', 'sickleBtn', 'dynamiteBtn']) $(id).classList.remove('on');
  if (w === 'ak') $('akBtn').classList.add('on');
  if (w === 'sickle') $('sickleBtn').classList.add('on');
  if (w === 'dynamite') $('dynamiteBtn').classList.add('on');
}
$('akBtn').onclick = () => switchWeapon('ak');
$('sickleBtn').onclick = () => switchWeapon('sickle');
$('dynamiteBtn').onclick = () => switchWeapon('dynamite');
$('fireBtn').addEventListener('pointerdown', e => { e.preventDefault(); beginFire(); });
$('fireBtn').addEventListener('pointerup', e => { e.preventDefault(); endFire(); });
$('fireBtn').addEventListener('pointercancel', e => { e.preventDefault(); endFire(); });
$('fireBtn').addEventListener('pointerleave', e => { if (e.buttons === 0 || e.pointerType === 'touch') endFire(); });
$('cigBtn').onclick = () => lightCigarette();
$('pauseBtn').onclick = () => togglePause();
$('resumeBtn').onclick = () => togglePause();
$('quitBtn').onclick = () => returnToMenu();
$('againBtn').onclick = () => restartLevel();
$('levelsBtn').onclick = () => returnToMenu();
$('retryBtn').onclick = () => restartLevel();
$('failedLevelsBtn').onclick = () => returnToMenu();

// ─────────────────────────────────────────────────────────────────────────
// Setup hero weapons (attach into bone mounts)
// ─────────────────────────────────────────────────────────────────────────
let sickleVisual = null;

function setupHeroWeapons(assets) {
  // AK47
  const ak = cloneGLBScene(assets.ak47) || makeFallbackAK();
  if (ak) {
    fitHeight(ak, 0.32);
    ak.position.set(0, 0, 0.2);
    ak.rotation.y = -Math.PI/2;
    hero.rightHandMount.add(ak);
    hero.weapons.ak = ak;
  }
  // Sickle
  const sickle = cloneGLBScene(assets.sickle) || makeFallbackSickle();
  if (sickle) {
    fitHeight(sickle, 0.6);
    sickle.position.set(0, -0.05, 0.1);
    sickle.rotation.set(0, 0, -0.5);
    hero.rightHandMount.add(sickle);
    hero.weapons.sickle = sickle;
    sickleVisual = sickle;
  }
  // Dynamite
  const dyn = cloneGLBScene(assets.dynamite) || makeFallbackDynamite();
  if (dyn) {
    fitHeight(dyn, 0.3);
    dyn.position.set(0, 0, 0.1);
    hero.rightHandMount.add(dyn);
    hero.weapons.dynamite = dyn;
  }
  // Cigarette (mouth)
  const cig = cloneGLBScene(assets.cig) || makeFallbackCigarette();
  if (cig) {
    fitHeight(cig, 0.12);
    cig.position.set(0.06, -0.02, 0.04);
    cig.rotation.set(0, 0, 0.4);
    cig.visible = false;
    hero.mouthMount.add(cig);
    cigVisual = cig;
    const embG = new THREE.SphereGeometry(0.025, 8, 8);
    const embM = new THREE.MeshBasicMaterial({ color: 0xff7a30 });
    const ember = new THREE.Mesh(embG, embM);
    ember.position.set(0.13, 0, 0);
    cig.add(ember);
    cigEmber = ember;
  }
  switchWeapon('ak');
}

// ─────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────
let assets = null;
let hero = null;
let animClips = {};
let fbxRigs = {};
let clock = 0;
let playing = false;
let paused = false;
let cinemaActive = false;
const realClock = new THREE.Clock();

async function boot() {
  buildGround();
  buildStreet();
  buildShopFacades();
  buildWelcomeSign();
  buildMinaretsAndSkyline();
  buildBossArena();

  assets = await loadAllGLBs();
  fbxRigs = await loadFBXKeys(['walkGun'], 'Loading rigged hero');
  animClips = extractClips(fbxRigs);
  window.__animClips = animClips;
  loadDeferredAnimationKeys(['walk', 'throwDyn', 'throwGrenade']);

  loading.classList.add('hidden');
  menu.classList.remove('hidden');

  $('levelYaari').onclick = () => startLevel(animClips);
  if (new URLSearchParams(location.search).get('autoplay') === 'yaari') {
    startLevel(animClips);
    setTimeout(endIntro, 120);
  }
}

function startLevel(animClips) {
  menu.classList.add('hidden');
  hud.classList.remove('hidden');
  weaponBar.classList.remove('hidden');
  comms.classList.remove('hidden');
  crosshair.classList.remove('hidden');

  // Hero with animations
  hero = new Hero(assets.hero, animClips || window.__animClips || {});
  hero.group.userData.ent = hero;
  setupHeroWeapons(assets);

  // Spawn goons
  entities.goons = [];
  spawnGoons();

  // Boss
  entities.boss = new Boss(assets.iqbalBefore, assets.iqbalAfter);
  entities.boss.group.userData.ent = entities.boss;

  setObjectives([
    { id: 'enter', text: 'Walk past the YAARI TOWN sign' },
    { id: 'goons', text: `Clear Iqbal's patrols (0 / ${entities.goons.length})` },
    { id: 'sickle', text: 'Throw the sickle at Iqbal (severs limb)' },
    { id: 'boss', text: 'Finish Iqbal' }
  ]);

  startIntro();

  try { bgm.currentTime = 0; bgm.volume = 0.55; bgm.play().catch(()=>{}); } catch(_) {}

  playing = true;
}

function spawnGoons() {
  const positions = [
    { p: v3(-4, 0, 22), patrol: [v3(-4,0,22), v3(-4,0,40)] },
    { p: v3( 4, 0, 38), patrol: [v3( 4,0,38), v3( 4,0,52)] },
    { p: v3(-3, 0, 60), patrol: [v3(-3,0,60), v3(-3,0,80)] },
    { p: v3( 3, 0, 86), patrol: [v3( 3,0,86), v3( 3,0,108)] },
    { p: v3(-4, 0,115), patrol: [v3(-4,0,115),v3(-4,0,135)] },
    { p: v3( 4, 0,140), patrol: [v3( 4,0,140),v3( 4,0,158)] },
    { p: v3(-3, 0,170), patrol: [v3(-3,0,170),v3(-3,0,184)] }
  ];
  for (const pos of positions) {
    const g = new Goon(assets.goon, pos.p, pos.patrol);
    g.group.userData.ent = g;
    entities.goons.push(g);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Intro
// ─────────────────────────────────────────────────────────────────────────
const introLines = [
  ['YAARI TOWN · DAWN', '"They killed my brother on this street."'],
  ['BLOCK 7, SIGN GATE', '"Iqbal smokes on the rooftop like it\'s his city."'],
  ['THE SICKLE IS SHARP', '"He took a hand of mine. I\'ll take both of his."']
];
let introIndex = 0;
let introT = 0;

function startIntro() {
  cinemaActive = true;
  introOverlay.classList.remove('hidden');
  introIndex = 0; introT = 0;
  hero.pos.set(0, 0, -22);
  hero.aimYaw = 0;
  hero.facing = 0;
  introA.textContent = introLines[0][0];
  introB.textContent = introLines[0][1];
}
skipIntroBtn.onclick = endIntro;
function endIntro() {
  cinemaActive = false;
  introOverlay.classList.add('hidden');
  showToast('Move with WASD. Press Fire, F, Space, or click to attack. C lights a cigarette.');
}
function updateIntro(realDt) {
  introT += realDt;
  const t = introT;
  const camY = 5 + Math.sin(t*0.5)*0.6;
  const angle = -0.6 + t * 0.2;
  camera.position.set(Math.sin(angle)*10, camY, Math.cos(angle)*10 - 18);
  camera.lookAt(0, 2.5, 2);
  hero.pos.z = Math.min(-4, -22 + t * 1.6);
  hero.facing = 0; hero.aimYaw = 0;
  hero.moving = true;
  if (hero.actions.walkGun) hero.playAction('walkGun', 0.15, 0.8);
  else if (hero.actions.walk) hero.playAction('walk', 0.15, 0.8);
  hero.group.position.copy(hero.pos);
  hero.group.rotation.y = 0;
  const linePer = 3.0;
  const idx = Math.floor(t / linePer);
  if (idx !== introIndex && idx < introLines.length) {
    introIndex = idx;
    introA.textContent = introLines[idx][0];
    introB.textContent = introLines[idx][1];
  }
  if (t > linePer * introLines.length) endIntro();
}

// ─────────────────────────────────────────────────────────────────────────
// Comms / objectives
// ─────────────────────────────────────────────────────────────────────────
function setComms(msg) { comms.textContent = msg; }

const objectives = [];
function setObjectives(arr) {
  objectives.length = 0;
  arr.forEach(o => objectives.push({ ...o, done: false }));
  renderObjectives();
}
function completeObjective(id) {
  const o = objectives.find(o => o.id === id);
  if (o && !o.done) { o.done = true; renderObjectives(); }
}
function updateObjective(id, text) {
  const o = objectives.find(o => o.id === id);
  if (o) { o.text = text; renderObjectives(); }
}
function renderObjectives() {
  objectiveList.innerHTML = '';
  for (const o of objectives) {
    const d = document.createElement('div');
    if (o.done) d.classList.add('done');
    d.textContent = (o.done ? '✓ ' : '• ') + o.text;
    objectiveList.appendChild(d);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────────────────
function updateHUD() {
  healthFill.style.width = (hero.hp / HERO_MAX_HP * 100).toFixed(0) + '%';
  const ammoTxt = hero.reloading ? 'RELOADING' : `${hero.ammo}/${hero.reserve}`;
  statsEl.innerHTML = `HP <b>${hero.hp|0}</b> · AK <b>${ammoTxt}</b> · DYN <b>${hero.dynamiteCount}</b>`;
  if (entities.boss && entities.boss.activated) {
    bossBar.classList.remove('hidden');
    bossFill.style.width = (entities.boss.hp / entities.boss.maxHp * 100).toFixed(0) + '%';
  }
  if (hero.cigState === 'smoking') {
    cigBar.classList.remove('hidden');
    cigFill.style.width = (1 - hero.cigT/CIG_DUR) * 100 + '%';
    cigFill.style.background = 'linear-gradient(90deg, #cfa37e, #ffe6c8)';
  } else if (hero.cigState === 'cooldown') {
    cigBar.classList.remove('hidden');
    cigFill.style.width = (hero.cigT/CIG_COOLDOWN) * 100 + '%';
    cigFill.style.background = 'linear-gradient(90deg, #555, #cfa37e)';
  } else {
    cigBar.classList.add('hidden');
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Update helpers
// ─────────────────────────────────────────────────────────────────────────
function updateTracers(realDt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i]; t.t += realDt;
    t.line.material.opacity = Math.max(0, 1 - t.t/t.life);
    if (t.t > t.life) { scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); tracers.splice(i,1); }
  }
}
function updateFlashes(realDt) {
  for (let i = flashes.length-1; i >= 0; i--) {
    const f = flashes[i]; f.t += realDt;
    f.mesh.material.opacity = Math.max(0, 1 - f.t/f.life);
    f.mesh.scale.setScalar(1 + f.t*8);
    f.light.intensity *= 0.6;
    if (f.t > f.life) { scene.remove(f.mesh); scene.remove(f.light); f.mesh.geometry.dispose(); f.mesh.material.dispose(); flashes.splice(i,1); }
  }
}
function updateSmokes(dt) {
  for (let i = smokes.length-1; i >= 0; i--) {
    const s = smokes[i]; s.t += dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.scale.setScalar(1 + s.t*2);
    s.mesh.material.opacity = Math.max(0, 0.6 * (1 - s.t/s.life));
    if (s.t > s.life) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); smokes.splice(i,1); }
  }
}
function updateBlood(dt) {
  for (let i = blood.length-1; i >= 0; i--) {
    const b = blood[i]; b.t += dt;
    b.vel.y -= 9 * dt;
    b.mesh.position.addScaledVector(b.vel, dt);
    if (b.mesh.position.y < 0.05) { b.mesh.position.y = 0.05; b.vel.set(0,0,0); }
    if (b.t > b.life) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); blood.splice(i,1); }
  }
}
function updateFlyingLimbs(dt) {
  for (let i = flyingLimbs.length-1; i >= 0; i--) {
    const l = flyingLimbs[i]; l.t += dt;
    l.vel.y -= 9 * dt;
    l.mesh.position.addScaledVector(l.vel, dt);
    l.mesh.rotation.x += l.spin.x * dt;
    l.mesh.rotation.y += l.spin.y * dt;
    l.mesh.rotation.z += l.spin.z * dt;
    if (l.mesh.position.y < 0.1) { l.mesh.position.y = 0.1; l.vel.set(0,0,0); l.spin.set(0,0,0); }
    if (l.t > l.life) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); flyingLimbs.splice(i,1); }
  }
}
function updateExplosions(realDt) {
  for (let i = explosions.length-1; i >= 0; i--) {
    const e = explosions[i]; e.t += realDt;
    const k = e.t / e.life;
    e.ring.scale.setScalar(1 + k*22);
    e.ring.material.opacity = 1 - k;
    e.ball.scale.setScalar(1 + k*4);
    e.ball.material.opacity = 1 - k;
    e.light.intensity *= 0.85;
    if (e.t > e.life) {
      scene.remove(e.ring); scene.remove(e.ball); scene.remove(e.light);
      e.ring.geometry.dispose(); e.ring.material.dispose();
      e.ball.geometry.dispose(); e.ball.material.dispose();
      explosions.splice(i,1);
    }
  }
}
function updateCasings(realDt) {
  for (let i = casings.length - 1; i >= 0; i--) {
    const c = casings[i];
    c.t += realDt;
    c.vel.y -= 8.5 * realDt;
    c.mesh.position.addScaledVector(c.vel, realDt);
    c.mesh.rotation.x += c.spin.x * realDt;
    c.mesh.rotation.y += c.spin.y * realDt;
    c.mesh.rotation.z += c.spin.z * realDt;
    if (c.mesh.position.y < 0.05) {
      c.mesh.position.y = 0.05;
      c.vel.multiplyScalar(0.48);
      c.spin.multiplyScalar(0.55);
    }
    if (c.t > c.life) {
      scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
      casings.splice(i, 1);
    }
  }
}
function updateProjectiles(dt) {
  for (let i = projectiles.length-1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.kind === 'sickle') {
      p.t += dt;
      if (!p.returning) {
        p.pos.addScaledVector(p.vel, dt);
        const dist = p.pos.distanceTo(hero.pos);
        if (dist > p.maxReach) p.returning = true;
        if (entities.boss && entities.boss.alive && !p.hitSet.has('boss')) {
          if (p.pos.distanceTo(entities.boss.pos.clone().add(v3(0,1.2,0))) < 1.4) {
            p.hitSet.add('boss');
            if (entities.boss.phase === 1) {
              entities.boss.triggerSickleCut();
              completeObjective('sickle');
              showPrompt('LIMB SEVERED — DEAL THE FINAL BLOW');
              setTimeout(()=>showPrompt(''), 2500);
            } else {
              entities.boss.takeDamage(SICKLE_DMG);
            }
            p.returning = true;
          }
        }
        for (const g of entities.goons) {
          if (!g.alive || p.hitSet.has(g)) continue;
          if (p.pos.distanceTo(g.pos.clone().add(v3(0,1.2,0))) < 1.0) {
            p.hitSet.add(g);
            g.takeDamage(SICKLE_DMG);
          }
        }
      } else {
        const handPos = hero.rightHandMount.getWorldPosition(tmpV).clone();
        const dir = handPos.clone().sub(p.pos);
        const d = dir.length();
        if (d < 0.6) {
          scene.remove(p.mesh);
          hero.rightHandMount.add(p.mesh);
          p.mesh.position.set(0, -0.05, 0.1);
          p.mesh.rotation.set(0, 0, -0.5);
          p.mesh.scale.setScalar(1);
          hero.sickleInFlight = false;
          playSickleCatchSound();
          projectiles.splice(i, 1);
          continue;
        }
        dir.normalize();
        p.pos.addScaledVector(dir, SICKLE_SPEED * dt);
      }
      p.mesh.position.copy(p.pos);
      p.spin += dt * 28;
      p.mesh.rotation.set(0, p.spin, 0);
    } else if (p.kind === 'dynamite') {
      p.t += dt;
      p.fuse -= dt;
      p.vel.y -= 11 * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.2) { p.pos.y = 0.2; p.vel.y *= -0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; }
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.z += p.spin * 0.5 * dt;
      if (p.fuse <= 0) {
        scene.remove(p.mesh);
        spawnExplosion(p.pos.clone());
        projectiles.splice(i, 1);
      }
    }
  }
}
function updateFlags(realDt) {
  for (const f of wavingFlags) {
    const t = realClock.elapsedTime * 3 + f.id;
    const pos = f.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(t + x * 4) * 0.1 * (x+0.8));
    }
    pos.needsUpdate = true;
  }
}
function updateFlicker(realDt) {
  for (const l of flickerLights) {
    l.intensity = 0.28 + Math.sin(realClock.elapsedTime * 12 + l.position.x) * 0.08;
  }
}

let lastSeenComms = '';
function comm(msg) { if (msg && msg !== lastSeenComms) { lastSeenComms = msg; setComms(msg); } }

function maybeCompletionChecks() {
  if (!objectives[0].done && hero.pos.z > 6) {
    completeObjective('enter');
    comm('You crossed the gate. Yaari is watching.');
  }
  const total = entities.goons.length;
  const dead = entities.goons.filter(g => !g.alive).length;
  if (!objectives[1].done) {
    updateObjective('goons', `Clear Iqbal's patrols (${dead} / ${total})`);
    if (dead === total) {
      completeObjective('goons');
      comm('All patrols down. Iqbal heard the gunfire.');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Pause / restart / end
// ─────────────────────────────────────────────────────────────────────────
function togglePause() {
  if (!playing) return;
  paused = !paused;
  pauseModal.classList.toggle('hidden', !paused);
  if (paused) { try { bgm.pause(); } catch(_) {} }
  else { try { bgm.play().catch(()=>{}); } catch(_) {} }
}
function onGameOver(won, text) {
  playing = false;
  if (won) {
    completeModal.classList.remove('hidden');
    $('completeText').textContent = text;
  } else {
    failedModal.classList.remove('hidden');
    $('failedText').textContent = text;
  }
  try { bgm.pause(); } catch(_) {}
}
function returnToMenu() { location.reload(); }
function restartLevel()  { location.reload(); }

// ─────────────────────────────────────────────────────────────────────────
// Main loop
// ─────────────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const realDt = Math.min(0.05, realClock.getDelta());
  clock += realDt;

  if (!playing) { renderer.render(scene, camera); return; }
  if (paused)   { renderer.render(scene, camera); return; }

  const slow = hero && hero.cigState === 'smoking' ? CIG_SLOW : 1.0;
  const dt = realDt * slow;

  if (cinemaActive) updateIntro(realDt);

  if (hero) hero.update(dt, realDt);
  for (const g of entities.goons) g.update(dt, realDt);
  if (entities.boss) entities.boss.update(dt, realDt);

  if (input.fire && hero && hero.alive && hero.equipped === 'ak' && !cinemaActive) shootAK();

  updateProjectiles(dt);
  updateTracers(realDt);
  updateFlashes(realDt);
  updateSmokes(realDt);
  updateBlood(dt);
  updateFlyingLimbs(dt);
  updateExplosions(realDt);
  updateCasings(realDt);
  updateFlicker(realDt);
  updateFlags(realDt);

  if (!cinemaActive) updateCamera(realDt);
  updateHUD();
  maybeCompletionChecks();

  renderer.render(scene, camera);
}

// Boot the game
setupTouch();
boot();
animate();

window.__rev = { scene, camera, entities, get hero(){return hero;} };
