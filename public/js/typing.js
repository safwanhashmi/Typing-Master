let sampleText =
  'The quick brown fox jumps over the lazy dog. Practice makes perfect when learning to type quickly and accurately.';

const promptEl = document.getElementById('prompt');
const typingArea = document.getElementById('typing-area');
const startBtn = document.getElementById('start-btn');
const finishBtn = document.getElementById('finish-btn');
const timeEl = document.getElementById('time');
const resultsEl = document.getElementById('results');
const resultWpmEl = document.getElementById('result-wpm');
const resultAccuracyEl = document.getElementById('result-accuracy');
const resultNetWpmEl = document.getElementById('result-net-wpm');
const resultTyposEl = document.getElementById('result-typos');
const retakeBtn = document.getElementById('retake-btn');
const newTestBtn = document.getElementById('new-test-btn');
const logoutBtn = document.getElementById('logout-btn');
const resultRawEl = document.getElementById('result-raw');
const resultCharsEl = document.getElementById('result-characters');
const resultConsistencyEl = document.getElementById('result-consistency');
const resultTimeEl = document.getElementById('result-time');
const resultChartCanvas = document.getElementById('result-chart');
const timePills = document.querySelectorAll('.topbar-pill-time');
const resultTestTypeEl = document.getElementById('result-testtype');
const printResultBtn = document.getElementById('print-result-btn');
const resultTypedEl = document.getElementById('result-typed');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let startTime = null;
let timerInterval = null;
let isRunning = false;
let typedText = '';
let wpmSeries = [];
let errorSeries = [];
let timeSeries = [];
let lastSecond = 0;
let targetDurationSeconds = 30;
let allowRetake = true;
let isArmed = false; // user clicked Start but hasn't typed yet
let accuracyMode = 'chars';

function renderPrompt() {
  promptEl.innerHTML = '';
  for (let i = 0; i < sampleText.length; i++) {
    const ch = sampleText[i];
    const span = document.createElement('span');
    span.textContent = ch;
    if (typedText.length > i) {
      if (typedText[i] === ch) {
        span.classList.add('char-correct');
      } else {
        span.classList.add('char-incorrect');
      }
    } else if (typedText.length === i && isRunning) {
      span.classList.add('char-current');
    }
    promptEl.appendChild(span);
  }
}

async function loadExam() {
  try {
    const res = await fetch('/api/exam');
    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        sampleText = data.text;
      }
      if (typeof data.durationSeconds === 'number' && data.durationSeconds > 0) {
        targetDurationSeconds = data.durationSeconds;
        timePills.forEach((pill) => {
          const seconds = Number(pill.dataset.seconds || '0');
          pill.classList.toggle('active', seconds === targetDurationSeconds);
        });
      }
      if (typeof data.allowRetake === 'boolean') {
        allowRetake = data.allowRetake;
      }
      if (data.accuracyMode === 'words' || data.accuracyMode === 'chars') {
        accuracyMode = data.accuracyMode;
      }
    }
  } catch (e) {
    // ignore and keep defaults
  } finally {
    if (retakeBtn) {
      retakeBtn.style.display = allowRetake ? '' : 'none';
    }
    if (newTestBtn) {
      newTestBtn.style.display = allowRetake ? '' : 'none';
    }
    if (startBtn) {
      startBtn.style.display = 'none';
    }
    // Automatically arm a new test so user can just start typing
    startTest();
  }
}

loadExam();

function resetTest() {
  typingArea.value = '';
  typedText = '';
  typingArea.disabled = true;
  startTime = null;
  clearInterval(timerInterval);
  timeEl.textContent = '0';
  resultsEl.classList.add('hidden');
  isRunning = false;
   isArmed = false;
  wpmSeries = [];
  errorSeries = [];
  timeSeries = [];
  lastSecond = 0;
  renderPrompt();
}

function startTest() {
  resetTest();
  typingArea.disabled = false;
  typingArea.focus();
  // timer will actually start on first user input
  isArmed = true;
}

function ensureTimerStarted() {
  if (!isArmed || isRunning) return;
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    timeEl.textContent = String(seconds);
    if (seconds >= targetDurationSeconds) {
      finishTest();
      return;
    }
    if (seconds !== lastSecond) {
      lastSecond = seconds;
      const minutesSoFar = seconds / 60 || 1 / 60;
      const wordsSoFar = typedText.trim().length === 0 ? 0 : typedText.trim().split(/\s+/).length;
      const wpmSoFar = wordsSoFar / minutesSoFar;
      let correctSoFar = 0;
      const maxLenSoFar = Math.min(typedText.length, sampleText.length);
      for (let i = 0; i < maxLenSoFar; i++) {
        if (typedText[i] === sampleText[i]) correctSoFar++;
      }
      const errorsSoFar = Math.max(0, typedText.length - correctSoFar);
      timeSeries.push(seconds);
      wpmSeries.push(wpmSoFar);
      errorSeries.push(errorsSoFar);
    }
  }, 250);
  isRunning = true;
}

function finishTest() {
  if (!startTime || !isRunning) {
    return;
  }
  typingArea.disabled = true;
  clearInterval(timerInterval);
  isRunning = false;
  const elapsedSeconds = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
  const typed = typedText;
  let correctChars = 0;
  let incorrectChars = 0;
  const overlapLen = Math.min(typed.length, sampleText.length);
  for (let i = 0; i < overlapLen; i++) {
    if (typed[i] === sampleText[i]) {
      correctChars++;
    } else {
      incorrectChars++;
    }
  }
  const extraChars = Math.max(0, typed.length - sampleText.length);
  const missedChars = Math.max(0, sampleText.length - typed.length);
  const totalChars = typed.length;
  // word-based accuracy option
  const sampleWords = sampleText.trim().length === 0 ? [] : sampleText.trim().split(/\s+/);
  const typedWords = typed.trim().length === 0 ? [] : typed.trim().split(/\s+/);
  const wordOverlap = Math.min(sampleWords.length, typedWords.length);
  let correctWords = 0;
  for (let i = 0; i < wordOverlap; i++) {
    if (typedWords[i] === sampleWords[i]) correctWords++;
  }
  const totalWords = typedWords.length;

  let accuracy;
  if (accuracyMode === 'words') {
    accuracy = totalWords === 0 ? 0 : (correctWords / totalWords) * 100;
  } else {
    accuracy = totalChars === 0 ? 0 : (correctChars / totalChars) * 100;
  }
  const typos = incorrectChars + extraChars + missedChars;
  // WPM is based on correctly typed words only
  const wordsTyped = correctWords;
  const minutes = elapsedSeconds / 60;
  const wpm = minutes === 0 ? 0 : wordsTyped / minutes;
  const netWpm = wpm * (accuracy / 100);

  resultWpmEl.textContent = wpm.toFixed(0);
  resultAccuracyEl.textContent = `${accuracy.toFixed(0)}%`;
  if (resultNetWpmEl) {
    resultNetWpmEl.textContent = netWpm.toFixed(0);
  }
  if (resultTyposEl) {
    resultTyposEl.textContent = typos;
  }
  resultRawEl.textContent = wpm.toFixed(0);
  resultCharsEl.textContent = `${correctChars}/${incorrectChars}/${extraChars}/${missedChars}`;
  resultTimeEl.textContent = `${elapsedSeconds}s`;
  resultTestTypeEl.textContent = `time ${targetDurationSeconds} • english`;
  if (resultTypedEl) {
    resultTypedEl.innerHTML = '';
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
      resultTypedEl.appendChild(span);
    }
  }

  if (wpmSeries.length > 1) {
    const avg = wpmSeries.reduce((s, v) => s + v, 0) / wpmSeries.length;
    const variance =
      wpmSeries.reduce((s, v) => s + (v - avg) * (v - avg), 0) / wpmSeries.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, Math.min(100, 100 - (stdDev / (avg || 1)) * 100));
    resultConsistencyEl.textContent = `${consistency.toFixed(0)}%`;
  } else {
    resultConsistencyEl.textContent = '100%';
  }

  resultsEl.classList.remove('hidden');

  if (resultChartCanvas && typeof Chart !== 'undefined') {
    const ctx = resultChartCanvas.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeSeries,
        datasets: [
          {
            label: 'WPM',
            data: wpmSeries,
            borderColor: '#ffd166',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'Errors',
            data: errorSeries,
            borderColor: '#ff6b6b',
            borderWidth: 1,
            borderDash: [4, 4],
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            position: 'left',
            ticks: { color: '#ffffff' },
            grid: { color: 'rgba(255,255,255,0.1)' },
          },
          y1: {
            position: 'right',
            ticks: { color: '#ff6b6b' },
            grid: { drawOnChartArea: false },
          },
          x: {
            ticks: { color: '#ffffff' },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
        },
      },
    });
  }

  fetch('/api/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      durationSeconds: elapsedSeconds,
      totalChars,
      correctChars,
      wpm,
      accuracy,
      typedText: typed,
    }),
  }).then((res) => {
    if (res.status === 401) {
      window.location.href = '/';
    }
  });
}

// Prevent corrections: block backspace, delete, arrow keys
typingArea.addEventListener('keydown', (e) => {
  // Start timer as soon as the user presses any key in the typing area
  ensureTimerStarted();

  const forbiddenKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (forbiddenKeys.includes(e.key)) {
    e.preventDefault();
  }
});

// If user clicks somewhere else and then types, redirect focus back to typing area
document.addEventListener('keydown', (e) => {
  if (!isArmed && !isRunning) return;
  // ignore shortcuts like Ctrl/Cmd combinations
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.activeElement !== typingArea) {
    typingArea.focus();
  }
});

typingArea.addEventListener('input', () => {
  // Start timer on first actual input after Start
  ensureTimerStarted();
  // Keep input length at most the sample length
  if (typingArea.value.length > sampleText.length) {
    typingArea.value = typingArea.value.slice(0, sampleText.length);
  }
  typedText = typingArea.value;
  renderPrompt();
});

startBtn.addEventListener('click', startTest);
retakeBtn.addEventListener('click', startTest);
newTestBtn.addEventListener('click', startTest);

if (printResultBtn) {
  printResultBtn.addEventListener('click', () => {
    window.print();
  });
}

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

// Full screen toggle
if (fullscreenBtn) {
  const rootEl = document.documentElement;
  function updateFullscreenLabel() {
    fullscreenBtn.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  }

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      if (rootEl.requestFullscreen) rootEl.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', updateFullscreenLabel);
  updateFullscreenLabel();
}
