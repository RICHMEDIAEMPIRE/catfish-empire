(() => {
  const BACKEND_URL = (window.BACKEND_URL || "https://catfish-stripe-backend.onrender.com").replace(/\/+$/,"");

  const ENDPOINT = `${BACKEND_URL}/api/printful-products`; // Use cache for speed

  const grid = document.getElementById("printful-grid");
  // This file is now deprecated on the homepage (we render into #products-grid there).
  // If #printful-grid is not present, do nothing.
  if (!grid) return;

  function normalizeOne(raw) {
    const priceCents =
      raw.priceMinCents ??
      raw.price_cents ??
      (typeof raw.price === "number" ? Math.round(raw.price * 100) : null) ??
      null;

    const img =
      raw.thumb ||
      raw.image ||
      raw.mainImage ||
      raw.thumbnail ||
      raw.thumbnail_url ||
      "";

    return {
      id: raw.id,
      name: raw.name || "Product",
      img,
      priceCents,
      currency: (raw.currency || "USD").toUpperCase()
    };
  }

  function priceLabel(p) {
    return (p.priceCents != null && isFinite(p.priceCents))
      ? `$${(p.priceCents/100).toFixed(2)}`
      : "View options";
  }

  function cardHTML(p) {
    const href = `/product.html?id=${encodeURIComponent(p.id)}`;
    return `
      <a class="product-card product-card--printful" href="${href}">
        <div class="product-image">
          <img src="${p.img || ""}" alt="${(p.name || '').replace(/"/g,"&quot;")}" loading="lazy">
        </div>
        <div class="product-info">
          <h3 class="product-title">${p.name}</h3>
          <div class="product-meta">
            <span class="product-price">${priceLabel(p)}</span>
          </div>
        </div>
      </a>
    `;
  }

  async function fetchList() {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        console.warn('[printful] list failed', ENDPOINT, res.status);
        return null;
      }
      const json = await res.json().catch(() => null);
      if (!json) return null;
      const list = Array.isArray(json.products) ? json.products : (Array.isArray(json) ? json : (Array.isArray(json.result) ? json.result : null));
      if (!list || !list.length) return null;
      return list;
    } catch (e) {
      console.warn('[printful] fetch error', ENDPOINT, e);
      return null;
    }
  }

  async function init() {
    try {
      const list = await fetchList();
      if (!list) {
        grid.innerHTML = `<p class="muted">No products available right now.</p>`;
        return;
      }
      const normalized = list.map(normalizeOne);
      grid.innerHTML = normalized.map(cardHTML).join("");
      console.debug("[printful] rendered", normalized.length, "products");
    } catch (err) {
      console.error("[printful] fatal", err);
      grid.innerHTML = `<p class="error">Couldn’t load products. Please try again later.</p>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


