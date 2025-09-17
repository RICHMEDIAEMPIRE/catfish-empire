// Color normalizer (matches backend)
function colorKey(s){
  return String(s || "")
    .toLowerCase()
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let CURRENT = { colorKey: "", angle: "front", data: null };

function money(c){ return `$${(c/100).toFixed(2)}`; }

function buildColorDropdown(colors) {
  const sel = document.getElementById("sel-color");
  if (!sel) return;
  sel.innerHTML = "";
  for (const c of colors) {
    const opt = document.createElement("option");
    opt.value = c.key;   // use normalized key as value
    opt.textContent = c.label || c.key;
    sel.appendChild(opt);
  }
  sel.value = CURRENT.colorKey;
  sel.onchange = () => {
    CURRENT.colorKey = sel.value;
    // reset to first available angle for this color
    const avail = CURRENT.data.availableAnglesByColor[CURRENT.colorKey] || [];
    CURRENT.angle = avail[0] || "front";
    paintGallery();
    buildSizeDropdown();
    refreshPriceAndVariant();
  };
}

function buildAngleTabs() {
  const tabs = document.getElementById("angleTabs");
  if (!tabs) return;
  tabs.innerHTML = "";

  console.log("🔧 buildAngleTabs - colorKey:", CURRENT.colorKey);
  console.log("🔧 buildAngleTabs - availableAnglesByColor:", CURRENT.data.availableAnglesByColor);
  
  const avail = CURRENT.data.availableAnglesByColor[CURRENT.colorKey] || [];
  console.log("🔧 buildAngleTabs - available for this color:", avail);
  
  const ordered = ["front","back","left","right"].filter(a => avail.includes(a));
  console.log("🔧 buildAngleTabs - ordered angles:", ordered);

  for (const a of ordered) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.angle = a;
    btn.textContent = a[0].toUpperCase() + a.slice(1);
    btn.className = "angle-tab";
    btn.addEventListener("click", () => {
      CURRENT.angle = a;
      paintGallery();
    });
    tabs.appendChild(btn);
  }
}

function buildSizeDropdown() {
  const sel = document.getElementById("sel-size");
  if (!sel) return;
  
  // Find sizes available for current color
  const sizes = [];
  for (const [key, variantId] of Object.entries(CURRENT.data.variantMatrix || {})) {
    const [colorPart, sizePart] = key.split("|");
    if (colorPart === CURRENT.colorKey && sizePart) {
      sizes.push(sizePart);
    }
  }
  
  // Sort sizes
  const SIZE_ORDER = ['XS','S','M','L','XL','2XL','3XL','4XL','5XL'];
  sizes.sort((a,b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  
  sel.innerHTML = "";
  for (const size of sizes) {
    const opt = document.createElement("option");
    opt.value = size;
    opt.textContent = size.toUpperCase();
    sel.appendChild(opt);
  }
  
  sel.onchange = refreshPriceAndVariant;
}

function refreshPriceAndVariant() {
  const sizeEl = document.getElementById("sel-size");
  const priceEl = document.getElementById("p-price");
  const addBtn = document.getElementById("btn-add");
  
  if (!sizeEl || !priceEl || !addBtn) return;
  
  const size = sizeEl.value;
  if (!CURRENT.colorKey || !size) {
    priceEl.textContent = "$—";
    addBtn.disabled = true;
    return;
  }
  
  const key = `${CURRENT.colorKey}|${size}`;
  const priceCents = CURRENT.data.priceByKey?.[key];
  const variantId = CURRENT.data.variantMatrix?.[key];
  
  if (priceCents && variantId) {
    priceEl.textContent = money(priceCents);
    addBtn.disabled = false;
    // Store current selection for add to cart
    CURRENT.currentPriceCents = priceCents;
    CURRENT.currentVariantId = variantId;
    CURRENT.currentSize = size;
  } else {
    priceEl.textContent = "$—";
    addBtn.disabled = true;
  }
}

function paintGallery() {
  const g = (CURRENT.data.galleryByColor[CURRENT.colorKey] || {});
  const main = document.getElementById("mainImage");

  // pick the best available source
  const src = g.views?.[CURRENT.angle] || g.views?.front || CURRENT.data.coverImage || CURRENT.data.images?.[0] || "";
  if (main && src) {
    main.loading = "lazy";
    if (main.src !== src) main.src = src;
  }

  // update tab active state
  const tabs = document.querySelectorAll("#angleTabs [data-angle]");
  tabs.forEach(b => b.classList.toggle("active", b.dataset.angle === CURRENT.angle));

  // debug logs to verify structure
  console.log("[angles] colorKey=", CURRENT.colorKey, "angle=", CURRENT.angle);
  console.log("[angles] available=", CURRENT.data.availableAnglesByColor[CURRENT.colorKey]);
  console.log("[angles] bucket=", g);
  console.log("[angles] galleryByColor keys=", Object.keys(CURRENT.data.galleryByColor || {}));
  console.log("[angles] availableAnglesByColor=", CURRENT.data.availableAnglesByColor);
  console.log("[angles] colors array=", CURRENT.data.colors);
}

function addToCart() {
  const qtyEl = document.getElementById("sel-qty");
  const qty = Math.max(1, parseInt(qtyEl?.value || "1", 10));
  
  if (!CURRENT.currentVariantId || !CURRENT.currentPriceCents) {
    alert("Please choose a color and size.");
    return;
  }
  
  // Use shared cart state if available
  const { setCart, getCart } = window.CFECart || {};
  if (setCart && getCart) {
    const cart = getCart();
    cart.push({
      type: "printful",
      productId: CURRENT.data.id,
      name: CURRENT.data.name,
      color: CURRENT.colorKey,
      size: CURRENT.currentSize,
      variantId: CURRENT.currentVariantId,
      priceCents: CURRENT.currentPriceCents,
      currency: "USD",
      image: document.getElementById("mainImage")?.src || CURRENT.data.coverImage,
      qty
    });
    setCart(cart);
  } else {
    // Fallback to localStorage
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.push({
      type: "printful",
      productId: CURRENT.data.id,
      name: CURRENT.data.name,
      color: CURRENT.colorKey,
      size: CURRENT.currentSize,
      variantId: CURRENT.currentVariantId,
      priceCents: CURRENT.currentPriceCents,
      currency: "USD",
      image: document.getElementById("mainImage")?.src || CURRENT.data.coverImage,
      qty
    });
    localStorage.setItem("cart", JSON.stringify(cart));
    try { window.dispatchEvent(new CustomEvent('cart:changed')); } catch(_){}
  }
  
  // Update toolbar if function exists
  try { 
    if (window.renderToolbarTotals) window.renderToolbarTotals(); 
  } catch(_) {}
  
  // Show feedback
  const btn = document.getElementById("btn-add");
  if (btn) {
    btn.textContent = "Added!";
    setTimeout(() => { btn.textContent = "Add to Cart"; }, 900);
  }
}

async function initProduct() {
  console.log("🚀 Product page initializing...");
  
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  
  console.log("📋 Product ID:", id);
  
  if (!id) {
    console.error("❌ Missing product ID");
    document.getElementById("p-title").textContent = "Missing product ID";
    return;
  }
  
  try {
    const url = `${window.BACKEND_URL || ''}/api/printful-product/${id}`;
    console.log("🌐 Fetching:", url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("📦 API Response:", { ok: response.ok, status: response.status, data });
    
    if (!response.ok || data.error) {
      console.error("❌ Product fetch failed:", data);
      document.getElementById("p-title").textContent = "Product not found";
      return;
    }
    
    CURRENT.data = data;
    console.log("✅ Product data loaded:", data);

    // choose starting color
    CURRENT.colorKey = data.defaultColor || data.colors?.[0]?.key || Object.keys(data.galleryByColor)[0] || "";
    console.log("🎯 Initial colorKey set to:", CURRENT.colorKey);
    console.log("🎯 Available colors:", Object.keys(data.galleryByColor || {}));
    console.log("🎯 data.colors:", data.colors);
    
    // choose best starting angle
    const avail = data.availableAnglesByColor[CURRENT.colorKey] || [];
    console.log("🎯 Available angles for initial color:", avail);
    CURRENT.angle = avail[0] || "front";

    // Update page content
    document.getElementById("p-title").textContent = data.name || "Catfish Empire Product";
    if (data.description) {
      document.getElementById("p-desc").innerHTML = data.description.replace(/\n/g, "<br>");
    }

    // build UI
    buildColorDropdown(data.colors || Object.keys(data.galleryByColor).map(k => ({ key:k, label:k })));
    buildAngleTabs();
    buildSizeDropdown();
    paintGallery();
    refreshPriceAndVariant();
    
    // Bind add to cart
    const addBtn = document.getElementById("btn-add");
    if (addBtn) {
      addBtn.onclick = addToCart;
    }
    
  } catch (error) {
    console.error("Failed to load product:", error);
    document.getElementById("p-title").textContent = "Failed to load product";
  }
}

document.addEventListener("DOMContentLoaded", initProduct);
