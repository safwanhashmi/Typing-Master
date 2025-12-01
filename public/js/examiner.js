async function fetchExam() {
  const res = await fetch('/api/exam');
  if (res.status === 401 || res.status === 403) {
    window.location.href = '/examiner-login.html';
    return;
  }
  const data = await res.json();
  document.getElementById('exam-text').value = data.text || '';
  document.getElementById('exam-duration').value = data.durationSeconds || 1200;
  document.getElementById('exam-allow-retake').checked = data.allowRetake !== false;
  const modeSelect = document.getElementById('exam-accuracy-mode');
  if (modeSelect) {
    modeSelect.value = data.accuracyMode === 'words' ? 'words' : 'chars';
  }
}

async function saveExam(e) {
  e.preventDefault();
  const msg = document.getElementById('exam-message');
  msg.textContent = '';
  const text = document.getElementById('exam-text').value.trim();
  const durationSeconds = Number(document.getElementById('exam-duration').value);
  const allowRetake = document.getElementById('exam-allow-retake').checked;
  const accuracyMode = document.getElementById('exam-accuracy-mode').value === 'words' ? 'words' : 'chars';
  if (!text || !durationSeconds || durationSeconds <= 0) {
    msg.textContent = 'Please provide text and a positive duration in seconds.';
    return;
  }
  const res = await fetch('/api/exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, durationSeconds, allowRetake, accuracyMode }),
  });
  const data = await res.json();
  if (res.ok && data.success) {
    msg.textContent = 'Exam saved.';
    msg.style.color = '#10b981';
  } else {
    msg.textContent = data.error || 'Failed to save exam.';
    msg.style.color = 'red';
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

document.getElementById('exam-form').addEventListener('submit', saveExam);

document.getElementById('logout-btn').addEventListener('click', logout);

fetchExam();
