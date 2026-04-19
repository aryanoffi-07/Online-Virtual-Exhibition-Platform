// ============================================================
// exhibit.js — Single exhibit detail page logic
// ============================================================

let exhibitId = null;
let exhibitData = null;

document.addEventListener('DOMContentLoaded', async () => {
  exhibitId = new URLSearchParams(window.location.search).get('id');
  if (!exhibitId) {
    window.location.href = '/';
    return;
  }

  // Navbar
  const navActions = document.getElementById('nav-actions');
  const user = getUser();
  if (navActions) {
    if (isLoggedIn() && user) {
      let adminLink = user.role === 'admin' ? `<a href="/admin" class="btn btn-danger btn-sm">⚡ Admin</a>` : '';
      navActions.innerHTML = `${adminLink}<a href="/profile" class="btn btn-outline btn-sm">👤 Profile</a><button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>`;
    } else {
      navActions.innerHTML = `<a href="/login" class="btn btn-outline btn-sm">Login</a><a href="/register" class="btn btn-primary btn-sm">Join Free</a>`;
    }
  }

  await loadExhibit();
  await loadComments();
  setupInteractions();
});

async function loadExhibit() {
  try {
    exhibitData = await exhibitsAPI.getOne(exhibitId);

    // Update SEO title
    document.title = `${exhibitData.title} — ArtVerse`;

    // Show content
    document.getElementById('exhibit-loading').hidden = true;
    document.getElementById('exhibit-content').hidden = false;

    // Media
    const mediaContainer = document.getElementById('media-container');
    if (exhibitData.mediaType === 'video') {
      mediaContainer.innerHTML = `<video src="${exhibitData.mediaLink}" class="exhibit-detail-media-video" controls onerror="this.outerHTML='<div style=padding:3rem;text-align:center;color:var(--text-muted);>⚠️ Video could not be loaded</div>'"></video>`;
    } else {
      mediaContainer.innerHTML = `<img src="${exhibitData.mediaLink}" class="exhibit-detail-media" alt="${exhibitData.title}" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend','<div style=padding:3rem;text-align:center;color:var(--text-muted);font-size:1rem;>⚠️ Image could not be loaded</div>')" />`;
    }

    // Info
    document.getElementById('exhibit-category').innerHTML = getCategoryBadge(exhibitData.category);
    document.getElementById('exhibit-title').textContent = exhibitData.title;
    document.getElementById('exhibit-description').textContent = exhibitData.description;
    document.getElementById('exhibit-date').textContent = `Published on ${formatDate(exhibitData.createdAt)}`;

    // Stats
    document.getElementById('like-count').textContent = exhibitData.likes?.length || 0;
    document.getElementById('share-count').textContent = exhibitData.shareCount ? `(${exhibitData.shareCount})` : '';
    document.getElementById('stat-likes').textContent = exhibitData.likes?.length || 0;
    document.getElementById('stat-shares').textContent = exhibitData.shareCount || 0;

    // Creator
    const creator = exhibitData.creator;
    const creatorInfo = document.getElementById('creator-info');
    if (creator) {
      const avatar = creator.profilePicLink
        ? `<img src="${creator.profilePicLink}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--border-glass);" onerror="this.outerHTML='<div class=comment-avatar>${getInitials(creator.name)}</div>'" />`
        : `<div class="comment-avatar" style="width:40px;height:40px;">${getInitials(creator.name)}</div>`;
      creatorInfo.innerHTML = `
        ${avatar}
        <div>
          <p style="font-weight:600; color:var(--text-primary);">${creator.name}</p>
          <p style="font-size:0.78rem; color:var(--accent-violet-light); text-transform:capitalize;">${creator.role}</p>
        </div>
      `;
    }

    // Tags
    if (exhibitData.tags && exhibitData.tags.length > 0) {
      const tagsSection = document.getElementById('tags-section');
      const tagsList = document.getElementById('tags-list');
      tagsSection.style.display = 'block';
      tagsList.innerHTML = exhibitData.tags.map(t => `<span style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);color:var(--accent-violet-light);padding:3px 10px;border-radius:12px;font-size:0.75rem;">#${t}</span>`).join('');
    }

    // Like button state
    const user = getUser();
    const likeBtn = document.getElementById('like-btn');
    if (user && exhibitData.likes?.includes(user.id)) {
      likeBtn.classList.add('liked');
    }

    // Creator actions (edit/delete for own exhibit or admin)
    if (user && (user.id === exhibitData.creator?._id || user.role === 'admin')) {
      document.getElementById('creator-actions').innerHTML =
        `<button class="btn btn-danger btn-sm" id="delete-exhibit-btn">🗑️ Delete</button>`;
      document.getElementById('delete-exhibit-btn').addEventListener('click', deleteExhibit);
    }

    // Comment form visibility
    if (isLoggedIn()) {
      document.getElementById('comment-form').style.display = 'block';
    } else {
      document.getElementById('comment-login-prompt').style.display = 'block';
    }

  } catch (err) {
    document.getElementById('exhibit-loading').innerHTML = `
      <div class="empty-state"><div class="empty-icon">⚠️</div><h3>Exhibit not found</h3><p>${err.message}</p><a href="/" class="btn btn-primary">Back to Gallery</a></div>`;
  }
}

async function loadComments() {
  const commentsList = document.getElementById('comments-list');
  try {
    const comments = await exhibitsAPI.getComments(exhibitId);
    if (comments.length === 0) {
      commentsList.innerHTML = `<div class="empty-state" style="padding:1.5rem 0;"><div class="empty-icon" style="font-size:2rem;">💬</div><p>No comments yet. Be the first!</p></div>`;
      return;
    }
    commentsList.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-avatar">
          ${c.author?.profilePicLink
            ? `<img src="${c.author.profilePicLink}" onerror="this.outerHTML='${getInitials(c.author?.name || '?')}'"/>`
            : getInitials(c.author?.name || '?')}
        </div>
        <div style="flex:1;">
          <p class="comment-meta"><strong>${c.author?.name || 'Anonymous'}</strong>${formatDate(c.createdAt)}</p>
          <p class="comment-text">${escapeHtml(c.text)}</p>
        </div>
      </div>
    `).join('');
  } catch {
    commentsList.innerHTML = '<p style="color:var(--text-muted); font-size:0.875rem; padding:1rem 0;">Could not load comments.</p>';
  }
}

function setupInteractions() {
  // Like button
  document.getElementById('like-btn')?.addEventListener('click', async () => {
    if (!isLoggedIn()) { showToast('Please login to like exhibits', 'error'); window.location.href = '/login'; return; }
    try {
      const result = await exhibitsAPI.like(exhibitId);
      document.getElementById('like-count').textContent = result.likes;
      document.getElementById('stat-likes').textContent = result.likes;
      document.getElementById('like-btn').classList.toggle('liked', result.liked);
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Share button
  document.getElementById('share-btn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      await exhibitsAPI.share(exhibitId);
      showToast('Link copied to clipboard!', 'success');
      const shareCount = parseInt(document.getElementById('stat-shares').textContent || '0') + 1;
      document.getElementById('stat-shares').textContent = shareCount;
      document.getElementById('share-count').textContent = `(${shareCount})`;
    } catch { showToast('Could not copy link', 'error'); }
  });

  // Comment form
  document.getElementById('comment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;

    const btn = document.getElementById('comment-btn');
    btn.disabled = true;
    btn.textContent = 'Posting...';

    try {
      await exhibitsAPI.addComment(exhibitId, text);
      input.value = '';
      showToast('Comment posted!', 'success');
      await loadComments();
    } catch (err) { showToast(err.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = 'Post Comment';
    }
  });
}

async function deleteExhibit() {
  if (!confirm('Are you sure you want to delete this exhibit? This cannot be undone.')) return;
  try {
    await exhibitsAPI.delete(exhibitId);
    showToast('Exhibit deleted', 'success');
    setTimeout(() => window.location.href = '/', 800);
  } catch (err) { showToast(err.message, 'error'); }
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(text));
  return d.innerHTML;
}
