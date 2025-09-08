export function dollars(cents){ return (Number(cents||0)/100).toFixed(2); }
export function n(v){ return Number(v||0); }
export function clampQty(q){ const x = n(q); return Math.min(100, Math.max(1, x||1)); }
export function normalizeColor(v){ return String(v||'').trim().toLowerCase(); }
export function normalizeSize(v){ return String(v||'').trim().toUpperCase(); }

// Sunglasses fallback price (cents)
const SUNGLASSES_CENTS = 1499;

function sanitizeItem(it){
  const isPrintful = (it.type || 'printful') === 'printful';

  // Derive/normalize priceCents safely
  let priceCents;
  if (isPrintful) {
    // Prefer numeric priceCents; fallback: price string -> cents, else 0
    if (Number.isFinite(Number(it.priceCents))) {
      priceCents = Number(it.priceCents);
    } else if (it.price) {
      const parsed = Math.round(parseFloat(String(it.price).replace(/[^0-9.]/g,'')) * 100);
      priceCents = Number.isFinite(parsed) ? parsed : 0;
    } else {
      priceCents = 0;
    }
  } else {
    priceCents = SUNGLASSES_CENTS;
  }

  return {
    ...it,
    type: isPrintful ? 'printful' : 'sunglasses',
    priceCents,
    qty: clampQty(it.qty)
  };
}

export function loadCart(){
  try {
    const arr = JSON.parse(localStorage.getItem('cart') || '[]');
    return Array.isArray(arr) ? arr.map(sanitizeItem) : [];
  } catch {
    return [];
  }
}
export function saveCart(cart){
  localStorage.setItem('cart', JSON.stringify(cart.map(sanitizeItem)));
  window.dispatchEvent(new CustomEvent('cart:changed'));
}

export function linePriceCents(item){
  const each = Number(item.priceCents) || 0;
  return each * clampQty(item.qty);
}
export function subtotalCents(cart){
  return cart.reduce((sum, it) => sum + linePriceCents(it), 0);
}

export function mergeDuplicates(cart){
  const map = new Map();
  for (const raw of cart){
    const it = sanitizeItem(raw);
    const key = [
      it.type,
      it.productId || '',
      normalizeColor(it.color),
      normalizeSize(it.size),
      it.variantId || ''
    ].join('|');
    if (!map.has(key)){
      map.set(key, { ...it });
    } else {
      const row = map.get(key);
      row.qty = clampQty(Number(row.qty) + Number(it.qty));
      if ((row.priceCents||0) === 0 && (it.priceCents||0) > 0) row.priceCents = it.priceCents;
    }
  }
  return Array.from(map.values());
}
export function sortByVariant(cart){
  return [...cart].sort((a,b) => {
    const ka = `${a.type}|${a.productId}|${normalizeColor(a.color)}|${normalizeSize(a.size)}`;
    const kb = `${b.type}|${b.productId}|${normalizeColor(b.color)}|${normalizeSize(b.size)}`;
    return ka.localeCompare(kb);
  });
}
export function upsertCartItem(newItem){
  let cart = loadCart();
  cart.push(sanitizeItem(newItem));
  cart = mergeDuplicates(cart);
  cart = sortByVariant(cart);
  saveCart(cart);
}
export function totalQty(cart){
  return cart.reduce((q, it) => q + clampQty(it.qty), 0);
}
export function renderCartBadge(selector='[data-role="cart-badge"]'){
  const el = document.querySelector(selector);
  if (!el) return;
  const cart = loadCart();
  const qty = totalQty(cart);
  const total = dollars(subtotalCents(cart));
  el.textContent = `Cart (${qty} – $${total})`;
}


