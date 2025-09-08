import { renderCartBadge } from './cart-utils.js';

function update(){
  renderCartBadge();
}
document.addEventListener('DOMContentLoaded', () => {
  update();
  window.addEventListener('cart:changed', update);
  window.addEventListener('storage', update);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') update();
  });
});


