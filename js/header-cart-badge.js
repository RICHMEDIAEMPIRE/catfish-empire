import { loadCart, subtotalCents, totalQty, dollars } from './cart-utils.js';

const BE = (typeof window !== 'undefined' && window.BACKEND_URL) || 'https://catfish-stripe-backend.onrender.com';

async function fetchActivePromo(){
  try{ const r = await fetch(`${BE}/api/promo/active`, { credentials:'include' }); return (await r.json()).promo || null; }catch{ return null; }
}

async function renderBadge(){
  const el = document.querySelector('[data-role="cart-badge"]');
  if (!el) return;
  const cart = loadCart();
  const qty = totalQty(cart);
  const sub = subtotalCents(cart);
  const promo = await fetchActivePromo();
  const discount = promo && promo.percent ? Math.floor(sub * (promo.percent/100)) : 0;
  const total = Math.max(0, sub - discount);
  el.textContent = `Cart (${qty} – $${dollars(total)})`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderBadge();
  window.addEventListener('cart:changed', renderBadge);
  window.addEventListener('storage', renderBadge);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderBadge();
  });
});


