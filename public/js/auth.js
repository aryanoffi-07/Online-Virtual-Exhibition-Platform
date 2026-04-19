// ============================================================
// auth.js — Login and Register form logic
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (isLoggedIn()) {
    window.location.href = '/';
    return;
  }

  // ── Login Form ──
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      const errEl = document.getElementById('login-error');
      errEl.style.display = 'none';

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      btn.disabled = true;
      btn.textContent = 'Signing in...';

      try {
        const data = await authAPI.login({ email, password });
        setAuth(data.token, data.user);
        showToast('Welcome back, ' + data.user.name + '!', 'success');

        // Redirect based on role
        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = '/admin';
          } else {
            window.location.href = '/';
          }
        }, 800);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  // ── Register Form ──
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('reg-btn');
      const errEl = document.getElementById('reg-error');
      errEl.style.display = 'none';

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const role = document.querySelector('input[name="role"]:checked')?.value || 'visitor';

      if (password.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creating account...';

      try {
        const data = await authAPI.register({ name, email, password, role });
        setAuth(data.token, data.user);
        showToast('Welcome to ArtVerse, ' + data.user.name + '!', 'success');
        setTimeout(() => { window.location.href = '/'; }, 800);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }
});
