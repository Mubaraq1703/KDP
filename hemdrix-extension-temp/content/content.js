// Hemdrix KDP Wizard — Content Script (v3 + CSV Export)
// Product pages: floating panel   |   Search pages: inline badges + Download All bar

'use strict';

let currentProductData = null;   // holds last extracted product page data
let lastUrl = window.location.href;
let isWidgetCollapsed = false;

// In-memory store of all badge data on the search page, keyed by ASIN
const searchDataStore = {};   // { [asin]: { asin, title, rating, reviewCount, bsr } }

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const _bodyPoll = setInterval(() => {
  if (document.body) {
    clearInterval(_bodyPoll);
    init();
  }
}, 50);

function init() {
  injectFloatingWidget();

  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('collapsed', (data) => {
      isWidgetCollapsed = !!data.collapsed;
      runPageModeCycle();
    });
  } else {
    runPageModeCycle();
  }

  setupChangeListeners();
}

// ─── Page Type Detector ───────────────────────────────────────────────────────

function isProductPage() {
  // True only on actual product detail pages
  return (
    /\/dp\/[A-Z0-9]{10}/i.test(window.location.pathname) ||
    !!document.getElementById('productTitle') ||
    !!document.getElementById('ASIN')
  );
}

// ─── Mode Scheduler ──────────────────────────────────────────────────────────

function runPageModeCycle() {
  // 1. Floating panel — show only on product detail pages
  const root = document.getElementById('aqi-extension-root');
  if (isProductPage()) {
    if (root) root.classList.remove('aqi-hide');
    runProductExtractionCycle();
  } else {
    // Hide the floating panel on non-product pages (homepage, etc.)
    if (root) root.classList.add('aqi-hide');
  }

  // 2. Inline badges — inject into ANY [data-asin] card found on the page
  //    (search results, bestsellers, deals, category pages, homepage widgets, brand stores…)
  processProductCards();

  // 3. Download All bar — visible on non-product pages only
  if (Object.keys(searchDataStore).length > 0) {
    ensureDownloadAllBar();
  }
  const bar = document.getElementById('aqi-download-all-bar');
  if (bar) bar.classList.toggle('aqi-hide', isProductPage());
}


// ─── CSV Utility ─────────────────────────────────────────────────────────────

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/"/g, '""');
  return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
}

function buildCSVRow(fields) {
  return fields.map(escapeCSV).join(',');
}

// Parse a BSR rank string like "1,234" or "#1,234" into a plain integer for sorting/display.
function bsrRank(b) {
  return parseInt(String(b.rank).replace(/[^0-9]/g, ''), 10) || 0;
}

function triggerCSVDownload(csvContent, filename) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

function getLogoUrl() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL('logo.png');
  }
  return 'logo.png';
}

// ─── Floating Widget (Product Pages) ─────────────────────────────────────────

function injectFloatingWidget() {
  if (document.getElementById('aqi-extension-root')) return;

  const root = document.createElement('div');
  root.id = 'aqi-extension-root';
  root.className = 'aqi-widget-container aqi-hide';

  const logoSrc = getLogoUrl();

  root.innerHTML = `
    <div id="aqi-card" class="aqi-card aqi-hide">
      <div class="aqi-header">
        <div class="aqi-logo-group">
          <img src="${logoSrc}" class="aqi-logo-icon-img" alt="Logo">
          <h3 class="aqi-title">Hemdrix KDP Wizard</h3>
        </div>
        <div class="aqi-controls">
          <button id="aqi-btn-collapse" class="aqi-btn-icon" title="Minimize">
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="aqi-body">
        <div class="aqi-section">
          <h4 id="aqi-product-title" class="aqi-product-title-text">Loading product details...</h4>
        </div>
        <div class="aqi-section">
          <span class="aqi-label">ASIN</span>
          <div class="aqi-asin-row">
            <span id="aqi-asin-val" class="aqi-asin-val">-</span>
            <button id="aqi-btn-copy" class="aqi-btn-copy">
              <svg style="width:12px;height:12px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>Copy
            </button>
          </div>
        </div>
        <div class="aqi-section">
          <span class="aqi-label">Best Sellers Rank</span>
          <ul id="aqi-bsr-list" class="aqi-bsr-list">
            <div class="aqi-loader">
              <div class="aqi-skeleton-line" style="width:80%;"></div>
              <div class="aqi-skeleton-line" style="width:60%;"></div>
            </div>
          </ul>
        </div>
        <div class="aqi-section">
          <span class="aqi-label">Reviews</span>
          <div id="aqi-reviews-row" class="aqi-reviews-row aqi-hide">
            <div id="aqi-stars" class="aqi-stars-container"></div>
            <span id="aqi-rating-num" class="aqi-rating-num">-</span>
            <span id="aqi-review-count" class="aqi-review-count">(-)</span>
          </div>
          <div id="aqi-reviews-loader" class="aqi-loader">
            <div class="aqi-skeleton-line" style="width:50%;"></div>
          </div>
        </div>
        <div class="aqi-section">
          <span class="aqi-label">Price</span>
          <span id="aqi-price-val" class="aqi-price-val">-</span>
        </div>
      </div>
      <!-- CSV Download & KDP Filter Footer -->
      <div class="aqi-panel-footer">
        <button id="aqi-btn-csv" class="aqi-btn-csv">
          <svg style="width:13px;height:13px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.58L16 15.01 12.01 11 8 15.01z"/>
          </svg>
          Download as CSV
        </button>
        <button id="aqi-btn-panel-gems" class="aqi-btn-panel-gems" title="Filter KDP Gems: BSR ≤ 500, Reviews ≤ 5, Price > $14">
          <svg style="width:13px;height:13px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.2l5.7 3.56L12 11.3 6.3 7.76 12 4.2zM5.5 8.94l6 3.75v6.52l-6-3.75V8.94zm7 10.27v-6.52l6-3.75v6.52l-6 3.75z"/>
          </svg>
          💎 Filter KDP Gems
        </button>
      </div>
    </div>

    <div id="aqi-collapsed-pill" class="aqi-collapsed-pill aqi-hide" title="Open Hemdrix KDP Wizard">
      <img src="${logoSrc}" class="aqi-collapsed-logo-img" alt="Logo">
    </div>
  `;

  document.body.appendChild(root);

  document.getElementById('aqi-btn-collapse').addEventListener('click', toggleCollapse);
  document.getElementById('aqi-collapsed-pill').addEventListener('click', toggleCollapse);
  document.getElementById('aqi-btn-copy').addEventListener('click', copyPanelAsin);
  document.getElementById('aqi-btn-csv').addEventListener('click', downloadProductCSV);
  document.getElementById('aqi-btn-panel-gems').addEventListener('click', openOpportunityModal);
}

// ─── Product Page Extraction ──────────────────────────────────────────────────

function extractProductInfo() {
  const result = { asin: null, title: null, bsr: [], rating: null, reviewCount: null };

  const urlMatch = window.location.href.match(/\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  if (urlMatch) result.asin = urlMatch[1].toUpperCase();

  if (!result.asin) {
    const el = document.getElementById('ASIN') || document.querySelector('input[name="ASIN"]');
    if (el && el.value) result.asin = el.value.toUpperCase();
  }

  if (!result.asin || result.asin.length !== 10) return null;

  const titleEl = document.getElementById('productTitle');
  if (titleEl) result.title = titleEl.innerText.trim();

  const { rating, reviewCount } = extractRatingAndReviews(document);
  result.rating = rating;
  result.reviewCount = reviewCount;
  result.price = extractPrice(document);
  result.bsr = extractBSR(document);

  return result;
}

function runProductExtractionCycle() {
  const data = extractProductInfo();
  currentProductData = data;
  updateFloatingWidget(data);

  if (data && (!data.bsr || data.bsr.length === 0 || !data.rating)) {
    setTimeout(() => {
      const d = extractProductInfo();
      if (d) { currentProductData = d; updateFloatingWidget(d); }
    }, 1200);
    setTimeout(() => {
      const d = extractProductInfo();
      if (d) { currentProductData = d; updateFloatingWidget(d); }
    }, 3500);
  }
}

function updateFloatingWidget(data) {
  const root = document.getElementById('aqi-extension-root');
  const card = document.getElementById('aqi-card');
  const pill = document.getElementById('aqi-collapsed-pill');
  if (!root || !card || !pill) return;

  if (!data) { root.classList.add('aqi-hide'); return; }

  root.classList.remove('aqi-hide');

  card.classList.toggle('aqi-hide', isWidgetCollapsed);
  pill.classList.toggle('aqi-hide', !isWidgetCollapsed);

  const titleEl = document.getElementById('aqi-product-title');
  if (titleEl) titleEl.innerText = data.title || 'Unknown Product';

  const asinEl = document.getElementById('aqi-asin-val');
  if (asinEl) asinEl.innerText = data.asin;

  const copyBtn = document.getElementById('aqi-btn-copy');
  if (copyBtn) {
    copyBtn.className = 'aqi-btn-copy';
    copyBtn.innerHTML = `<svg style="width:12px;height:12px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>Copy`;
  }

  const bsrList = document.getElementById('aqi-bsr-list');
  if (bsrList) {
    bsrList.innerHTML = data.bsr && data.bsr.length > 0
      ? data.bsr.map(b => `<li class="aqi-bsr-item"><span class="aqi-bsr-bullet">•</span><span><span class="aqi-bsr-rank">#${b.rank}</span> in <span class="aqi-bsr-cat">${b.category}</span></span></li>`).join('')
      : `<span class="aqi-empty-bsr">No rank details found</span>`;
  }

  const reviewsRow = document.getElementById('aqi-reviews-row');
  const reviewsLoader = document.getElementById('aqi-reviews-loader');
  if (data.rating || data.reviewCount) {
    if (reviewsRow) reviewsRow.classList.remove('aqi-hide');
    if (reviewsLoader) reviewsLoader.classList.add('aqi-hide');
    const starsEl = document.getElementById('aqi-stars');
    if (starsEl && data.rating) starsEl.innerHTML = buildStarsHtml(data.rating);
    const rNum = document.getElementById('aqi-rating-num');
    if (rNum) rNum.innerText = data.rating || '-';
    const rcDisp = document.getElementById('aqi-review-count');
    if (rcDisp) rcDisp.innerText = data.reviewCount ? `(${data.reviewCount})` : '';
  } else {
    if (reviewsRow) reviewsRow.classList.add('aqi-hide');
    if (reviewsLoader) reviewsLoader.classList.add('aqi-hide');
  }

  const priceValEl = document.getElementById('aqi-price-val');
  if (priceValEl) priceValEl.innerText = data.price || '-';
}

// ─── Product Page CSV Download ────────────────────────────────────────────────

function downloadProductCSV() {
  const data = currentProductData;
  if (!data) return;

  const btn = document.getElementById('aqi-btn-csv');

  // Build rows: one row per BSR category, or just one row if no BSR
  const header = buildCSVRow(['Name', 'ASIN', 'BSR Rank', 'BSR Category', 'Rating', 'Reviews', 'Price']);

  let rows;
  if (data.bsr && data.bsr.length > 0) {
    rows = [...data.bsr]
      .sort((a, b) => bsrRank(a) - bsrRank(b))
      .map(b => buildCSVRow([data.title, data.asin, bsrRank(b), b.category, data.rating || '', data.reviewCount || '', data.price || '']));
  } else {
    rows = [buildCSVRow([data.title, data.asin, '', '', data.rating || '', data.reviewCount || '', data.price || ''])];
  }

  const csv = [header, ...rows].join('\r\n');
  const safeAsin = (data.asin || 'product').replace(/[^A-Z0-9]/gi, '');
  triggerCSVDownload(csv, `amazon_${safeAsin}.csv`);

  // Flash confirmation
  if (btn) {
    btn.classList.add('flash');
    btn.innerHTML = `<svg style="width:13px;height:13px;fill:currentColor;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Downloaded!`;
    setTimeout(() => {
      btn.classList.remove('flash');
      btn.innerHTML = `<svg style="width:13px;height:13px;fill:currentColor;" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.58L16 15.01 12.01 11 8 15.01z"/></svg>Download as CSV`;
    }, 2000);
  }
}

function copyPanelAsin() {
  if (!currentProductData || !currentProductData.asin) return;
  navigator.clipboard.writeText(currentProductData.asin).then(() => {
    const btn = document.getElementById('aqi-btn-copy');
    if (!btn) return;
    btn.classList.add('success');
    btn.innerHTML = `<svg style="width:12px;height:12px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Copied!`;
    setTimeout(() => {
      btn.classList.remove('success');
      btn.innerHTML = `<svg style="width:12px;height:12px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>Copy`;
    }, 1500);
  }).catch(() => {});
}

function toggleCollapse() {
  isWidgetCollapsed = !isWidgetCollapsed;
  const card = document.getElementById('aqi-card');
  const pill = document.getElementById('aqi-collapsed-pill');
  if (card) card.classList.toggle('aqi-hide', isWidgetCollapsed);
  if (pill) pill.classList.toggle('aqi-hide', !isWidgetCollapsed);
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ collapsed: isWidgetCollapsed });
  }
}

// ─── All Product Cards — Inline Badges ───────────────────────────────────────
// Works on: search results, bestsellers, deals, category pages,
//           homepage carousels, brand stores, "also bought" sections, etc.

function processProductCards() {
  // Grab every element that Amazon marks with a product ASIN.
  const candidates = document.querySelectorAll('[data-asin]');
  const items = Array.from(candidates).filter(el => {
    const tag = el.tagName.toLowerCase();
    // Skip inline/form elements — they are never product containers
    if (['button', 'input', 'form', 'a', 'span', 'li', 'img', 'svg', 'path'].includes(tag)) return false;
    const asin = el.getAttribute('data-asin');
    if (!asin || asin.length !== 10) return false;
    if (el.querySelector('.aqi-search-badge')) return false; // already injected
    // Confirm it is a product container by checking for any of the many title/image
    // patterns Amazon uses across search, bestsellers, deals, carousels, brand stores…
    return !!el.querySelector([
      // Standard search results
      'h2, h3, h4',
      '.a-text-normal, .a-size-medium, .a-size-base-plus, .a-size-small',
      // Bestsellers / Top-rated (p13n, zg)
      '.p13n-sc-truncated, .p13n-sc-line-clamp-2, ._cDEzb_p13n-sc-css-line-clamp-1_1Fn9h',
      '.zg-item, .zg-grid-general-faceout',
      // Deals pages
      '.dealTitleStyle, [data-hook="deal-title"]',
      // Homepage / carousel widgets
      '.a-truncate-cut, [data-truncate-expand-asin]',
      // Fresh / Pantry / Prime tiles
      '.rush-component',
      // Brand store / sponsored
      '.s-product-image-container, [class*="ProductCard"]',
      // Catch-all: product image with meaningful alt text (present on virtually every tile)
      'img[alt]:not([alt=""])',
    ].join(', '));
  });

  items.forEach(item => {
    const asin = item.getAttribute('data-asin');
    if (!asin || asin.length !== 10) return;
    if (item.querySelector('.aqi-search-badge')) return;

    // Extract rating, reviews count, price, and title from the card DOM
    const rating = extractCardRating(item);
    const reviewCount = extractCardReviews(item);
    const price = extractCardPrice(item);
    const title = extractCardTitle(item);

    // Initialise store entry
    searchDataStore[asin] = { asin, title, rating, reviewCount, price, bsr: [] };

    // Update the Download All bar count
    updateDownloadAllBar();

    // ── Build badge ──
    const badge = document.createElement('div');
    badge.className = 'aqi-search-badge';
    const logoSrc = getLogoUrl();
    badge.innerHTML = `
      <img src="${logoSrc}" class="aqi-search-logo-img" alt="Logo">
      <div class="aqi-search-asin-container">
        ASIN:&nbsp;<span class="aqi-search-asin-val">${asin}</span>
        <button class="aqi-btn-copy-small" title="Copy ASIN">
          <svg style="width:10px;height:10px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>
      </div>
      <div class="aqi-search-reviews" id="aqi-reviews-${asin}">
        ${rating ? `<span class="aqi-search-stars">${buildStarsHtml(rating)}</span><span style="font-weight:600;">${rating}</span>` : ''}
        ${reviewCount ? `<span class="aqi-search-reviews-count">(${reviewCount})</span>` : ''}
      </div>
      <div class="aqi-search-price" id="aqi-price-${asin}">
        ${price ? `<span class="aqi-price-tag">${price}</span>` : ''}
      </div>
      <div class="aqi-search-bsr-container" id="aqi-bsr-${asin}">
        <span class="aqi-inline-loader"></span><span style="font-size:10px;color:#9ca3af;">Loading BSR...</span>
      </div>
      <button class="aqi-btn-csv-card" title="Download this product as CSV">
        <svg style="width:9px;height:9px;fill:currentColor;" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.58L16 15.01 12.01 11 8 15.01z"/>
        </svg>
        CSV
      </button>
    `;

    // Copy ASIN
    badge.querySelector('.aqi-btn-copy-small').addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      navigator.clipboard.writeText(asin).then(() => {
        const btn = badge.querySelector('.aqi-btn-copy-small');
        btn.classList.add('success');
        btn.innerHTML = `<svg style="width:10px;height:10px;fill:currentColor;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
        setTimeout(() => {
          btn.classList.remove('success');
          btn.innerHTML = `<svg style="width:10px;height:10px;fill:currentColor;" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
        }, 1200);
      });
    });

    // Auto-fetch BSR immediately after injection
    setTimeout(() => {
      const container = document.getElementById(`aqi-bsr-${asin}`);
      if (container) fetchAndShowBsr(asin, container);
    }, 0);

    // Per-card CSV download
    badge.querySelector('.aqi-btn-csv-card').addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      downloadSearchCardCSV(asin, badge.querySelector('.aqi-btn-csv-card'));
    });

    // Inject below title
    const anchor = item.querySelector('h2, .a-size-mini, .puis-title-instructions-container');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(badge, anchor.nextSibling);
    } else {
      item.appendChild(badge);
    }
  });
}

// ─── Per-Card CSV Download ────────────────────────────────────────────────────

function downloadSearchCardCSV(asin, btn) {
  const d = searchDataStore[asin];
  if (!d) return;

  const header = buildCSVRow(['Name', 'ASIN', 'BSR Rank', 'BSR Category', 'Rating', 'Reviews', 'Price']);
  let rows;
  if (d.bsr && d.bsr.length > 0) {
    rows = [...d.bsr]
      .sort((a, b) => bsrRank(a) - bsrRank(b))
      .map(b => buildCSVRow([d.title, d.asin, bsrRank(b), b.category, d.rating || '', d.reviewCount || '', d.price || '']));
  } else {
    rows = [buildCSVRow([d.title, d.asin, '', '', d.rating || '', d.reviewCount || '', d.price || ''])];
  }

  triggerCSVDownload([header, ...rows].join('\r\n'), `amazon_${asin}.csv`);

  if (btn) {
    btn.classList.add('flash');
    btn.textContent = '✓ Saved';
    setTimeout(() => { btn.classList.remove('flash'); btn.innerHTML = `<svg style="width:9px;height:9px;fill:currentColor;" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.58L16 15.01 12.01 11 8 15.01z"/></svg> CSV`; }, 2000);
  }
}

// ─── Sticky "Download All" Bar (Search Pages) ─────────────────────────────────

function ensureDownloadAllBar() {
  if (document.getElementById('aqi-download-all-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'aqi-download-all-bar';
  bar.className = 'aqi-download-all-bar';
  const logoSrc = getLogoUrl();
  bar.innerHTML = `
    <img src="${logoSrc}" class="aqi-search-logo-img" alt="Logo">
    <span class="aqi-download-count" id="aqi-dl-count">0 products found</span>
    <button class="aqi-btn-filter-gems aqi-icon-btn" id="aqi-btn-filter-gems" title="Filter KDP Gems: BSR ≤ 500, Reviews ≤ 5, Price > $14">
      <svg class="aqi-anim-pulse-spin" style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
        <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.2l5.7 3.56L12 11.3 6.3 7.76 12 4.2zM5.5 8.94l6 3.75v6.52l-6-3.75V8.94zm7 10.27v-6.52l6-3.75v6.52l-6 3.75z"/>
      </svg>
    </button>
    <button class="aqi-btn-download-all aqi-icon-btn" id="aqi-btn-dl-all" title="Download All CSV">
      <svg class="aqi-anim-bounce-down" style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.58L16 15.01 12.01 11 8 15.01z"/>
      </svg>
    </button>
  `;

  document.body.appendChild(bar);

  document.getElementById('aqi-btn-dl-all').addEventListener('click', downloadAllSearchCSV);
  document.getElementById('aqi-btn-filter-gems').addEventListener('click', openOpportunityModal);
  updateDownloadAllBar();
}

function updateDownloadAllBar() {
  const countEl = document.getElementById('aqi-dl-count');
  if (countEl) {
    const n = Object.keys(searchDataStore).length;
    countEl.textContent = `${n} product${n !== 1 ? 's' : ''} detected`;
  }
}

function downloadAllSearchCSV() {
  const entries = Object.values(searchDataStore);
  if (entries.length === 0) return;

  const header = buildCSVRow(['Name', 'ASIN', 'BSR Rank', 'BSR Category', 'Rating', 'Reviews', 'Price']);
  const rows = [];

  entries.forEach(d => {
    if (d.bsr && d.bsr.length > 0) {
      d.bsr.forEach(b => {
        rows.push(buildCSVRow([d.title, d.asin, bsrRank(b), b.category, d.rating || '', d.reviewCount || '', d.price || '']));
      });
    } else {
      rows.push(buildCSVRow([d.title, d.asin, '', '', d.rating || '', d.reviewCount || '', d.price || '']));
    }
  });

  // Sort all rows ascending by BSR rank (column index 2); rows with no BSR go to the bottom.
  rows.sort((rowA, rowB) => {
    const parse = r => parseInt(r.split(',')[2], 10) || Infinity;
    return parse(rowA) - parse(rowB);
  });

  const csv = [header, ...rows].join('\r\n');
  const ts = new Date().toISOString().slice(0, 10);
  triggerCSVDownload(csv, `amazon_search_results_${ts}.csv`);

  // Flash button feedback
  const btn = document.getElementById('aqi-btn-dl-all');
  if (btn) {
    btn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    btn.innerHTML = `<svg style="width:13px;height:13px;fill:currentColor;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Downloaded!`;
    setTimeout(() => {
      btn.style.background = '';
      btn.innerHTML = `<svg style="width:13px;height:13px;fill:currentColor;" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.58L16 15.01 12.01 11 8 15.01z"/></svg> ⬇ Download All CSV`;
    }, 2500);
  }
}

// ─── KDP Opportunity Helpers & Filter ─────────────────────────────────────────

function parseReviewCount(val) {
  if (val === null || val === undefined || val === '') return 0;
  const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function parsePriceNum(val) {
  if (!val) return 0;
  const m = String(val).match(/[\d,]+(?:\.\d+)?/);
  if (!m) return 0;
  const num = parseFloat(m[0].replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

function getLowestBsr(d) {
  if (!d.bsr || d.bsr.length === 0) return null;
  const ranks = d.bsr.map(b => bsrRank(b)).filter(r => r > 0);
  return ranks.length > 0 ? Math.min(...ranks) : null;
}

function getKDPOpportunityProducts() {
  const entries = Object.values(searchDataStore);
  return entries.filter(d => {
    // 1. Exclude Kindle books
    const titleStr = (d.title || '').toLowerCase();
    if (titleStr.includes('kindle edition')) return false;
    if (d.bsr && d.bsr.some(b => (b.category || '').toLowerCase().includes('kindle'))) return false;

    // 2. BSR <= 500 (and > 0)
    const bsr = getLowestBsr(d);
    if (bsr === null || bsr <= 0 || bsr > 500) return false;

    // 3. Reviews <= 5
    const reviews = parseReviewCount(d.reviewCount);
    if (reviews > 5) return false;

    // 4. Price > 14
    const price = parsePriceNum(d.price);
    if (price <= 14) return false;

    return true;
  }).sort((a, b) => (getLowestBsr(a) || Infinity) - (getLowestBsr(b) || Infinity));
}

// ─── KDP Opportunity Modal ────────────────────────────────────────────────────

let isGemsHighlightActive = false;

function openOpportunityModal() {
  let modalOverlay = document.getElementById('aqi-opportunity-modal');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'aqi-opportunity-modal';
    modalOverlay.className = 'aqi-modal-overlay';
    document.body.appendChild(modalOverlay);
  }

  const gems = getKDPOpportunityProducts();
  const logoSrc = getLogoUrl();

  modalOverlay.innerHTML = `
    <div class="aqi-modal-card">
      <div class="aqi-modal-header">
        <div class="aqi-modal-title-group">
          <img src="${logoSrc}" class="aqi-search-logo-img" alt="Logo">
          <h2 class="aqi-modal-title">💎 KDP Opportunity Gems</h2>
        </div>
        <button id="aqi-modal-close" class="aqi-modal-close-btn" title="Close">✕</button>
      </div>

      <div class="aqi-modal-toolbar">
        <div class="aqi-modal-chips">
          <span class="aqi-filter-chip">🎯 BSR ≤ 500</span>
          <span class="aqi-filter-chip">⭐ Reviews ≤ 5</span>
          <span class="aqi-filter-chip">💰 Price &gt; $14</span>
          <span style="font-size:12px;color:#e2e8f0;font-weight:600;margin-left:4px;">
            ${gems.length} gem${gems.length !== 1 ? 's' : ''} found
          </span>
        </div>
        <div class="aqi-modal-actions">
          <button id="aqi-btn-modal-highlight" class="aqi-btn-modal-dl" style="background:linear-gradient(135deg,#8b5cf6,#6366f1);">
            ✨ ${isGemsHighlightActive ? 'Unhighlight' : 'Highlight on Page'}
          </button>
          ${gems.length > 0 ? `
            <button id="aqi-btn-modal-csv" class="aqi-btn-modal-dl">
              <svg style="width:11px;height:11px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.58L16 15.01 12.01 11 8 15.01z"/>
              </svg>
              ⬇ Export Gems CSV
            </button>
          ` : ''}
        </div>
      </div>

      <div class="aqi-modal-body">
        ${gems.length > 0 ? gems.map(g => {
          const mainBsr = g.bsr && g.bsr.length > 0 ? g.bsr[0] : null;
          return `
            <div class="aqi-gem-card" data-gem-asin="${g.asin}">
              <div class="aqi-gem-top-row">
                <a href="/dp/${g.asin}" target="_blank" class="aqi-gem-title" title="Open product in new tab">
                  ${g.title || 'Unknown Product'}
                </a>
                <span class="aqi-price-tag" style="font-size:13px;padding:3px 8px;">${g.price || '-'}</span>
              </div>
              <div class="aqi-gem-metrics">
                <div class="aqi-search-asin-container">
                  ASIN:&nbsp;<span class="aqi-search-asin-val">${g.asin}</span>
                  <button class="aqi-btn-copy-small" data-copy-asin="${g.asin}" title="Copy ASIN">
                    <svg style="width:10px;height:10px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                  </button>
                </div>
                ${mainBsr ? `
                  <span class="aqi-gem-bsr-badge">#${mainBsr.rank} in ${mainBsr.category}</span>
                ` : ''}
                <div class="aqi-search-reviews">
                  ${g.rating ? `<span class="aqi-search-stars">${buildStarsHtml(g.rating)}</span><span style="font-weight:600;">${g.rating}</span>` : ''}
                  <span class="aqi-search-reviews-count">(${g.reviewCount || 0} reviews)</span>
                </div>
              </div>
            </div>
          `;
        }).join('') : `
          <div class="aqi-gem-empty">
            <div class="aqi-gem-empty-icon">🔍</div>
            <h3 style="margin:0 0 6px 0;color:#f3f4f6;">No matching products found</h3>
            <p style="font-size:12px;margin:0;max-width:440px;line-height:1.5;">
              None of the currently detected products have <strong>BSR ≤ 500</strong>, <strong>reviews ≤ 5</strong>, and <strong>price &gt; $14</strong>. Try scrolling the page or waiting for automatic BSR loading to complete.
            </p>
          </div>
        `}
      </div>
    </div>
  `;

  modalOverlay.classList.remove('aqi-hide');

  // Close handlers
  document.getElementById('aqi-modal-close').addEventListener('click', closeOpportunityModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeOpportunityModal();
  });

  // Export Gems CSV
  const dlBtn = document.getElementById('aqi-btn-modal-csv');
  if (dlBtn) {
    dlBtn.addEventListener('click', () => downloadGemsCSV(gems));
  }

  // Highlight on page
  const hlBtn = document.getElementById('aqi-btn-modal-highlight');
  if (hlBtn) {
    hlBtn.addEventListener('click', () => {
      toggleGemsHighlight(gems);
      hlBtn.innerHTML = `✨ ${isGemsHighlightActive ? 'Unhighlight' : 'Highlight on Page'}`;
    });
  }

  // Copy ASIN buttons inside modal
  modalOverlay.querySelectorAll('[data-copy-asin]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      const asin = btn.getAttribute('data-copy-asin');
      if (asin) {
        navigator.clipboard.writeText(asin).then(() => {
          btn.classList.add('success');
          btn.innerHTML = `<svg style="width:10px;height:10px;fill:currentColor;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
          setTimeout(() => {
            btn.classList.remove('success');
            btn.innerHTML = `<svg style="width:10px;height:10px;fill:currentColor;" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
          }, 1200);
        });
      }
    });
  });
}

function closeOpportunityModal() {
  const modalOverlay = document.getElementById('aqi-opportunity-modal');
  if (modalOverlay) modalOverlay.classList.add('aqi-hide');
}

function toggleGemsHighlight(gems) {
  isGemsHighlightActive = !isGemsHighlightActive;
  const asins = new Set(gems.map(g => g.asin));
  document.querySelectorAll('[data-asin]').forEach(el => {
    const asin = el.getAttribute('data-asin');
    if (asin && asins.has(asin)) {
      el.classList.toggle('aqi-gem-page-highlight', isGemsHighlightActive);
    } else {
      el.classList.remove('aqi-gem-page-highlight');
    }
  });
}

function downloadGemsCSV(gems) {
  if (!gems || gems.length === 0) return;
  const header = buildCSVRow(['Name', 'ASIN', 'BSR Rank', 'BSR Category', 'Rating', 'Reviews', 'Price']);
  const rows = [];
  const seenNames = new Set();

  gems.forEach(d => {
    const nameKey = (d.title || '').trim().toLowerCase();
    if (nameKey && seenNames.has(nameKey)) return; // Skip duplicates
    if (nameKey) seenNames.add(nameKey);

    if (d.bsr && d.bsr.length > 0) {
      // Only take the first/best BSR category so we only have one row per unique name
      const b = d.bsr[0];
      rows.push(buildCSVRow([d.title, d.asin, bsrRank(b), b.category, d.rating || '', d.reviewCount || '', d.price || '']));
    } else {
      rows.push(buildCSVRow([d.title, d.asin, '', '', d.rating || '', d.reviewCount || '', d.price || '']));
    }
  });

  const csv = [header, ...rows].join('\r\n');
  const ts = new Date().toISOString().slice(0, 10);
  triggerCSVDownload(csv, `kdp_gems_${ts}.csv`);
}

// ─── Card DOM Extractors (Search, Bestsellers, Deals, Carousels) ─────────────

function extractCardTitle(item) {
  const tEl = item.querySelector([
    'h2 a span, h2 a, h2 span',
    '.a-text-normal, .a-size-medium',
    '.p13n-sc-truncated, .p13n-sc-line-clamp-2, ._cDEzb_p13n-sc-css-line-clamp-1_1Fn9h',
    '[data-hook="deal-title"]',
    '.a-truncate-cut',
    'img[alt]:not([alt=""])',
  ].join(', '));
  if (tEl) {
    return (tEl.tagName.toLowerCase() === 'img' ? tEl.getAttribute('alt') : tEl.innerText).trim();
  }
  return 'Unknown Product';
}

function extractCardRating(item) {
  const selectors = [
    '.a-icon-star-small .a-icon-alt',
    '.a-icon-star .a-icon-alt',
    'i[class*="a-icon-star"] span.a-icon-alt',
    'i[class*="a-icon-star"]',
    'span[aria-label*="out of 5 stars"]',
    'span[aria-label*="stars"]',
    'span[aria-label*="étoiles sur 5"]',
    'span[aria-label*="de 5 estrellas"]',
    'span[aria-label*="von 5 Sternen"]',
    'span[aria-label*="su 5 stelle"]',
    'span[aria-label*="5つ星のうち"]',
    '.a-icon-alt',
  ];
  for (const sel of selectors) {
    const el = item.querySelector(sel);
    if (el) {
      const txt = el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || '';
      const m = txt.match(/([0-9.]+)\s*(?:out of 5|stars|von 5|sur 5|de 5|su 5|つ星のうち)/i) || txt.match(/([0-9.]+)\s*stars/i) || txt.match(/^([0-9.]+)$/);
      if (m) {
        const val = parseFloat(m[1]);
        if (!isNaN(val) && val >= 0 && val <= 5) return val;
      }
    }
  }
  return null;
}

function extractCardReviews(item) {
  const selectors = [
    'span.a-size-base.s-underline-text',
    'span.s-underline-text',
    'a[href*="customerReviews"] span',
    'a[href*="customerReviews"]',
    'a[href*="product-reviews"] span',
    'a[href*="product-reviews"]',
    'span[aria-label*="ratings"]',
    'span[aria-label*="rating"]',
    'span[aria-label*="reviews"]',
    'span.puis-small-expander-outer',
    'div[data-cy="reviews-ratings-slot"] a:not([href*="rating"]) span',
    '.a-icon-star-small + span',
    '.a-icon-star + span',
    'i.a-icon-star + a',
    'i.a-icon-star-small + a',
    '.rating-row span:not(.a-icon-alt)',
    'a.a-size-small.a-link-normal',
  ];
  for (const sel of selectors) {
    const el = item.querySelector(sel);
    if (el) {
      let txt = el.getAttribute('aria-label') || el.innerText || '';
      txt = txt.trim();
      if (txt && !txt.includes('out of') && !txt.includes('stars') && !txt.includes('étoiles')) {
        const clean = txt.replace(/[()]/g, '').replace(/\s*(ratings?|reviews?|global ratings?|avis)/gi, '').trim();
        if (clean && /[\d]/.test(clean)) return clean;
      }
    }
  }
  return null;
}

function extractCardPrice(item) {
  // 1. Offscreen price span in standard .a-price container
  const offscreen = item.querySelector('.a-price:not(.a-text-price) .a-offscreen, .a-price .a-offscreen');
  if (offscreen && offscreen.innerText.trim()) return offscreen.innerText.trim();

  // 2. Visible whole + fraction construction
  const priceContainer = item.querySelector('.a-price:not(.a-text-price), .a-price');
  if (priceContainer) {
    const symbol = priceContainer.querySelector('.a-price-symbol')?.innerText?.trim() || '';
    const whole = priceContainer.querySelector('.a-price-whole')?.innerText?.replace(/[^0-9]/g, '') || '';
    const frac = priceContainer.querySelector('.a-price-fraction')?.innerText?.replace(/[^0-9]/g, '') || '';
    if (whole) {
      return `${symbol}${whole}${frac ? '.' + frac : ''}`.trim();
    }
  }

  // 3. Other Amazon layouts (bestsellers, deals, carousels, tables, mock)
  const otherSelectors = [
    '.p13n-sc-price',
    '._cDEzb_p13n-sc-price_3mJ9Z',
    '.zg-item .a-color-price',
    '.a-color-price',
    '[data-a-color="price"]',
    '.price-row',
    '.dealPriceText',
    '[data-hook="deal-price"]',
    '.a-price-range',
    'span[class*="price"]',
  ];
  for (const sel of otherSelectors) {
    const el = item.querySelector(sel);
    if (el && el.innerText.trim()) {
      const txt = el.innerText.trim();
      const m = txt.match(/([$€£¥₹\w$]*\s*[\d,]+(?:\.\d{2})?)/);
      if (m && m[1] && /\d/.test(m[1])) return m[1].trim();
      if (/\d/.test(txt)) return txt.split('\n')[0].trim();
    }
  }
  return null;
}

// ─── Document-Level Extractors (Product Page & Fetched HTML) ──────────────────

function extractPrice(doc) {
  const selectors = [
    '.priceToPay .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-price',
    '#corePrice_desktop .a-price .a-offscreen',
    '#apex_desktop .a-price .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '#priceblock_saleprice',
    '#price_inside_buybox',
    '#actualPriceValue',
    '.a-price .a-offscreen',
    '.a-color-price',
    '.p13n-sc-price',
    'span[class*="price"]',
  ];
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (el && el.innerText.trim()) {
      const txt = el.innerText.trim();
      const m = txt.match(/([$€£¥₹\w$]*\s*[\d,]+(?:\.\d{2})?)/);
      if (m && m[1] && /\d/.test(m[1])) return m[1].trim();
      if (/\d/.test(txt)) return txt.split('\n')[0].trim();
    }
  }
  return null;
}

function extractRatingAndReviews(doc) {
  let rating = null, reviewCount = null;

  const ratingEl = doc.querySelector('#acrPopover, #averageCustomerReviews, span[data-hook="rating-out-of-text"]');
  if (ratingEl) {
    const txt = ratingEl.getAttribute('title') || ratingEl.getAttribute('aria-label') || ratingEl.innerText || '';
    const m = txt.match(/([0-9.]+)\s*out\s*of\s*5/i) || txt.match(/([0-9.]+)\s*stars/i);
    if (m) rating = parseFloat(m[1]);
  }

  const rcEl = doc.querySelector('#acrCustomerReviewText, #acrCustomerReviewLink, span[data-hook="total-review-count"]');
  if (rcEl) {
    let raw = rcEl.innerText.trim();
    raw = raw.replace(/[()]/g, '').replace(/\s*(ratings?|reviews?|global ratings?|customer reviews)/gi, '').trim();
    if (raw && /[\d]/.test(raw)) reviewCount = raw;
  }

  return { rating, reviewCount };
}

// ─── On-Demand BSR + Rating + Price Fetcher ──────────────────────────────────

function fetchAndShowBsr(asin, container) {
  container.innerHTML = `<span class="aqi-inline-loader"></span><span style="font-size:10px;color:#9ca3af;">Loading...</span>`;

  const url = window.location.protocol === 'file:'
    ? `mock_detail_${asin}.html`
    : `/dp/${asin}`;

  fetch(url)
    .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const bsr = extractBSR(doc);
      const { rating, reviewCount } = extractRatingAndReviews(doc);
      const price = extractPrice(doc);

      // Update the store with all fetched data
      if (searchDataStore[asin]) {
        searchDataStore[asin].bsr = bsr;
        if (rating && !searchDataStore[asin].rating)            searchDataStore[asin].rating = rating;
        if (reviewCount && !searchDataStore[asin].reviewCount)  searchDataStore[asin].reviewCount = reviewCount;
        if (price && !searchDataStore[asin].price)              searchDataStore[asin].price = price;
      }

      // ── Update BSR container ──
      if (bsr && bsr.length > 0) {
        container.innerHTML = bsr.slice(0, 2).map(b =>
          `<span class="aqi-bsr-text"><span class="aqi-bsr-rank-highlight">#${b.rank}</span> in ${b.category}</span>`
        ).join(' &nbsp;|&nbsp; ');
      } else {
        container.innerHTML = `<span class="aqi-bsr-text-error">No BSR found</span>`;
      }

      // ── Update reviews container ──
      const reviewsEl = document.getElementById(`aqi-reviews-${asin}`);
      const curRating = searchDataStore[asin]?.rating || rating;
      const curReviews = searchDataStore[asin]?.reviewCount || reviewCount;
      if (reviewsEl && (curRating || curReviews)) {
        reviewsEl.innerHTML =
          (curRating ? `<span class="aqi-search-stars">${buildStarsHtml(curRating)}</span><span style="font-weight:600;">${curRating}</span>` : '') +
          (curReviews ? `<span class="aqi-search-reviews-count">(${curReviews})</span>` : '');
      }

      // ── Update price container ──
      const priceEl = document.getElementById(`aqi-price-${asin}`);
      const curPrice = searchDataStore[asin]?.price || price;
      if (priceEl && curPrice) {
        priceEl.innerHTML = `<span class="aqi-price-tag">${curPrice}</span>`;
      }
    })
    .catch(err => {
      console.warn(`[Hemdrix KDP Wizard] Fetch failed for ${asin}:`, err);
      container.innerHTML = `<span class="aqi-bsr-text-error">Error loading data</span>`;
    });
}

// ─── BSR Parser ───────────────────────────────────────────────────────────────

function extractBSR(root) {
  const parseText = (text) => {
    const results = [];
    const clean = text.replace(/\s*\([^)]+\)/g, '');
    const re = /#([\d,]+)\s+in\s+([A-Za-z0-9\s&,>_\-\/]+)/g;
    let m;
    while ((m = re.exec(clean)) !== null) {
      const rank = m[1].trim();
      const cat = m[2].trim().replace(/\s+Best\s*Sellers\s*Rank.*/gi, '').replace(/\s+in\s*$/i, '').trim();
      if (rank && cat) results.push({ rank, category: cat });
    }
    return results;
  };

  for (const div of root.querySelectorAll('#detailBullets_feature_div, #detailBulletsWrapper_feature_div')) {
    for (const li of div.querySelectorAll('li')) {
      const t = li.innerText || '';
      if (t.includes('Best Sellers Rank') || t.includes('Bestsellers Rank')) {
        const r = parseText(t); if (r.length) return r;
      }
    }
  }

  for (const table of root.querySelectorAll('.prodDetTable, #prodDetTable, #technicalSpecifications_section_1')) {
    for (const row of table.querySelectorAll('tr')) {
      const th = row.querySelector('th'), td = row.querySelector('td');
      if (th && td) {
        const h = th.innerText || '';
        if (h.includes('Best Sellers Rank') || h.includes('Bestsellers Rank') || h.includes('BSR')) {
          const r = parseText(td.innerText || ''); if (r.length) return r;
        }
      }
    }
  }

  for (const el of root.querySelectorAll('#productDetails_feature_div, #productDetails_db_sections, #salesRank')) {
    const t = el.innerText || '';
    if (t.includes('Best Sellers Rank') || t.includes('Bestsellers Rank')) {
      const r = parseText(t); if (r.length) return r;
    }
  }

  return [];
}

// ─── Stars HTML ───────────────────────────────────────────────────────────────

function buildStarsHtml(rating) {
  if (!rating) return '';
  const full = Math.floor(rating), half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= full)
      html += `<svg style="width:14px;height:14px;fill:currentColor;margin-right:1px;" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
    else if (i === full + 1 && half)
      html += `<svg style="width:14px;height:14px;fill:currentColor;margin-right:1px;" viewBox="0 0 24 24"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4V6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>`;
    else
      html += `<svg style="width:14px;height:14px;fill:rgba(255,255,255,0.15);margin-right:1px;" viewBox="0 0 24 24"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>`;
  }
  return html;
}

// ─── Change Listeners ─────────────────────────────────────────────────────────

function setupChangeListeners() {
  // URL poller — catches pushState variation swaps
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      runPageModeCycle();
    }
  }, 500);

  // Sweep for new cards from infinite scroll / lazy-loaded widgets on any page
  setInterval(() => {
    processProductCards();
    if (Object.keys(searchDataStore).length > 0) updateDownloadAllBar();
  }, 1500);

  // Variation mutations on product pages
  const twister = document.getElementById('twister') || document.getElementById('ppd');
  if (twister) new MutationObserver(() => runPageModeCycle()).observe(twister, { childList: true, subtree: true, attributes: true });

  window.addEventListener('load', runPageModeCycle);
  document.addEventListener('DOMContentLoaded', runPageModeCycle);
}
