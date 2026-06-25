export const WEAPONS = [
  {
    id:'pistol', name:'Pistole',
    damage:24, fireRate:420, range:160, spread:0.02,
    rarity:'Common', rarityColor:'#aaaaaa', tracer:0xffff88,
  },
  {
    id:'shotgun', name:'Schrotflinte',
    damage:14, fireRate:1000, range:55, spread:0.10, pellets:8,
    rarity:'Uncommon', rarityColor:'#44cc44', tracer:0xff8800,
  },
  {
    id:'rifle', name:'Sturmgewehr',
    damage:30, fireRate:130, range:240, spread:0.03,
    rarity:'Rare', rarityColor:'#4488ee', tracer:0x88aaff,
  },
  {
    id:'sniper', name:'Scharfschütze',
    damage:100, fireRate:1600, range:480, spread:0.004,
    rarity:'Epic', rarityColor:'#aa44ee', tracer:0xff44ff,
  },
  {
    id:'smg', name:'Maschinenpistole',
    damage:16, fireRate:80, range:120, spread:0.05,
    rarity:'Common', rarityColor:'#aaaaaa', tracer:0xffff44,
  },
  {
    id:'rocket', name:'Raketenwerfer',
    damage:120, fireRate:2200, range:300, spread:0.01, explosive:true, explosionR:18,
    rarity:'Legendary', rarityColor:'#ffaa00', tracer:0xff4400,
  },
];
