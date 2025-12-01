async function examinerLogin(e) {
  e.preventDefault();
  const msg = document.getElementById('examiner-login-message');
  msg.textContent = '';
  const username = document.getElementById('examiner-username').value.trim();
  const password = document.getElementById('examiner-password').value;
  const res = await fetch('/api/examiner-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (res.ok && data.success) {
    window.location.href = '/examiner.html';
  } else {
    msg.textContent = data.error || 'Login failed';
  }
}

document
  .getElementById('examiner-login-form')
  .addEventListener('submit', examinerLogin);
