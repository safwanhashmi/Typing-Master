const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { db, initDb } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'typing-master-secret',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, 'public')));

const examTextPath = path.join(__dirname, 'Exam.txt');
const examConfigPath = path.join(__dirname, 'exam-config.json');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireExaminer(req, res, next) {
  if (!req.session.isExaminer) {
    return res.status(403).json({ error: 'Examiner access only' });
  }
  next();
}

// Auth routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  stmt.run(username, hash, function (err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Username already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }
    req.session.userId = this.lastID;
    res.json({ success: true });
  });
});

// All results for examiner/admin view
app.get('/api/admin/results', requireExaminer, (req, res) => {
  const sql = `
    SELECT r.id, r.user_id, u.username, r.duration_seconds, r.total_chars,
           r.correct_chars, r.wpm, r.accuracy, r.created_at
    FROM results r
    JOIN users u ON r.user_id = u.id
    ORDER BY r.created_at DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ history: rows });
  });
});

// Admin summary analytics
app.get('/api/admin/summary', requireExaminer, (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS totalTests,
      COUNT(DISTINCT user_id) AS uniqueUsers,
      AVG(wpm) AS avgWpm,
      AVG(accuracy) AS avgAccuracy
    FROM results
  `;
  const perUserSql = `
    SELECT u.username,
           COUNT(r.id) AS tests,
           AVG(r.wpm) AS avgWpm,
           AVG(r.accuracy) AS avgAccuracy
    FROM results r
    JOIN users u ON r.user_id = u.id
    GROUP BY r.user_id
    ORDER BY tests DESC
  `;

  db.get(sql, [], (err, summaryRow) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    db.all(perUserSql, [], (err2, perUser) => {
      if (err2) return res.status(500).json({ error: 'Database error' });
      res.json({ summary: summaryRow, perUser });
    });
  });
});

// Exam configuration (text + duration)
app.get('/api/exam', (req, res) => {
  if (!req.session.userId && !req.session.isExaminer) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let text =
    'The quick brown fox jumps over the lazy dog. Practice makes perfect when learning to type quickly and accurately.';
  let durationSeconds = 1200; // default 20 minutes
  let allowRetake = true;
  let accuracyMode = 'chars';

  try {
    if (fs.existsSync(examTextPath)) {
      text = fs.readFileSync(examTextPath, 'utf8');
    }
    if (fs.existsSync(examConfigPath)) {
      const cfg = JSON.parse(fs.readFileSync(examConfigPath, 'utf8'));
      if (typeof cfg.durationSeconds === 'number' && cfg.durationSeconds > 0) {
        durationSeconds = cfg.durationSeconds;
      }
      if (typeof cfg.allowRetake === 'boolean') {
        allowRetake = cfg.allowRetake;
      }
      if (cfg.accuracyMode === 'chars' || cfg.accuracyMode === 'words') {
        accuracyMode = cfg.accuracyMode;
      }
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load exam configuration' });
  }

  res.json({ text, durationSeconds, allowRetake, accuracyMode });
});

app.post('/api/exam', requireExaminer, (req, res) => {
  const { text, durationSeconds, allowRetake, accuracyMode } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Exam text is required' });
  }
  const seconds = Number(durationSeconds);
  if (!seconds || seconds <= 0) {
    return res.status(400).json({ error: 'Valid durationSeconds is required' });
  }

  const mode = accuracyMode === 'words' ? 'words' : 'chars';

  try {
    fs.writeFileSync(examTextPath, text, 'utf8');
    fs.writeFileSync(
      examConfigPath,
      JSON.stringify({ durationSeconds: seconds, allowRetake: !!allowRetake, accuracyMode: mode }),
      'utf8'
    );
  } catch (e) {
    return res.status(500).json({ error: 'Failed to save exam configuration' });
  }

  res.json({ success: true });
});

app.post('/api/examiner-login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'scadmin') {
    req.session.isExaminer = true;
    return res.json({ success: true });
  }
  return res.status(400).json({ error: 'Invalid examiner credentials' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    req.session.userId = user.id;
    res.json({ success: true });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Typing results
app.post('/api/results', requireAuth, (req, res) => {
  const { durationSeconds, totalChars, correctChars, wpm, accuracy, typedText } = req.body;
  const stmt = db.prepare(
    'INSERT INTO results (user_id, duration_seconds, total_chars, correct_chars, wpm, accuracy, created_at, typed_text) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), ?)'
  );
  stmt.run(
    req.session.userId,
    durationSeconds,
    totalChars,
    correctChars,
    wpm,
    accuracy,
    typedText || null,
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    }
  );
});

// Single result for viewing/printing
app.get('/api/results/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  db.get(
    'SELECT * FROM results WHERE id = ? AND user_id = ?',
    [id, req.session.userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Result not found' });
      res.json(row);
    }
  );
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM results WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.session.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      const summary = {
        sessions: rows.length,
        averageWpm:
          rows.length === 0
            ? 0
            : rows.reduce((s, r) => s + r.wpm, 0) / rows.length,
        averageAccuracy:
          rows.length === 0
            ? 0
            : rows.reduce((s, r) => s + r.accuracy, 0) / rows.length,
        history: rows,
      };
      res.json(summary);
    }
  );
});

initDb(() => {
  app.listen(PORT, () => {
    console.log(`Typing Master server running on http://localhost:${PORT}`);
  });
});
