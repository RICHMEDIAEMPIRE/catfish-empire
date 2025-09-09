import { getCart, getPromo, getTotals, formatMoney, computeTotals } from './cart-state.js';
const SHIPPING_CENTS = (typeof window !== 'undefined' && window.CFE_SHIPPING_CENTS) || 599;
const MIN_CENTS = 50;

export function renderToolbarTotals() {
  const el = document.querySelector('[data-role="cart-badge"]') || document.getElementById('toolbar-cart');
  if (!el) return;
  const { qty, totalCents } = computeTotals(getCart(), getPromo());
  el.textContent = qty === 0 ? 'Cart (empty)' : `Cart (${qty} – ${formatMoney(totalCents)})`;
}

export function initToolbar() {
  renderToolbarTotals();
  window.addEventListener('cart:changed', renderToolbarTotals);
  window.addEventListener('promo:changed', renderToolbarTotals);
  window.addEventListener('storage', renderToolbarTotals);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderToolbarTotals();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initToolbar);
  // expose for inline scripts if needed
  window.renderToolbarTotals = renderToolbarTotals;
}

// Replace paint logic per spec for explicit "Cart (empty)"
function paint() {
  const bubble = document.getElementById('toolbar-cart');
  if (!bubble) return;
  const { qty, totalCents } = computeTotals(getCart(), getPromo());
  bubble.textContent = qty === 0 ? 'Cart (empty)' : `Cart (${qty} — $${(totalCents/100).toFixed(2)})`;
}
window.addEventListener('cart:changed', paint);
window.addEventListener('promo:changed', paint);
document.addEventListener('DOMContentLoaded', paint);


