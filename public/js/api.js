// ============================================================
// api.js — Fetch wrapper and token/user management utilities
// ============================================================

const API_BASE = '/api';

// ── Token Helpers ──
const getToken = () => localStorage.getItem('artverse_token');
const getUser = () => {
  try { return JSON.parse(localStorage.getItem('artverse_user')); } catch { return null; }
};
const setAuth = (token, user) => {
  localStorage.setItem('artverse_token', token);
  localStorage.setItem('artverse_user', JSON.stringify(user));
};
const clearAuth = () => {
  localStorage.removeItem('artverse_token');
  localStorage.removeItem('artverse_user');
};
const isLoggedIn = () => !!getToken();

// ── Core Fetch ──
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Auth API ──
const authAPI = {
  register: (body) => apiFetch('/auth/register', { method: 'POST', body }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body })
};

// ── Exhibits API ──
const exhibitsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/exhibits${qs ? '?' + qs : ''}`);
  },
  getOne: (id) => apiFetch(`/exhibits/${id}`),
  create: (body) => apiFetch('/exhibits', { method: 'POST', body }),
  update: (id, body) => apiFetch(`/exhibits/${id}`, { method: 'PUT', body }),
  delete: (id) => apiFetch(`/exhibits/${id}`, { method: 'DELETE' }),
  like: (id) => apiFetch(`/exhibits/${id}/like`, { method: 'POST' }),
  share: (id) => apiFetch(`/exhibits/${id}/share`, { method: 'POST' }),
  addComment: (id, text) => apiFetch(`/exhibits/${id}/comment`, { method: 'POST', body: { text } }),
  getComments: (id) => apiFetch(`/exhibits/${id}/comments`)
};

// ── Users API ──
const usersAPI = {
  getProfile: () => apiFetch('/users/profile'),
  updateProfile: (body) => apiFetch('/users/profile', { method: 'PUT', body }),
  getPublicProfile: (id) => apiFetch(`/users/${id}`)
};

// ── Admin API ──
const adminAPI = {
  getStats: () => apiFetch('/admin/stats'),
  getUsers: () => apiFetch('/admin/users'),
  updateUser: (id, body) => apiFetch(`/admin/users/${id}`, { method: 'PUT', body }),
  deleteUser: (id) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
  getExhibits: (status) => apiFetch(`/admin/exhibits${status ? '?status=' + status : ''}`),
  approveExhibit: (id) => apiFetch(`/admin/exhibits/${id}/approve`, { method: 'PUT' }),
  rejectExhibit: (id) => apiFetch(`/admin/exhibits/${id}/reject`, { method: 'PUT' }),
  deleteExhibit: (id) => apiFetch(`/admin/exhibits/${id}`, { method: 'DELETE' })
};

// ── Toast Notifications ──
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(24px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Helpers ──
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getCategoryBadge(cat) {
  return cat === 'Art'
    ? `<span class="category-badge badge-art">🎨 Art</span>`
    : `<span class="category-badge badge-photography">📷 Photography</span>`;
}

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
}

// ── Navbar Auth Sync ──
function syncNavbar() {
  const actions = document.getElementById('nav-actions');
  const navUser = document.getElementById('nav-user');
  const user = getUser();

  if (isLoggedIn() && user) {
    if (actions) {
      let adminLink = user.role === 'admin' ? `<a href="/admin" class="btn btn-danger btn-sm">⚡ Admin</a>` : '';
      actions.innerHTML = `
        ${adminLink}
        <a href="/profile" class="btn btn-outline btn-sm">👤 Profile</a>
        <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>
      `;
    }
    if (navUser) {
      navUser.innerHTML = `<span style="color:var(--text-secondary); font-size:0.875rem;">${user.name}</span><span>${user.role}</span>`;
    }
  }
}

function logout() {
  clearAuth();
  window.location.href = '/';
}

// Run on every page
document.addEventListener('DOMContentLoaded', syncNavbar);
