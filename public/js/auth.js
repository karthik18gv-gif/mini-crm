// If already logged in, skip straight to the dashboard
if (localStorage.getItem('crm_token')) {
  window.location.href = '/admin/dashboard.html';
}

const form = document.getElementById('loginForm');
const statusEl = document.getElementById('loginStatus');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  statusEl.textContent = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Login failed.');

    localStorage.setItem('crm_token', data.token);
    localStorage.setItem('crm_admin', JSON.stringify(data.admin));
    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.style.color = 'var(--red)';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});
