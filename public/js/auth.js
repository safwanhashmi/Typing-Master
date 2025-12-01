async function postJson(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authMessage = document.getElementById('auth-message');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const res = await postJson('/api/login', { username, password });
  if (res.success) {
    window.location.href = '/dashboard.html';
  } else {
    authMessage.textContent = res.error || 'Login failed';
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const res = await postJson('/api/register', { username, password });
  if (res.success) {
    window.location.href = '/dashboard.html';
  } else {
    authMessage.textContent = res.error || 'Registration failed';
  }
});
