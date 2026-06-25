import * as THREE from 'three';
import { CFG, WORLD_HALF } from './config.js';
import { WEAPONS } from './weapons.js';

// ===================================================================
//  GLOBALS
// ===================================================================
let renderer, scene, camera, clock;
let player, bots = [], chests = [], drops = [], tracers = [];
let wallBoxes = [];                 // AABBs für Kollision {minX,maxX,minZ,maxZ}
let yaw = 0, pitch = 0.25;          // Kamera-Orientierung
let keys = {};
let pointerLocked = false;
let running = false;
let aliveCount = CFG.botCount + 1;
let gameStartTime = 0;
let storm = { active:false, radius: WORLD_HALF * 1.5, center:new THREE.Vector3(0,0,0), mesh:null };
const raycaster = new THREE.Raycaster();

const WEAPON_ICON = { pistol:'🔫', shotgun:'💥', rifle:'🪖', sniper:'🎯', smg:'⚡', rocket:'🚀' };

// ===================================================================
//  DOM
// ===================================================================
const dom = {
  root:        document.getElementById('game-root'),
  lobby:       document.getElementById('lobby'),
  hud:         document.getElementById('hud'),
  playBtn:     document.getElementById('play-btn'),
  deviceText:  document.getElementById('device-text'),
  lobbySlots:  document.getElementById('lobby-slots'),
  hotbar:      document.getElementById('hotbar'),
  hpBar:       document.getElementById('hp-bar'),
  hpText:      document.getElementById('hp-text'),
  alive:       document.getElementById('alive-counter'),
  stormWarn:   document.getElementById('storm-warn'),
  killfeed:    document.getElementById('killfeed'),
  minimap:     document.getElementById('minimap'),
  interact:    document.getElementById('interact-prompt'),
  lockHint:    document.getElementById('lock-hint'),
  endscreen:   document.getElementById('endscreen'),
  endPanel:    document.getElementById('end-panel'),
  endTitle:    document.getElementById('end-title'),
  endSub:      document.getElementById('end-sub'),
  restartBtn:  document.getElementById('restart-btn'),
};
const mmCtx = dom.minimap.getContext('2d');

// ===================================================================
//  LOBBY
// ===================================================================
function buildLobby() {
  // Sterne
  const starWrap = document.getElementById('lobby-stars');
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('i');
    const sz = (Math.random() * 2 + 1).toFixed(1);
    s.style.width = sz + 'px'; s.style.height = sz + 'px';
    s.style.left = (Math.random() * 100) + '%';
    s.style.top  = (Math.random() * 100) + '%';
    s.style.opacity = (Math.random() * 0.6 + 0.3).toFixed(2);
    starWrap.appendChild(s);
  }

  // Gerät erkennen
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  dom.deviceText.textContent = isMobile ? '📱 Handy' : '💻 Laptop';

  // 5 Inventar-Slots (Vorschau mit Beispielwaffen)
  const preview = ['pistol', 'rifle', 'shotgun', 'sniper', 'rocket'];
  for (let i = 0; i < 5; i++) {
    const w = WEAPONS.find(x => x.id === preview[i]);
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML =
      `<div class="num">${i + 1}</div>` +
      `<div class="ico">${WEAPON_ICON[w.id]}</div>` +
      `<div class="nm" style="color:${w.rarityColor}">${w.name}</div>`;
    dom.lobbySlots.appendChild(slot);
  }
}

// ===================================================================
//  WORLD BUILDING
// ===================================================================
function makeBox(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.position.set(x, y, z);
  return mesh;
}

function buildWorld() {
  // Himmel
  scene.background = new THREE.Color(0x87b8e8);
  scene.fog = new THREE.Fog(0x87b8e8, 220, 460);

  // Licht
  const hemi = new THREE.HemisphereLight(0xffffff, 0x556633, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(120, 200, 80);
  scene.add(sun);

  // Boden
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF * 2 + 40, WORLD_HALF * 2 + 40),
    new THREE.MeshLambertMaterial({ color: 0x3e8c3a })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Straßen (flache dunkle Flächen)
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x44444c });
  const addRoad = (x, z, w, d) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.05, z);
    scene.add(r);
  };
  addRoad(0, 0, WORLD_HALF * 2, 14);   // Ost-West
  addRoad(0, 0, 14, WORLD_HALF * 2);   // Nord-Süd
  addRoad(0, -78, 180, 9);
  addRoad(0,  78, 180, 9);
  addRoad(-78, 0, 9, 180);
  addRoad( 78, 0, 9, 180);

  // Häuser
  for (const h of CFG.houses) buildHouse(h);

  // Bäume
  for (const t of CFG.trees) buildTree(t.x, t.z);

  // Welt-Grenze (Zaun)
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const fH = 6, edge = WORLD_HALF + 18;
  const fences = [
    [0, fH/2, -edge, edge*2, fH, 1],
    [0, fH/2,  edge, edge*2, fH, 1],
    [-edge, fH/2, 0, 1, fH, edge*2],
    [ edge, fH/2, 0, 1, fH, edge*2],
  ];
  for (const f of fences) {
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(f[3], f[4], f[5]), fenceMat)
      .translateX(f[0]).translateY(f[1]).translateZ(f[2]));
  }
}

function buildHouse(h) {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xd0a878 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x7a3b16 });
  const t = 1.2;                      // Wandstärke
  const { x, z, w, d, h: ht } = h;

  // Vier Wände (Vorderwand mit Türlücke)
  group.add(makeBox(w, ht, t, 0xd0a878, x, ht/2, z - d/2));            // Rück
  group.add(makeBox(t, ht, d, 0xd0a878, x - w/2, ht/2, z));            // Links
  group.add(makeBox(t, ht, d, 0xd0a878, x + w/2, ht/2, z));            // Rechts
  // Vorderwand: zwei Teile + Sturz (Türlücke in der Mitte)
  const doorW = 6;
  const sideW = (w - doorW) / 2;
  group.add(makeBox(sideW, ht, t, 0xd0a878, x - w/2 + sideW/2, ht/2, z + d/2));
  group.add(makeBox(sideW, ht, t, 0xd0a878, x + w/2 - sideW/2, ht/2, z + d/2));
  group.add(makeBox(doorW, ht - 7, t, 0xd0a878, x, ht - (ht-7)/2, z + d/2));  // Türsturz

  // Dach (leicht überstehend)
  const roof = makeBox(w + 2, 1.2, d + 2, 0x7a3b16, x, ht + 0.6, z);
  group.add(roof);

  // Fenster (kleine helle Boxen an Seiten)
  const winMat = new THREE.MeshLambertMaterial({ color: 0x99ddff, emissive: 0x223344 });
  const win = (wx, wz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 5), winMat);
    m.position.set(wx, ht/2, wz);
    group.add(m);
  };
  win(x - w/2 - 0.3, z);
  win(x + w/2 + 0.3, z);

  group.children.forEach(c => { c.material.flatShading = false; });
  scene.add(group);

  // Kollisions-AABB (ganzes Hausvolumen)
  wallBoxes.push({ minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2 });
}

function buildTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.1, 7, 6),
    new THREE.MeshLambertMaterial({ color: 0x5d3a1a })
  );
  trunk.position.set(x, 3.5, z);
  scene.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(5, 11, 8),
    new THREE.MeshLambertMaterial({ color: 0x256b27 })
  );
  leaves.position.set(x, 11, z);
  scene.add(leaves);

  // Bäume blockieren auch (kleiner Radius)
  wallBoxes.push({ minX: x-1.4, maxX: x+1.4, minZ: z-1.4, maxZ: z+1.4 });
}

// ===================================================================
//  CHARACTERS (blockige Fortnite-artige Figur)
// ===================================================================
function buildCharacter(skin, shirt, pants) {
  const g = new THREE.Group();
  // Beine
  g.add(makeBox(1.3, 2.4, 1.3, pants, -0.8, 1.2, 0));
  g.add(makeBox(1.3, 2.4, 1.3, pants,  0.8, 1.2, 0));
  // Torso
  g.add(makeBox(3.2, 3.2, 1.8, shirt, 0, 4.0, 0));
  // Arme
  g.add(makeBox(0.9, 2.8, 0.9, shirt, -2.0, 4.0, 0));
  g.add(makeBox(0.9, 2.8, 0.9, shirt,  2.0, 4.0, 0));
  // Kopf
  g.add(makeBox(1.8, 1.8, 1.8, skin, 0, 6.6, 0));
  // Blickrichtung-Marker (Nase)
  g.add(makeBox(0.5, 0.5, 0.4, 0x222222, 0, 6.6, 1.0));
  return g;
}

function makeNameTag(text, color) {
  const cnv = document.createElement('canvas');
  cnv.width = 256; cnv.height = 64;
  const c = cnv.getContext('2d');
  c.font = 'bold 36px Arial';
  c.textAlign = 'center';
  c.lineWidth = 6; c.strokeStyle = '#000';
  c.strokeText(text, 128, 44);
  c.fillStyle = color; c.fillText(text, 128, 44);
  const tex = new THREE.CanvasTexture(cnv);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  spr.scale.set(8, 2, 1);
  spr.position.y = 9;
  return spr;
}

function makeHealthSprite() {
  const cnv = document.createElement('canvas');
  cnv.width = 128; cnv.height = 16;
  const tex = new THREE.CanvasTexture(cnv);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  spr.scale.set(6, 0.75, 1);
  spr.position.y = 8;
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

// ===================================================================
//  PLAYER
// ===================================================================
function createPlayer() {
  const sp = CFG.spawnPoints[Math.floor(Math.random() * CFG.spawnPoints.length)];
  const group = buildCharacter(0xf0c080, 0x3366cc, 0x223355);
  group.position.set(sp.x, 0, sp.z);
  scene.add(group);

  return {
    group,
    pos: new THREE.Vector3(sp.x, 0, sp.z),
    vy: 0, onGround: true,
    health: 100, maxHealth: 100,
    inventory: Array(5).fill(null),
    selectedSlot: 0,
    lastShot: 0,
    isAlive: true,
    spawnProtectUntil: performance.now() + 3000,
  };
}

// ===================================================================
//  BOTS
// ===================================================================
function createBot(index) {
  const colors = [0xff4444,0xff8800,0xffaa00,0xaa44ff,0xff44aa,0x22ccaa,0xff6644,0xddaa00];
  const shirt = colors[index % colors.length];
  const name = CFG.botNames[index] || ('Bot_' + index);
  const sp = CFG.spawnPoints[index % CFG.spawnPoints.length];
  const bx = sp.x + (Math.random() * 50 - 25);
  const bz = sp.z + (Math.random() * 50 - 25);

  const group = buildCharacter(0xf0c080, shirt, 0x333333);
  group.position.set(bx, 0, bz);
  const tag = makeNameTag(name, '#ffffff');
  const hb = makeHealthSprite();
  group.add(tag); group.add(hb.spr);
  scene.add(group);

  const weapon = { ...WEAPONS[Math.floor(Math.random() * WEAPONS.length)] };

  return {
    group, name, hb,
    pos: new THREE.Vector3(bx, 0, bz),
    health: 100, maxHealth: 100,
    weapon, isAlive: true,
    state: 'wander',
    wanderTarget: new THREE.Vector3(rand(-WORLD_HALF, WORLD_HALF), 0, rand(-WORLD_HALF, WORLD_HALF)),
    wanderTimer: 0,
    lastShot: 0,
    facing: 0,
  };
}

function rand(a, b) { return Math.random() * (b - a) + a; }

// ===================================================================
//  CHESTS & DROPS
// ===================================================================
function buildChests() {
  for (const cd of CFG.chests) {
    const group = new THREE.Group();
    const base = makeBox(3.4, 2.2, 3.4, 0xcc9900, 0, 1.1, 0);
    const lid  = makeBox(3.6, 1.0, 3.6, 0xffcc00, 0, 2.6, 0);
    group.add(base); group.add(lid);
    group.position.set(cd.x, 0, cd.z);

    // Glow-Säule
    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    glow.position.set(cd.x, 15, cd.z);
    scene.add(glow);
    scene.add(group);

    chests.push({ group, lid, glow, x: cd.x, z: cd.z, isOpen: false });
  }
}

function openChest(chest) {
  if (chest.isOpen) return;
  chest.isOpen = true;
  // Deckel wegklappen
  chest.lid.position.y = 2.6;
  chest.lid.rotation.x = -1.2;
  chest.lid.position.z = -1.6;
  chest.lid.material.color.set(0x886600);
  chest.glow.visible = false;

  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const w = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
    spawnDrop(chest.x + rand(-4, 4), chest.z + rand(-4, 4), w);
  }
}

function spawnDrop(x, z, weaponData) {
  const col = parseInt(weaponData.rarityColor.slice(1), 16);
  const mesh = makeBox(3, 1, 1.4, col, x, 1.5, z);
  mesh.material = new THREE.MeshLambertMaterial({ color: col, emissive: new THREE.Color(col).multiplyScalar(0.25) });
  const tag = makeNameTag(weaponData.name, weaponData.rarityColor);
  tag.position.y = 4;
  tag.scale.set(6, 1.5, 1);
  mesh.add(tag);
  scene.add(mesh);
  drops.push({ mesh, weapon: weaponData, x, z, baseY: 1.5, t: Math.random() * 6 });
}

// ===================================================================
//  COLLISION
// ===================================================================
function resolveCollision(pos, radius) {
  for (const b of wallBoxes) {
    const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - cx, dz = pos.z - cz;
    const distSq = dx*dx + dz*dz;
    if (distSq < radius*radius) {
      const dist = Math.sqrt(distSq) || 0.001;
      const push = (radius - dist) / dist;
      // Wenn Mittelpunkt innerhalb der Box: nach nächster Kante schieben
      if (distSq < 0.0001) {
        const left = Math.abs(pos.x - b.minX), right = Math.abs(b.maxX - pos.x);
        const top = Math.abs(pos.z - b.minZ), bot = Math.abs(b.maxZ - pos.z);
        const m = Math.min(left, right, top, bot);
        if (m === left) pos.x = b.minX - radius;
        else if (m === right) pos.x = b.maxX + radius;
        else if (m === top) pos.z = b.minZ - radius;
        else pos.z = b.maxZ + radius;
      } else {
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
  }
  // Weltgrenze
  const lim = WORLD_HALF + 14;
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.z = Math.max(-lim, Math.min(lim, pos.z));
}

// ===================================================================
//  INPUT
// ===================================================================
function setupInput() {
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!running) return;
    if (e.code === 'Digit1') selectSlot(0);
    if (e.code === 'Digit2') selectSlot(1);
    if (e.code === 'Digit3') selectSlot(2);
    if (e.code === 'Digit4') selectSlot(3);
    if (e.code === 'Digit5') selectSlot(4);
    if (e.code === 'KeyG') dropWeapon();
    if (e.code === 'KeyE') interactChest();
    if (e.code === 'Space') jump();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // Maus-Look (Pointer Lock)
  dom.root.addEventListener('click', () => {
    if (running && !pointerLocked) dom.root.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === dom.root;
    dom.lockHint.classList.toggle('hidden', pointerLocked || !running);
  });
  document.addEventListener('mousemove', e => {
    if (!pointerLocked) return;
    yaw   -= e.movementX * 0.0024;
    pitch -= e.movementY * 0.0024;
    pitch = Math.max(-0.25, Math.min(1.1, pitch));
  });
  // Schießen
  document.addEventListener('mousedown', e => {
    if (running && pointerLocked && e.button === 0) playerShoot();
  });
  // Mausrad = Slot
  window.addEventListener('wheel', e => {
    if (!running) return;
    const s = (player.selectedSlot + (e.deltaY > 0 ? 1 : -1) + 5) % 5;
    selectSlot(s);
  });

  // Mobile: Touch-Steuerung (vereinfacht – Tippen schießt, Drag dreht)
  let lastTouch = null;
  dom.root.addEventListener('touchstart', e => { lastTouch = e.touches[0]; });
  dom.root.addEventListener('touchmove', e => {
    if (!lastTouch) return;
    const t = e.touches[0];
    yaw   -= (t.clientX - lastTouch.clientX) * 0.006;
    pitch -= (t.clientY - lastTouch.clientY) * 0.006;
    pitch = Math.max(-0.25, Math.min(1.1, pitch));
    lastTouch = t;
  });
  dom.root.addEventListener('touchend', () => { lastTouch = null; if (running) playerShoot(); });
}

// ===================================================================
//  GAMEPLAY ACTIONS
// ===================================================================
function selectSlot(i) {
  player.selectedSlot = i;
  renderHotbar();
}

function jump() {
  if (player.onGround) { player.vy = 22; player.onGround = false; }
}

function dropWeapon() {
  const i = player.selectedSlot;
  const item = player.inventory[i];
  if (!item) return;
  const wData = WEAPONS.find(w => w.id === item.id);
  if (wData) spawnDrop(player.pos.x + rand(-3,3), player.pos.z + rand(-3,3), wData);
  player.inventory[i] = null;
  renderHotbar();
}

function interactChest() {
  for (const c of chests) {
    if (c.isOpen) continue;
    const d = Math.hypot(player.pos.x - c.x, player.pos.z - c.z);
    if (d < 8) { openChest(c); return; }
  }
}

function addToInventory(weaponData) {
  let slot = player.inventory.findIndex(s => s === null);
  if (slot === -1) slot = player.selectedSlot;
  player.inventory[slot] = {
    id: weaponData.id, name: weaponData.name, damage: weaponData.damage,
    fireRate: weaponData.fireRate, range: weaponData.range, spread: weaponData.spread,
    pellets: weaponData.pellets, explosive: weaponData.explosive, explosionR: weaponData.explosionR,
    tracer: weaponData.tracer, rarity: weaponData.rarity,
    ammo: 999, maxAmmo: 999,
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

  const shots = slot.pellets || 1;
  for (let s = 0; s < shots; s++) {
    const dir = baseDir.clone();
    dir.x += rand(-slot.spread, slot.spread);
    dir.y += rand(-slot.spread, slot.spread);
    dir.z += rand(-slot.spread, slot.spread);
    dir.normalize();
    fireRay(origin, dir, slot, false);
  }
}

function fireRay(origin, dir, weapon, isBot) {
  let hitPoint = origin.clone().add(dir.clone().multiplyScalar(weapon.range));
  let hitDist = weapon.range;
  let hitBot = null;
  let hitPlayer = false;

  if (!isBot) {
    // Spieler trifft Bots (Kugel-Schnitt)
    for (const bot of bots) {
      if (!bot.isAlive) continue;
      const center = new THREE.Vector3(bot.pos.x, 4, bot.pos.z);
      const t = rayHitsSphere(origin, dir, center, 2.6);
      if (t !== null && t < hitDist) { hitDist = t; hitBot = bot; }
    }
  } else {
    // Bot trifft Spieler
    const center = new THREE.Vector3(player.pos.x, 4, player.pos.z);
    const t = rayHitsSphere(origin, dir, center, 2.6);
    if (t !== null && t < hitDist) { hitDist = t; hitPlayer = true; }
  }

  hitPoint = origin.clone().add(dir.clone().multiplyScalar(hitDist));

  if (hitBot) {
    damageBot(hitBot, weapon.damage);
    if (weapon.explosive) explosion(hitPoint, weapon.explosionR, weapon.damage * 0.5, isBot);
  } else if (hitPlayer) {
    damagePlayer(weapon.damage);
    if (weapon.explosive) explosion(hitPoint, weapon.explosionR, weapon.damage * 0.5, isBot);
  }

  spawnTracer(origin, hitPoint, weapon.tracer || 0xffff88);
}

function rayHitsSphere(origin, dir, center, radius) {
  const oc = origin.clone().sub(center);
  const b = oc.dot(dir);
  const c = oc.dot(oc) - radius * radius;
  const disc = b*b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : null;
}

function explosion(point, radius, dmg, isBot) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 })
  );
  flash.position.copy(point);
  scene.add(flash);
  tracers.push({ mesh: flash, born: performance.now(), life: 350, expand: true });

  for (const bot of bots) {
    if (!bot.isAlive) continue;
    if (new THREE.Vector3(bot.pos.x,4,bot.pos.z).distanceTo(point) < radius) damageBot(bot, dmg);
  }
  if (new THREE.Vector3(player.pos.x,4,player.pos.z).distanceTo(point) < radius) damagePlayer(dmg);
}

function spawnTracer(a, b, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  scene.add(line);
  tracers.push({ mesh: line, born: performance.now(), life: 90 });
}

// ===================================================================
//  DAMAGE
// ===================================================================
function damageBot(bot, dmg) {
  if (!bot.isAlive) return;
  bot.health -= dmg;
  updateHealthSprite(bot.hb, bot.health / bot.maxHealth);
  if (bot.health <= 0) {
    bot.isAlive = false;
    aliveCount--;
    spawnDrop(bot.pos.x, bot.pos.z, bot.weapon);
    scene.remove(bot.group);
    addKillFeed('Du', bot.name);
    updateAlive();
  }
}

function damagePlayer(dmg) {
  if (!player.isAlive) return;
  if (performance.now() < player.spawnProtectUntil) return;   // Spawnschutz
  player.health -= dmg;
  if (player.health <= 0) {
    player.health = 0;
    player.isAlive = false;
    endGame(false);
  }
  renderHP();
}

// ===================================================================
//  STORM
// ===================================================================
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

// ===================================================================
//  BOT AI
// ===================================================================
function updateBots(dt, now) {
  for (const bot of bots) {
    if (!bot.isAlive) continue;
    const toPlayer = new THREE.Vector3(player.pos.x - bot.pos.x, 0, player.pos.z - bot.pos.z);
    const dist = toPlayer.length();

    if (!player.isAlive || dist > 130) bot.state = 'wander';
    else if (dist > 40) bot.state = 'chase';
    else bot.state = 'attack';

    let move = new THREE.Vector3();
    if (bot.state === 'wander') {
      const td = bot.pos.distanceTo(bot.wanderTarget);
      if (td < 8 || now > bot.wanderTimer) {
        bot.wanderTarget.set(rand(-WORLD_HALF, WORLD_HALF), 0, rand(-WORLD_HALF, WORLD_HALF));
        bot.wanderTimer = now + rand(5000, 13000);
      }
      move = new THREE.Vector3(bot.wanderTarget.x - bot.pos.x, 0, bot.wanderTarget.z - bot.pos.z);
      if (move.length() > 0.1) move.normalize().multiplyScalar(CFG.botSpeed * 0.6 * dt);
      bot.facing = Math.atan2(move.x, move.z);
    } else if (bot.state === 'chase') {
      move = toPlayer.clone().normalize().multiplyScalar(CFG.botSpeed * dt);
      bot.facing = Math.atan2(toPlayer.x, toPlayer.z);
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
  }
}

// ===================================================================
//  PLAYER UPDATE + CAMERA
// ===================================================================
function updatePlayer(dt) {
  if (!player.isAlive) return;

  // Bewegungsrichtung relativ zur Kamera (yaw)
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right   = new THREE.Vector3(Math.sin(yaw - Math.PI/2), 0, Math.cos(yaw - Math.PI/2));
  let move = new THREE.Vector3();

  if (keys['KeyW'] || keys['ArrowUp'])    move.add(forward);
  if (keys['KeyS'] || keys['ArrowDown'])  move.sub(forward);
  if (keys['KeyD'] || keys['ArrowRight']) move.add(right);
  if (keys['KeyA'] || keys['ArrowLeft'])  move.sub(right);

  if (move.length() > 0.1) {
    move.normalize().multiplyScalar(CFG.playerSpeed * dt);
    player.pos.x += move.x;
    player.pos.z += move.z;
    // Figur dreht sich in Laufrichtung
    player.group.rotation.y = Math.atan2(move.x, move.z);
  }

  resolveCollision(player.pos, CFG.playerRadius);

  // Springen / Gravitation
  player.vy -= 60 * dt;
  let y = player.group.position.y + player.vy * dt;
  if (y <= 0) { y = 0; player.vy = 0; player.onGround = true; }
  player.group.position.set(player.pos.x, y, player.pos.z);

  // Kamera hinter dem Spieler (Third-Person)
  const camOffset = new THREE.Vector3(
    Math.sin(yaw) * -CFG.camDistance * Math.cos(pitch),
    CFG.camHeight + Math.sin(pitch) * CFG.camDistance,
    Math.cos(yaw) * -CFG.camDistance * Math.cos(pitch)
  );
  const targetCamPos = new THREE.Vector3(player.pos.x, y, player.pos.z).add(camOffset);
  camera.position.lerp(targetCamPos, 0.35);
  camera.lookAt(player.pos.x, y + 5, player.pos.z);
}

// ===================================================================
//  TRACERS / DROPS UPDATE
// ===================================================================
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
      addToInventory(d.weapon);
      scene.remove(d.mesh);
      drops.splice(i, 1);
    }
  }
}

// ===================================================================
//  HUD
// ===================================================================
function renderHotbar() {
  dom.hotbar.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const item = player.inventory[i];
    const div = document.createElement('div');
    div.className = 'wslot' + (i === player.selectedSlot ? ' sel' : '');
    if (item) {
      div.style.borderColor = (WEAPONS.find(w => w.id === item.id) || {}).rarityColor || '#88aaff';
      div.innerHTML =
        `<div class="n">${i+1}</div>` +
        `<div class="ico">${WEAPON_ICON[item.id] || '🔫'}</div>` +
        `<div class="wn">${item.name}</div>`;
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
  e.className = 'kf';
  e.textContent = `${killer} ⚡ ${victim}`;
  dom.killfeed.appendChild(e);
  setTimeout(() => { e.style.opacity = '0'; setTimeout(() => e.remove(), 500); }, 5000);
}

function updateInteractPrompt() {
  let near = false;
  for (const c of chests) {
    if (c.isOpen) continue;
    if (Math.hypot(player.pos.x - c.x, player.pos.z - c.z) < 8) { near = true; break; }
  }
  dom.interact.classList.toggle('hidden', !near);
}

function drawMinimap() {
  const size = 200, half = WORLD_HALF + 20;
  const toMap = (v) => (v + half) / (half * 2) * size;
  mmCtx.clearRect(0, 0, size, size);

  // Grün-Hintergrund
  mmCtx.fillStyle = '#2e6b2e';
  mmCtx.fillRect(0, 0, size, size);

  // Straßen
  mmCtx.fillStyle = '#555';
  mmCtx.fillRect(0, size/2 - 3, size, 6);
  mmCtx.fillRect(size/2 - 3, 0, 6, size);

  // Häuser
  mmCtx.fillStyle = '#b89060';
  for (const h of CFG.houses) {
    const mx = toMap(h.x - h.w/2), mz = toMap(h.z - h.d/2);
    mmCtx.fillRect(mx, mz, (h.w/(half*2))*size, (h.d/(half*2))*size);
  }

  // Truhen (gelb, nur ungeöffnet)
  mmCtx.fillStyle = '#ffcc00';
  for (const c of chests) {
    if (c.isOpen) continue;
    mmCtx.fillRect(toMap(c.x) - 1.5, toMap(c.z) - 1.5, 3, 3);
  }

  // Bots (rot)
  mmCtx.fillStyle = '#ff3333';
  for (const b of bots) {
    if (!b.isAlive) continue;
    mmCtx.beginPath();
    mmCtx.arc(toMap(b.pos.x), toMap(b.pos.z), 2.4, 0, Math.PI*2);
    mmCtx.fill();
  }

  // Sturm-Ring
  if (storm.active) {
    mmCtx.strokeStyle = '#6666ff';
    mmCtx.lineWidth = 2;
    mmCtx.beginPath();
    mmCtx.arc(toMap(0), toMap(0), (storm.radius/(half*2))*size, 0, Math.PI*2);
    mmCtx.stroke();
  }

  // Spieler (gelb, mit Blickrichtung)
  const px = toMap(player.pos.x), pz = toMap(player.pos.z);
  mmCtx.fillStyle = '#ffff00';
  mmCtx.beginPath();
  mmCtx.arc(px, pz, 3.2, 0, Math.PI*2);
  mmCtx.fill();
  mmCtx.strokeStyle = '#ffff00';
  mmCtx.lineWidth = 2;
  mmCtx.beginPath();
  mmCtx.moveTo(px, pz);
  mmCtx.lineTo(px + Math.sin(yaw) * 9, pz + Math.cos(yaw) * 9);
  mmCtx.stroke();
}

// ===================================================================
//  WIN / LOSE
// ===================================================================
function checkWin() {
  if (!player.isAlive) return;
  if (bots.filter(b => b.isAlive).length === 0) endGame(true);
}

function endGame(won) {
  if (!running) return;
  running = false;
  document.exitPointerLock?.();
  dom.endscreen.classList.remove('hidden');
  dom.endPanel.className = 'end-panel ' + (won ? 'win' : 'lose');
  dom.endTitle.textContent = won ? '🏆 VICTORY ROYALE!' : 'Du wurdest eliminiert!';
  dom.endSub.textContent = won
    ? 'Du hast alle 15 Gegner besiegt!'
    : `Noch ${bots.filter(b=>b.isAlive).length} Gegner übrig.`;
}

// ===================================================================
//  MAIN LOOP
// ===================================================================
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  if (running) {
    updatePlayer(dt);
    updateBots(dt, now);
    updateStorm(dt);
    updateDrops(dt);
    updateTracers(now);
    updateInteractPrompt();
    drawMinimap();
    checkWin();
    // Bot-HP-Sprites zur Kamera ausrichten passiert automatisch (Sprite)
  }

  renderer.render(scene, camera);
}

// ===================================================================
//  START / RESET
// ===================================================================
function startGame() {
  // Welt zurücksetzen
  scene = new THREE.Scene();
  wallBoxes = []; bots = []; chests = []; drops = []; tracers = [];
  aliveCount = CFG.botCount + 1;
  yaw = 0; pitch = 0.25;

  buildWorld();
  buildChests();
  player = createPlayer();
  for (let i = 0; i < CFG.botCount; i++) bots.push(createBot(i));

  // HUD initialisieren
  renderHotbar();
  renderHP();
  updateAlive();
  dom.killfeed.innerHTML = '';
  dom.stormWarn.textContent = '';

  storm = { active:false, radius: WORLD_HALF*1.5, center:new THREE.Vector3(0,0,0), mesh:null };
  gameStartTime = performance.now();
  setTimeout(() => { if (running) startStorm(); }, CFG.stormStartMs);

  dom.lobby.classList.add('hidden');
  dom.endscreen.classList.add('hidden');
  dom.hud.classList.remove('hidden');

  running = true;
  dom.root.requestPointerLock?.();
}

// ===================================================================
//  INIT
// ===================================================================
function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  dom.root.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1000);
  scene = new THREE.Scene();
  clock = new THREE.Clock();

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
