async function fetchAdminSummary() {
  const res = await fetch('/api/admin/summary');
  if (res.status === 401 || res.status === 403) {
    window.location.href = '/examiner-login.html';
    return;
  }
  const data = await res.json();
  const summary = data.summary || {};
  document.getElementById('admin-total-tests').textContent = summary.totalTests || 0;
  document.getElementById('admin-unique-users').textContent = summary.uniqueUsers || 0;
  document.getElementById('admin-avg-wpm').textContent = summary.avgWpm ? summary.avgWpm.toFixed(1) : 0;
  document.getElementById('admin-avg-accuracy').textContent = summary.avgAccuracy ? summary.avgAccuracy.toFixed(1) + '%' : '0%';

  const perUser = data.perUser || [];
  const tbody = document.getElementById('admin-peruser-body');
  tbody.innerHTML = '';
  perUser.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.username}</td>
      <td>${row.tests}</td>
      <td>${row.avgWpm.toFixed(1)}</td>
      <td>${row.avgAccuracy.toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

fetchAdminSummary();

document.getElementById('logout-btn').addEventListener('click', logout);
