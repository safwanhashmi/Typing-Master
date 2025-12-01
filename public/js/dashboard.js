async function fetchDashboard() {
  const res = await fetch('/api/dashboard');
  if (res.status === 401) {
    window.location.href = '/';
    return;
  }
  const data = await res.json();
  document.getElementById('sessions').textContent = data.sessions;
  document.getElementById('avg-wpm').textContent = data.averageWpm.toFixed(1);
  document.getElementById('avg-accuracy').textContent = data.averageAccuracy.toFixed(1) + '%';

  const testsStarted = data.history.length;
  const testsCompleted = data.history.length;
  const totalSeconds = data.history.reduce((sum, r) => sum + r.duration_seconds, 0);

  document.getElementById('tests-started').textContent = testsStarted;
  document.getElementById('tests-completed').textContent = testsCompleted;
  document.getElementById('time-typing').textContent = formatDuration(totalSeconds);

  const tbody = document.getElementById('history-body');
  tbody.innerHTML = '';
  data.history.forEach((r) => {
    const tr = document.createElement('tr');
    const date = new Date(r.created_at);
    tr.innerHTML = `
      <td>${date.toLocaleString()}</td>
      <td>${r.duration_seconds}s</td>
      <td>${r.wpm.toFixed(1)}</td>
      <td>${r.accuracy.toFixed(1)}%</td>
      <td><a href="/result.html?id=${r.id}" class="btn btn-sm btn-outline-secondary">View</a></td>
    `;
    tbody.appendChild(tr);
  });
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

document.getElementById('logout-btn').addEventListener('click', logout);

fetchDashboard();
