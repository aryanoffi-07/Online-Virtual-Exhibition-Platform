// ============================================================
// browse.js — Gallery page: load exhibits, search, filter, paginate
// ============================================================

let currentPage = 1;
let currentCategory = '';
let searchQuery = '';
let currentSort = 'latest';
let searchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  // Apply URL params on load
  const params = new URLSearchParams(window.location.search);
  if (params.get('category')) {
    currentCategory = params.get('category');
    setActiveFilter(currentCategory);
  }

  loadExhibits();

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = e.target.value.trim();
        currentPage = 1;
        loadExhibits();
      }, 400);
    });
  }

  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentCategory = pill.dataset.category;
      currentPage = 1;
      setActiveFilter(currentCategory);
      loadExhibits();
    });
  });

  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      currentPage = 1;
      loadExhibits();
    });
  }

  // Update hero create button
  const heroCta = document.getElementById('hero-create-btn');
  if (heroCta && isLoggedIn()) {
    heroCta.href = '/profile';
    heroCta.textContent = 'Upload My Work';
  }
});

function setActiveFilter(category) {
  document.querySelectorAll('.filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.category === category);
  });
}

async function loadExhibits() {
  const grid = document.getElementById('gallery-grid');
  const countEl = document.getElementById('result-count');
  grid.innerHTML = `<div class="loading-overlay" style="grid-column:1/-1;"><div class="spinner"></div><span>Loading exhibits...</span></div>`;

  try {
    const params = { page: currentPage, limit: 12 };
    if (currentCategory) params.category = currentCategory;
    if (searchQuery) params.search = searchQuery;
    if (currentSort) params.sortBy = currentSort;

    const data = await exhibitsAPI.getAll(params);

    if (countEl) countEl.textContent = `${data.total} exhibit${data.total !== 1 ? 's' : ''}`;

    if (!data.exhibits || data.exhibits.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">🖼️</div>
          <h3>No exhibits found</h3>
          <p>${searchQuery ? 'Try a different search term.' : 'Be the first to upload an exhibit!'}</p>
          ${isLoggedIn() ? '<a href="/profile" class="btn btn-primary">Upload Exhibit</a>' : '<a href="/register" class="btn btn-primary">Join & Create</a>'}
        </div>`;
      renderPagination(0, 1);
      return;
    }

    grid.innerHTML = '';
    data.exhibits.forEach((exhibit, i) => {
      const card = createExhibitCard(exhibit, i);
      grid.appendChild(card);
    });

    renderPagination(data.pages, data.page);
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">⚠️</div>
        <h3>Failed to load exhibits</h3>
        <p>${err.message}</p>
      </div>`;
  }
}

function createExhibitCard(exhibit, index) {
  const card = document.createElement('div');
  card.className = 'exhibit-card';
  card.style.animationDelay = `${index * 0.06}s`;

  const creatorName = exhibit.creator?.name || 'Unknown';
  const likeCount = exhibit.likes?.length || 0;
  const catBadge = getCategoryBadge(exhibit.category);

  card.innerHTML = `
    <div class="card-media-wrap">
      ${renderMedia(exhibit.mediaLink, exhibit.mediaType)}
      <div class="exhibit-overlay">
        ${catBadge}
      </div>
    </div>
    <div class="card-body">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
        <h3 class="card-title" title="${exhibit.title}">${exhibit.title}</h3>
        ${catBadge}
      </div>
      <p class="card-creator">by <span>${creatorName}</span></p>
      <div class="card-stats">
        <span class="stat-item">❤️ ${likeCount}</span>
        <span class="stat-item">🔗 ${exhibit.shareCount || 0}</span>
        <span class="stat-item" style="margin-left:auto;">${formatDate(exhibit.createdAt)}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', () => {
    window.location.href = `/exhibit?id=${exhibit._id}`;
  });

  return card;
}

function renderMedia(link, type) {
  if (type === 'video') {
    return `<video src="${link}" class="card-media" muted loop preload="metadata" onerror="this.parentElement.innerHTML='<div class=card-media-error><span>🚫</span>Video unavailable</div>'"></video>`;
  }
  return `<img src="${link}" class="card-media" alt="exhibit" loading="lazy" onerror="this.parentElement.innerHTML='<div class=card-media-error><span>🖼️</span>Image unavailable</div>'" />`;
}

function renderPagination(totalPages, activePage) {
  const el = document.getElementById('pagination');
  if (!el) return;
  el.innerHTML = '';
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === activePage ? ' active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      currentPage = i;
      loadExhibits();
      document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
    });
    el.appendChild(btn);
  }
}
