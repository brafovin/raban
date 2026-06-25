import * as THREE from 'three';
import { CFG, WORLD_HALF } from './config.js';
import { WEAPONS } from './weapons.js';

// ==============================================================
//  GLOBALS
// ==============================================================
let renderer, scene, camera, clock;
let player, bots = [], chests = [], drops = [], tracers = [];
let wallBoxes = [];
let yaw = 0, pitch = 0.25;
let keys = {};
let pointerLocked = false;
let running = false;
let aliveCount = CFG.botCount + 1;
let storm = { active:false, radius:WORLD_HALF*1.5, center:new THREE.Vector3(), mesh:null };

// State: 'lobby' | 'bus' | 'gliding' | 'playing'
let gameState = 'lobby';
let busMesh   = null;
let busT      = 0;
let gliderMesh = null;
let houseColorIdx = 0;

const BUS_START    = new THREE.Vector3(-300, 120, -260);
const BUS_END      = new THREE.Vector3( 300, 120,  260);
const BUS_DURATION = 28;   // seconds to cross map
const CAM_DIST = 11, CAM_H = 4;

const WEAPON_ICON = { pistol:'🔫', shotgun:'💥', rifle:'🪖', sniper:'🎯', smg:'⚡', rocket:'🚀' };

// ==============================================================
//  DOM
// ==============================================================
const dom = {
  root:       document.getElementById('game-root'),
  lobby:      document.getElementById('lobby'),
  hud:        document.getElementById('hud'),
  playBtn:    document.getElementById('play-btn'),
  deviceText: document.getElementById('device-text'),
  lobbySlots: document.getElementById('lobby-slots'),
  hotbar:     document.getElementById('hotbar'),
  hpBar:      document.getElementById('hp-bar'),
  hpText:     document.getElementById('hp-text'),
  alive:      document.getElementById('alive-counter'),
  stormWarn:  document.getElementById('storm-warn'),
  killfeed:   document.getElementById('killfeed'),
  minimap:    document.getElementById('minimap'),
  interact:   document.getElementById('interact-prompt'),
  lockHint:   document.getElementById('lock-hint'),
  endscreen:  document.getElementById('endscreen'),
  endPanel:   document.getElementById('end-panel'),
  endTitle:   document.getElementById('end-title'),
  endSub:     document.getElementById('end-sub'),
  restartBtn: document.getElementById('restart-btn'),
  busPrompt:  document.getElementById('bus-prompt'),
};
const mmCtx = dom.minimap.getContext('2d');

// ==============================================================
//  LOBBY
// ==============================================================
function buildLobby() {
  const starWrap = document.getElementById('lobby-stars');
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('i');
    const sz = (Math.random() * 2 + 1).toFixed(1);
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;opacity:${(Math.random()*0.6+0.3).toFixed(2)}`;
    starWrap.appendChild(s);
  }
  // Show only detected device type
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  dom.deviceText.textContent = isMobile ? '📱 Handy' : '🖥️ PC';

  const preview = ['pistol','rifle','shotgun','sniper','rocket'];
  for (let i = 0; i < 5; i++) {
    const w = WEAPONS.find(x => x.id === preview[i]);
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML = `<div class="num">${i+1}</div><div class="ico">${WEAPON_ICON[w.id]}</div><div class="nm" style="color:${w.rarityColor}">${w.name}</div>`;
    dom.lobbySlots.appendChild(slot);
  }
}

// ==============================================================
//  HELPERS
// ==============================================================
function makeBox(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.position.set(x, y, z);
  return mesh;
}
function rand(a, b) { return Math.random() * (b - a) + a; }

// ==============================================================
//  WORLD BUILDING
// ==============================================================
const HOUSE_COLORS = [
  [0xe8d4a8, 0x7a3b16],  // tan
  [0x90b8e0, 0x2a4870],  // blue
  [0xecd480, 0x7a5010],  // yellow
  [0xa8c890, 0x326030],  // green
  [0xe0a890, 0x6a2818],  // brick red
  [0xd0ccc4, 0x485868],  // gray
  [0xecc0d0, 0x703050],  // rose
];

function buildWorld() {
  // Pink/purple Battle-Woods sky
  scene.background = new THREE.Color(0xd4a0c0);
  scene.fog = new THREE.Fog(0xd4a0c0, 200, 450);

  // Warm lighting
  scene.add(new THREE.HemisphereLight(0xffe8f8, 0x4a6c30, 0.9));
  const sun = new THREE.DirectionalLight(0xffd8b0, 1.1);
  sun.position.set(100, 200, 60);
  scene.add(sun);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF*2+100, WORLD_HALF*2+100),
    new THREE.MeshLambertMaterial({ color: 0x52a844 })
  );
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  // Roads with sidewalk strips
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x383840 });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0x6c6874 });
  const addRoad = (x, z, w, d) => {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(w+5, d+5), sideMat);
    sw.rotation.x = -Math.PI/2; sw.position.set(x, 0.03, z); scene.add(sw);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    r.rotation.x = -Math.PI/2; r.position.set(x, 0.06, z); scene.add(r);
  };
  addRoad(0, 0, WORLD_HALF*2, 14);
  addRoad(0, 0, 14, WORLD_HALF*2);
  addRoad(0, -80, 200, 9); addRoad(0,  80, 200, 9);
  addRoad(-80, 0, 9, 200); addRoad( 80, 0, 9, 200);
  // Diagonal connectors
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(9, 60), roadMat);
    seg.rotation.x = -Math.PI/2; seg.rotation.z = angle;
    seg.position.set(Math.cos(angle)*130, 0.07, Math.sin(angle)*130);
    scene.add(seg);
  }

  houseColorIdx = 0;
  for (const h of CFG.houses) buildHouse(h);
  for (const t of CFG.trees)  buildTree(t.x, t.z);
  buildSign(-195, -195);

  // World fence
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x181820 });
  const edge = WORLD_HALF + 20;
  for (const [fx, fz, fw, fd] of [
    [0, -edge, edge*2+1, 1], [0, edge, edge*2+1, 1],
    [-edge, 0, 1, edge*2+1], [edge, 0, 1, edge*2+1],
  ]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, 10, fd), fenceMat);
    f.position.set(fx, 5, fz); scene.add(f);
  }
}

function buildHouse(h) {
  const group = new THREE.Group();
  const [wallC, roofC] = HOUSE_COLORS[houseColorIdx++ % HOUSE_COLORS.length];
  const { x, z, w, d, h: ht } = h;
  const stories = Math.max(1, Math.round(ht / 8));
  const storyH  = ht / stories;
  const t = 1.2;

  group.add(makeBox(w, ht, t, wallC, x, ht/2, z - d/2));
  group.add(makeBox(t, ht, d, wallC, x - w/2, ht/2, z));
  group.add(makeBox(t, ht, d, wallC, x + w/2, ht/2, z));
  const doorW = 5, doorH = Math.min(9, ht * 0.6);
  const sw = (w - doorW) / 2;
  group.add(makeBox(sw, ht, t, wallC, x - w/2 + sw/2, ht/2, z + d/2));
  group.add(makeBox(sw, ht, t, wallC, x + w/2 - sw/2, ht/2, z + d/2));
  group.add(makeBox(doorW, ht - doorH, t, wallC, x, ht - (ht-doorH)/2, z + d/2));

  // Floor bands between stories
  for (let s = 1; s < stories; s++) {
    group.add(makeBox(w + 2, 1.4, d + 2, roofC, x, s * storyH, z));
  }
  group.add(makeBox(w + 2, 1.6, d + 2, roofC, x, ht + 0.8, z));

  // Windows
  const winMat = new THREE.MeshLambertMaterial({ color: 0xaaddff, emissive: 0x1a3050 });
  for (let s = 0; s < stories; s++) {
    const winY = s * storyH + storyH * 0.55;
    for (const side of [-1, 1]) {
      const winX = x + side * (w/2 + 0.2);
      const wCount = Math.max(1, Math.floor(d / 8));
      for (let wi = 0; wi < wCount; wi++) {
        const wz = z - d/2 + 4 + wi * (d / wCount);
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 2.8), winMat);
        win.position.set(winX, winY, wz);
        group.add(win);
      }
    }
  }

  scene.add(group);
  wallBoxes.push({ minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2 });
}

function buildTree(x, z) {
  const trunkH = 10 + Math.random() * 8;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 1.1, trunkH, 7),
    new THREE.MeshLambertMaterial({ color: 0x4a2a0e })
  );
  trunk.position.set(x, trunkH/2, z);
  scene.add(trunk);

  // Multi-layer pine cones
  const layers = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < layers; i++) {
    const r = 5.5 - i * 0.7;
    const h = 9 - i * 0.8;
    const yPos = trunkH + i * 4.2 - i * 0.4;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 8),
      new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0x1a5a18 : 0x226622 })
    );
    cone.position.set(x, yPos, z);
    scene.add(cone);
  }
  wallBoxes.push({ minX: x-1.5, maxX: x+1.5, minZ: z-1.5, maxZ: z+1.5 });
}

function buildSign(x, z) {
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a2010 });
  for (const px of [x-18, x, x+18]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 28, 6), poleMat);
    pole.position.set(px, 14, z); scene.add(pole);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(50, 11, 1.8),
    new THREE.MeshLambertMaterial({ color: 0x1e1008 }));
  board.position.set(x, 30, z); scene.add(board);
  const lMat = new THREE.MeshLambertMaterial({ color: 0xf5f0dc, emissive: 0x201808 });
  for (const ox of [-21,-15,-9,-3,3,9,15,21]) {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(4, 7.5, 0.9), lMat);
    blk.position.set(x + ox, 30, z - 1.4); scene.add(blk);
  }
}

// ==============================================================
//  BATTLE BUS
// ==============================================================
function buildBusMesh() {
  const g = new THREE.Group();
  g.add(makeBox(22, 8, 9, 0xffcc00, 0, 0, 0));
  g.add(makeBox(22, 1.2, 9.6, 0xffaa00, 0, 4.1, 0));

  const winMat = new THREE.MeshLambertMaterial({ color: 0x88ccff, emissive: 0x224466 });
  for (let i = -2; i <= 2; i++) {
    for (const sx of [-11, 11]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.5, 2.0), winMat);
      w.position.set(sx, 0.5, i * 2.2); g.add(w);
    }
  }

  // Balloon
  const balloon = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0x4488ff }));
  balloon.scale.set(1.5, 1.1, 1.5); balloon.position.set(0, 19, 0); g.add(balloon);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 11, 4),
    new THREE.MeshLambertMaterial({ color: 0x887744 }));
  rope.position.set(0, 9.5, 0); g.add(rope);

  // Wheels
  const wMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  for (const [wx, wz] of [[-7,3.5],[7,3.5],[-7,-3.5],[7,-3.5]]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2, 8), wMat);
    wh.rotation.z = Math.PI/2; wh.position.set(wx, -3.5, wz); g.add(wh);
  }

  // Propeller
  const propGroup = new THREE.Group();
  propGroup.position.set(-11, 0, 0);
  for (let i = 0; i < 3; i++) {
    const blade = makeBox(1.2, 0.5, 7, 0xcccc88, 0, 0, 0);
    blade.rotation.z = (i / 3) * Math.PI * 2;
    propGroup.add(blade);
  }
  g.add(propGroup);
  g.userData.propeller = propGroup;
  return g;
}

function startBusPhase() {
  busMesh = buildBusMesh();
  busT = 0;
  const dir = BUS_END.clone().sub(BUS_START).normalize();
  busMesh.rotation.y = Math.atan2(dir.x, dir.z);
  busMesh.position.copy(BUS_START);
  scene.add(busMesh);
  player.group.visible = false;
  dom.busPrompt.classList.remove('hidden');
}

function updateBus(dt) {
  busT += dt / BUS_DURATION;
  if (busT >= 1) { busT = 1; jumpFromBus(); return; }

  const pos = BUS_START.clone().lerp(BUS_END, busT);
  busMesh.position.copy(pos);
  if (busMesh.userData.propeller) busMesh.userData.propeller.rotation.z += dt * 7;

  // Cinematic camera: follows from side-behind
  const dir = BUS_END.clone().sub(BUS_START).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const camPos = pos.clone()
    .add(dir.clone().multiplyScalar(-30))
    .add(side.clone().multiplyScalar(18))
    .add(new THREE.Vector3(0, 14, 0));
  camera.position.lerp(camPos, 0.05);
  camera.lookAt(pos.x, pos.y - 5, pos.z);
}

function jumpFromBus() {
  if (gameState !== 'bus') return;
  gameState = 'gliding';

  const busPos = busMesh.position.clone();
  scene.remove(busMesh); busMesh = null;
  dom.busPrompt.classList.add('hidden');

  player.pos.set(
    Math.max(-WORLD_HALF, Math.min(WORLD_HALF, busPos.x)),
    busPos.y,
    Math.max(-WORLD_HALF, Math.min(WORLD_HALF, busPos.z))
  );
  player.group.position.copy(player.pos);
  player.group.visible = true;
  player.vy = -1;

  // Glider wing mesh
  gliderMesh = new THREE.Group();
  const wMat = new THREE.MeshLambertMaterial({ color: 0xee5520 });
  for (const ox of [-9, 9]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 6), wMat);
    wing.position.set(ox, 0, 0); gliderMesh.add(wing);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10, 4),
    new THREE.MeshLambertMaterial({ color: 0x999999 }));
  mast.position.set(0, -5, 0); gliderMesh.add(mast);
  gliderMesh.position.set(0, 10, 0);
  player.group.add(gliderMesh);
}

function updateGliding(dt) {
  // Horizontal steering
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right   = new THREE.Vector3(Math.sin(yaw - Math.PI/2), 0, Math.cos(yaw - Math.PI/2));
  let move = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp'])    move.add(forward);
  if (keys['KeyS'] || keys['ArrowDown'])  move.sub(forward);
  if (keys['KeyD'] || keys['ArrowRight']) move.add(right);
  if (keys['KeyA'] || keys['ArrowLeft'])  move.sub(right);
  if (move.length() > 0.1) {
    move.normalize().multiplyScalar(30 * dt);
    player.pos.x = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, player.pos.x + move.x));
    player.pos.z = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, player.pos.z + move.z));
    player.group.rotation.y = Math.atan2(move.x, move.z);
  }

  // Slow fall (glider)
  player.vy = Math.max(player.vy - 3 * dt, -12);
  let y = player.group.position.y + player.vy * dt;

  if (y <= 0) {
    y = 0; player.vy = 0; player.onGround = true;
    if (gliderMesh) { player.group.remove(gliderMesh); gliderMesh = null; }
    gameState = 'playing'; running = true;
    player.spawnProtectUntil = performance.now() + 2000;
    setTimeout(() => { if (running) startStorm(); }, CFG.stormStartMs);
    dom.root.requestPointerLock?.();
  }

  player.group.position.set(player.pos.x, y, player.pos.z);

  // Camera follows during glide
  const camOff = new THREE.Vector3(
    Math.sin(yaw) * -20, 8 + y * 0.04, Math.cos(yaw) * -20
  );
  camera.position.lerp(
    new THREE.Vector3(player.pos.x, y, player.pos.z).add(camOff), 0.2
  );
  camera.lookAt(player.pos.x, y + 5, player.pos.z);
}

// ==============================================================
//  CHARACTERS WITH PIVOT GROUPS (walk animation)
// ==============================================================
function buildCharacter(skin, shirt, pants) {
  const g = new THREE.Group();

  // Left leg — pivot at hip (y=2.4)
  const legL = new THREE.Group(); legL.position.set(-0.8, 2.4, 0);
  legL.add(makeBox(1.3, 2.4, 1.3, pants, 0, -1.2, 0));
  g.add(legL); g.userData.legL = legL;

  // Right leg
  const legR = new THREE.Group(); legR.position.set(0.8, 2.4, 0);
  legR.add(makeBox(1.3, 2.4, 1.3, pants, 0, -1.2, 0));
  g.add(legR); g.userData.legR = legR;

  // Torso
  g.add(makeBox(3.2, 3.2, 1.8, shirt, 0, 4.0, 0));

  // Left arm — pivot at shoulder (y=5.4)
  const armL = new THREE.Group(); armL.position.set(-2.1, 5.4, 0);
  armL.add(makeBox(0.9, 2.8, 0.9, shirt, 0, -1.4, 0));
  g.add(armL); g.userData.armL = armL;

  // Right arm
  const armR = new THREE.Group(); armR.position.set(2.1, 5.4, 0);
  armR.add(makeBox(0.9, 2.8, 0.9, shirt, 0, -1.4, 0));
  g.add(armR); g.userData.armR = armR;

  // Head + nose
  g.add(makeBox(1.8, 1.8, 1.8, skin, 0, 6.6, 0));
  g.add(makeBox(0.5, 0.5, 0.4, 0x222222, 0, 6.6, 1.05));
  return g;
}

function animateWalk(group, isMoving, time) {
  const { legL, legR, armL, armR } = group.userData;
  if (!legL) return;
  if (isMoving) {
    const s = Math.sin(time * 9) * 0.55;
    legL.rotation.x =  s; legR.rotation.x = -s;
    armL.rotation.x = -s * 0.65; armR.rotation.x = s * 0.65;
  } else {
    legL.rotation.x *= 0.82; legR.rotation.x *= 0.82;
    armL.rotation.x *= 0.82; armR.rotation.x *= 0.82;
  }
}

function makeNameTag(text, color) {
  const cnv = document.createElement('canvas');
  cnv.width = 256; cnv.height = 64;
  const c = cnv.getContext('2d');
  c.font = 'bold 36px Arial'; c.textAlign = 'center';
  c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText(text, 128, 44);
  c.fillStyle = color; c.fillText(text, 128, 44);
  const tex = new THREE.CanvasTexture(cnv);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  spr.scale.set(8, 2, 1); spr.position.y = 9;
  return spr;
}

function makeHealthSprite() {
  const cnv = document.createElement('canvas');
  cnv.width = 128; cnv.height = 16;
  const tex = new THREE.CanvasTexture(cnv);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  spr.scale.set(6, 0.75, 1); spr.position.y = 8;
  return { spr, cnv, tex };
}

function updateHealthSprite(hb, ratio) {
  const c = hb.cnv.getContext('2d');
  c.clearRect(0, 0, 128, 16);
  c.fillStyle = '#000'; c.fillRect(0, 0, 128, 16);
  c.fillStyle = ratio > 0.5 ? '#33dd44' : ratio > 0.25 ? '#ddbb00' : '#dd2222';
  c.fillRect(2, 2, 124 * Math.max(0, ratio), 12);
  hb.tex.needsUpdate = true;
}

// ==============================================================
//  PLAYER
// ==============================================================
function createPlayer() {
  const group = buildCharacter(0xf0c080, 0x3366cc, 0x223355);
  group.position.set(0, 0, 0);
  scene.add(group);
  return {
    group,
    pos: new THREE.Vector3(0, 0, 0),
    vy: 0, onGround: true,
    health: 100, maxHealth: 100,
    inventory: Array(5).fill(null),
    selectedSlot: 0,
    lastShot: 0,
    isAlive: true,
    spawnProtectUntil: 0,
  };
}

// ==============================================================
//  BOTS
// ==============================================================
function createBot(index) {
  const colors = [0xff4444,0xff8800,0xffaa00,0xaa44ff,0xff44aa,0x22ccaa,0xff6644,0xddaa00];
  const shirt = colors[index % colors.length];
  const name = CFG.botNames[index] || ('Bot_' + index);
  const sp = CFG.spawnPoints[index % CFG.spawnPoints.length];
  const bx = sp.x + rand(-30, 30);
  const bz = sp.z + rand(-30, 30);

  const group = buildCharacter(0xf0c080, shirt, 0x333333);
  group.position.set(bx, 0, bz);
  const tag = makeNameTag(name, '#ffffff');
  const hb = makeHealthSprite();
  group.add(tag); group.add(hb.spr);
  scene.add(group);

  return {
    group, name, hb,
    pos: new THREE.Vector3(bx, 0, bz),
    health: 100, maxHealth: 100,
    weapon: { ...WEAPONS[Math.floor(Math.random() * WEAPONS.length)] },
    isAlive: true, state: 'wander',
    wanderTarget: new THREE.Vector3(rand(-WORLD_HALF, WORLD_HALF), 0, rand(-WORLD_HALF, WORLD_HALF)),
    wanderTimer: 0, lastShot: 0, facing: 0, isMoving: false,
  };
}

// ==============================================================
//  CHESTS & DROPS
// ==============================================================
function buildChests() {
  for (const cd of CFG.chests) {
    const group = new THREE.Group();
    const base = makeBox(3.4, 2.2, 3.4, 0xcc9900, 0, 1.1, 0);
    const lid  = makeBox(3.6, 1.0, 3.6, 0xffcc00, 0, 2.6, 0);
    group.add(base); group.add(lid);
    group.position.set(cd.x, 0, cd.z);
    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    glow.position.set(cd.x, 15, cd.z);
    scene.add(glow); scene.add(group);
    chests.push({ group, lid, glow, x: cd.x, z: cd.z, isOpen: false });
  }
}

function openChest(chest) {
  if (chest.isOpen) return;
  chest.isOpen = true;
  chest.lid.rotation.x = -1.2; chest.lid.position.z = -1.6;
  chest.lid.material.color.set(0x886600);
  chest.glow.visible = false;
  for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
    spawnDrop(chest.x + rand(-4,4), chest.z + rand(-4,4),
      WEAPONS[Math.floor(Math.random() * WEAPONS.length)]);
  }
}

function spawnDrop(x, z, weaponData) {
  const col = parseInt(weaponData.rarityColor.slice(1), 16);
  const mesh = makeBox(3, 1, 1.4, col, x, 1.5, z);
  mesh.material = new THREE.MeshLambertMaterial({ color: col, emissive: new THREE.Color(col).multiplyScalar(0.25) });
  const tag = makeNameTag(weaponData.name, weaponData.rarityColor);
  tag.position.y = 4; tag.scale.set(6, 1.5, 1);
  mesh.add(tag); scene.add(mesh);
  drops.push({ mesh, weapon: weaponData, x, z, baseY: 1.5, t: Math.random() * 6 });
}

// ==============================================================
//  COLLISION
// ==============================================================
function resolveCollision(pos, radius) {
  for (const b of wallBoxes) {
    const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - cx, dz = pos.z - cz;
    const distSq = dx*dx + dz*dz;
    if (distSq < radius*radius) {
      if (distSq < 0.0001) {
        const l = Math.abs(pos.x-b.minX), r = Math.abs(b.maxX-pos.x);
        const t = Math.abs(pos.z-b.minZ), bt = Math.abs(b.maxZ-pos.z);
        const m = Math.min(l,r,t,bt);
        if (m===l) pos.x=b.minX-radius; else if(m===r) pos.x=b.maxX+radius;
        else if(m===t) pos.z=b.minZ-radius; else pos.z=b.maxZ+radius;
      } else {
        const dist = Math.sqrt(distSq);
        const push = (radius - dist) / dist;
        pos.x += dx * push; pos.z += dz * push;
      }
    }
  }
  const lim = WORLD_HALF + 14;
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.z = Math.max(-lim, Math.min(lim, pos.z));
}

// ==============================================================
//  INPUT
// ==============================================================
function setupInput() {
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState === 'bus' && e.code === 'Space') { e.preventDefault(); jumpFromBus(); return; }
    if (gameState !== 'playing') return;
    if (e.code === 'Digit1') selectSlot(0);
    if (e.code === 'Digit2') selectSlot(1);
    if (e.code === 'Digit3') selectSlot(2);
    if (e.code === 'Digit4') selectSlot(3);
    if (e.code === 'Digit5') selectSlot(4);
    if (e.code === 'KeyG') dropWeapon();
    if (e.code === 'KeyE') interactChest();
    if (e.code === 'Space') { e.preventDefault(); jump(); }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  dom.root.addEventListener('click', () => {
    if ((gameState === 'playing' || gameState === 'gliding') && !pointerLocked)
      dom.root.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === dom.root;
    dom.lockHint.classList.toggle('hidden', pointerLocked || gameState !== 'playing');
  });
  document.addEventListener('mousemove', e => {
    if (!pointerLocked) return;
    yaw   -= e.movementX * 0.0024;
    pitch -= e.movementY * 0.0024;
    pitch = Math.max(-0.25, Math.min(1.1, pitch));
  });
  document.addEventListener('mousedown', e => {
    if (gameState === 'playing' && pointerLocked && e.button === 0) playerShoot();
  });
  window.addEventListener('wheel', e => {
    if (gameState !== 'playing') return;
    selectSlot((player.selectedSlot + (e.deltaY > 0 ? 1 : -1) + 5) % 5);
  });

  // Mobile touch
  let lastTouch = null;
  dom.root.addEventListener('touchstart', e => {
    lastTouch = e.touches[0];
    if (gameState === 'bus') { jumpFromBus(); return; }
  });
  dom.root.addEventListener('touchmove', e => {
    if (!lastTouch || gameState === 'bus') return;
    const t = e.touches[0];
    yaw   -= (t.clientX - lastTouch.clientX) * 0.006;
    pitch -= (t.clientY - lastTouch.clientY) * 0.006;
    pitch = Math.max(-0.25, Math.min(1.1, pitch));
    lastTouch = t;
  });
  dom.root.addEventListener('touchend', () => {
    lastTouch = null;
    if (gameState === 'playing') playerShoot();
  });
}

// ==============================================================
//  GAMEPLAY ACTIONS
// ==============================================================
function selectSlot(i) { player.selectedSlot = i; renderHotbar(); }
function jump() { if (player.onGround) { player.vy = 22; player.onGround = false; } }

function dropWeapon() {
  const i = player.selectedSlot, item = player.inventory[i];
  if (!item) return;
  const wd = WEAPONS.find(w => w.id === item.id);
  if (wd) spawnDrop(player.pos.x + rand(-3,3), player.pos.z + rand(-3,3), wd);
  player.inventory[i] = null; renderHotbar();
}

function interactChest() {
  for (const c of chests) {
    if (!c.isOpen && Math.hypot(player.pos.x - c.x, player.pos.z - c.z) < 8) {
      openChest(c); return;
    }
  }
}

function addToInventory(weaponData) {
  let slot = player.inventory.findIndex(s => s === null);
  if (slot === -1) slot = player.selectedSlot;
  player.inventory[slot] = {
    id: weaponData.id, name: weaponData.name, damage: weaponData.damage,
    fireRate: weaponData.fireRate, range: weaponData.range, spread: weaponData.spread,
    pellets: weaponData.pellets, explosive: weaponData.explosive,
    explosionR: weaponData.explosionR, tracer: weaponData.tracer,
    rarity: weaponData.rarity, ammo: 999, maxAmmo: 999,
  };
  renderHotbar();
}

function playerShoot() {
  const slot = player.inventory[player.selectedSlot];
  if (!slot) return;
  const now = performance.now();
  if (now - player.lastShot < slot.fireRate) return;
  player.lastShot = now;
  const origin = new THREE.Vector3(player.pos.x, CFG.playerHeight, player.pos.z);
  const baseDir = new THREE.Vector3();
  camera.getWorldDirection(baseDir);
  for (let s = 0; s < (slot.pellets || 1); s++) {
    const dir = baseDir.clone();
    dir.x += rand(-slot.spread, slot.spread);
    dir.y += rand(-slot.spread, slot.spread);
    dir.z += rand(-slot.spread, slot.spread);
    fireRay(origin, dir.normalize(), slot, false);
  }
}

function fireRay(origin, dir, weapon, isBot) {
  let hitDist = weapon.range, hitBot = null, hitPlayer = false;
  if (!isBot) {
    for (const bot of bots) {
      if (!bot.isAlive) continue;
      const t = rayHitsSphere(origin, dir, new THREE.Vector3(bot.pos.x, 4, bot.pos.z), 2.6);
      if (t !== null && t < hitDist) { hitDist = t; hitBot = bot; }
    }
  } else {
    const t = rayHitsSphere(origin, dir, new THREE.Vector3(player.pos.x, 4, player.pos.z), 2.6);
    if (t !== null && t < hitDist) { hitDist = t; hitPlayer = true; }
  }
  const hitPoint = origin.clone().add(dir.clone().multiplyScalar(hitDist));
  if (hitBot) { damageBot(hitBot, weapon.damage); if (weapon.explosive) explosion(hitPoint, weapon.explosionR, weapon.damage*0.5, isBot); }
  else if (hitPlayer) { damagePlayer(weapon.damage); if (weapon.explosive) explosion(hitPoint, weapon.explosionR, weapon.damage*0.5, isBot); }
  spawnTracer(origin, hitPoint, weapon.tracer || 0xffff88);
}

function rayHitsSphere(origin, dir, center, radius) {
  const oc = origin.clone().sub(center);
  const b = oc.dot(dir), c = oc.dot(oc) - radius*radius;
  const disc = b*b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : null;
}

function explosion(point, radius, dmg, isBot) {
  const flash = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 }));
  flash.position.copy(point); scene.add(flash);
  tracers.push({ mesh: flash, born: performance.now(), life: 350, expand: true });
  for (const bot of bots) {
    if (bot.isAlive && new THREE.Vector3(bot.pos.x,4,bot.pos.z).distanceTo(point) < radius)
      damageBot(bot, dmg);
  }
  if (new THREE.Vector3(player.pos.x,4,player.pos.z).distanceTo(point) < radius) damagePlayer(dmg);
}

function spawnTracer(a, b, color) {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([a, b]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
  scene.add(line);
  tracers.push({ mesh: line, born: performance.now(), life: 90 });
}

// ==============================================================
//  DAMAGE
// ==============================================================
function damageBot(bot, dmg) {
  if (!bot.isAlive) return;
  bot.health -= dmg;
  updateHealthSprite(bot.hb, bot.health / bot.maxHealth);
  if (bot.health <= 0) {
    bot.isAlive = false; aliveCount--;
    spawnDrop(bot.pos.x, bot.pos.z, bot.weapon);
    scene.remove(bot.group);
    addKillFeed('Du', bot.name);
    updateAlive();
  }
}

function damagePlayer(dmg) {
  if (!player.isAlive || gameState !== 'playing') return;
  if (performance.now() < player.spawnProtectUntil) return;
  player.health -= dmg;
  if (player.health <= 0) { player.health = 0; player.isAlive = false; endGame(false); }
  renderHP();
}

// ==============================================================
//  STORM
// ==============================================================
function startStorm() {
  storm.active = true;
  storm.radius = WORLD_HALF * 1.1;
  storm.targetRadius = 40;
  storm.mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(storm.radius, storm.radius, 80, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4040ff, transparent: true, opacity: 0.18, side: THREE.BackSide })
  );
  storm.mesh.position.set(0, 40, 0);
  scene.add(storm.mesh);
  dom.stormWarn.textContent = '⚡ Sturm zieht auf!';
}

function updateStorm(dt) {
  if (!storm.active) return;
  if (storm.radius > storm.targetRadius) {
    storm.radius -= CFG.stormShrinkRate * dt;
    storm.mesh.scale.set(storm.radius / (WORLD_HALF * 1.1), 1, storm.radius / (WORLD_HALF * 1.1));
  }
  const pd = Math.hypot(player.pos.x - storm.center.x, player.pos.z - storm.center.z);
  if (pd > storm.radius) {
    damagePlayer(CFG.stormDamage * dt);
    dom.stormWarn.textContent = '🌩️ Im Sturm! Lauf zur Mitte!';
    dom.stormWarn.style.color = '#ff5555';
  } else {
    dom.stormWarn.textContent = '⚡ Sicherer Bereich schrumpft';
    dom.stormWarn.style.color = '#8a8aff';
  }
}

// ==============================================================
//  BOT AI
// ==============================================================
function updateBots(dt, now) {
  const time = now / 1000;
  for (const bot of bots) {
    if (!bot.isAlive) continue;
    const toPlayer = new THREE.Vector3(player.pos.x - bot.pos.x, 0, player.pos.z - bot.pos.z);
    const dist = toPlayer.length();

    if (!player.isAlive || dist > 130) bot.state = 'wander';
    else if (dist > 40) bot.state = 'chase';
    else bot.state = 'attack';

    let move = new THREE.Vector3();
    bot.isMoving = false;

    if (bot.state === 'wander') {
      if (bot.pos.distanceTo(bot.wanderTarget) < 8 || now > bot.wanderTimer) {
        bot.wanderTarget.set(rand(-WORLD_HALF, WORLD_HALF), 0, rand(-WORLD_HALF, WORLD_HALF));
        bot.wanderTimer = now + rand(5000, 13000);
      }
      move = new THREE.Vector3(bot.wanderTarget.x - bot.pos.x, 0, bot.wanderTarget.z - bot.pos.z);
      if (move.length() > 0.1) {
        move.normalize().multiplyScalar(CFG.botSpeed * 0.6 * dt);
        bot.facing = Math.atan2(move.x, move.z);
        bot.isMoving = true;
      }
    } else if (bot.state === 'chase') {
      move = toPlayer.clone().normalize().multiplyScalar(CFG.botSpeed * dt);
      bot.facing = Math.atan2(toPlayer.x, toPlayer.z);
      bot.isMoving = true;
    } else {
      bot.facing = Math.atan2(toPlayer.x, toPlayer.z);
      if (now - bot.lastShot > bot.weapon.fireRate + rand(100, 500)) {
        bot.lastShot = now;
        const origin = new THREE.Vector3(bot.pos.x, 4, bot.pos.z);
        const dir = new THREE.Vector3(toPlayer.x, rand(-1, 1), toPlayer.z).normalize();
        dir.x += rand(-0.06, 0.06); dir.z += rand(-0.06, 0.06);
        fireRay(origin, dir.normalize(), bot.weapon, true);
      }
    }

    bot.pos.add(move);
    resolveCollision(bot.pos, CFG.botRadius);
    bot.group.position.set(bot.pos.x, 0, bot.pos.z);
    bot.group.rotation.y = bot.facing;
    animateWalk(bot.group, bot.isMoving, time);
  }
}

// ==============================================================
//  PLAYER UPDATE + CAMERA
// ==============================================================
function updatePlayer(dt) {
  if (!player.isAlive) return;
  const time = performance.now() / 1000;

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right   = new THREE.Vector3(Math.sin(yaw - Math.PI/2), 0, Math.cos(yaw - Math.PI/2));
  let move = new THREE.Vector3();
  let isMoving = false;

  if (keys['KeyW'] || keys['ArrowUp'])    { move.add(forward); isMoving = true; }
  if (keys['KeyS'] || keys['ArrowDown'])  { move.sub(forward); isMoving = true; }
  if (keys['KeyD'] || keys['ArrowRight']) { move.add(right);   isMoving = true; }
  if (keys['KeyA'] || keys['ArrowLeft'])  { move.sub(right);   isMoving = true; }

  if (isMoving) {
    move.normalize().multiplyScalar(CFG.playerSpeed * dt);
    player.pos.x += move.x; player.pos.z += move.z;
    player.group.rotation.y = Math.atan2(move.x, move.z);
  }

  resolveCollision(player.pos, CFG.playerRadius);
  animateWalk(player.group, isMoving, time);

  // Gravity + jump
  player.vy -= 60 * dt;
  let y = player.group.position.y + player.vy * dt;
  if (y <= 0) { y = 0; player.vy = 0; player.onGround = true; }
  else player.onGround = false;
  player.group.position.set(player.pos.x, y, player.pos.z);

  // Third-person camera (lowered to ground level)
  const camOffset = new THREE.Vector3(
    Math.sin(yaw) * -CAM_DIST * Math.cos(pitch),
    CAM_H + Math.sin(pitch) * CAM_DIST,
    Math.cos(yaw) * -CAM_DIST * Math.cos(pitch)
  );
  camera.position.lerp(new THREE.Vector3(player.pos.x, y, player.pos.z).add(camOffset), 0.35);
  camera.lookAt(player.pos.x, y + 3, player.pos.z);
}

// ==============================================================
//  TRACERS / DROPS
// ==============================================================
function updateTracers(now) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    const age = now - t.born;
    if (age > t.life) { scene.remove(t.mesh); tracers.splice(i, 1); continue; }
    const k = 1 - age / t.life;
    if (t.mesh.material) t.mesh.material.opacity = k * 0.9;
    if (t.expand) t.mesh.scale.setScalar(1 + (1 - k) * 0.8);
  }
}

function updateDrops(dt) {
  const px = player.pos.x, pz = player.pos.z;
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.t += dt * 2;
    d.mesh.position.y = d.baseY + Math.sin(d.t) * 0.4;
    d.mesh.rotation.y += dt * 1.5;
    if (Math.hypot(px - d.x, pz - d.z) < 4) {
      addToInventory(d.weapon); scene.remove(d.mesh); drops.splice(i, 1);
    }
  }
}

// ==============================================================
//  HUD
// ==============================================================
function renderHotbar() {
  dom.hotbar.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const item = player.inventory[i];
    const div = document.createElement('div');
    div.className = 'wslot' + (i === player.selectedSlot ? ' sel' : '');
    if (item) {
      div.style.borderColor = (WEAPONS.find(w => w.id === item.id) || {}).rarityColor || '#88aaff';
      div.innerHTML = `<div class="n">${i+1}</div><div class="ico">${WEAPON_ICON[item.id]||'🔫'}</div><div class="wn">${item.name}</div>`;
    } else {
      div.innerHTML = `<div class="n">${i+1}</div>`;
    }
    dom.hotbar.appendChild(div);
  }
}

function renderHP() {
  const r = Math.max(0, player.health / player.maxHealth);
  dom.hpBar.style.width = (r * 100) + '%';
  dom.hpBar.style.background = r > 0.5 ? '#32dd50' : r > 0.25 ? '#ddbb30' : '#dd3030';
  dom.hpText.textContent = Math.ceil(player.health) + ' HP';
}

function updateAlive() { dom.alive.textContent = 'Alive: ' + aliveCount; }

function addKillFeed(killer, victim) {
  const e = document.createElement('div');
  e.className = 'kf'; e.textContent = `${killer} ⚡ ${victim}`;
  dom.killfeed.appendChild(e);
  setTimeout(() => { e.style.opacity = '0'; setTimeout(() => e.remove(), 500); }, 5000);
}

function updateInteractPrompt() {
  let near = false;
  for (const c of chests) {
    if (!c.isOpen && Math.hypot(player.pos.x - c.x, player.pos.z - c.z) < 8) { near = true; break; }
  }
  dom.interact.classList.toggle('hidden', !near);
}

function drawMinimap() {
  const size = 200, half = WORLD_HALF + 20;
  const toMap = v => (v + half) / (half * 2) * size;
  mmCtx.clearRect(0, 0, size, size);
  mmCtx.fillStyle = '#2e6b2e'; mmCtx.fillRect(0, 0, size, size);
  mmCtx.fillStyle = '#555';
  mmCtx.fillRect(0, size/2-3, size, 6); mmCtx.fillRect(size/2-3, 0, 6, size);
  mmCtx.fillStyle = '#b89060';
  for (const h of CFG.houses)
    mmCtx.fillRect(toMap(h.x-h.w/2), toMap(h.z-h.d/2), (h.w/(half*2))*size, (h.d/(half*2))*size);
  mmCtx.fillStyle = '#ffcc00';
  for (const c of chests) { if (!c.isOpen) mmCtx.fillRect(toMap(c.x)-1.5, toMap(c.z)-1.5, 3, 3); }
  mmCtx.fillStyle = '#ff3333';
  for (const b of bots) {
    if (!b.isAlive) continue;
    mmCtx.beginPath(); mmCtx.arc(toMap(b.pos.x), toMap(b.pos.z), 2.4, 0, Math.PI*2); mmCtx.fill();
  }
  if (storm.active) {
    mmCtx.strokeStyle = '#6666ff'; mmCtx.lineWidth = 2;
    mmCtx.beginPath(); mmCtx.arc(toMap(0), toMap(0), (storm.radius/(half*2))*size, 0, Math.PI*2); mmCtx.stroke();
  }
  const px = toMap(player.pos.x), pz = toMap(player.pos.z);
  mmCtx.fillStyle = '#ffff00';
  mmCtx.beginPath(); mmCtx.arc(px, pz, 3.2, 0, Math.PI*2); mmCtx.fill();
  mmCtx.strokeStyle = '#ffff00'; mmCtx.lineWidth = 2;
  mmCtx.beginPath(); mmCtx.moveTo(px, pz); mmCtx.lineTo(px + Math.sin(yaw)*9, pz + Math.cos(yaw)*9); mmCtx.stroke();
}

// ==============================================================
//  WIN / LOSE
// ==============================================================
function checkWin() {
  if (!player.isAlive) return;
  if (bots.filter(b => b.isAlive).length === 0) endGame(true);
}

function endGame(won) {
  if (!running) return;
  running = false; gameState = 'over';
  document.exitPointerLock?.();
  dom.endscreen.classList.remove('hidden');
  dom.endPanel.className = 'end-panel ' + (won ? 'win' : 'lose');
  dom.endTitle.textContent = won ? '🏆 VICTORY ROYALE!' : 'Du wurdest eliminiert!';
  dom.endSub.textContent   = won
    ? 'Du hast alle 15 Gegner besiegt!'
    : `Noch ${bots.filter(b=>b.isAlive).length} Gegner übrig.`;
}

// ==============================================================
//  MAIN LOOP
// ==============================================================
function animate() {
  requestAnimationFrame(animate);
  const dt  = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  if (gameState === 'bus') {
    updateBus(dt);
  } else if (gameState === 'gliding') {
    updateGliding(dt);
    updateTracers(now);
  } else if (gameState === 'playing' && running) {
    updatePlayer(dt);
    updateBots(dt, now);
    updateStorm(dt);
    updateDrops(dt);
    updateTracers(now);
    updateInteractPrompt();
    drawMinimap();
    checkWin();
  }

  renderer.render(scene, camera);
}

// ==============================================================
//  START / RESET
// ==============================================================
function startGame() {
  scene = new THREE.Scene();
  wallBoxes = []; bots = []; chests = []; drops = []; tracers = [];
  aliveCount = CFG.botCount + 1;
  yaw = 0; pitch = 0.25;
  running = false;
  gameState = 'bus';

  buildWorld();
  buildChests();
  player = createPlayer();
  for (let i = 0; i < CFG.botCount; i++) bots.push(createBot(i));

  renderHotbar(); renderHP(); updateAlive();
  dom.killfeed.innerHTML = '';
  dom.stormWarn.textContent = '';
  storm = { active:false, radius:WORLD_HALF*1.5, center:new THREE.Vector3(), mesh:null };

  dom.lobby.classList.add('hidden');
  dom.endscreen.classList.add('hidden');
  dom.hud.classList.remove('hidden');

  startBusPhase();
}

// ==============================================================
//  INIT
// ==============================================================
function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  dom.root.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1000);
  scene  = new THREE.Scene();
  clock  = new THREE.Clock();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  buildLobby();
  setupInput();
  dom.playBtn.addEventListener('click', startGame);
  dom.restartBtn.addEventListener('click', startGame);
  animate();
}

init();
