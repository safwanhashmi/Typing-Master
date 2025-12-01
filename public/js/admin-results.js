let adminHistory = [];

function renderAdminResults(rows) {
  const tbody = document.getElementById('admin-results-body');
  tbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    const date = new Date(r.created_at);
    tr.innerHTML = `
      <td>${r.username}</td>
      <td>${date.toLocaleString()}</td>
      <td>${r.duration_seconds}s</td>
      <td>${r.wpm.toFixed(1)}</td>
      <td>${r.accuracy.toFixed(1)}%</td>
      <td><a href="/result.html?id=${r.id}" class="btn btn-sm btn-outline-secondary">View</a></td>
    `;
    tbody.appendChild(tr);
  });
}

async function fetchAdminResults() {
  const res = await fetch('/api/admin/results');
  if (res.status === 401 || res.status === 403) {
    window.location.href = '/examiner-login.html';
    return;
  }
  const data = await res.json();
  adminHistory = data.history || [];
  renderAdminResults(adminHistory);
}

function applyFilters() {
  const username = document.getElementById('filter-username').value.trim().toLowerCase();
  const fromStr = document.getElementById('filter-from').value;
  const toStr = document.getElementById('filter-to').value;
  const minWpm = Number(document.getElementById('filter-min-wpm').value);

  const fromTs = fromStr ? new Date(fromStr + 'T00:00:00').getTime() : null;
  const toTs = toStr ? new Date(toStr + 'T23:59:59').getTime() : null;

  const filtered = adminHistory.filter((r) => {
    if (username && !r.username.toLowerCase().includes(username)) return false;
    const ts = new Date(r.created_at).getTime();
    if (fromTs && ts < fromTs) return false;
    if (toTs && ts > toTs) return false;
    if (!Number.isNaN(minWpm) && minWpm > 0 && r.wpm < minWpm) return false;
    return true;
  });

  renderAdminResults(filtered);
}

function downloadCsv() {
  const table = document.getElementById('admin-results-table');
  let csv = [];
  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    const cols = row.querySelectorAll('th, td');
    const values = [];
    cols.forEach((c) => {
      let text = c.innerText.replace(/"/g, '""');
      values.push(`"${text}"`);
    });
    csv.push(values.join(','));
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'typing-results.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

fetchAdminResults();

document.getElementById('download-csv-btn').addEventListener('click', downloadCsv);

document.getElementById('print-table-btn').addEventListener('click', () => window.print());

document.getElementById('logout-btn').addEventListener('click', logout);

document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
