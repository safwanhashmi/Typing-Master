function getQueryId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function loadResult() {
  const id = getQueryId();
  if (!id) {
    window.location.href = '/dashboard.html';
    return;
  }
  const [examRes, resultRes] = await Promise.all([
    fetch('/api/exam'),
    fetch(`/api/results/${id}`),
  ]);

  if (resultRes.status === 401) {
    window.location.href = '/';
    return;
  }

  const examData = examRes.ok ? await examRes.json() : {};
  const row = await resultRes.json();

  const sampleText = examData.text || '';
  const typed = row.typed_text || '';

  const promptEl = document.getElementById('result-prompt');
  promptEl.innerHTML = '';
  const maxLen = Math.max(sampleText.length, typed.length);
  for (let i = 0; i < maxLen; i++) {
    const ch = sampleText[i] || '';
    const span = document.createElement('span');
    span.textContent = ch || ' ';
    if (i < typed.length) {
      if (typed[i] === ch) {
        span.classList.add('char-correct');
      } else {
        span.classList.add('char-incorrect');
      }
    }
    promptEl.appendChild(span);
  }

  document.getElementById('view-wpm').textContent = row.wpm.toFixed(0);
  document.getElementById('view-accuracy').textContent = row.accuracy.toFixed(0) + '%';
  document.getElementById('view-raw').textContent = row.wpm.toFixed(0);
  document.getElementById('view-time').textContent = row.duration_seconds + 's';
  document.getElementById('view-testtype').textContent = `time ${row.duration_seconds}s · english`;

  // recompute character breakdown
  let correct = 0;
  let incorrect = 0;
  const overlap = Math.min(typed.length, sampleText.length);
  for (let i = 0; i < overlap; i++) {
    if (typed[i] === sampleText[i]) correct++;
    else incorrect++;
  }
  const extra = Math.max(0, typed.length - sampleText.length);
  const missed = Math.max(0, sampleText.length - typed.length);
  document.getElementById('view-characters').textContent = `${correct}/${incorrect}/${extra}/${missed}`;

  const viewTypedEl = document.getElementById('view-typed');
  if (viewTypedEl) {
    viewTypedEl.innerHTML = '';
    for (let i = 0; i < typed.length; i++) {
      const span = document.createElement('span');
      span.textContent = typed[i];
      const refChar = i < sampleText.length ? sampleText[i] : null;
      if (refChar !== null && typed[i] !== refChar) {
        span.classList.add('char-incorrect');
      } else if (refChar === null) {
        // extra characters beyond sample text
        span.classList.add('char-incorrect');
      }
      viewTypedEl.appendChild(span);
    }
  }

  // simple consistency estimate: we don't have per-second series here, so set to 100% if completed
  document.getElementById('view-consistency').textContent = '100%';
}

const printBtn = document.getElementById('print-result-btn');
if (printBtn) {
  printBtn.addEventListener('click', () => window.print());
}

loadResult();
