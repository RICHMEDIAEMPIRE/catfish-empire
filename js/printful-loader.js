(() => {
  const BACKEND_URL = (window.BACKEND_URL || "https://catfish-stripe-backend.onrender.com").replace(/\/+$/,"");

  const ENDPOINTS = [
    `${BACKEND_URL}/api/printful-products?nocache=1`,
    `${BACKEND_URL}/products/printful/catfish-empire?nocache=1`,
    `${BACKEND_URL}/printful/products?nocache=1`
  ];

  const grid = document.getElementById("printful-grid");
  if (!grid) {
    console.warn("[printful] #printful-grid not found; skipping render");
    return;
  }

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

  async function fetchFirstWorking() {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, { credentials: "omit" });
        if (!res.ok) {
          console.warn("[printful] endpoint failed", url, res.status);
          continue;
        }
        const json = await res.json();
        let list = null;
        if (Array.isArray(json)) list = json;
        else if (Array.isArray(json.products)) list = json.products;
        else if (Array.isArray(json.result)) list = json.result;
        if (!list || list.length === 0) {
          console.warn("[printful] no products in response", url, json);
          continue;
        }
        return list;
      } catch (err) {
        console.warn("[printful] fetch error", url, err);
      }
    }
    return null;
  }

  async function init() {
    try {
      const list = await fetchFirstWorking();
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


