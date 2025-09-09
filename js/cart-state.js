// Shared cart + promo state (client-side only)
// Storage keys
const CART_KEY_V2 = 'cfe_cart_v2';
const CART_KEY_LEGACY = 'cart';
const PROMO_KEY = 'cfe_promo_v1';

const SUNGLASSES_PRICE_CENTS = 1499;

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

export function getTotals(cart, promoPercent) {
  const items = Array.isArray(cart) ? cart : [];
  const qty = items.reduce((q, it) => q + clampQuantity(it.qty), 0);
  const subtotalCents = items.reduce((sum, it) => {
    const unit = (it.type === 'printful') ? toNumber(it.priceCents) : SUNGLASSES_PRICE_CENTS;
    return sum + (unit * clampQuantity(it.qty));
  }, 0);
  const pct = Math.max(0, Math.min(100, toNumber(promoPercent)));
  const discountCents = Math.floor(subtotalCents * (pct / 100));
  const shippingCents = subtotalCents > 0 ? 599 : 0;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;
  return { qty, subtotalCents, discountCents, shippingCents, totalCents };
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


