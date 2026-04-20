// ============================================================
// profile.js — Profile page: view profile, edit, upload exhibits
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) { window.location.href = '/login'; return; }

  const user = getUser();

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', () => { clearAuth(); window.location.href = '/'; });

  // Nav user display
  const navUser = document.getElementById('nav-user');
  if (navUser && user) {
    navUser.innerHTML = `<span style="color:var(--text-secondary);">${user.name}</span><span>${user.role}</span>`;
  }

  await loadProfile();
  setupProfileForm();
  setupUploadForm();
  setupMediaPreview();
});

async function loadProfile() {
  try {
    const data = await usersAPI.getProfile();
    renderProfileHeader(data.user);
    fillProfileForm(data.user);
    renderMyExhibits(data.exhibits);

    // Show upload section for creators
    if (data.user.role === 'creator' || data.user.role === 'admin') {
      document.getElementById('upload-section').hidden = false;
    }
  } catch (err) {
    showToast(err.message, 'error');
    if (err.message.includes('token') || err.message.includes('authorized')) {
      clearAuth();
      window.location.href = '/login';
    }
  }
}

function renderProfileHeader(user) {
  const header = document.getElementById('profile-header');
  const roleColor = { visitor: 'var(--accent-teal)', creator: 'var(--accent-violet-light)', admin: 'var(--accent-rose)' };
  const avatarEl = user.profilePicLink
    ? `<img class="profile-avatar" src="${user.profilePicLink}" alt="avatar" onerror="this.outerHTML='<div class=profile-avatar-placeholder>${getInitials(user.name)}</div>'" />`
    : `<div class="profile-avatar-placeholder">${getInitials(user.name)}</div>`;

  header.innerHTML = `
    ${avatarEl}
    <div class="profile-info" style="flex:1;">
      <h2>${user.name}</h2>
      <p>${user.email}</p>
      <div class="profile-role">
        <span style="background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.2);color:${roleColor[user.role]};padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;text-transform:capitalize;">
          ${user.role === 'creator' ? '🎨' : user.role === 'admin' ? '⚡' : '👁️'} ${user.role}
        </span>
      </div>
      ${user.bio ? `<p style="color:var(--text-secondary); margin-top:0.5rem; font-size:0.9rem;">${user.bio}</p>` : ''}
    </div>
  `;
}

function fillProfileForm(user) {
  const nameEl = document.getElementById('p-name');
  const bioEl = document.getElementById('p-bio');
  const picEl = document.getElementById('p-pic');
  if (nameEl) nameEl.value = user.name || '';
  if (bioEl) bioEl.value = user.bio || '';
  if (picEl) picEl.value = user.profilePicLink || '';
}

function setupProfileForm() {
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('profile-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const name = document.getElementById('p-name').value.trim();
      const bio = document.getElementById('p-bio').value.trim();
      const profilePicLink = document.getElementById('p-pic').value.trim();

      await usersAPI.updateProfile({ name, bio, profilePicLink });

      // Update localStorage
      const user = getUser();
      setAuth(getToken(), { ...user, name });

      showToast('Profile updated!', 'success');
      await loadProfile();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function setupUploadForm() {
  document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('upload-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const title = document.getElementById('u-title').value.trim();
      const description = document.getElementById('u-desc').value.trim();
      const category = document.getElementById('u-category').value;
      let mediaLink = '';
      const mediaSource = document.querySelector('input[name="mediaSource"]:checked').value;
      if (mediaSource === 'link') {
        mediaLink = document.getElementById('u-medialink').value.trim();
      } else {
        const fileInput = document.getElementById('u-mediafile');
        if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
          if (file.size > 5 * 1024 * 1024) {
            showToast('Image file size must be below 5MB', 'error');
            btn.disabled = false;
            btn.textContent = 'Submit Exhibit';
            return;
          }
          mediaLink = await fileToBase64(file);
        }
      }
      const mediaType = document.getElementById('u-mediatype').value;
      const tagsRaw = document.getElementById('u-tags').value;
      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

      if (!title || !description || !category || !mediaLink) {
        showToast('Please fill all required fields', 'error');
        return;
      }

      await exhibitsAPI.create({ title, description, category, mediaLink, mediaType, tags });
      showToast('Exhibit submitted! Awaiting admin approval.', 'success');

      // Reset form
      document.getElementById('upload-form').reset();
      document.getElementById('media-preview').style.display = 'none';

      // Refresh my exhibits
      const data = await usersAPI.getProfile();
      renderMyExhibits(data.exhibits);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Exhibit';
    }
  });
}

function setupMediaPreview() {
  const linkInput = document.getElementById('u-medialink');
  const typeSelect = document.getElementById('u-mediatype');
  const previewDiv = document.getElementById('media-preview');
  const previewImg = document.getElementById('preview-img');
  const previewVid = document.getElementById('preview-vid');

  const linkRadio = document.querySelector('input[value="link"]');
  const uploadRadio = document.querySelector('input[value="upload"]');
  const sourceLinkDiv = document.getElementById('source-link');
  const sourceUploadDiv = document.getElementById('source-upload');
  const fileInput = document.getElementById('u-mediafile');

  function toggleSource() {
    if (uploadRadio.checked) {
      sourceLinkDiv.style.display = 'none';
      sourceUploadDiv.style.display = 'block';
      typeSelect.value = 'image';
      Array.from(typeSelect.options).find(o => o.value === 'video').disabled = true;
    } else {
      sourceLinkDiv.style.display = 'block';
      sourceUploadDiv.style.display = 'none';
      Array.from(typeSelect.options).find(o => o.value === 'video').disabled = false;
    }
    updatePreview();
  }

  async function updatePreview() {
    const type = typeSelect?.value;
    let link = '';

    if (uploadRadio && uploadRadio.checked) {
      if (fileInput && fileInput.files.length > 0) {
        try {
          link = await fileToBase64(fileInput.files[0]);
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      link = linkInput?.value.trim();
    }

    if (!link) { previewDiv.style.display = 'none'; return; }

    previewDiv.style.display = 'block';
    if (type === 'video') {
      previewImg.style.display = 'none';
      previewVid.style.display = 'block';
      previewVid.src = link;
    } else {
      previewVid.style.display = 'none';
      previewImg.style.display = 'block';
      previewImg.src = link;
      previewImg.onerror = () => { previewDiv.style.display = 'none'; };
    }
  }

  linkInput?.addEventListener('input', updatePreview);
  typeSelect?.addEventListener('change', updatePreview);
  fileInput?.addEventListener('change', updatePreview);
  linkRadio?.addEventListener('change', toggleSource);
  uploadRadio?.addEventListener('change', toggleSource);
}

function renderMyExhibits(exhibits) {
  const container = document.getElementById('my-exhibits');
  const countEl = document.getElementById('my-exhibit-count');
  if (countEl) countEl.textContent = `${exhibits.length} exhibit${exhibits.length !== 1 ? 's' : ''}`;

  if (!exhibits || exhibits.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🖼️</div>
        <h3>No exhibits yet</h3>
        <p>Upload your first artwork or photograph using the form on the left.</p>
      </div>`;
    return;
  }

  container.innerHTML = exhibits.map(ex => {
    const statusBadge = `<span class="badge-${ex.status}">${ex.status.toUpperCase()}</span>`;
    const mediaEl = ex.mediaType === 'video'
      ? `<video src="${ex.mediaLink}" style="width:100%;height:160px;object-fit:cover;" muted preload="metadata"></video>`
      : `<img src="${ex.mediaLink}" style="width:100%;height:160px;object-fit:cover;" alt="${ex.title}" onerror="this.style.display='none'" />`;

    return `
      <div class="card" style="margin-bottom:1rem; overflow:hidden;">
        <div style="position:relative; overflow:hidden; height:160px; background:var(--bg-secondary);">
          ${mediaEl}
          <div style="position:absolute;top:8px;right:8px;">${statusBadge}</div>
        </div>
        <div style="padding:1rem;">
          <h4 style="margin-bottom:4px;">${ex.title}</h4>
          <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.75rem;">${getCategoryBadge(ex.category)} · ${formatDate(ex.createdAt)}</p>
          <div style="display:flex; gap:8px;">
            <a href="/exhibit?id=${ex._id}" class="btn btn-ghost btn-sm">👁️ View</a>
            <button class="btn btn-danger btn-sm" onclick="deleteMyExhibit('${ex._id}')">🗑️ Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function deleteMyExhibit(id) {
  if (!confirm('Delete this exhibit permanently?')) return;
  try {
    await exhibitsAPI.delete(id);
    showToast('Exhibit deleted', 'success');
    const data = await usersAPI.getProfile();
    renderMyExhibits(data.exhibits);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
