/**
 * BookFlow — Writer Dashboard Module
 * Handles batch book upload, dual-tab view, search, and Socket.io real-time updates.
 */

import {
  showToast, showSkeleton, showModal, api, apiUpload,
  escapeHtml, formatDate, renderFilePills, fileTypeIcon,
  debounce, setButtonLoading, triggerDownload
} from './components.js';
import { onSocketEvent } from './socket.js';

let currentUser = null;
let activeTab    = 'NEW';
let searchQuery  = '';
let allNewBooks  = [];
let allDownBooks = [];

export function renderWriter(user) {
  currentUser = user;
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="content-container">
      <!-- Top Action Controls (Search + Add Button) -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">
        <!-- Tab Bar (Desktop / Tablet) -->
        <div class="desktop-tab-container" style="display:flex;align-items:center;gap:1rem">
          <div class="tab-bar" id="writer-tab-bar">
            <button class="tab-btn active" id="tab-new" data-tab="NEW" onclick="window._writerTab('NEW')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              New
              <span class="tab-count" id="count-new">0</span>
            </button>
            <button class="tab-btn" id="tab-down" data-tab="DOWNLOADED" onclick="window._writerTab('DOWNLOADED')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Downloaded
              <span class="tab-count" id="count-down">0</span>
            </button>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:0.75rem;flex:1;justify-content:flex-end">
          <div class="search-wrapper" style="flex:1;max-width:360px">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" id="writer-search" class="search-input" placeholder="Search books, uploaders…" />
          </div>
          <button id="btn-new-book" class="btn btn-primary btn-sm" onclick="window._openBatchModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Books
          </button>
        </div>
      </div>

      <!-- Books Grid -->
      <div id="writer-books-grid" class="books-grid">
      </div>
    </div>

    <!-- Mobile Native Bottom Navigation Bar -->
    <nav class="mobile-bottom-bar" aria-label="Mobile Navigation">
      <button class="mobile-nav-item active" id="mob-tab-new" onclick="window._writerTab('NEW')">
        <div class="mobile-nav-icon-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span class="mobile-nav-badge" id="mob-count-new">0</span>
        </div>
        <span>New</span>
      </button>

      <button class="mobile-nav-action-btn" onclick="window._openBatchModal()" aria-label="Add Books">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <button class="mobile-nav-item" id="mob-tab-down" onclick="window._writerTab('DOWNLOADED')">
        <div class="mobile-nav-icon-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span class="mobile-nav-badge" id="mob-count-down">0</span>
        </div>
        <span>Downloaded</span>
      </button>
    </nav>
  `;

  // Register global callbacks
  window._writerTab         = switchTab;
  window._openBatchModal    = openBatchModal;
  window._writerDownload    = downloadBook;

  // Debounced search
  const searchInput = document.getElementById('writer-search');
  searchInput.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    loadBooks();
  }, 350));

  // Socket.io: listen for real-time download events
  onSocketEvent('book:downloaded', handleBookDownloaded);

  loadBooks();
}

// ── Tab Switching ──────────────────────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;

  // Update desktop tab buttons
  document.querySelectorAll('#writer-tab-bar .tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update mobile bottom nav items
  const mobNew  = document.getElementById('mob-tab-new');
  const mobDown = document.getElementById('mob-tab-down');
  if (mobNew)  mobNew.classList.toggle('active', tab === 'NEW');
  if (mobDown) mobDown.classList.toggle('active', tab === 'DOWNLOADED');

  renderBookGrid(tab === 'NEW' ? allNewBooks : allDownBooks);
}

// ── Load Books ─────────────────────────────────────────────────────────────────

async function loadBooks() {
  const grid = document.getElementById('writer-books-grid');
  showSkeleton(grid, 4);

  try {
    const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
    const [{ books: newBooks }, { books: downBooks }] = await Promise.all([
      api(`/api/writer/books?tab=NEW${searchParam}`),
      api(`/api/writer/books?tab=DOWNLOADED${searchParam}`),
    ]);

    allNewBooks  = newBooks;
    allDownBooks = downBooks;

    updateTabCounts(newBooks.length, downBooks.length);
    renderBookGrid(activeTab === 'NEW' ? newBooks : downBooks);
  } catch (err) {
    grid.innerHTML = '';
    showToast(err.message, 'error', 'Failed to load books');
  }
}

function updateTabCounts(newCount, downCount) {
  const newEl  = document.getElementById('count-new');
  const downEl = document.getElementById('count-down');
  const mobNew  = document.getElementById('mob-count-new');
  const mobDown = document.getElementById('mob-count-down');

  if (newEl)  newEl.textContent  = newCount;
  if (downEl) downEl.textContent = downCount;
  if (mobNew)  mobNew.textContent  = newCount;
  if (mobDown) mobDown.textContent = downCount;
}

// ── Render Book Cards ──────────────────────────────────────────────────────────

function renderBookGrid(books) {
  const grid = document.getElementById('writer-books-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!books.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </div>
        <h3>${activeTab === 'NEW' ? 'No new books' : 'No downloaded books'}</h3>
        <p>${activeTab === 'NEW'
          ? 'Upload your first book batch to get started.'
          : 'Books downloaded by Uploaders will appear here.'}</p>
      </div>
    `;
    return;
  }

  books.forEach((book) => {
    const card = createBookCard(book);
    card.classList.add('entering');
    grid.appendChild(card);
  });
}

function createBookCard(book) {
  const card = document.createElement('div');
  card.className = `book-card${book.status === 'DOWNLOADED' ? ' status-downloaded' : ''}`;
  card.dataset.bookId = book._id;

  card.innerHTML = `
    <div class="book-card-header">
      <h3 class="book-title">${escapeHtml(book.title)}</h3>
      <span class="book-status-badge ${book.status}">${book.status}</span>
    </div>

    <div class="book-meta">
      <div class="book-meta-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        Target: <strong>${escapeHtml(book.targetUploaderId?.name || '—')}</strong>
      </div>
      <div class="book-meta-row text-muted" style="font-size:0.78rem">
        Uploaded: ${formatDate(book.createdAt)}
      </div>
      ${book.status === 'DOWNLOADED' ? `
      <div class="book-download-ts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Downloaded: ${formatDate(book.downloadedAt)}
      </div>` : ''}
    </div>

    <div class="book-files">
      ${renderFilePills(book.filesIncluded)}
    </div>

    <div class="book-card-footer">
      <button class="btn btn-ghost btn-sm" onclick="window._writerDownload('${book._id}', '${escapeHtml(book.sanitizedTitle)}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download ZIP
      </button>
    </div>
  `;

  return card;
}

// ── Socket.io — Real-time Downloaded Handler ───────────────────────────────────

function handleBookDownloaded({ bookId, downloadedAt, status }) {
  // Find the book in newBooks and animate it out
  const card = document.querySelector(`[data-book-id="${bookId}"]`);
  if (card && activeTab === 'NEW') {
    card.classList.add('realtime-update');

    setTimeout(() => {
      card.classList.add('leaving');
      card.addEventListener('animationend', () => {
        card.remove();

        // Update local arrays
        const book = allNewBooks.find((b) => b._id === bookId);
        if (book) {
          book.status      = 'DOWNLOADED';
          book.downloadedAt = downloadedAt;
          allNewBooks = allNewBooks.filter((b) => b._id !== bookId);
          allDownBooks = [book, ...allDownBooks];
        }

        // Update tab counts with animation
        updateTabCounts(allNewBooks.length, allDownBooks.length);
        const downCountEl = document.getElementById('count-down');
        downCountEl?.classList.add('pop');
        downCountEl?.addEventListener('animationend', () => downCountEl.classList.remove('pop'), { once: true });

        showToast(
          `"${book?.title || 'Book'}" was downloaded by the uploader.`,
          'success',
          'Book Downloaded'
        );
      }, { once: true });
    }, 600);
  } else {
    // Not visible — just refresh counts
    loadBooks();
  }
}

// ── Download Handler ───────────────────────────────────────────────────────────

async function downloadBook(bookId, sanitizedTitle) {
  const btn = document.querySelector(`[data-book-id="${bookId}"] .btn-ghost`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Fetching…';
  }
  try {
    await triggerDownload(`/api/writer/books/${bookId}/download`, `${sanitizedTitle}.zip`);
    showToast('ZIP package downloaded.', 'success');
  } catch (err) {
    showToast(err.message, 'error', 'Download failed');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download ZIP';
    }
  }
}

// ── Batch Upload Modal ─────────────────────────────────────────────────────────

function openBatchModal() {
  let bookCount = 1;
  let uploaders = [];

  const { el, close } = showModal(`
    <div class="modal-header">
      <h2 class="modal-title">Upload Books</h2>
      <button class="modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div id="batch-error" class="form-error" style="display:none;margin-bottom:1rem">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span id="batch-error-msg"></span>
      </div>
      <div class="book-builder" id="book-builder"></div>
      <button type="button" id="add-book-btn" class="add-book-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Another Book
      </button>
      <p style="text-align:center;color:rgba(255,255,255,0.3);font-size:0.75rem;margin-top:0.75rem">
        Maximum 5 books per batch
      </p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="batch-cancel">Cancel</button>
      <button class="btn btn-primary" id="batch-submit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span class="btn-text">Upload Batch</span>
      </button>
    </div>
  `, { wide: true });

  el.querySelector('#batch-cancel').addEventListener('click', close);

  const builder = el.querySelector('#book-builder');
  const addBtn  = el.querySelector('#add-book-btn');

  // Load uploaders first
  api('/api/writer/uploaders')
    .then(({ uploaders: ul }) => {
      uploaders = ul;
      renderBookBuilderCard(builder, 0, uploaders);
      updateAddButton();
    })
    .catch(() => showToast('Could not load uploaders.', 'error'));

  addBtn.addEventListener('click', () => {
    if (bookCount >= 5) return;
    renderBookBuilderCard(builder, bookCount, uploaders);
    bookCount++;
    updateAddButton();
  });

  function updateAddButton() {
    addBtn.style.display = bookCount >= 5 ? 'none' : 'flex';
  }

  // Remove a book card
  builder.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-book-btn');
    if (removeBtn && bookCount > 1) {
      const card = removeBtn.closest('.book-builder-card');
      card.style.animation = 'cardLeave 0.3s ease forwards';
      card.addEventListener('animationend', () => {
        card.remove();
        bookCount--;
        // Re-index remaining cards
        builder.querySelectorAll('.book-builder-card').forEach((c, i) => {
          c.dataset.bookIdx = i;
          c.querySelector('.book-num-badge').textContent = `Book ${i + 1}`;
        });
        updateAddButton();
      }, { once: true });
    }
  });

  // Handle submit
  el.querySelector('#batch-submit').addEventListener('click', () => submitBatch(el, builder, close));
}

function renderBookBuilderCard(builder, idx, uploaders) {
  const card = document.createElement('div');
  card.className = 'book-builder-card';
  card.dataset.bookIdx = idx;

  card.innerHTML = `
    <div class="book-builder-card-header">
      <span class="book-num-badge">Book ${idx + 1}</span>
      ${idx > 0 ? `<button type="button" class="remove-book-btn btn btn-danger btn-sm">Remove</button>` : ''}
    </div>

    <div class="form-group">
      <label class="form-label">Book Title *</label>
      <input type="text" class="form-input book-title-input" placeholder="e.g. The Art of Silence" required />
    </div>

    <div class="form-group">
      <label class="form-label">Target Uploader *</label>
      <select class="form-select book-uploader-select">
        <option value="">— Select Uploader —</option>
        ${uploaders.map((u) => `<option value="${u._id}">${escapeHtml(u.name)}</option>`).join('')}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Book Files</label>
      <div class="dropzone" id="dz-${idx}" data-idx="${idx}">
        <div class="dropzone-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="dropzone-title">Drop files here or click to browse</div>
        <div class="dropzone-subtitle">.docx (optional) · .pdf · .jpg · .txt</div>
        <div class="dropzone-types">
          <span class="file-pill docx">${fileTypeIcon('docx')} .docx</span>
          <span class="file-pill pdf">${fileTypeIcon('pdf')} .pdf</span>
          <span class="file-pill jpg">${fileTypeIcon('jpg')} .jpg</span>
          <span class="file-pill txt">${fileTypeIcon('txt')} .txt</span>
        </div>
        <div class="dropzone-files" id="dz-files-${idx}"></div>
      </div>
      <input type="file" id="file-input-${idx}" class="book-file-input"
        style="display:none" multiple accept=".docx,.pdf,.jpg,.jpeg,.txt" />
    </div>
  `;

  builder.appendChild(card);

  // Wire up drag & drop
  const dz        = card.querySelector(`#dz-${idx}`);
  const fileInput = card.querySelector(`#file-input-${idx}`);
  const filesMap  = new Map(); // ext → File

  dz.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files), idx, dz, filesMap));

  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files), idx, dz, filesMap);
  });

  // Store filesMap reference for submit
  card._filesMap = filesMap;
}

function handleFiles(files, idx, dz, filesMap) {
  const allowed  = ['docx', 'pdf', 'jpg', 'jpeg', 'txt'];
  const extMap   = { jpeg: 'jpg' };

  files.forEach((file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const normalExt = extMap[ext] || ext;

    if (!allowed.includes(ext)) {
      showToast(`${file.name} is not supported.`, 'warning');
      return;
    }

    filesMap.set(normalExt, file);
  });

  renderDropzoneFiles(idx, filesMap, dz);
}

function renderDropzoneFiles(idx, filesMap, dz) {
  const filesEl = dz.querySelector(`#dz-files-${idx}`);
  if (!filesEl) return;

  if (filesMap.size === 0) {
    filesEl.innerHTML = '';
    return;
  }

  filesEl.innerHTML = [...filesMap.entries()].map(([ext, file]) => `
    <div class="file-chip" data-ext="${ext}">
      ${fileTypeIcon(ext)}
      <span>${escapeHtml(file.name)}</span>
      <button class="file-chip-remove" data-idx="${idx}" data-ext="${ext}" title="Remove">✕</button>
    </div>
  `).join('');

  filesEl.querySelectorAll('.file-chip-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { ext } = btn.dataset;
      filesMap.delete(ext);
      renderDropzoneFiles(idx, filesMap, dz);
    });
  });
}

async function submitBatch(el, builder, close) {
  const errEl  = el.querySelector('#batch-error');
  const errMsg = el.querySelector('#batch-error-msg');
  const btn    = el.querySelector('#batch-submit');

  errEl.style.display = 'none';

  const cards   = builder.querySelectorAll('.book-builder-card');
  const booksMetadata = [];
  const formData = new FormData();
  let valid = true;

  cards.forEach((card, i) => {
    const title      = card.querySelector('.book-title-input')?.value.trim();
    const uploaderId = card.querySelector('.book-uploader-select')?.value;

    if (!title || !uploaderId) { valid = false; return; }

    booksMetadata.push({ title, targetUploaderId: uploaderId });

    const filesMap = card._filesMap || new Map();
    filesMap.forEach((file, ext) => {
      formData.append(`book_${i}_${ext}`, file, file.name);
    });
  });

  if (!valid) {
    errMsg.textContent = 'Please fill in the title and target uploader for each book.';
    errEl.style.display = 'flex';
    return;
  }

  formData.append('books', JSON.stringify(booksMetadata));
  setButtonLoading(btn, true);

  try {
    const result = await apiUpload('/api/writer/books/batch', formData);
    const successCount = result.results?.length || 0;
    const errorCount   = result.errors?.length || 0;

    if (successCount > 0) {
      showToast(
        `${successCount} book${successCount > 1 ? 's' : ''} uploaded successfully.`,
        'success',
        'Upload Complete',
        6000
      );
    }
    if (errorCount > 0) {
      result.errors.forEach((e) => {
        showToast(`Book ${e.index + 1}: ${e.error}`, 'error');
      });
    }

    close();
    loadBooks();
  } catch (err) {
    errMsg.textContent = err.message;
    errEl.style.display = 'flex';
  } finally {
    setButtonLoading(btn, false);
  }
}
