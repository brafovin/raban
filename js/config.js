// Alle Werte in 3D-Welt-Einheiten. Karte ist von -HALF..HALF zentriert.
export const WORLD_HALF = 240;          // Halbe Kartenbreite
export const WORLD_SIZE = WORLD_HALF * 2;

export const CFG = {
  worldHalf: WORLD_HALF,
  playerSpeed: 42,
  botSpeed: 28,
  botCount: 15,
  inventorySize: 5,

  playerRadius: 1.6,
  botRadius: 1.6,
  playerHeight: 5,

  stormStartMs: 90000,    // wann der Sturm losgeht
  stormDamage: 6,         // HP pro Sekunde außerhalb
  stormShrinkRate: 0.6,   // Einheiten pro Sekunde

  camDistance: 14,
  camHeight: 7,

  botNames: [
    'xX_Destroyer_Xx','ProGamer99','NightHawk','ShadowStrike',
    'LegendKiller','BlazeFire','IronFist','StormBreaker',
    'DarkHunter','FrostBite','ThunderBolt','CrimsonEagle',
    'GhostSniper','VortexKing','AceWarrior',
  ],

  // Häuser: x,z = Mitte, w = Breite (X), d = Tiefe (Z), h = Höhe
  houses: [
    // Stadtmitte
    { x:  0,  z:  0,  w: 28, d: 24, h: 18 },
    { x: 34,  z:  0,  w: 22, d: 18, h: 14 },
    { x:-34,  z:  0,  w: 24, d: 18, h: 15 },
    { x:  0,  z: 34,  w: 28, d: 22, h: 16 },
    { x:  0,  z:-34,  w: 26, d: 18, h: 14 },
    { x: 34,  z: 34,  w: 18, d: 17, h: 13 },
    { x:-34,  z: 34,  w: 20, d: 18, h: 14 },
    { x: 34,  z:-34,  w: 19, d: 17, h: 13 },
    { x:-34,  z:-34,  w: 21, d: 18, h: 14 },
    // Äußerer Ring
    { x:-80, z:-80,  w: 24, d: 20, h: 16 },
    { x: 80, z:-80,  w: 22, d: 19, h: 15 },
    { x:-80, z: 80,  w: 26, d: 21, h: 17 },
    { x: 80, z: 80,  w: 23, d: 20, h: 16 },
    { x:  0, z:-120, w: 30, d: 24, h: 20 },
    { x:  0, z: 120, w: 32, d: 26, h: 21 },
    { x:-120,z:  0,  w: 26, d: 22, h: 18 },
    { x: 120,z:  0,  w: 25, d: 21, h: 17 },
    // Weit außen
    { x:-160,z:-160, w: 22, d: 19, h: 15 },
    { x: 160,z:-160, w: 21, d: 18, h: 14 },
    { x:-160,z: 160, w: 23, d: 20, h: 16 },
    { x: 160,z: 160, w: 22, d: 19, h: 15 },
    { x:  0, z:-180, w: 33, d: 26, h: 22 },
    { x:  0, z: 180, w: 31, d: 25, h: 21 },
    { x:-180,z:  0,  w: 26, d: 22, h: 18 },
    { x: 180,z:  0,  w: 27, d: 23, h: 18 },
    { x:-100,z: 100, w: 22, d: 18, h: 14 },
    { x: 100,z:-100, w: 21, d: 18, h: 14 },
    { x:-100,z:-100, w: 19, d: 17, h: 13 },
    { x: 100,z: 100, w: 20, d: 17, h: 13 },
  ],

  // Bäume: x,z
  trees: [
    {x:-64,z:-64},{x:-57,z:-58},{x:-70,z:-55},
    {x: 64,z:-63},{x: 70,z:-57},{x: 58,z:-60},
    {x:-64,z: 64},{x:-58,z: 70},{x:-70,z: 58},
    {x: 64,z: 63},{x: 58,z: 70},{x: 70,z: 56},
    {x:-100,z:-100},{x:-92,z:-108},{x:-108,z:-94},
    {x: 100,z:-100},{x: 108,z:-95},{x: 93,z:-106},
    {x:-100,z: 100},{x:-95,z: 108},{x:-108,z: 92},
    {x: 100,z: 100},{x: 108,z: 92},{x: 92,z: 107},
    {x:  0,z:-150},{x:  8,z:-142},{x: -8,z:-146},
    {x:-150,z:  0},{x:-142,z:  8},{x:-146,z: -8},
    {x: 150,z:  0},{x: 142,z:  8},{x: 146,z: -8},
    {x:  0,z: 150},{x:  8,z: 158},{x: -8,z: 142},
    {x:-200,z:-200},{x:-208,z:-190},{x:-190,z:-208},
    {x: 200,z:-200},{x: 208,z:-192},{x: 190,z:-185},
    {x:-200,z: 200},{x:-192,z: 208},{x:-208,z: 190},
    {x: 200,z: 200},{x: 192,z: 192},{x: 208,z: 208},
    {x:-150,z: 150},{x: 150,z:-150},{x: 150,z: 150},{x:-150,z:-150},
  ],

  // Truhen: x,z
  chests: [
    {x:  0, z: 12},{x: 34, z: 12},{x:-34, z: 12},
    {x:  0, z: 46},{x:  0, z:-22},{x:-58, z:  2},
    {x: 58, z:  2},{x: 12, z:-30},{x: 12, z: 60},
    {x:-80, z:-80},{x: 80, z:-80},{x:-80, z: 80},
    {x: 80, z: 80},{x:-160,z:-160},{x: 160,z:-160},
    {x:-160,z: 160},{x: 160,z: 160},{x:  0, z:-180},
    {x:-180,z:  0},{x: 180,z:  0},{x:  0, z: 180},
    {x:-100,z: 100},{x: 100,z:-100},{x:-120,z:  0},
  ],

  // Spawn-Punkte
  spawnPoints: [
    {x:-180,z:-180},{x: 180,z:-180},{x:-180,z: 180},{x: 180,z: 180},
    {x:  0, z:-200},{x:  0, z: 200},{x:-200,z:  0},{x: 200,z:  0},
    {x:-120,z:-120},{x: 120,z:-120},{x:-120,z: 120},{x: 120,z: 120},
  ],
};
