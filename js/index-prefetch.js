document.addEventListener('mouseover', (e) => {
  const card = e.target.closest('[data-product-id]');
  if (!card) return;
  const id = card.getAttribute('data-product-id');
  if (!id) return;
  try { fetch(`/api/printful-product/${encodeURIComponent(id)}`, { cache: 'force-cache' }); } catch {}
});



