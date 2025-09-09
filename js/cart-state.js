// Shared cart + promo state (client-side only)
// Storage keys
const CART_KEY_V2 = 'cfe_cart_v2';
const CART_KEY_LEGACY = 'cart';
const PROMO_KEY = 'cfe_promo_v1';

const SUNGLASSES_PRICE_CENTS = 1499;
export const SHIPPING_CENTS = 599;
export const MIN_AFTER_DISCOUNT = 50;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampQuantity(quantity) {
  const q = toNumber(quantity);
  return Math.min(100, Math.max(1, q || 1));
}

function normalizeColor(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSize(value) {
  return String(value || '').trim().toUpperCase();
}

function sanitizeItem(raw) {
  const isPrintful = (raw?.type || 'printful') === 'printful';
  let priceCents;
  if (isPrintful) {
    if (Number.isFinite(Number(raw.priceCents))) {
      priceCents = Number(raw.priceCents);
    } else if (raw.price) {
      const parsed = Math.round(parseFloat(String(raw.price).replace(/[^0-9.]/g, '')) * 100);
      priceCents = Number.isFinite(parsed) ? parsed : 0;
    } else {
      priceCents = 0;
    }
  } else {
    priceCents = SUNGLASSES_PRICE_CENTS;
  }
  return {
    ...raw,
    type: isPrintful ? 'printful' : 'sunglasses',
    priceCents,
    qty: clampQuantity(raw.qty)
  };
}

export function getCart() {
  try {
    const v2 = localStorage.getItem(CART_KEY_V2);
    if (v2) return JSON.parse(v2).map(sanitizeItem);
    const legacy = localStorage.getItem(CART_KEY_LEGACY);
    const cart = legacy ? JSON.parse(legacy).map(sanitizeItem) : [];
    // migrate
    localStorage.setItem(CART_KEY_V2, JSON.stringify(cart));
    return cart;
  } catch {
    return [];
  }
}

export function setCart(nextCart) {
  const sanitized = Array.isArray(nextCart) ? nextCart.map(sanitizeItem) : [];
  localStorage.setItem(CART_KEY_V2, JSON.stringify(sanitized));
  // keep legacy key in sync for older pages/components
  localStorage.setItem(CART_KEY_LEGACY, JSON.stringify(sanitized));
  try { window.dispatchEvent(new CustomEvent('cart:changed')); } catch {}
  return sanitized;
}
export function broadcast(){ try { window.dispatchEvent(new CustomEvent('cart:changed')); } catch {} }

export function itemKey(it){
  if (!it) return '';
  if (it.type === 'printful') return `p|${it.productId}|${it.variantId||''}|${String(it.color||'')}|${String(it.size||'')}`;
  if (it.type === 'sunglasses') return `s|${String(it.color||'')}`;
  return `x|${String(it.name||'')}|${String(it.priceCents||0)}`;
}

export function setQtyByKey(key, newQty){
  const cart = getCart();
  const idx = cart.findIndex(it => itemKey(it) === key);
  if (idx >= 0){ cart[idx].qty = clampQuantity(newQty); setCart(cart); }
}

export function removeByKey(key){
  const cart = getCart().filter(it => itemKey(it) !== key);
  setCart(cart);
}

export function getPromo() {
  try {
    const raw = localStorage.getItem(PROMO_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p.percent !== 'number') return null;
    return { code: String(p.code || '').trim(), percent: p.percent };
  } catch {
    return null;
  }
}

export function setPromo(promoObjectOrNull) {
  if (promoObjectOrNull && typeof promoObjectOrNull.percent === 'number') {
    const toStore = { code: String(promoObjectOrNull.code || '').trim(), percent: promoObjectOrNull.percent };
    localStorage.setItem(PROMO_KEY, JSON.stringify(toStore));
  } else {
    localStorage.removeItem(PROMO_KEY);
  }
  try { window.dispatchEvent(new CustomEvent('promo:changed')); } catch {}
}

export function getTotals(cart, promoPercent, minCents = MIN_AFTER_DISCOUNT, shippingCents = SHIPPING_CENTS) {
  const items = Array.isArray(cart) ? cart : [];
  const qty = items.reduce((q, it) => q + clampQuantity(it.qty), 0);
  const subtotalCents = items.reduce((sum, it) => {
    const unit = (it.type === 'printful') ? toNumber(it.priceCents) : SUNGLASSES_PRICE_CENTS;
    return sum + (unit * clampQuantity(it.qty));
  }, 0);
  const pct = Math.max(0, Math.min(99, toNumber(promoPercent)));
  const rawDiscount = Math.round(subtotalCents * (pct / 100));
  const maxDiscount = Math.max(0, subtotalCents - (minCents || 0));
  const discountCents = Math.min(rawDiscount, maxDiscount);
  const discountedSubtotal = Math.max(minCents || 0, subtotalCents - discountCents);
  const ship = subtotalCents > 0 ? (shippingCents || 0) : 0;
  const totalCents = Math.max(0, discountedSubtotal + ship);
  return { qty, subtotalCents, discountCents, discountedSubtotal, shippingCents: ship, totalCents };
}

// Replacement per spec: use floor only when subtotal>0, never on empty carts; clamp shipping
export function computeTotals(cart = getCart(), promo = getPromo()) {
  const normalized = Array.isArray(cart) ? cart : [];
  const qty = normalized.reduce((q, it) => q + (Number(it.qty) || 0), 0);
  const subtotalCents = normalized.reduce((s, it) => s + (Number(it.priceCents) || 0) * (Number(it.qty) || 0), 0);
  const percent = promo?.percent ? Math.min(100, Math.max(0, Number(promo.percent))) : 0;
  let discountCents = Math.round(subtotalCents * percent / 100);
  if (subtotalCents > 0 && percent > 0) {
    const discounted = subtotalCents - discountCents;
    if (discounted < MIN_AFTER_DISCOUNT) {
      discountCents = Math.max(0, subtotalCents - MIN_AFTER_DISCOUNT);
    }
  } else {
    discountCents = 0;
  }
  const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
  const shippingCents = qty > 0 ? SHIPPING_CENTS : 0;
  const totalCents = discountedSubtotal + shippingCents;
  return { qty, subtotalCents, discountCents, shippingCents, totalCents, percent };
}

export function formatMoney(cents) {
  const n = toNumber(cents);
  return `$${(n / 100).toFixed(2)}`;
}

// expose for non-module inline scripts if needed
if (typeof window !== 'undefined') {
  window.CFECart = window.CFECart || {};
  window.CFECart.getCart = getCart;
  window.CFECart.setCart = setCart;
  window.CFECart.getPromo = getPromo;
  window.CFECart.setPromo = setPromo;
  window.CFECart.getTotals = getTotals;
  window.CFECart.formatMoney = formatMoney;
}


