// Simple toolbar Donate button + modal, used across pages
// Depends on BACKEND_URL global or falls back to deployed backend

(function(){
  const BACKEND_URL = (typeof window !== 'undefined' && window.BACKEND_URL) || 'https://catfish-stripe-backend.onrender.com';

  function ensureModal(){
    if (document.getElementById('donateModal')) return;
    const modal = document.createElement('div');
    modal.id = 'donateModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;';
    modal.innerHTML = `
      <div class="donate-box" style="background:#111;border:1px solid #444;padding:1rem;border-radius:12px;width:min(92vw,420px);margin:10vh auto;color:#fff;">
        <label style="display:block;margin-bottom:.5rem;">Enter amount (USD)</label>
        <input id="donateAmount" type="number" step="0.01" min="1" max="10000" placeholder="25.00" style="width:100%;padding:.6rem;border-radius:8px;border:1px solid #444;background:#000;color:#fff;" />
        <div id="donateError" style="margin-top:.5rem;color:#ff6b6b;font-size:.9rem;"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem;">
          <button id="donateClose" style="background:#333;color:#fff;border:none;padding:.5rem .9rem;border-radius:8px;cursor:pointer;">Cancel</button>
          <button id="donateGo" style="background:gold;color:#000;border:none;padding:.5rem .9rem;border-radius:8px;cursor:pointer;">Donate with Stripe</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#donateClose');
    const goBtn = modal.querySelector('#donateGo');
    const amt = modal.querySelector('#donateAmount');
    const err = modal.querySelector('#donateError');
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; err.textContent=''; });
    goBtn.addEventListener('click', async () => {
      const v = Number(amt.value);
      err.textContent = '';
      if (!Number.isFinite(v) || v < 1 || v > 10000) {
        err.textContent = 'Please enter an amount between $1 and $10,000';
        return;
      }
      try {
        const r = await fetch(`${BACKEND_URL}/donate/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: v })
        });
        const text = await r.text();
        let j; try { j = JSON.parse(text); } catch { j = { raw: text }; }
        if (!r.ok) throw new Error(j?.error || 'Donation checkout failed');
        if (j.url) window.location = j.url; else err.textContent = 'Could not start donation checkout.';
      } catch(e) {
        err.textContent = e.message || 'Error starting donation checkout.';
      }
    });
  }

  function injectDonateButton(){
    const nav = document.querySelector('.nav-links');
    if (!nav || document.getElementById('donateToolbarBtn')) return;
    const btn = document.createElement('a');
    btn.id = 'donateToolbarBtn';
    btn.href = '#';
    btn.textContent = 'Support the Empire';
    btn.style.background = '#222';
    btn.style.color = 'gold';
    btn.style.borderRadius = '6px';
    btn.style.padding = '0.5rem 0.9rem';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      ensureModal();
      const modal = document.getElementById('donateModal');
      const amt = document.getElementById('donateAmount');
      modal.style.display = 'block';
      if (amt) amt.focus();
    });
    nav.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDonateButton);
  } else {
    injectDonateButton();
  }
})();



