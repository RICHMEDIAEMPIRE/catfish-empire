import { getCart, getPromo, getTotals, formatMoney } from './cart-state.js';

export function renderToolbarTotals() {
  const el = document.querySelector('[data-role="cart-badge"]');
  if (!el) return;
  const cart = getCart();
  const promo = getPromo();
  const { qty, totalCents, subtotalCents, discountCents, shippingCents } = getTotals(cart, promo?.percent || 0);
  const label = `Cart (${qty} – ${formatMoney(totalCents)})`;
  el.textContent = label;
  el.setAttribute('aria-label', `Cart, ${qty} items, subtotal ${formatMoney(subtotalCents)}, discount ${formatMoney(discountCents)}, shipping ${formatMoney(shippingCents)}, total ${formatMoney(totalCents)}`);
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


