/* ============================================================
   RAMAN WEAR – Shop Logik
   ============================================================ */

// ---- Farben ----
const COLORS = [
  { id: 'black',  name: 'Midnight Black', hex: '#1a1a1a' },
  { id: 'white',  name: 'Arctic White',  hex: '#f2f2f2' },
  { id: 'red',    name: 'Lava Red',      hex: '#e63946' },
  { id: 'blue',   name: 'Ocean Blue',    hex: '#2a6df4' },
  { id: 'green',  name: 'Neon Green',    hex: '#27d17f' },
  { id: 'purple', name: 'Cosmic Purple', hex: '#7c5cff' },
  { id: 'orange', name: 'Sunset Orange', hex: '#ff7a18' },
  { id: 'pink',   name: 'Hot Pink',      hex: '#ff4fa3' },
  { id: 'sand',   name: 'Desert Sand',   hex: '#cbb892' },
];

// ---- Produkte (Bundle-Stufen) ----
const PRODUCTS = [
  { id: 'single', name: 'Solo Tee',   qty: 1, price: 10000,         desc: 'Ein Premium Tee in deiner Wunschfarbe. Der Klassiker.', tag: null },
  { id: 'duo',    name: 'Duo Pack',   qty: 2, price: 30000,         desc: 'Zwei Tees zum Mixen & Matchen. Doppelter Flex.',         tag: 'BELIEBT' },
  { id: 'mega',   name: 'Mega Drop',  qty: 3, price: 1000000000000, desc: 'Drei Tees + Collector-Status. Für echte Legenden.',      tag: '🔥 LIMITED' },
];

// ---- SVG T-Shirt (umfärbbar via fill) ----
function shirtSVG(hex, logo = true) {
  const dark = isDark(hex);
  const logoColor = dark ? '#ffffff' : '#1a1a1a';
  const shade = shadeColor(hex, -18);
  return `
  <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="T-Shirt">
    <defs>
      <linearGradient id="g-${hex.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${shadeColor(hex,10)}"/>
        <stop offset="1" stop-color="${shade}"/>
      </linearGradient>
    </defs>
    <path d="M105 40 L60 70 L40 120 L70 140 L80 120 L80 255
             Q80 268 93 268 L207 268 Q220 268 220 255 L220 120
             L230 140 L260 120 L240 70 L195 40
             Q175 62 150 62 Q125 62 105 40 Z"
          fill="url(#g-${hex.replace('#','')})" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
    <path d="M105 40 Q125 62 150 62 Q175 62 195 40 L185 48
             Q168 70 150 70 Q132 70 115 48 Z" fill="${shadeColor(hex,-28)}"/>
    ${logo ? `<path d="M168 110 q14 -10 30 -8 q-12 4 -20 14 q14 -8 26 -4 q-20 4 -30 16 q6 -4 14 -3 q-16 6 -24 14 z"
             fill="${logoColor}" transform="translate(-6,4) scale(.9)"/>` : ''}
  </svg>`;
}

function isDark(hex){
  const c = hex.replace('#','');
  const r=parseInt(c.substr(0,2),16),g=parseInt(c.substr(2,2),16),b=parseInt(c.substr(4,2),16);
  return (0.299*r+0.587*g+0.114*b) < 150;
}
function shadeColor(hex, percent){
  const c=hex.replace('#','');
  let r=parseInt(c.substr(0,2),16),g=parseInt(c.substr(2,2),16),b=parseInt(c.substr(4,2),16);
  r=Math.min(255,Math.max(0,r+Math.round(255*percent/100)));
  g=Math.min(255,Math.max(0,g+Math.round(255*percent/100)));
  b=Math.min(255,Math.max(0,b+Math.round(255*percent/100)));
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function fmt(n){ return n.toLocaleString('de-DE') + ' €'; }

// ---- State ----
let selectedColor = COLORS[0];
let cart = []; // {key, name, colorId, colorName, hex, price, qty, units}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  renderHeroShirt();
  renderSwatches();
  renderPreview();
  renderProducts();
  bindCart();
});

function renderHeroShirt(){
  document.getElementById('hero-shirt-holder').innerHTML = shirtSVG(selectedColor.hex);
}

function renderSwatches(){
  const wrap = document.getElementById('swatches');
  wrap.innerHTML = COLORS.map(c =>
    `<button class="swatch ${c.id===selectedColor.id?'active':''}" data-id="${c.id}"
       style="background:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`
  ).join('');
  wrap.querySelectorAll('.swatch').forEach(s => {
    s.addEventListener('click', () => {
      selectedColor = COLORS.find(c => c.id === s.dataset.id);
      renderSwatches();
      renderPreview();
      renderHeroShirt();
    });
  });
}

function renderPreview(){
  document.getElementById('preview-stage').innerHTML = shirtSVG(selectedColor.hex);
  document.getElementById('preview-name').textContent = selectedColor.name;
}

function renderProducts(){
  const wrap = document.getElementById('products');
  wrap.innerHTML = PRODUCTS.map(p => `
    <article class="product ${p.tag==='BELIEBT'?'featured':''}">
      ${p.tag ? `<span class="product-tag">${p.tag}</span>` : ''}
      <div class="product-img">${shirtSVG(p.id==='mega'?'#7c5cff':(p.id==='duo'?'#2a6df4':'#1a1a1a'))}</div>
      <h3>${p.name}</h3>
      <p class="desc">${p.desc}</p>
      <div class="product-bottom">
        <div class="product-price">${fmt(p.price)}<small>${p.qty} Shirt${p.qty>1?'s':''}</small></div>
        <button class="btn btn-primary" data-product="${p.id}">+ Kaufen</button>
      </div>
    </article>
  `).join('');
  wrap.querySelectorAll('[data-product]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PRODUCTS.find(x => x.id === btn.dataset.product);
      addToCart({
        name: `${p.name} · ${selectedColor.name}`,
        colorName: selectedColor.name,
        hex: selectedColor.hex,
        price: p.price,
        units: p.qty,
        key: `${p.id}-${selectedColor.id}`,
      });
    });
  });
}

// ---- Configurator add ----
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'config-add') {
    addToCart({
      name: `Solo Tee · ${selectedColor.name}`,
      colorName: selectedColor.name,
      hex: selectedColor.hex,
      price: 10000,
      units: 1,
      key: `single-${selectedColor.id}`,
    });
  }
});

// ---- Cart ----
function addToCart(item){
  const found = cart.find(c => c.key === item.key);
  if (found) found.qty += 1;
  else cart.push({ ...item, qty: 1 });
  renderCart();
  toast(`✓ ${item.name} hinzugefügt`);
  openCart();
}

function changeQty(key, delta){
  const it = cart.find(c => c.key === key);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) cart = cart.filter(c => c.key !== key);
  renderCart();
}

function renderCart(){
  const totalUnits = cart.reduce((s,c)=>s+c.qty,0);
  document.getElementById('cart-count').textContent = totalUnits;
  const total = cart.reduce((s,c)=>s + c.price*c.qty, 0);
  document.getElementById('cart-total').textContent = fmt(total);

  const box = document.getElementById('cart-items');
  if (!cart.length){
    box.innerHTML = `<p class="cart-empty">Dein Warenkorb ist leer.<br>Zeit, was Cooles reinzulegen. 😎</p>`;
    return;
  }
  box.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="ci-swatch" style="background:${c.hex}"></div>
      <div class="ci-info">
        <strong>${c.name}</strong>
        <span>${fmt(c.price)}${c.units>1?` · ${c.units} Stück`:''}</span>
        <div class="qty">
          <button data-dec="${c.key}">−</button>
          <span>${c.qty}</span>
          <button data-inc="${c.key}">+</button>
        </div>
      </div>
      <button class="ci-remove" data-rm="${c.key}" aria-label="Entfernen">🗑️</button>
    </div>
  `).join('');
  box.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));
  box.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));
  box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{cart=cart.filter(c=>c.key!==b.dataset.rm);renderCart();});
}

function bindCart(){
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  document.getElementById('cart-toggle').onclick = openCart;
  document.getElementById('cart-close').onclick = closeCart;
  overlay.onclick = closeCart;
  document.getElementById('checkout-btn').onclick = () => {
    if (!cart.length){ toast('Warenkorb ist leer 🙈'); return; }
    const total = cart.reduce((s,c)=>s+c.price*c.qty,0);
    toast(`🚀 Danke! Bestellung über ${fmt(total)} aufgegeben.`);
    cart = []; renderCart();
    setTimeout(closeCart, 800);
  };
  renderCart();
}
function openCart(){ document.getElementById('cart-drawer').classList.add('open'); document.getElementById('cart-overlay').classList.add('open'); }
function closeCart(){ document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('cart-overlay').classList.remove('open'); }

// ---- Toast ----
let toastTimer;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}
