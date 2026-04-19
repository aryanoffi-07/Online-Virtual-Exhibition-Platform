// ============================================================
// admin.js — Admin panel: dashboard, users, exhibits management
// ============================================================

let activeTab = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard: admin only
  if (!isLoggedIn()) { window.location.href = '/login'; return; }
  const user = getUser();
  if (user?.role !== 'admin') { showToast('Admin access required', 'error'); window.location.href = '/'; return; }

  // Show admin name
  const adminName = document.getElementById('admin-name');
  if (adminName) adminName.textContent = user.name;

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => { clearAuth(); window.location.href = '/'; });

  // Sidebar navigation
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  // Exhibit status filter
  document.getElementById('exhibit-status-filter')?.addEventListener('change', (e) => {
    loadAdminExhibits(e.target.value);
  });

  // Load dashboard by default
  await loadDashboard();
  await loadPendingCount(); // for badge
});

function switchTab(tab) {
  activeTab = tab;
  // Hide all panels
  document.querySelectorAll('.tab-panel').forEach(p => p.hidden = true);
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`tab-${tab}`).hidden = false;
  document.getElementById(`nav-${tab}`)?.classList.add('active');

  // Lazy load
  if (tab === 'dashboard') loadDashboard();
  else if (tab === 'pending') loadPendingExhibits();
  else if (tab === 'exhibits') loadAdminExhibits();
  else if (tab === 'users') loadUsers();
}

// ── Dashboard ──
async function loadDashboard() {
  const grid = document.getElementById('stats-grid');
  try {
    const stats = await adminAPI.getStats();
    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${stats.totalUsers}</div>
        <div class="stat-label">Total Users</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🖼️</div>
        <div class="stat-value">${stats.totalExhibits}</div>
        <div class="stat-label">Total Exhibits</div>
      </div>
      <div class="stat-card" style="border-color:rgba(20,184,166,0.25);">
        <div class="stat-icon">✅</div>
        <div class="stat-value" style="color:var(--accent-teal);">${stats.approvedExhibits}</div>
        <div class="stat-label">Approved</div>
      </div>
      <div class="stat-card" style="border-color:rgba(245,158,11,0.25);">
        <div class="stat-icon">⏳</div>
        <div class="stat-value" style="color:#fbbf24;">${stats.pendingExhibits}</div>
        <div class="stat-label">Pending Review</div>
      </div>
      <div class="stat-card" style="border-color:rgba(244,63,94,0.25);">
        <div class="stat-icon">❌</div>
        <div class="stat-value" style="color:var(--accent-rose);">${stats.rejectedExhibits}</div>
        <div class="stat-label">Rejected</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💬</div>
        <div class="stat-value">${stats.totalComments}</div>
        <div class="stat-label">Comments</div>
      </div>
    `;
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p style="color:var(--accent-rose);">${err.message}</p></div>`;
  }
}

async function loadPendingCount() {
  try {
    const stats = await adminAPI.getStats();
    const badge = document.getElementById('pending-badge');
    if (badge && stats.pendingExhibits > 0) badge.textContent = stats.pendingExhibits;
  } catch {}
}

// ── Pending Exhibits ──
async function loadPendingExhibits() {
  const container = document.getElementById('pending-list');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  try {
    const exhibits = await adminAPI.getExhibits('pending');
    if (!exhibits.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><h3>No pending submissions</h3><p>All caught up!</p></div>`;
      return;
    }
    container.innerHTML = exhibits.map(ex => renderPendingCard(ex)).join('');
    // Update badge
    document.getElementById('pending-badge').textContent = exhibits.length || '';
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--accent-rose);">${err.message}</p></div>`;
  }
}

function renderPendingCard(ex) {
  const mediaEl = ex.mediaType === 'video'
    ? `<video src="${ex.mediaLink}" style="width:100%;height:180px;object-fit:cover;" muted preload="metadata"></video>`
    : `<img src="${ex.mediaLink}" style="width:100%;height:180px;object-fit:cover;background:var(--bg-secondary);" alt="${ex.title}" onerror="this.style.display='none'" />`;

  return `
    <div class="card" style="padding:0; margin-bottom:1.25rem; display:grid; grid-template-columns:220px 1fr; overflow:hidden;" id="pending-${ex._id}">
      <div style="overflow:hidden; background:var(--bg-secondary);">${mediaEl}</div>
      <div style="padding:1.25rem; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
            ${getCategoryBadge(ex.category)}
            <span class="badge-pending">Pending</span>
          </div>
          <h3 style="margin-bottom:0.4rem;">${ex.title}</h3>
          <p style="font-size:0.825rem; color:var(--text-secondary); line-height:1.5; margin-bottom:0.75rem;">${ex.description.slice(0, 160)}${ex.description.length > 160 ? '...' : ''}</p>
          <p style="font-size:0.78rem; color:var(--text-muted);">by <strong style="color:var(--accent-violet-light);">${ex.creator?.name || 'Unknown'}</strong> (${ex.creator?.email || ''}) · ${formatDate(ex.createdAt)}</p>
        </div>
        <div style="display:flex; gap:0.75rem; margin-top:1rem; flex-wrap:wrap;">
          <a href="/exhibit?id=${ex._id}" target="_blank" class="btn btn-ghost btn-sm">👁️ Preview</a>
          <button class="btn btn-success btn-sm" onclick="approveExhibit('${ex._id}')">✅ Approve</button>
          <button class="btn btn-danger btn-sm" onclick="rejectExhibit('${ex._id}')">❌ Reject</button>
          <button class="btn btn-danger btn-sm" onclick="adminDeleteExhibit('${ex._id}')">🗑️ Delete</button>
        </div>
      </div>
    </div>
  `;
}

// ── All Exhibits ──
async function loadAdminExhibits(status = '') {
  const tbody = document.getElementById('exhibits-table-body');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);"><div class="spinner" style="margin:0 auto;"></div></td></tr>';
  try {
    const exhibits = await adminAPI.getExhibits(status);
    tbody.innerHTML = exhibits.map(ex => `
      <tr>
        <td style="color:var(--text-primary); font-weight:500;">${ex.title}</td>
        <td>${getCategoryBadge(ex.category)}</td>
        <td style="color:var(--accent-violet-light);">${ex.creator?.name || '-'}</td>
        <td><span class="badge-${ex.status}">${ex.status}</span></td>
        <td>${formatDate(ex.createdAt)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <a href="/exhibit?id=${ex._id}" target="_blank" class="btn btn-ghost btn-sm">👁️</a>
            ${ex.status !== 'approved' ? `<button class="btn btn-success btn-sm" onclick="approveExhibit('${ex._id}')">✅</button>` : ''}
            ${ex.status !== 'rejected' ? `<button class="btn btn-danger btn-sm" onclick="rejectExhibit('${ex._id}')">❌</button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="adminDeleteExhibit('${ex._id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No exhibits found</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--accent-rose);text-align:center;padding:1rem;">${err.message}</td></tr>`;
  }
}

// ── Users ──
async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;"><div class="spinner" style="margin:0 auto;"></div></td></tr>';
  try {
    const users = await adminAPI.getUsers();
    const me = getUser();
    tbody.innerHTML = users.map(u => `
      <tr id="user-row-${u._id}">
        <td style="color:var(--text-primary); font-weight:500;">${u.name}</td>
        <td style="color:var(--text-secondary);">${u.email}</td>
        <td>
          <select id="role-${u._id}" class="form-control" style="width:110px; padding:4px 8px; font-size:0.8rem;" ${u._id === me?.id ? 'disabled' : ''} onchange="changeRole('${u._id}', this.value)">
            <option value="visitor" ${u.role === 'visitor' ? 'selected' : ''}>Visitor</option>
            <option value="creator" ${u.role === 'creator' ? 'selected' : ''}>Creator</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
        <td>
          ${u.isBanned
            ? `<span class="badge-rejected">Banned</span>`
            : `<span class="badge-approved">Active</span>`}
        </td>
        <td style="color:var(--text-muted);">${formatDate(u.createdAt)}</td>
        <td>
          <div style="display:flex;gap:6px;">
            ${u._id !== me?.id ? `
              <button class="btn btn-sm ${u.isBanned ? 'btn-success' : 'btn-danger'}" onclick="toggleBan('${u._id}', ${u.isBanned})">
                ${u.isBanned ? '🔓 Unban' : '🔒 Ban'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="deleteUser('${u._id}')">🗑️</button>
            ` : '<span style="color:var(--text-muted);font-size:0.78rem;">You</span>'}
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;padding:1rem;color:var(--text-muted);">No users found</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--accent-rose);text-align:center;padding:1rem;">${err.message}</td></tr>`;
  }
}

// ── Actions ──
async function approveExhibit(id) {
  try {
    await adminAPI.approveExhibit(id);
    showToast('Exhibit approved!', 'success');
    document.getElementById(`pending-${id}`)?.remove();
    if (activeTab === 'pending') await loadPendingExhibits();
    if (activeTab === 'exhibits') await loadAdminExhibits(document.getElementById('exhibit-status-filter').value);
    await loadPendingCount();
  } catch (err) { showToast(err.message, 'error'); }
}

async function rejectExhibit(id) {
  try {
    await adminAPI.rejectExhibit(id);
    showToast('Exhibit rejected', 'info');
    document.getElementById(`pending-${id}`)?.remove();
    if (activeTab === 'pending') await loadPendingExhibits();
    if (activeTab === 'exhibits') await loadAdminExhibits(document.getElementById('exhibit-status-filter').value);
    await loadPendingCount();
  } catch (err) { showToast(err.message, 'error'); }
}

async function adminDeleteExhibit(id) {
  if (!confirm('Delete this exhibit permanently?')) return;
  try {
    await adminAPI.deleteExhibit(id);
    showToast('Exhibit deleted', 'success');
    document.getElementById(`pending-${id}`)?.remove();
    if (activeTab === 'pending') await loadPendingExhibits();
    if (activeTab === 'exhibits') await loadAdminExhibits(document.getElementById('exhibit-status-filter').value);
    if (activeTab === 'dashboard') await loadDashboard();
  } catch (err) { showToast(err.message, 'error'); }
}

async function changeRole(userId, role) {
  try {
    await adminAPI.updateUser(userId, { role });
    showToast('Role updated!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    loadUsers(); // revert
  }
}

async function toggleBan(userId, currentlyBanned) {
  try {
    await adminAPI.updateUser(userId, { isBanned: !currentlyBanned });
    showToast(!currentlyBanned ? 'User banned' : 'User unbanned', 'info');
    await loadUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteUser(userId) {
  if (!confirm('Delete this user and all their exhibits permanently?')) return;
  try {
    await adminAPI.deleteUser(userId);
    showToast('User deleted', 'success');
    await loadUsers();
    await loadDashboard();
  } catch (err) { showToast(err.message, 'error'); }
}
