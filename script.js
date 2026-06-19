// ============================================================
// CONFIG
// ============================================================
const API_META = document.querySelector('meta[name="api-url"]')?.content;
const API = API_META || (window.location.protocol === 'file:' ? 'http://localhost:5000' : window.location.origin) + '/api';
let sessionId = localStorage.getItem('sessionId') || 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
localStorage.setItem('sessionId', sessionId);
const CURRENCIES = { fcfa: { label: 'FCFA', rate: 1, symbol: 'F' }, eur: { label: '€', rate: 0.0015, symbol: '€' }, usd: { label: '$', rate: 0.0016, symbol: '$' } };
let currentCurrency = localStorage.getItem('currency') || 'fcfa';
function convertPrice(price) { return Math.round(price * CURRENCIES[currentCurrency].rate * 100) / 100; }
function fmtPrice(price) { const c = CURRENCIES[currentCurrency]; return c.rate === 1 ? fmt(price) + ' F' : convertPrice(price).toFixed(2) + ' ' + c.symbol; }

// ============================================================
// HELPERS
// ============================================================
function fmt(n) { return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
const STATUS_LABELS = { pending: 'En attente', confirmed: 'Confirmée', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' };

function setCurrency(code) {
  currentCurrency = code; localStorage.setItem('currency', code);
  const s = document.getElementById('currencySwitcher');
  if (s) s.value = code;
  const grid = document.getElementById('productsGrid');
  if (grid && grid.children.length > 1) loadProducts();
  showToast('Devise changée en ' + (CURRENCIES[code]?.label || code), 'info');
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId, ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || res.statusText);
  return data;
}

function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

// ============================================================
// IMAGE ERROR FALLBACK
// ============================================================
document.addEventListener('error', e => {
  if (e.target.tagName === 'IMG' && !e.target.dataset.fallback) {
    e.target.dataset.fallback = '1';
    e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80';
  }
}, true);

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type = 'info') {
  let c = document.getElementById('toastContainer');
  if (!c) {
    c = document.createElement('div'); c.id = 'toastContainer';
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = msg;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('toast-hide'); setTimeout(() => t.remove(), 300); }, 3500);
}

function showLoader(el, msg = 'Chargement...') {
  el.innerHTML = `<div class="loader"><div class="loader-spinner"></div><p>${msg}</p></div>`;
}

// ============================================================
// ROUTING
// ============================================================
let allProducts = [];
let currentFilter = 'all';

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const el = document.getElementById('page-' + name);
  if (el) el.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    const page = el.dataset.page;
    if (page === 'checkout') renderCheckout();
    if (page === 'admin') renderAdmin('dashboard');
    if (page === 'account') showAccount();
    showPage(page);
  });
});

// ============================================================
// TIMER
// ============================================================
(function () {
  let t = 2 * 3600 + 45 * 60;
  const h = document.getElementById('hours'), m = document.getElementById('minutes'), s = document.getElementById('seconds');
  function up() {
    const hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = t % 60;
    h.textContent = String(hh).padStart(2, '0');
    m.textContent = String(mm).padStart(2, '0');
    s.textContent = String(ss).padStart(2, '0');
    if (t > 0) t--;
  }
  up();
  setInterval(up, 1000);
})();

// ============================================================
// MOBILE MENU
// ============================================================
const mobileBtn = document.getElementById('mobileMenuBtn');
const closeBtn = document.getElementById('closeMobileMenu');
const overlay = document.getElementById('mobileOverlay');
const menu = document.getElementById('mobileMenu');
function toggleMenu(open) {
  menu.classList.toggle('open', open);
  overlay.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
mobileBtn.addEventListener('click', () => toggleMenu(true));
closeBtn.addEventListener('click', () => toggleMenu(false));
overlay.addEventListener('click', () => toggleMenu(false));

// ============================================================
// CATEGORIES
// ============================================================
async function loadCategories() {
  const cats = await api('/categories');
  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = cats.map(c => `
    <a href="#" class="category-card" style="background:${c.color || '#f5f5f5'}" data-cat-slug="${c.slug}">
      <div class="category-icon"><img src="images/icons/${({'fa-mobile-alt':'phone','fa-gamepad':'console','fa-laptop':'laptop','fa-desktop':'desktop','fa-headphones':'headphones','fa-tag':'tag'})[c.icon] || 'tag'}.svg" alt="${esc(c.name)}" class="icon-svg-lg"></div>
      <span>${esc(c.name)}</span>
    </a>
  `).join('');

  grid.querySelectorAll('[data-cat-slug]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); goHomeAndFilter('category', el.dataset.catSlug); });
  });

  const fc = document.getElementById('footerCatalogue');
  fc.innerHTML = cats.map(c => `<li><a href="#" data-cat-slug="${c.slug}">${esc(c.name)}</a></li>`).join('');
  fc.querySelectorAll('[data-cat-slug]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); goHomeAndFilter('category', el.dataset.catSlug); });
  });

  const tabs = document.getElementById('productTabs');
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.catSlug = c.slug;
    btn.textContent = c.name;
    btn.addEventListener('click', () => goHomeAndFilter('category', c.slug));
    tabs.appendChild(btn);
  });
}

// ============================================================
// PRODUCT RENDERING
// ============================================================
function renderProducts(products, gridId) {
  const grid = document.getElementById(gridId || 'productsGrid');
  if (!products.length) {
    grid.innerHTML = '<p class="loading">Aucun produit trouvé</p>';
    return;
  }
  const token = getToken();
  grid.innerHTML = products.map(p => {
    const badge = p.discount ? `<div class="product-badge badge-sale">-${p.discount}%</div>`
      : p.condition === 'occasion' ? '<div class="product-badge badge-used">Occasion</div>'
      : '<div class="product-badge">Neuf</div>';
    const oldPrice = p.old_price ? `<span class="old-price">${fmt(p.old_price)} F</span>` : '';
    const favBtn = token ? `<button class="wishlist-btn" data-id="${p.id}" onclick="toggleWishlist(event, ${p.id})"><i class="fas fa-heart"></i></button>` : '';
    return `
      <div class="product-card" data-id="${p.id}">
        ${favBtn}${badge}
        <div class="product-img"><img src="${p.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80'}" alt="${esc(p.name)}" loading="lazy"></div>
        <div class="product-info">
          <h3>${esc(p.name)}</h3>
          <div class="product-price"><span class="current-price">${fmt(p.price)} F</span> ${oldPrice}</div>
          <button class="btn btn-primary add-to-cart" data-id="${p.id}"><i class="fas fa-shopping-cart"></i> Ajouter</button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', function (e) {
      if (e.target.closest('.add-to-cart')) return;
      showProductDetail(parseInt(this.dataset.id));
    });
  });

  grid.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', async function (e) {
      e.stopPropagation();
      try {
        await api('/cart/add', { method: 'POST', body: JSON.stringify({ product_id: Number(this.dataset.id), quantity: 1 }) });
        this.innerHTML = '<i class="fas fa-check"></i> Ajouté';
        this.style.background = '#28a745';
        setTimeout(() => { this.innerHTML = '<i class="fas fa-shopping-cart"></i> Ajouter'; this.style.background = ''; }, 1500);
        updateCart();
      } catch (e) { alert('Erreur: ' + e.message); }
    });
  });
}

// === WISHLIST ===
async function toggleWishlist(event, productId) {
  event.stopPropagation();
  const btn = event.currentTarget;
  try {
    const check = await apiAuth('/wishlist/check/' + productId);
    if (check.favorited) {
      await apiAuth('/wishlist/' + productId, { method: 'DELETE' });
      btn.classList.remove('active');
      showToast('Retiré des favoris', 'info');
    } else {
      await apiAuth('/wishlist', { method: 'POST', body: JSON.stringify({ product_id: productId }) });
      btn.classList.add('active');
      showToast('Ajouté aux favoris &#10084;', 'success');
    }
  } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

async function loadWishlist() {
  try {
    const items = await apiAuth('/wishlist');
    const grid = document.getElementById('wishlistGrid');
    if (!items.length) {
      grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999"><i class="fas fa-heart" style="font-size:40px;color:#ddd;margin-bottom:12px"></i><p>Votre liste de favoris est vide.</p></div>';
      return;
    }
    renderProducts(items, 'wishlistGrid');
    items.forEach(p => {
      const btn = document.querySelector(`.wishlist-btn[data-id="${p.product_id}"]`);
      if (btn) btn.classList.add('active');
    });
  } catch (e) { document.getElementById('wishlistGrid').innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

// === REVIEWS ===
async function loadReviews(productId, containerId) {
  const el = document.getElementById(containerId);
  try {
    const data = await api('/reviews/product/' + productId);
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
        <div style="text-align:center"><div style="font-size:32px;font-weight:700;color:#e63946">${data.stats.avg.toFixed(1)}</div><div style="font-size:12px;color:#999">${data.stats.count} avis</div></div>
        <div style="flex:1">${renderStars(data.stats.avg)}</div>
        ${getToken() ? '<button class="btn btn-secondary btn-sm" onclick="showReviewForm(' + productId + ')"><i class="fas fa-pen"></i> Donner mon avis</button>' : ''}
      </div>
      ${data.reviews.length ? data.reviews.map(r => `
        <div style="padding:12px 0;border-bottom:1px solid #f0f2f4">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong style="font-size:13px">${esc(r.customer_name)}</strong>
            <small style="color:#999">${r.created_at || ''}</small>
          </div>
          <div style="margin:4px 0">${renderStars(r.rating)}</div>
          ${r.comment ? '<p style="font-size:13px;color:#555;margin:4px 0">' + esc(r.comment) + '</p>' : ''}
        </div>
      `).join('') : '<p style="color:#999;font-size:13px;text-align:center;padding:20px">Aucun avis pour le moment. Soyez le premier !</p>'}
    `;
  } catch (e) { el.innerHTML = ''; }
}

function renderStars(rating) {
  const full = Math.floor(rating); const half = rating % 1 >= 0.5 ? 1 : 0; const empty = 5 - full - half;
  return '<span style="color:#f59e0b;font-size:14px">'
    + '<i class="fas fa-star"></i>'.repeat(full)
    + (half ? '<i class="fas fa-star-half-alt"></i>' : '')
    + '<i class="far fa-star"></i>'.repeat(empty) + '</span>';
}

function showReviewForm(productId) {
  openModal(`
    <h3>Donner mon avis</h3>
    <form id="reviewForm">
      <div class="form-group"><label>Note</label><div id="starPicker" style="font-size:24px;color:#f59e0b;cursor:pointer">
        ${[1,2,3,4,5].map(i => `<i class="far fa-star" data-val="${i}"></i>`).join('')}
      </div><input type="hidden" id="reviewRating" value="0"></div>
      <div class="form-group"><label>Commentaire (optionnel)</label><textarea id="reviewComment" rows="3" style="width:100%;padding:8px;border:1px solid #d6d8db;border-radius:6px"></textarea></div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Envoyer</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      </div>
    </form>
  `);
  document.getElementById('starPicker').addEventListener('click', function (e) {
    if (e.target.dataset.val) {
      document.getElementById('reviewRating').value = e.target.dataset.val;
      this.querySelectorAll('i').forEach((el, i) => el.className = i < e.target.dataset.val ? 'fas fa-star' : 'far fa-star');
    }
  });
  document.getElementById('reviewForm').addEventListener('submit', async function (e) {
    e.preventDefault(); const btn = this.querySelector('button');
    const rating = document.getElementById('reviewRating').value;
    if (!rating || rating === '0') return showToast('Veuillez sélectionner une note', 'error');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
    try {
      await apiAuth('/reviews/product/' + productId, { method: 'POST', body: JSON.stringify({ rating: +rating, comment: document.getElementById('reviewComment').value }) });
      closeModal(); loadReviews(productId, 'reviewsContainer'); showToast('Avis envoyé !', 'success');
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = 'Envoyer'; }
  });
}

// === DELIVERY TRACKING ===
async function loadDeliveryTracking(orderId, containerId) {
  const el = document.getElementById(containerId);
  try {
    const data = await api('/delivery/status/' + orderId);
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <strong style="font-size:14px">${data.status_label}</strong>
        ${data.delivery_tracking ? '<span style="font-size:12px;color:#999">Suivi: ' + esc(data.delivery_tracking) + '</span>' : ''}
      </div>
      <div style="position:relative;padding-left:20px">${(data.timeline || []).map((t, i) => `
        <div style="position:relative;padding-bottom:16px;padding-left:20px;border-left:2px solid ${i === data.timeline.length - 1 ? '#e63946' : '#ddd'};margin-left:0">
          <div style="position:absolute;left:-7px;top:0;width:12px;height:12px;border-radius:50%;background:${i === data.timeline.length - 1 ? '#e63946' : '#ddd'}"></div>
          <div style="font-size:13px;font-weight:${i === data.timeline.length - 1 ? '600' : '400'}">${esc(t.status)}</div>
          <div style="font-size:11px;color:#999">${t.created_at || ''}${t.note ? ' · ' + esc(t.note) : ''}</div>
        </div>
      `).join('')}</div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#999;font-size:13px">Suivi non disponible</p>'; }
}

// ============================================================
// HOME PAGE - LOAD PRODUCTS
// ============================================================
async function loadProducts(filter) {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = Array(6).fill('').map(() =>
    '<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div></div>'
  ).join('');
  let url = '/products';
  if (filter === 'neuf') url += '?condition=neuf';
  else if (filter === 'occasion') url += '?condition=occasion';
  else if (filter === 'featured') url = '/products/featured';
  else if (filter && filter.startsWith('cat_')) url += '?category_id=' + filter.replace('cat_', '');
  allProducts = await api(url);
  if (!filter || filter === 'all' || filter === 'featured') {
    if (filter === 'featured') document.getElementById('productsTitle').textContent = 'Promotions';
    else document.getElementById('productsTitle').textContent = 'Tous les produits';
  }
  renderProducts(allProducts);
}

function goHomeAndFilter(type, value) {
  showPage('home');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (type === 'condition') {
    currentFilter = value;
    const filtered = allProducts.filter(p => p.condition === value);
    document.querySelector(`.tab-btn[data-filter="${value}"]`)?.classList.add('active');
    document.getElementById('productsTitle').textContent = value === 'neuf' ? 'Produits neufs' : 'Produits d\'occasion';
    renderProducts(filtered);
  } else if (type === 'category') {
    currentFilter = 'cat_' + value;
    const filtered = allProducts.filter(p => p.category_slug === value);
    document.querySelector(`.tab-btn[data-cat-slug="${value}"]`)?.classList.add('active');
    document.getElementById('productsTitle').textContent = filtered[0] ? filtered[0].category_name : 'Catégorie';
    renderProducts(filtered);
  } else {
    currentFilter = 'all';
    document.querySelector('.tab-btn[data-filter="all"]')?.classList.add('active');
    document.getElementById('productsTitle').textContent = 'Tous les produits';
    renderProducts(allProducts);
  }
}

// ============================================================
// PRODUCT DETAIL
// ============================================================
async function showProductDetail(id) {
  showPage('product');
  const el = document.getElementById('productDetailContent');
  showLoader(el, 'Chargement du produit...');
  try {
    const p = await api('/products/' + id);
    const badge = p.discount ? `<div class="product-badge badge-sale">-${p.discount}%</div>`
      : p.condition === 'occasion' ? '<div class="product-badge badge-used">Occasion</div>'
      : '<div class="product-badge">Neuf</div>';
    const oldPrice = p.old_price ? `<span class="old-price">${fmt(p.old_price)} F</span>` : '';

    el.innerHTML = `
      <div class="product-detail-grid">
        <div class="product-detail-image" style="position:relative">${badge}
          <img src="${p.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80'}" alt="${esc(p.name)}">
        </div>
        <div class="product-detail-info">
          <h1>${esc(p.name)}</h1>
          <div class="product-price"><span class="current-price">${fmt(p.price)} F</span> ${oldPrice}</div>
          <p class="product-detail-desc">${esc(p.description || 'Aucune description disponible.')}</p>
          <div class="product-detail-meta">
            <span><i class="fas fa-tag"></i> ${esc(p.condition)}</span>
            <span><i class="fas fa-folder"></i> ${esc(p.category_name || 'Général')}</span>
            <span><i class="fas fa-box"></i> Stock: ${p.stock > 0 ? '<span style="color:#2e7d32;font-weight:600">' + p.stock + ' disponibles</span>' : '<span style="color:#d32f2f">Rupture</span>'}</span>
          </div>
          <div class="product-detail-actions">
            <button class="btn btn-primary add-to-cart-detail" data-id="${p.id}"><i class="fas fa-shopping-cart"></i> Ajouter au panier</button>
            ${getToken() ? `<button class="btn btn-secondary" onclick="toggleWishlist(event, ${p.id})"><i class="fas fa-heart"></i> Favori</button>` : ''}
            <button class="btn btn-secondary" onclick="showPage('home')"><i class="fas fa-arrow-left"></i> Continuer</button>
          </div>
        </div>
      </div>
      <div class="reviews-section" style="margin-top:24px">
        <h3><i class="fas fa-star"></i> Avis clients</h3>
        <div id="reviewsContainer"></div>
      </div>
      <div class="related-products"><h3>Produits similaires</h3><div class="related-grid" id="relatedGrid"><p class="loading">Chargement...</p></div></div>
    `;

    loadReviews(id, 'reviewsContainer');

    el.querySelector('.add-to-cart-detail')?.addEventListener('click', async function () {
      await api('/cart/add', { method: 'POST', body: JSON.stringify({ product_id: p.id, quantity: 1 }) });
      this.innerHTML = '<i class="fas fa-check"></i> Ajouté au panier';
      this.style.background = '#28a745';
      setTimeout(() => { this.innerHTML = '<i class="fas fa-shopping-cart"></i> Ajouter au panier'; this.style.background = ''; }, 2000);
      updateCart();
    });

    // Related products
    if (p.category_id) {
      const related = await api('/products?category_id=' + p.category_id + '&limit=4');
      const filtered = related.filter(r => r.id !== p.id).slice(0, 4);
      renderProducts(filtered, 'relatedGrid');
    } else {
      document.getElementById('relatedGrid').innerHTML = '';
    }
  } catch (e) {
    el.innerHTML = '<p style="color:#e63946;padding:40px;text-align:center">Erreur: ' + e.message + '</p>';
  }
}

// ============================================================
// CHECKOUT
// ============================================================
async function renderCheckout() {
  showPage('checkout');
  const itemsEl = document.getElementById('checkoutItems');
  const summaryEl = document.getElementById('checkoutSummary');
  showLoader(itemsEl, 'Chargement du panier...');
  try {
    const cart = await api('/cart');
    if (!cart.items || !cart.items.length) {
      itemsEl.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Votre panier est vide</p><button class="btn btn-primary" onclick="showPage(\'home\')" style="margin-top:16px">Découvrir nos produits</button></div>';
      summaryEl.innerHTML = '';
      return;
    }
    itemsEl.innerHTML = cart.items.map(item => `
      <div class="checkout-item" data-id="${item.id}">
        <div class="checkout-item-img"><img src="${item.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80'}" alt="${esc(item.name)}"></div>
        <div class="checkout-item-info">
          <h4>${esc(item.name)}</h4>
          <p>${fmt(item.price)} F / unité</p>
        </div>
        <div class="checkout-item-qty">
          <button class="qty-minus" data-id="${item.id}">-</button>
          <span>${item.quantity}</span>
          <button class="qty-plus" data-id="${item.id}">+</button>
        </div>
        <div class="checkout-item-price">${fmt(item.price * item.quantity)} F</div>
        <div class="checkout-item-remove" data-id="${item.id}"><i class="fas fa-trash"></i></div>
      </div>
    `).join('');

    itemsEl.querySelectorAll('.qty-minus').forEach(btn => {
      btn.addEventListener('click', async function () {
        const id = this.dataset.id;
        const row = this.closest('.checkout-item');
        const qtySpan = row.querySelector('.checkout-item-qty span');
        const qty = parseInt(qtySpan.textContent);
        if (qty <= 1) return;
        await api('/cart/' + id, { method: 'PATCH', body: JSON.stringify({ quantity: qty - 1 }) });
        renderCheckout();
        updateCart();
      });
    });
    itemsEl.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', async function () {
        const id = this.dataset.id;
        const row = this.closest('.checkout-item');
        const qtySpan = row.querySelector('.checkout-item-qty span');
        const qty = parseInt(qtySpan.textContent);
        await api('/cart/' + id, { method: 'PATCH', body: JSON.stringify({ quantity: qty + 1 }) });
        renderCheckout();
        updateCart();
      });
    });
    itemsEl.querySelectorAll('.checkout-item-remove').forEach(btn => {
      btn.addEventListener('click', async function () {
        await api('/cart/' + this.dataset.id, { method: 'DELETE' });
        renderCheckout();
        updateCart();
      });
    });

    const isLoggedInCustomer = isLoggedIn();
    let customerData = {};
    if (isLoggedInCustomer) {
      try { customerData = await apiAuth('/customers/me'); } catch (_) {}
    }
    let paydunyaOk = false;
    try { const cfg = await api('/config'); paydunyaOk = !!(cfg.paydunya_master_key && cfg.paydunya_private_key && cfg.paydunya_token); } catch (_) {}

    summaryEl.innerHTML = `
      <h3>Résumé de la commande</h3>
      <div class="summary-row"><span>Articles</span><span>${cart.count} produit(s)</span></div>
      <div class="summary-row"><span>Livraison</span><span style="color:#2e7d32">Gratuite</span></div>
      <div class="summary-row total"><span>Total</span><span>${fmt(cart.total)} F</span></div>
      <div class="form-group"><label>Mode de paiement</label><select id="paymentMethod" onchange="document.getElementById('paymentPhoneGroup').style.display=this.value==='cash'?'none':'block'">
        ${paydunyaOk ? `
          <option value="orange_money">Orange Money</option>
          <option value="mtn_money">MTN Money</option>
          <option value="wave">Wave</option>
        ` : ''}
        <option value="cash">Paiement à la livraison</option>
      </select></div>
      <div id="paymentPhoneGroup" class="form-group"${paydunyaOk ? '' : ' style="display:none"'}><label>Téléphone Mobile Money</label><input type="tel" id="paymentPhone" placeholder="+225 XX XX XX XX"></div>
      ${!isLoggedInCustomer ? '<p style="font-size:12px;color:#e63946;margin:8px 0"><i class="fas fa-info-circle"></i> <a href="#" onclick="showAccount();return false" style="color:#e63946;text-decoration:underline">Connectez-vous</a> pour suivre vos commandes.</p>' : ''}
      <form class="checkout-form" id="orderForm">
        <div class="form-group"><label>Nom complet *</label><input type="text" id="orderName" required placeholder="Votre nom" value="${esc(customerData.name || '')}"></div>
        <div class="form-group"><label>Téléphone *</label><input type="tel" id="orderPhone" required placeholder="+225 XX XX XX XX" value="${esc(customerData.phone || '')}"></div>
        <div class="form-group"><label>Email</label><input type="email" id="orderEmail" placeholder="votre@email.com" value="${esc(customerData.email || '')}"></div>
        <div class="form-group"><label>Adresse de livraison</label><input type="text" id="orderAddress" placeholder="Quartier, rue, villa" value="${esc(customerData.address || '')}"></div>
        <div class="form-group"><label>Notes</label><textarea id="orderNotes" placeholder="Instructions particulières..."></textarea></div>
        <div class="form-group"><button type="submit" class="btn btn-primary" id="orderSubmitBtn">Passer la commande</button></div>
      </form>
    `;

    document.getElementById('orderForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = document.getElementById('orderSubmitBtn');
      btn.disabled = true; btn.textContent = 'Traitement...';
      const paymentMethod = document.getElementById('paymentMethod').value;
      const paymentPhone = document.getElementById('paymentPhone')?.value || '';
      const orderPayload = {
        customer_name: document.getElementById('orderName').value,
        customer_phone: document.getElementById('orderPhone').value,
        customer_email: document.getElementById('orderEmail').value || null,
        address: document.getElementById('orderAddress').value || null,
        notes: document.getElementById('orderNotes').value || null,
        items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.price })),
        payment_method: paymentMethod
      };
      try {
        const order = isLoggedInCustomer
          ? await apiAuth('/customers/orders', { method: 'POST', body: JSON.stringify(orderPayload) })
          : await api('/orders', { method: 'POST', body: JSON.stringify(orderPayload) });

        if (paymentMethod === 'cash') {
          await api('/cart', { method: 'DELETE' });
          updateCart();
          showOrderSuccess(order.id, order.total);
        } else {
          btn.textContent = 'Redirection vers PayDunya...';
          const payRes = await api('/paydunya/initiate', {
            method: 'POST', body: JSON.stringify({ order_id: order.id, phone: paymentPhone || order.customer_phone })
          });
          if (payRes.checkout_url) {
            sessionStorage.setItem('pendingOrderId', order.id);
            window.location.href = payRes.checkout_url;
          } else {
            throw new Error(payRes.error || 'Erreur d\'initiation du paiement');
          }
        }
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Passer la commande';
        showToast('Erreur: ' + e.message, 'error');
      }
    });
  } catch (e) {
    itemsEl.innerHTML = '<p style="color:#e63946;padding:40px;text-align:center">Erreur: ' + e.message + '</p>';
    summaryEl.innerHTML = '';
  }
}

// ============================================================
// CART UPDATE
// ============================================================
function showOrderSuccess(orderId, total) {
  const itemsEl = document.getElementById('checkoutItems');
  const summaryEl = document.getElementById('checkoutSummary');
  if (itemsEl) itemsEl.innerHTML = '';
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="text-align:center;padding:20px">
        <div style="font-size:56px;color:#2e7d32;margin-bottom:12px">✓</div>
        <h3>Paiement réussi !</h3>
        <p style="color:#666;margin:12px 0">Commande <strong>#${orderId}</strong>${total != null ? ' · Total: <strong>' + fmt(total) + ' F</strong>' : ''}</p>
        <p style="color:#999;font-size:14px">Vous recevrez une confirmation par téléphone.</p>
        <button class="btn btn-primary" onclick="showPage('home')" style="margin-top:20px">Retour à l'accueil</button>
      </div>
    `;
  }
  showPage('checkout');
  showToast('Paiement réussi ! Commande #' + orderId, 'success');
}

async function updateCart() {
  try {
    const cart = await api('/cart');
    const badge = document.getElementById('cartCount');
    const prev = parseInt(badge.textContent);
    badge.textContent = cart.count;
    if (cart.count > prev) { badge.classList.add('pulse'); setTimeout(() => badge.classList.remove('pulse'), 500); }
  } catch (_) { document.getElementById('cartCount').textContent = '0'; }
}

// ============================================================
// NEWSLETTER
// ============================================================
document.getElementById('newsletterForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const email = document.getElementById('newsletterEmail').value;
  const btn = this.querySelector('button');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  try {
    await api('/newsletter', { method: 'POST', body: JSON.stringify({ email }) });
    this.reset();
    showToast('Inscription à la newsletter réussie !', 'success');
  } catch (err) {
    showToast(err.message === 'Déjà inscrit' ? 'Cet email est déjà inscrit.' : 'Erreur lors de l\'inscription.', 'error');
  }
  btn.disabled = false; btn.innerHTML = orig;
});

// ============================================================
// SEARCH
// ============================================================
document.getElementById('searchBtn').addEventListener('click', doSearch);
document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  showPage('home');
  if (!q) { await loadProducts(); document.querySelector('.tab-btn[data-filter="all"]')?.classList.add('active'); return; }
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<div class="loader"><div class="loader-spinner"></div><p>Recherche...</p></div>';
  try {
    const results = await api('/products?search=' + encodeURIComponent(q));
    allProducts = results;
    document.getElementById('productsTitle').textContent = 'Résultats pour "' + esc(q) + '"';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    renderProducts(results);
  } catch (_) { grid.innerHTML = '<p class="loading">Aucun résultat</p>'; }
}

// ============================================================
// NAV LINKS
// ============================================================
document.querySelectorAll('.nav-inner > a[data-category]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); goHomeAndFilter('category', a.dataset.category); });
});
document.querySelectorAll('.nav-inner > a[data-condition]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); goHomeAndFilter('condition', a.dataset.condition); });
});
document.querySelector('.nav-cat-btn')?.addEventListener('click', async function (e) {
  e.preventDefault(); showPage('home'); currentFilter = 'all';
  document.getElementById('productsTitle').textContent = 'Tous les produits';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.tab-btn[data-filter="all"]')?.classList.add('active');
  allProducts = await api('/products');
  renderProducts(allProducts);
});
document.querySelector('.nav-inner > a[data-featured]')?.addEventListener('click', async e => {
  e.preventDefault(); showPage('home');
  allProducts = await api('/products/featured');
  document.getElementById('productsTitle').textContent = 'Promotions';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  renderProducts(allProducts);
});
document.querySelectorAll('.nav-dropdown-menu a').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); goHomeAndFilter('category', 'consoles'); });
});
document.querySelectorAll('.hero-card .btn').forEach(btn => {
  btn.addEventListener('click', e => { e.preventDefault(); goHomeAndFilter('category', btn.dataset.category); });
});

// ============================================================
// TAB CLICKS
// ============================================================
document.querySelectorAll('.tab-btn[data-filter]').forEach(btn => {
  btn.addEventListener('click', async function () {
    const f = this.dataset.filter;
    if (f === 'all') {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = 'all';
      document.getElementById('productsTitle').textContent = 'Tous les produits';
      allProducts = await api('/products');
      renderProducts(allProducts);
    } else { goHomeAndFilter('condition', f); }
  });
});

// ============================================================
// MOBILE MENU BUILD
// ============================================================
async function buildMobileMenu() {
  const cats = await api('/categories');
  const body = document.getElementById('mobileMenuBody');
  body.innerHTML = `
    <a href="#" data-page="home"><i class="fas fa-home"></i> Accueil</a>
    <a href="#" data-page="checkout"><i class="fas fa-shopping-cart"></i> Mon panier</a>
    <a href="#" onclick="showAccount();toggleMenu(false);return false"><i class="fas fa-user"></i> ${isLoggedIn() ? 'Mon compte' : 'Connexion'}</a>
    <hr style="border:none;border-top:1px solid #eee;margin:8px 16px">
    ${cats.map(c => `<a href="#" data-cat-slug="${c.slug}"><i class="fas fa-chevron-right"></i> ${esc(c.name)}</a>`).join('')}
  `;
  body.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault(); toggleMenu(false);
      const p = el.dataset.page;
      if (p === 'checkout') renderCheckout();
      showPage(p);
    });
  });
  body.querySelectorAll('[data-cat-slug]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); toggleMenu(false); goHomeAndFilter('category', el.dataset.catSlug); });
  });
}

// ============================================================
// CLIENT ACCOUNT
// ============================================================
function getToken() { return localStorage.getItem('authToken'); }
function setToken(t) { if (t) localStorage.setItem('authToken', t); else localStorage.removeItem('authToken'); }
function isLoggedIn() { return !!getToken(); }

async function apiAuth(path, opts = {}) {
  const t = getToken();
  if (t) opts.headers = { ...opts.headers, 'x-auth-token': t };
  return api(path, opts);
}

// ---- Google Auth ----
window.handleGoogleCredential = async function (response) {
  try {
    const res = await api('/auth/google', {
      method: 'POST', body: JSON.stringify({ credential: response.credential })
    });
    setToken(res.token);
    updateAccountLabel();
    const el = document.getElementById('accountContent');
    await renderAccountDashboard(el);
    showToast('Connecté avec Google !', 'success');
  } catch (e) {
    showToast('Erreur Google: ' + e.message, 'error');
  }
};

function updateAccountLabel() {
  document.getElementById('accountLabel').textContent = isLoggedIn() ? 'Mon compte' : 'Espace client';
}

async function showAccount() {
  showPage('account');
  const el = document.getElementById('accountContent');
  if (isLoggedIn()) { await renderAccountDashboard(el); return; }
  renderAccountLogin(el);
}

function renderAccountLogin(el) {
  let googHtml = '';
  const gid = localStorage.getItem('googleClientId');
  if (gid) {
    googHtml = `
      <div id="gSignInWrapper" style="margin-bottom:16px;display:flex;justify-content:center">
        <div id="g_id_onload" data-client_id="${gid}" data-context="signin" data-callback="handleGoogleCredential" data-auto_prompt="false"></div>
        <div class="g_id_signin" data-type="standard" data-shape="pill" data-theme="outline" data-text="signin_with" data-size="large" data-logo_alignment="left"></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px"><hr style="flex:1;border:none;border-top:1px solid #e0e0e0"><span style="font-size:12px;color:#999">ou</span><hr style="flex:1;border:none;border-top:1px solid #e0e0e0"></div>`;
  }
  el.innerHTML = `
    <div class="account-layout">
      <div class="account-card" id="loginCard">
        <h2><i class="fas fa-user"></i> Connexion</h2>
        ${googHtml}
        <form id="loginForm">
          <div class="form-group"><label>Email</label><input type="email" id="loginEmail" required placeholder="votre@email.com"></div>
          <div class="form-group"><label>Mot de passe</label><input type="password" id="loginPassword" required placeholder="Votre mot de passe"></div>
          <button type="submit" class="btn btn-primary">Se connecter</button>
        </form>
        <p class="account-msg" id="loginMsg"></p>
        <p class="account-toggle">Pas encore de compte ? <a id="showRegister">Créer un compte</a></p>
      </div>
      <div class="account-card" id="registerCard" style="display:none">
        <h2><i class="fas fa-user-plus"></i> Créer un compte</h2>
        ${gid ? `<div style="margin-bottom:16px;display:flex;justify-content:center">
          <div class="g_id_signin" data-type="standard" data-shape="pill" data-theme="outline" data-text="signup_with" data-size="large" data-logo_alignment="left"></div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px"><hr style="flex:1;border:none;border-top:1px solid #e0e0e0"><span style="font-size:12px;color:#999">ou</span><hr style="flex:1;border:none;border-top:1px solid #e0e0e0"></div>` : ''}
        <form id="registerForm">
          <div class="form-group"><label>Nom complet *</label><input type="text" id="regName" required placeholder="Votre nom"></div>
          <div class="form-group"><label>Email *</label><input type="email" id="regEmail" required placeholder="votre@email.com"></div>
          <div class="form-group"><label>Téléphone</label><input type="tel" id="regPhone" placeholder="+225 XX XX XX XX"></div>
          <div class="form-group"><label>Mot de passe *</label><input type="password" id="regPassword" required minlength="8" placeholder="Min 8 caractères"></div>
          <div class="form-group"><label>Confirmer mot de passe *</label><input type="password" id="regPasswordConfirm" required minlength="8" placeholder="Répétez le mot de passe"></div>
          <p style="font-size:12px;color:#999;margin:-8px 0 12px">Doit contenir : 1 majuscule, 1 minuscule, 1 chiffre, 1 symbole</p>
          <button type="submit" class="btn btn-primary">Créer mon compte</button>
        </form>
        <p class="account-msg" id="registerMsg"></p>
        <p class="account-toggle">Déjà un compte ? <a id="showLogin">Se connecter</a></p>
      </div>
    </div>
  `;
  if (gid && window.google?.accounts?.id) {
    try { google.accounts.id.initialize({ client_id: gid, callback: window.handleGoogleCredential }); google.accounts.id.renderButton(document.querySelector('.g_id_signin'), { type: 'standard', shape: 'pill', theme: 'outline', text: 'signin_with', size: 'large', logo_alignment: 'left' }); } catch (_) {}
  }

  document.getElementById('showRegister').addEventListener('click', () => {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('registerCard').style.display = 'block';
    document.getElementById('loginMsg').textContent = '';
  });
  document.getElementById('showLogin').addEventListener('click', () => {
    document.getElementById('loginCard').style.display = 'block';
    document.getElementById('registerCard').style.display = 'none';
    document.getElementById('registerMsg').textContent = '';
  });

  document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    const msg = document.getElementById('loginMsg');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
    msg.className = 'account-msg'; msg.textContent = '';
    try {
      const res = await api('/customers/login', {
        method: 'POST', body: JSON.stringify({
          email: document.getElementById('loginEmail').value,
          password: document.getElementById('loginPassword').value
        })
      });
      setToken(res.token);
      updateAccountLabel();
      await renderAccountDashboard(document.getElementById('accountContent'));
      showToast('Connecté en tant que ' + res.customer.name, 'success');
    } catch (err) { msg.className = 'account-msg account-error'; msg.textContent = err.message; btn.disabled = false; btn.innerHTML = 'Se connecter'; }
  });

  document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    const msg = document.getElementById('registerMsg');
    const pwd = document.getElementById('regPassword').value;
    if (pwd.length < 8) { msg.className = 'account-msg account-error'; msg.textContent = 'Mot de passe trop court (min 8 caractères)'; return; }
    if (!/[A-Z]/.test(pwd)) { msg.className = 'account-msg account-error'; msg.textContent = 'Doit contenir au moins une majuscule'; return; }
    if (!/[a-z]/.test(pwd)) { msg.className = 'account-msg account-error'; msg.textContent = 'Doit contenir au moins une minuscule'; return; }
    if (!/[0-9]/.test(pwd)) { msg.className = 'account-msg account-error'; msg.textContent = 'Doit contenir au moins un chiffre'; return; }
    if (!/[^a-zA-Z0-9]/.test(pwd)) { msg.className = 'account-msg account-error'; msg.textContent = 'Doit contenir au moins un symbole spécial'; return; }
    const confirm = document.getElementById('regPasswordConfirm').value;
    if (pwd !== confirm) { msg.className = 'account-msg account-error'; msg.textContent = 'Les mots de passe ne correspondent pas'; return; }
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
    msg.className = 'account-msg';
    try {
      const res = await api('/customers/register', {
        method: 'POST', body: JSON.stringify({
          name: document.getElementById('regName').value,
          email: document.getElementById('regEmail').value,
          phone: document.getElementById('regPhone').value || null,
          password: document.getElementById('regPassword').value
        })
      });
      setToken(res.token);
      updateAccountLabel();
      await renderAccountDashboard(document.getElementById('accountContent'));
      showToast('Bienvenue ' + res.customer.name + ' !', 'success');
    } catch (err) { msg.className = 'account-msg account-error'; msg.textContent = err.message; btn.disabled = false; btn.innerHTML = 'Créer mon compte'; }
  });
}

async function renderAccountDashboard(el) {
  try {
    const me = await apiAuth('/customers/me');
    const orders = await apiAuth('/customers/orders');
    el.innerHTML = `
      <div class="account-dashboard">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <h2><i class="fas fa-user-circle"></i> Bonjour, ${esc(me.name)}</h2>
          <div style="display:flex;gap:8px">
            <button class="logout-btn" id="editProfileBtn"><i class="fas fa-pen"></i> Modifier</button>
            <button class="logout-btn" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Déconnexion</button>
          </div>
        </div>
        <div class="account-info">
          <div><strong>Nom</strong><span>${esc(me.name)}</span></div>
          <div><strong>Email</strong><span>${esc(me.email)}</span></div>
          <div><strong>Téléphone</strong><span>${esc(me.phone || '-')}</span></div>
          <div><strong>Adresse</strong><span>${esc(me.address || '-')}</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm active" id="tabOrders" onclick="document.getElementById('ordersSection').style.display='block';document.getElementById('wishlistSection').style.display='none';this.classList.add('active');document.getElementById('tabWishlist').classList.remove('active')"><i class="fas fa-receipt"></i> Commandes</button>
          <button class="btn btn-secondary btn-sm" id="tabWishlist" onclick="document.getElementById('ordersSection').style.display='none';document.getElementById('wishlistSection').style.display='block';this.classList.add('active');document.getElementById('tabOrders').classList.remove('active');loadWishlist()"><i class="fas fa-heart"></i> Favoris</button>
        </div>
        <div id="ordersSection">
          <h3 style="margin-bottom:12px"><i class="fas fa-receipt"></i> Mes commandes</h3>
          <div id="myOrders">${orders.length ? orders.map(o => `
            <div class="account-order-card" style="cursor:pointer" onclick="showOrderDetail(${o.id})">
              <div class="order-info">
                <strong>Commande #${o.id}</strong>
                <small>${o.created_at || ''} · ${o.items ? o.items.length : 0} article(s)</small>
              </div>
              <div class="order-right">
                <div style="font-weight:700;color:#e63946">${fmt(o.total)} F</div>
                <span class="status-badge status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
              </div>
            </div>
          `).join('') : '<div style="text-align:center;padding:40px 0;color:#999"><i class="fas fa-receipt" style="font-size:40px;color:#ddd;margin-bottom:12px"></i><p>Aucune commande pour le moment.</p><a href="#" data-page="home" style="color:#e63946;font-weight:600;margin-top:8px;display:inline-block">Découvrir nos produits</a></div>'}</div>
        </div>
        <div id="wishlistSection" style="display:none">
          <h3 style="margin-bottom:12px"><i class="fas fa-heart"></i> Mes favoris</h3>
          <div id="wishlistGrid" class="products-grid"></div>
        </div>
        <p style="margin-top:20px"><a href="#" data-page="home" class="back-link"><i class="fas fa-arrow-left"></i> Retour aux achats</a></p>
      </div>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => {
      setToken(null); updateAccountLabel(); renderAccountLogin(el);
    });
    document.getElementById('editProfileBtn').addEventListener('click', () => {
      openModal(`
        <h3>Modifier mon profil</h3>
        <form id="editProfileForm">
          <div class="form-group"><label>Nom</label><input type="text" id="ep_name" value="${esc(me.name)}"></div>
          <div class="form-group"><label>Téléphone</label><input type="tel" id="ep_phone" value="${esc(me.phone || '')}"></div>
          <div class="form-group"><label>Adresse</label><input type="text" id="ep_address" value="${esc(me.address || '')}"></div>
          <div class="modal-actions">
            <button type="submit" class="btn btn-primary">Enregistrer</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
          </div>
        </form>
      `);
      document.getElementById('editProfileForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
          await apiAuth('/customers/me', { method: 'PUT', body: JSON.stringify({
            name: document.getElementById('ep_name').value,
            phone: document.getElementById('ep_phone').value || null,
            address: document.getElementById('ep_address').value || null
          })});
          closeModal();
          renderAccountDashboard(el);
          showToast('Profil mis à jour', 'success');
        } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
      });
    });
    el.querySelector('[data-page="home"]').addEventListener('click', e => { e.preventDefault(); showPage('home'); });
  } catch (e) {
    setToken(null); updateAccountLabel(); renderAccountLogin(el);
  }
}

async function showOrderDetail(orderId) {
  try {
    const order = await api('/orders/' + orderId);
    openModal(`
      <h3>Commande #${orderId}</h3>
      <div style="margin-bottom:12px"><span class="status-badge status-${order.status}">${STATUS_LABELS[order.status] || order.status}</span></div>
      <div style="margin-bottom:16px">
        <div><strong>Total:</strong> ${fmt(order.total)} F</div>
        <div><strong>Date:</strong> ${order.created_at || ''}</div>
        <div><strong>Paiement:</strong> ${order.payment_method || 'Non spécifié'}</div>
      </div>
      <div><strong>Articles</strong></div>
      ${(order.items || []).map(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f2f4;font-size:13px">
        <span>${esc(i.product_name || 'Produit #' + i.product_id)} x${i.quantity}</span>
        <span>${fmt(i.unit_price * i.quantity)} F</span>
      </div>`).join('')}
      <div style="margin-top:16px">
        <h4 style="font-size:14px;margin-bottom:8px"><i class="fas fa-truck"></i> Suivi livraison</h4>
        <div id="deliveryTracking_${orderId}"></div>
      </div>
      <div class="modal-actions" style="margin-top:16px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      </div>
    `);
    loadDeliveryTracking(orderId, 'deliveryTracking_' + orderId);
  } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

// ============================================================
// MODALS
// ============================================================
function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').style.display = 'block';
  document.getElementById('modalContent').style.display = 'block';
}
function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('modalContent').style.display = 'none';
}

// ============================================================
// ADMIN
// ============================================================
async function renderAdmin(section) {
  showPage('admin');
  document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.admin-nav-link').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('admin-' + section);
  if (panel) panel.style.display = 'block';
  document.querySelector(`.admin-nav-link[data-admin="${section}"]`)?.classList.add('active');

  const titles = { dashboard: 'Dashboard', products: 'Produits', categories: 'Catégories', orders: 'Commandes', subscribers: 'Abonnés', customers: 'Clients', reports: 'Rapports', banners: 'Bannières', config: 'Configuration', promos: 'Promos', users: 'Utilisateurs' };
  const icons = { dashboard: 'fa-chart-simple', products: 'fa-box', categories: 'fa-tags', orders: 'fa-truck', subscribers: 'fa-envelope', customers: 'fa-users', reports: 'fa-chart-line', banners: 'fa-images', config: 'fa-cog', promos: 'fa-percent', users: 'fa-user-shield' };
  document.getElementById('adminTitle').innerHTML = `<i class="fas ${icons[section] || 'fa-cog'}"></i> ${titles[section] || 'Admin'}`;

  if (section === 'dashboard') await renderDashboard();
  else if (section === 'products') await renderAdminProducts();
  else if (section === 'categories') await renderAdminCategories();
  else if (section === 'orders') await renderAdminOrders();
  else if (section === 'subscribers') await renderAdminSubscribers();
  else if (section === 'customers') await renderAdminCustomers();
  else if (section === 'reports') await renderAdminReports();
  else if (section === 'banners') await renderAdminBanners();
  else if (section === 'config') await renderAdminConfig();
  else if (section === 'promos') await renderAdminPromos();
  else if (section === 'users') await renderAdminUsers();
}

document.querySelectorAll('.admin-nav-link[data-admin]').forEach(tab => {
  tab.addEventListener('click', () => renderAdmin(tab.dataset.admin));
});

// --- Dashboard ---
async function renderDashboard() {
  const el = document.getElementById('admin-dashboard');
  try {
    const d = await api('/dashboard');
    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon"><i class="fas fa-box"></i></div><div class="stat-value">${d.products}</div><div class="stat-label">Produits</div></div>
        <div class="stat-card"><div class="stat-icon"><i class="fas fa-tags"></i></div><div class="stat-value">${d.categories}</div><div class="stat-label">Catégories</div></div>
        <div class="stat-card"><div class="stat-icon"><i class="fas fa-shopping-bag"></i></div><div class="stat-value">${d.orders}</div><div class="stat-label">Commandes</div></div>
        <div class="stat-card"><div class="stat-icon"><i class="fas fa-envelope"></i></div><div class="stat-value">${d.subscribers}</div><div class="stat-label">Abonnés</div></div>
        <div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill"></i></div><div class="stat-value">${fmt(d.revenue)} F</div><div class="stat-label">Revenu total</div></div>
      </div>
      ${d.lowStock && d.lowStock.length ? `
        <h3 style="margin-top:16px">⚠ Stock faible</h3>
        <div class="table-wrapper"><table class="admin-table">
          <tr><th>Produit</th><th>Stock</th></tr>
          ${d.lowStock.map(p => `<tr><td>${esc(p.name)}</td><td class="stock-low">${p.stock}</td></tr>`).join('')}
        </table></div>
      ` : ''}
      <h3 style="margin-top:16px">Dernières commandes</h3>
      <div class="table-wrapper"><table class="admin-table">
        <tr><th>#</th><th>Client</th><th>Total</th><th>Statut</th><th>Date</th></tr>
        ${(d.recentOrders || []).map(o => `<tr><td>#${o.id}</td><td>${esc(o.customer_name)}</td><td>${fmt(o.total)} F</td><td><span class="status-badge status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span></td><td>${o.created_at || ''}</td></tr>`).join('')}
      </table></div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

// --- Admin Products ---
async function renderAdminProducts() {
  const el = document.getElementById('admin-products');
  try {
    const products = await api('/products');
    el.innerHTML = `
      <div class="admin-header">
        <h3>Gestion des produits <span style="color:#999;font-weight:400">(${products.length})</span> <a href="/api/export/products" class="btn btn-secondary btn-sm export-btn" target="_blank"><i class="fas fa-download"></i> CSV</a></h3>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('csvImportInput').click()"><i class="fas fa-upload"></i> Import CSV</button>
          <input type="file" id="csvImportInput" accept=".csv" style="display:none" onchange="importProductsCSV(this)">
          <button class="btn btn-primary btn-sm" onclick="adminProductForm()"><i class="fas fa-plus"></i> Ajouter</button>
        </div>
      </div>
      <div class="table-wrapper"><table class="admin-table">
        <tr><th>ID</th><th>Nom</th><th>Prix</th><th>Catégorie</th><th>Stock</th><th>Remise</th><th>Actions</th></tr>
        ${products.map(p => `<tr>
          <td>#${p.id}</td>
          <td><strong>${esc(p.name)}</strong></td>
          <td>${fmt(p.price)} F</td>
          <td>${esc(p.category_name || '-')}</td>
          <td class="${p.stock < 5 ? 'stock-low' : 'stock-ok'}">${p.stock}</td>
          <td>${p.discount ? p.discount + '%' : '-'}</td>
          <td class="actions">
            <button class="btn btn-secondary btn-sm" onclick="adminProductForm(${p.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="adminDeleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`).join('')}
      </table></div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

async function adminProductForm(id) {
  const cats = await api('/categories');
  let p = { name: '', price: '', old_price: '', description: '', image: '', condition: 'neuf', stock: 0, category_id: '', discount: 0, slug: '' };
  let title = 'Ajouter un produit';
  if (id) { p = await api('/products/' + id); title = 'Modifier le produit'; }

  openModal(`
    <h3>${title}</h3>
    <form id="adminProductForm">
      <div class="form-group"><label>Nom *</label><input type="text" id="pf_name" value="${esc(p.name)}" required></div>
      <div class="form-group"><label>Prix (F) *</label><input type="number" id="pf_price" value="${p.price}" required></div>
      <div class="form-group"><label>Ancien prix (F)</label><input type="number" id="pf_old_price" value="${p.old_price || ''}"></div>
      <div class="form-group"><label>Remise (%)</label><input type="number" id="pf_discount" value="${p.discount || 0}"></div>
      <div class="form-group"><label>Stock</label><input type="number" id="pf_stock" value="${p.stock || 0}"></div>
      <div class="form-group"><label>Image URL</label><input type="url" id="pf_image" value="${esc(p.image || '')}"></div>
      <div class="form-group"><label>Description</label><textarea id="pf_description">${esc(p.description || '')}</textarea></div>
      <div class="form-group"><label>État</label><select id="pf_condition"><option value="neuf" ${p.condition === 'neuf' ? 'selected' : ''}>Neuf</option><option value="occasion" ${p.condition === 'occasion' ? 'selected' : ''}>Occasion</option></select></div>
      <div class="form-group"><label>Catégorie</label><select id="pf_category">${cats.map(c => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Ajouter'}</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      </div>
    </form>
  `);

  document.getElementById('adminProductForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (id ? 'Enregistrement...' : 'Ajout...');
    const data = {
      name: document.getElementById('pf_name').value,
      price: parseInt(document.getElementById('pf_price').value),
      old_price: document.getElementById('pf_old_price').value ? parseInt(document.getElementById('pf_old_price').value) : null,
      discount: parseInt(document.getElementById('pf_discount').value) || 0,
      stock: parseInt(document.getElementById('pf_stock').value) || 0,
      image: document.getElementById('pf_image').value || null,
      description: document.getElementById('pf_description').value || null,
      condition: document.getElementById('pf_condition').value,
      category_id: parseInt(document.getElementById('pf_category').value) || null
    };
    try {
      if (id) { await api('/products/' + id, { method: 'PUT', body: JSON.stringify(data) }); showToast('Produit modifié', 'success'); }
      else { await api('/products', { method: 'POST', body: JSON.stringify(data) }); showToast('Produit ajouté', 'success'); }
      closeModal();
      renderAdmin('products');
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = id ? 'Enregistrer' : 'Ajouter'; }
  });
}

async function adminDeleteProduct(id) {
  if (!confirm('Supprimer ce produit ?')) return;
  try { await api('/products/' + id, { method: 'DELETE' }); renderAdmin('products'); showToast('Produit supprimé', 'success'); }
  catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

async function importProductsCSV(input) {
  const file = input.files[0]; if (!file) return;
  const form = new FormData(); form.append('file', file);
  const btn = input.previousElementSibling; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Import...';
  try {
    const res = await fetch(API + '/import/products', { method: 'POST', body: form, headers: { 'x-admin-token': getAdminToken() } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur import');
    showToast(`${data.message}`, data.errors ? 'warning' : 'success');
    renderAdmin('products');
  } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Import CSV'; input.value = '';
}

// --- Admin Categories ---
async function renderAdminCategories() {
  const el = document.getElementById('admin-categories');
  try {
    const cats = await api('/categories');
    el.innerHTML = `
      <div class="admin-header"><h3>Catégories</h3><button class="btn btn-primary btn-sm" onclick="adminCategoryForm()"><i class="fas fa-plus"></i> Ajouter</button></div>
      <div class="table-wrapper"><table class="admin-table">
        <tr><th>ID</th><th>Nom</th><th>Slug</th><th>Produits</th><th>Actions</th></tr>
        ${cats.map(c => `<tr><td>#${c.id}</td><td><strong>${esc(c.name)}</strong></td><td>${esc(c.slug)}</td><td>${c.product_count || 0}</td><td class="actions">
          <button class="btn btn-secondary btn-sm" onclick="adminCategoryForm(${c.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm" onclick="adminDeleteCategory(${c.id})"><i class="fas fa-trash"></i></button>
        </td></tr>`).join('')}
      </table></div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

async function adminCategoryForm(id) {
  let c = { name: '', icon: 'fa-tag', color: '#f5f5f5' };
  let title = 'Ajouter une catégorie';
  if (id) { c = await api('/categories/' + id); title = 'Modifier'; }
  openModal(`
    <h3>${title}</h3>
    <form id="adminCategoryForm">
      <div class="form-group"><label>Nom *</label><input type="text" id="cf_name" value="${esc(c.name)}" required></div>
      <div class="form-group"><label>Icone (FontAwesome, ex: fa-laptop)</label><input type="text" id="cf_icon" value="${esc(c.icon || 'fa-tag')}"></div>
      <div class="form-group"><label>Couleur (ex: #e8f5e9)</label><input type="text" id="cf_color" value="${esc(c.color || '#f5f5f5')}"></div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Ajouter'}</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      </div>
    </form>
  `);
  document.getElementById('adminCategoryForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (id ? 'Enregistrement...' : 'Ajout...');
    const data = {
      name: document.getElementById('cf_name').value,
      icon: document.getElementById('cf_icon').value || 'fa-tag',
      color: document.getElementById('cf_color').value || '#f5f5f5'
    };
    try {
      if (id) { await api('/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }); showToast('Catégorie modifiée', 'success'); }
      else { await api('/categories', { method: 'POST', body: JSON.stringify(data) }); showToast('Catégorie ajoutée', 'success'); }
      closeModal(); renderAdmin('categories');
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = id ? 'Enregistrer' : 'Ajouter'; }
  });
}

async function adminDeleteCategory(id) {
  if (!confirm('Supprimer cette catégorie ? Les produits liés ne seront plus catégorisés.')) return;
  try { await api('/categories/' + id, { method: 'DELETE' }); renderAdmin('categories'); showToast('Catégorie supprimée', 'success'); }
  catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

// --- Admin Orders ---
async function renderAdminOrders() {
  const el = document.getElementById('admin-orders');
  try {
    const orders = await api('/orders');
    el.innerHTML = `
      <h3>Commandes <span style="color:#999;font-weight:400">(${orders.length})</span> <a href="/api/export/orders" class="btn btn-secondary btn-sm export-btn" target="_blank" style="float:right"><i class="fas fa-download"></i> CSV</a></h3>
      <div class="table-wrapper"><table class="admin-table">
        <tr><th>#</th><th>Client</th><th>Téléphone</th><th>Articles</th><th>Total</th><th>Statut</th><th>Date</th><th>Actions</th></tr>
        ${orders.map(o => `
          <tr>
            <td>#${o.id}</td>
            <td><strong>${esc(o.customer_name)}</strong></td>
            <td>${esc(o.customer_phone)}</td>
            <td><a href="#" onclick="showOrderItems(${o.id});return false" style="color:#e63946">Voir</a></td>
            <td>${fmt(o.total)} F</td>
            <td><span class="status-badge status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span></td>
            <td style="font-size:12px">${o.created_at || ''}</td>
            <td class="actions">
              <select onchange="adminUpdateOrderStatus(${o.id}, this.value)" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px">
                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>En attente</option>
                <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Expédiée</option>
                <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Livrée</option>
                <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Annulée</option>
              </select>
              <button class="btn btn-danger btn-sm" onclick="adminDeleteOrder(${o.id})"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join('')}
      </table></div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

async function showOrderItems(id) {
  const order = await api('/orders/' + id);
  if (!order.items || !order.items.length) return showToast('Aucun article', 'info');
  openModal(`
    <h3>Commande #${id}</h3>
    <div style="margin-bottom:12px"><strong>${esc(order.customer_name)}</strong> · ${order.created_at || ''}</div>
    <table class="admin-table" style="margin-bottom:12px">
      <tr><th>Produit</th><th>Qté</th><th>Prix</th><th>Total</th></tr>
      ${order.items.map(i => `<tr><td>${esc(i.product_name)}</td><td>x${i.quantity}</td><td>${fmt(i.unit_price)} F</td><td><strong>${fmt(i.unit_price * i.quantity)} F</strong></td></tr>`).join('')}
    </table>
    <div style="text-align:right;font-size:18px;font-weight:700">Total: ${fmt(order.total)} F</div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Fermer</button></div>
  `);
}

async function adminUpdateOrderStatus(id, status) {
  try {
    await api('/orders/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
    renderAdmin('orders');
    showToast('Commande #' + id + ' → ' + status, 'success');
  } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

async function adminDeleteOrder(id) {
  if (!confirm('Supprimer la commande #' + id + ' ?')) return;
  try { await api('/orders/' + id, { method: 'DELETE' }); renderAdmin('orders'); showToast('Commande #' + id + ' supprimée', 'success'); }
  catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

// --- Admin Subscribers ---
async function renderAdminSubscribers() {
  const el = document.getElementById('admin-subscribers');
  try {
    const subs = await api('/newsletter');
    el.innerHTML = `
      <h3>Abonnés newsletter <span style="color:#999;font-weight:400">(${subs.length})</span> <a href="/api/export/subscribers" class="btn btn-secondary btn-sm export-btn" target="_blank" style="float:right"><i class="fas fa-download"></i> CSV</a></h3>
      <div class="table-wrapper"><table class="admin-table">
        <tr><th>Email</th><th>Date d'inscription</th></tr>
        ${subs.map(s => `<tr><td>${esc(s.email)}</td><td style="font-size:12px;color:#666">${s.created_at || ''}</td></tr>`).join('')}
      </table></div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

// ============================================================
// ADMIN AUTH (multi-user with roles)
// ============================================================
const ADMIN_ROLES = { super_admin: 'Super Admin', manager: 'Manager', commercial: 'Commercial', vendeur: 'Vendeur' };

function getAdminToken() { return localStorage.getItem('adminToken'); }
function setAdminToken(t) { if (t) localStorage.setItem('adminToken', t); else localStorage.removeItem('adminToken'); }
function getAdminUser() { const d = localStorage.getItem('adminUser'); return d ? JSON.parse(d) : null; }
function setAdminUser(u) { if (u) localStorage.setItem('adminUser', JSON.stringify(u)); else localStorage.removeItem('adminUser'); }

function showAdminLogin() {
  openModal(`
    <h3><i class="fas fa-lock"></i> Administration</h3>
    <form id="adminLoginForm">
      <div class="form-group"><label>Email</label><input type="email" id="adminLoginEmail" required placeholder="admin@lebonwe.ci" value="admin@lebonwe.ci"></div>
      <div class="form-group"><label>Mot de passe</label><input type="password" id="adminLoginPassword" required placeholder="Mot de passe" autofocus></div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary"><i class="fas fa-unlock"></i> Se connecter</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      </div>
    </form>
    <p id="adminLoginError" style="color:#d32f2f;text-align:center;margin-top:12px;display:none"></p>
  `);
  document.getElementById('adminLoginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
    const err = document.getElementById('adminLoginError'); err.style.display = 'none';
    try {
      const res = await api('/admin/auth/login', {
        method: 'POST', body: JSON.stringify({
          email: document.getElementById('adminLoginEmail').value,
          password: document.getElementById('adminLoginPassword').value
        })
      });
      setAdminToken(res.token);
      setAdminUser(res.user);
      closeModal();
      applyAdminRole();
      renderAdmin('dashboard');
      showPage('admin');
      document.getElementById('adminUserName').textContent = res.user.name;
      document.getElementById('adminUserRole').textContent = ADMIN_ROLES[res.user.role] || res.user.role;
    } catch (e) {
      err.textContent = e.message; err.style.display = 'block';
      btn.disabled = false; btn.innerHTML = 'Se connecter';
    }
  });
  setTimeout(() => document.getElementById('adminLoginPassword')?.focus(), 100);
}

function applyAdminRole() {
  const user = getAdminUser();
  if (!user) return;
  document.querySelectorAll('[data-role]').forEach(el => {
    const roles = el.dataset.role.split(',');
    el.style.display = (roles.includes('all') || roles.includes(user.role)) ? '' : 'none';
  });
}

function adminLogout() {
  if (getAdminToken()) api('/admin/auth/logout', { method: 'POST', headers: { 'x-admin-token': getAdminToken() } }).catch(() => {});
  setAdminToken(null); setAdminUser(null);
  showPage('home');
  showToast('Déconnecté', 'info');
}

function checkAdminAccess(force) {
  if (!force && window.location.pathname !== '/admin' && window.location.pathname !== '/admin/') return;
  if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
    history.replaceState(null, '', '/');
  }
  const token = getAdminToken();
  if (token) {
    api('/admin/auth/me', { headers: { 'x-admin-token': token } }).then(user => {
      setAdminUser(user);
      applyAdminRole();
      document.getElementById('adminUserName').textContent = user.name;
      document.getElementById('adminUserRole').textContent = ADMIN_ROLES[user.role] || user.role;
      renderAdmin('dashboard');
      showPage('admin');
    }).catch(() => { setAdminToken(null); setAdminUser(null); showAdminLogin(); });
  } else {
    showAdminLogin();
  }
}

// === ADMIN: CLIENTS ===
async function renderAdminCustomers() {
  const el = document.getElementById('admin-customers');
  try {
    const customers = await api('/admin/customers');
    el.innerHTML = `
      <div class="admin-header">
        <h3>Clients <span style="color:#999;font-weight:400">(${customers.length})</span></h3>
        <input type="text" class="admin-search" id="customerSearch" placeholder="Rechercher un client...">
      </div>
      <div class="table-wrapper"><table class="admin-table">
        <tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Commandes</th><th>Total dépensé</th><th>Date</th><th>Actions</th></tr>
        ${customers.map(c => `<tr class="customer-row">
          <td><strong>${esc(c.name)}</strong></td>
          <td>${esc(c.email)}</td>
          <td>${esc(c.phone || '-')}</td>
          <td>${c.order_count}</td>
          <td style="font-weight:700">${fmt(c.total_spent)} F</td>
          <td style="font-size:12px">${c.created_at || ''}</td>
          <td class="actions"><button class="btn btn-secondary btn-sm" onclick="adminShowCustomerOrders(${c.id})"><i class="fas fa-receipt"></i></button></td>
        </tr>`).join('')}
      </table></div>
    `;
    document.getElementById('customerSearch').addEventListener('input', function () {
      const q = this.value.toLowerCase();
      document.querySelectorAll('.customer-row').forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

async function adminShowCustomerOrders(id) {
  try {
    const orders = await api('/admin/customers/' + id + '/orders');
    const customer = document.querySelector('.customer-row td strong')?.textContent || 'Client';
    openModal(`
      <h3>Commandes de ${esc(customer)}</h3>
      ${orders.length ? orders.map(o => `
        <div class="account-order-card" style="margin-bottom:8px">
          <div class="order-info">
            <strong>Commande #${o.id}</strong>
            <small>${o.created_at || ''} · ${o.items ? o.items.length : 0} article(s)</small>
          </div>
          <div class="order-right">
            <div style="font-weight:700;color:#e63946">${fmt(o.total)} F</div>
            <span class="status-badge status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
          </div>
        </div>
      `).join('') : '<p style="color:#999;text-align:center;padding:20px">Aucune commande</p>'}
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Fermer</button></div>
    `);
  } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

// === ADMIN: RAPPORTS ===
async function renderAdminReports() {
  const el = document.getElementById('admin-reports');
  try {
    const r = await api('/reports');
    el.innerHTML = `
      <h3>Rapports</h3>
      <div class="report-stats-row">
        <div class="report-card"><div class="report-stat" style="color:#e63946">${r.todayOrders}</div><div style="font-size:13px;color:#666">Commandes aujourd'hui</div></div>
        <div class="report-card"><div class="report-stat" style="color:#1565c0">${r.weekOrders}</div><div style="font-size:13px;color:#666">Cette semaine</div></div>
      </div>
      <div class="report-card">
        <h4>Top 5 produits</h4>
        ${(r.topProducts || []).map((p, i) => {
          const max = r.topProducts.reduce((m, x) => Math.max(m, x.total_sold), 1);
          const pct = (p.total_sold / max * 100).toFixed(0);
          return `<div class="report-bar"><span style="font-weight:700;width:24px">#${i+1}</span><div class="report-bar-fill" style="width:${pct}%"></div><span class="report-bar-value">${fmt(p.total_sold)} (${fmt(p.revenue)} F)</span></div>`;
        }).join('')}
      </div>
      <div class="report-card">
        <h4>Ventes par catégorie</h4>
        ${(r.salesByCategory || []).map(c => {
          const max = r.salesByCategory.reduce((m, x) => Math.max(m, x.total || 0), 1);
          const pct = ((c.total || 0) / max * 100).toFixed(0);
          return `<div class="report-bar"><span class="report-bar-label">${esc(c.name || 'Sans catégorie')}</span><div class="report-bar-fill" style="width:${pct}%"></div><span class="report-bar-value">${fmt(c.revenue)} F</span></div>`;
        }).join('')}
      </div>
      <div class="report-card">
        <h4>Revenu mensuel</h4>
        ${(r.monthlyRevenue || []).map(m => `<div class="report-bar"><span class="report-bar-label">${m.month}</span><span class="report-bar-value" style="color:#e63946">${fmt(m.revenue)} F (${m.orders} cmd)</span></div>`).join('')}
      </div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

// === ADMIN: BANNIÈRES ===
async function renderAdminBanners() {
  const el = document.getElementById('admin-banners');
  try {
    const banners = await api('/banners');
    el.innerHTML = `
      <div class="admin-header"><h3>Bannières</h3><button class="btn btn-primary btn-sm" onclick="adminBannerForm()"><i class="fas fa-plus"></i> Ajouter</button></div>
      <div class="table-wrapper"><table class="admin-table">
        <tr><th>Image</th><th>Titre</th><th>Sous-titre</th><th>Statut</th><th>Ordre</th><th>Actions</th></tr>
        ${banners.map(b => `<tr>
          <td><img src="${b.image || 'https://via.placeholder.com/80x60?text=No+Image'}" class="banner-preview-img" onerror="this.src='https://via.placeholder.com/80x60?text=No+Image'"></td>
          <td><strong>${esc(b.title || b.name)}</strong></td>
          <td>${esc(b.subtitle || '-')}</td>
          <td class="${b.active ? 'banner-active' : 'banner-inactive'}">${b.active ? 'Active' : 'Inactive'}</td>
          <td>${b.sort_order || 0}</td>
          <td class="actions">
            <button class="btn btn-secondary btn-sm" onclick="adminBannerForm(${b.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="adminDeleteBanner(${b.id})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`).join('')}
      </table></div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

async function adminBannerForm(id) {
  let b = { name: '', title: '', subtitle: '', image: '', link: '', active: 1, sort_order: 0 };
  let title = 'Ajouter une bannière';
  if (id) { const all = await api('/banners'); b = all.find(x => x.id === id) || b; title = 'Modifier la bannière'; }
  openModal(`
    <h3>${title}</h3>
    <form id="adminBannerForm">
      <div class="form-group"><label>Nom *</label><input type="text" id="bf_name" value="${esc(b.name)}" required></div>
      <div class="form-group"><label>Titre</label><input type="text" id="bf_title" value="${esc(b.title || '')}"></div>
      <div class="form-group"><label>Sous-titre</label><input type="text" id="bf_subtitle" value="${esc(b.subtitle || '')}"></div>
      <div class="form-group"><label>Image URL</label><input type="url" id="bf_image" value="${esc(b.image || '')}"></div>
      <div class="form-group"><label>Lien</label><input type="text" id="bf_link" value="${esc(b.link || '')}"></div>
      <div class="form-group"><label>Ordre</label><input type="number" id="bf_sort" value="${b.sort_order || 0}"></div>
      <div class="form-group"><label><input type="checkbox" id="bf_active" ${b.active ? 'checked' : ''}> Active</label></div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Ajouter'}</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      </div>
    </form>
  `);
  document.getElementById('adminBannerForm').addEventListener('submit', async function (e) {
    e.preventDefault(); const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (id ? 'Enregistrement...' : 'Ajout...');
    const data = {
      name: document.getElementById('bf_name').value,
      title: document.getElementById('bf_title').value || null,
      subtitle: document.getElementById('bf_subtitle').value || null,
      image: document.getElementById('bf_image').value || null,
      link: document.getElementById('bf_link').value || null,
      sort_order: parseInt(document.getElementById('bf_sort').value) || 0,
      active: document.getElementById('bf_active').checked ? 1 : 0
    };
    try {
      if (id) { await api('/banners/' + id, { method: 'PUT', body: JSON.stringify(data) }); showToast('Bannière modifiée', 'success'); }
      else { await api('/banners', { method: 'POST', body: JSON.stringify(data) }); showToast('Bannière ajoutée', 'success'); }
      closeModal(); renderAdmin('banners');
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = id ? 'Enregistrer' : 'Ajouter'; }
  });
}

async function adminDeleteBanner(id) {
  if (!confirm('Supprimer cette bannière ?')) return;
  try { await api('/banners/' + id, { method: 'DELETE' }); renderAdmin('banners'); showToast('Bannière supprimée', 'success'); }
  catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

// === ADMIN: CONFIGURATION ===
async function renderAdminConfig() {
  const el = document.getElementById('admin-config');
  try {
    const cfg = await api('/config');
    el.innerHTML = `
      <h3>Configuration du site</h3>
      <form class="config-form" id="configForm">
        <div class="form-group"><label>Nom du site</label><input type="text" id="cfg_site_name" value="${esc(cfg.site_name || '')}"></div>
        <div class="form-group"><label>Email de contact</label><input type="email" id="cfg_contact_email" value="${esc(cfg.contact_email || '')}"></div>
        <div class="form-group"><label>Téléphone</label><input type="text" id="cfg_contact_phone" value="${esc(cfg.contact_phone || '')}"></div>
        <div class="form-group"><label>Adresse</label><input type="text" id="cfg_address" value="${esc(cfg.address || '')}"></div>
        <div class="form-group"><label>Facebook URL</label><input type="url" id="cfg_facebook" value="${esc(cfg.facebook || '')}"></div>
        <div class="form-group"><label>Twitter URL</label><input type="url" id="cfg_twitter" value="${esc(cfg.twitter || '')}"></div>
        <div class="form-group"><label>Instagram URL</label><input type="url" id="cfg_instagram" value="${esc(cfg.instagram || '')}"></div>
        <div class="form-group"><label>Moyens de paiement (séparés par des virgules)</label><input type="text" id="cfg_payments" value="${esc(cfg.payment_methods || '')}"></div>
        <div class="form-group"><label>Frais de livraison (FCFA)</label><input type="number" id="cfg_delivery_fee" value="${cfg.delivery_fee || 0}"></div>
        <div class="form-group"><label>Google Client ID</label><input type="text" id="cfg_google_client_id" value="${esc(cfg.google_client_id || '')}" placeholder="Pour connexion Google"></div>
        <div style="border-top:2px solid #e0e0e0;margin:16px 0;padding-top:12px">
          <h4 style="margin-bottom:8px">PayDunya (Paiement Mobile Money)</h4>
          <div class="form-group"><label>Master Key</label><input type="text" id="cfg_paydunya_master_key" value="${esc(cfg.paydunya_master_key || '')}" style="font-family:monospace"></div>
          <div class="form-group"><label>Private Key</label><input type="text" id="cfg_paydunya_private_key" value="${esc(cfg.paydunya_private_key || '')}" style="font-family:monospace"></div>
          <div class="form-group"><label>Token</label><input type="text" id="cfg_paydunya_token" value="${esc(cfg.paydunya_token || '')}" style="font-family:monospace"></div>
        </div>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </form>
    `;
    document.getElementById('configForm').addEventListener('submit', async function (e) {
      e.preventDefault(); const btn = this.querySelector('button'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
      try {
        await api('/config', { method: 'PUT', body: JSON.stringify({
          site_name: document.getElementById('cfg_site_name').value,
          contact_email: document.getElementById('cfg_contact_email').value,
          contact_phone: document.getElementById('cfg_contact_phone').value,
          address: document.getElementById('cfg_address').value,
          facebook: document.getElementById('cfg_facebook').value,
          twitter: document.getElementById('cfg_twitter').value,
          instagram: document.getElementById('cfg_instagram').value,
          payment_methods: document.getElementById('cfg_payments').value,
          delivery_fee: document.getElementById('cfg_delivery_fee').value,
          google_client_id: document.getElementById('cfg_google_client_id').value,
          paydunya_master_key: document.getElementById('cfg_paydunya_master_key').value,
          paydunya_private_key: document.getElementById('cfg_paydunya_private_key').value,
          paydunya_token: document.getElementById('cfg_paydunya_token').value
        })});
        showToast('Configuration sauvegardée', 'success'); btn.disabled = false; btn.innerHTML = 'Enregistrer';
      } catch (e) { showToast('Erreur: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = 'Enregistrer'; }
    });
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

// === ADMIN: CODES PROMO ===
async function renderAdminPromos() {
  const el = document.getElementById('admin-promos');
  try {
    const promos = await api('/promos');
    el.innerHTML = `
      <div class="admin-header"><h3>Codes promo <span style="color:#999;font-weight:400">(${promos.length})</span></h3><button class="btn btn-primary btn-sm" onclick="adminPromoForm()"><i class="fas fa-plus"></i> Ajouter</button></div>
      <div class="table-wrapper"><table class="admin-table">
        <tr><th>Code</th><th>Type</th><th>Valeur</th><th>Min. achat</th><th>Utilisations</th><th>Période</th><th>Statut</th><th>Actions</th></tr>
        ${promos.map(p => {
          const now = new Date(); const start = p.start_date ? new Date(p.start_date) : null; const end = p.end_date ? new Date(p.end_date) : null;
          let status = p.active ? 'active' : 'inactive';
          let statusLabel = p.active ? 'Actif' : 'Inactif';
          if (p.usage_limit > 0 && p.used_count >= p.usage_limit) { status = 'exhausted'; statusLabel = 'Épuisé'; }
          else if (end && end < now) { status = 'expired'; statusLabel = 'Expiré'; }
          return `<tr>
            <td><strong style="font-size:14px">${esc(p.code)}</strong></td>
            <td><span class="promo-badge ${p.discount_type === 'percentage' ? 'promo-percentage' : 'promo-fixed'}">${p.discount_type === 'percentage' ? '%' : 'F'}</span></td>
            <td style="font-weight:700">${p.discount_type === 'percentage' ? p.discount_value + '%' : fmt(p.discount_value) + ' F'}</td>
            <td>${p.min_amount ? fmt(p.min_amount) + ' F' : '-'}</td>
            <td>${p.used_count}${p.usage_limit > 0 ? '/' + p.usage_limit : ''}</td>
            <td style="font-size:12px">${p.start_date || '—'} → ${p.end_date || '—'}</td>
            <td class="promo-${status}" style="font-weight:600">${statusLabel}</td>
            <td class="actions">
              <button class="btn btn-secondary btn-sm" onclick="adminPromoForm(${p.id})"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="adminDeletePromo(${p.id})"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        }).join('')}
      </table></div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

async function adminPromoForm(id) {
  let p = { code: '', discount_type: 'percentage', discount_value: '', min_amount: 0, start_date: '', end_date: '', usage_limit: 0, active: 1 };
  let title = 'Ajouter un code promo';
  if (id) { const all = await api('/promos'); p = all.find(x => x.id === id) || p; title = 'Modifier le code promo'; }
  openModal(`
    <h3>${title}</h3>
    <form id="adminPromoForm">
      <div class="form-group"><label>Code *</label><input type="text" id="pf_code" value="${esc(p.code)}" required style="text-transform:uppercase"></div>
      <div class="form-group"><label>Type</label><select id="pf_discount_type"><option value="percentage" ${p.discount_type === 'percentage' ? 'selected' : ''}>Pourcentage (%)</option><option value="fixed" ${p.discount_type === 'fixed' ? 'selected' : ''}>Montant fixe (F)</option></select></div>
      <div class="form-group"><label>Valeur *</label><input type="number" id="pf_discount_value" value="${p.discount_value}" required></div>
      <div class="form-group"><label>Montant minimum d'achat (F)</label><input type="number" id="pf_min_amount" value="${p.min_amount || 0}"></div>
      <div class="form-group"><label>Date de début</label><input type="date" id="pf_start" value="${p.start_date || ''}"></div>
      <div class="form-group"><label>Date de fin</label><input type="date" id="pf_end" value="${p.end_date || ''}"></div>
      <div class="form-group"><label>Limite d'utilisations (0 = illimité)</label><input type="number" id="pf_usage_limit" value="${p.usage_limit || 0}"></div>
      <div class="form-group"><label><input type="checkbox" id="pf_active" ${p.active ? 'checked' : ''}> Actif</label></div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Ajouter'}</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      </div>
    </form>
  `);
  document.getElementById('adminPromoForm').addEventListener('submit', async function (e) {
    e.preventDefault(); const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (id ? 'Enregistrement...' : 'Ajout...');
    const data = {
      code: document.getElementById('pf_code').value,
      discount_type: document.getElementById('pf_discount_type').value,
      discount_value: parseInt(document.getElementById('pf_discount_value').value),
      min_amount: parseInt(document.getElementById('pf_min_amount').value) || 0,
      start_date: document.getElementById('pf_start').value || null,
      end_date: document.getElementById('pf_end').value || null,
      usage_limit: parseInt(document.getElementById('pf_usage_limit').value) || 0,
      active: document.getElementById('pf_active').checked ? 1 : 0
    };
    try {
      if (id) { await api('/promos/' + id, { method: 'PUT', body: JSON.stringify(data) }); showToast('Code promo modifié', 'success'); }
      else { await api('/promos', { method: 'POST', body: JSON.stringify(data) }); showToast('Code promo ajouté', 'success'); }
      closeModal(); renderAdmin('promos');
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = id ? 'Enregistrer' : 'Ajouter'; }
  });
}

async function adminDeletePromo(id) {
  if (!confirm('Supprimer ce code promo ?')) return;
  try { await api('/promos/' + id, { method: 'DELETE' }); renderAdmin('promos'); showToast('Code promo supprimé', 'success'); }
  catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

// === ADMIN: UTILISATEURS ===
async function renderAdminUsers() {
  const el = document.getElementById('admin-users');
  try {
    const users = await api('/admin/auth/users', { headers: { 'x-admin-token': getAdminToken() } });
    el.innerHTML = `
      <div class="admin-header"><h3>Utilisateurs <span style="color:#999;font-weight:400">(${users.length})</span></h3><button class="btn btn-primary btn-sm" onclick="adminUserForm()"><i class="fas fa-plus"></i> Ajouter</button></div>
      <div class="table-wrapper"><table class="admin-table">
        <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Date</th><th>Actions</th></tr>
        ${users.map(u => `<tr>
          <td><strong>${esc(u.name)}</strong></td>
          <td>${esc(u.email)}</td>
          <td><span class="status-badge" style="background:#e8f5e9;color:#2e7d32">${ADMIN_ROLES[u.role] || u.role}</span></td>
          <td>${u.active ? '<span style="color:#2e7d32;font-weight:600">Actif</span>' : '<span style="color:#999">Inactif</span>'}</td>
          <td style="font-size:12px;color:#999">${u.created_at || ''}</td>
          <td class="actions">
            <button class="btn btn-secondary btn-sm" onclick="adminUserForm(${u.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="adminDeleteUser(${u.id})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`).join('')}
      </table></div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:#e63946">Erreur: ' + e.message + '</p>'; }
}

async function adminUserForm(id) {
  let u = { name: '', email: '', password: '', role: 'commercial', active: 1 };
  let title = 'Ajouter un utilisateur';
  if (id) { const all = await api('/admin/auth/users', { headers: { 'x-admin-token': getAdminToken() } }); u = all.find(x => x.id === id) || u; title = 'Modifier l\'utilisateur'; }
  openModal(`
    <h3>${title}</h3>
    <form id="adminUserForm">
      <div class="form-group"><label>Nom *</label><input type="text" id="uf_name" value="${esc(u.name)}" required></div>
      <div class="form-group"><label>Email *</label><input type="email" id="uf_email" value="${esc(u.email)}" required></div>
      <div class="form-group"><label>Mot de passe ${id ? '(laisser vide pour conserver)' : '*'}</label><input type="password" id="uf_password" ${id ? '' : 'required'} minlength="4"></div>
      <div class="form-group"><label>Rôle</label><select id="uf_role">
        <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
        <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>Manager</option>
        <option value="commercial" ${u.role === 'commercial' ? 'selected' : ''}>Commercial</option>
        <option value="vendeur" ${u.role === 'vendeur' ? 'selected' : ''}>Vendeur</option>
      </select></div>
      <div class="form-group"><label><input type="checkbox" id="uf_active" ${u.active ? 'checked' : ''}> Actif</label></div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Ajouter'}</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      </div>
    </form>
  `);
  document.getElementById('adminUserForm').addEventListener('submit', async function (e) {
    e.preventDefault(); const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (id ? 'Enregistrement...' : 'Ajout...');
    const data = {
      name: document.getElementById('uf_name').value,
      email: document.getElementById('uf_email').value,
      role: document.getElementById('uf_role').value,
      active: document.getElementById('uf_active').checked ? 1 : 0
    };
    const pwd = document.getElementById('uf_password').value;
    if (pwd) data.password = pwd;
    try {
      const headers = { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() };
      if (id) { await fetch(API + '/admin/auth/users/' + id, { method: 'PUT', body: JSON.stringify(data), headers }); showToast('Utilisateur modifié', 'success'); }
      else { await fetch(API + '/admin/auth/users', { method: 'POST', body: JSON.stringify(data), headers }); showToast('Utilisateur ajouté', 'success'); }
      closeModal(); renderAdmin('users');
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = id ? 'Enregistrer' : 'Ajouter'; }
  });
}

async function adminDeleteUser(id) {
  if (!confirm('Supprimer cet utilisateur ?')) return;
  try { await fetch(API + '/admin/auth/users/' + id, { method: 'DELETE', headers: { 'x-admin-token': getAdminToken() } }); renderAdmin('users'); showToast('Utilisateur supprimé', 'success'); }
  catch (e) { showToast('Erreur: ' + e.message, 'error'); }
}

// ============================================================
// KEYBOARD SHORTCUT: Ctrl+Shift+A to open admin
// ============================================================
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    checkAdminAccess(true);
  }
});

// ============================================================
// BACK TO TOP
// ============================================================
const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.scrollY > 400));
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ============================================================
// INIT
// ============================================================
async function init() {
  if (window.location.protocol === 'file:') {
    setTimeout(() => showToast('Utilisez <strong>http://localhost:5000</strong> pour toutes les fonctionnalités', 'info'), 500);
  }
  try {
    await api('/health');
    await loadCategories();
    await loadProducts();
    document.querySelector('.tab-btn[data-filter="all"]')?.classList.add('active');
    await updateCart();
    await buildMobileMenu();
    updateAccountLabel();
    try { const cfg = await api('/config'); if (cfg.google_client_id) localStorage.setItem('googleClientId', cfg.google_client_id); } catch (_) {}
    if (!localStorage.getItem('visited')) {
      setTimeout(() => showToast('Bienvenue sur <strong>lebonwé</strong> &#128075;', 'info'), 1500);
      localStorage.setItem('visited', '1');
    }
  checkAdminAccess();
  const params = new URLSearchParams(window.location.search);
  const paiement = params.get('paiement');
  const oid = params.get('order_id');
  if (paiement && oid) {
    history.replaceState(null, '', '/');
    await api('/cart', { method: 'DELETE' }); updateCart();
    if (paiement === 'success') {
      try { const o = await api('/orders/' + oid); showOrderSuccess(oid, o.total); }
      catch (_) { showOrderSuccess(oid); }
    } else {
      showToast('Paiement annulé pour la commande #' + oid, 'warning');
    }
  }
  if (window.location.pathname === '/account' || window.location.pathname === '/account/') {
    history.replaceState(null, '', '/');
    showAccount();
    showPage('account');
  }
} catch (e) {
    document.getElementById('productsGrid').innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:#e63946;padding:40px">⚠ Erreur de connexion au serveur.</p>';
  }
}

init();
