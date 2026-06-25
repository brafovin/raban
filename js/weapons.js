const WEAPONS = [
  {
    id:'pistol', name:'Pistole',
    damage:25, fireRate:500, ammo:16, bulletSpeed:700,
    bulletLife:450, bulletColor:0xffff88,
    rarity:'Common', rarityColor:0xaaaaaa,
  },
  {
    id:'shotgun', name:'Schrotflinte',
    damage:60, fireRate:1200, ammo:8, bulletSpeed:550,
    bulletLife:280, bulletColor:0xff8800, pellets:7,
    rarity:'Uncommon', rarityColor:0x44cc44,
  },
  {
    id:'rifle', name:'Sturmgewehr',
    damage:35, fireRate:140, ammo:30, bulletSpeed:900,
    bulletLife:600, bulletColor:0x88aaff,
    rarity:'Rare', rarityColor:0x4488ee,
  },
  {
    id:'sniper', name:'Scharfschütze',
    damage:105, fireRate:1800, ammo:5, bulletSpeed:1400,
    bulletLife:900, bulletColor:0xff44ff,
    rarity:'Epic', rarityColor:0xaa44ee,
  },
  {
    id:'smg', name:'Maschinenpistole',
    damage:18, fireRate:90, ammo:40, bulletSpeed:650,
    bulletLife:350, bulletColor:0xffff44,
    rarity:'Common', rarityColor:0xaaaaaa,
  },
  {
    id:'rocket', name:'Raketenwerfer',
    damage:200, fireRate:2500, ammo:4, bulletSpeed:380,
    bulletLife:1500, bulletColor:0xff4400, explosive:true, explosionR:80,
    rarity:'Legendary', rarityColor:0xffaa00,
  },
];
