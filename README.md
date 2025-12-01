# Typing Master

Full-stack typing exam platform for stenography/office typing tests. Built with **Node.js + Express + SQLite** and a custom **Monkeytype-style** front end.

---

## 1. Features Overview

- **Candidate side (Typing test)**
  - Registration & login with per-user history.
  - Examiner-controlled exam text (multi-page legal/office passages supported).
  - **Autoscrolling prompt**: as the candidate types, the current character stays in view even for very long exam texts.
  - No corrections (backspace, arrows, etc. can be disabled by examiner).
  - Timer starts on the **first key press**, not on page load or button click.
  - Test auto-finishes when time is over; text can be longer than the allocated time.
  - Detailed metrics:
    - WPM (based on correct words only)
    - Accuracy (word-based, using robust word alignment)
    - Characters: correct / incorrect / extra / missed
    - Consistency score based on WPM variance over time
  - Result detail page for each attempt with:
    - Highlighted prompt (correct vs incorrect characters)
    - "What you typed" with mistakes marked
    - Line chart of WPM and error count over time

- **Exam / print support**
  - Prompt area scrolls while typing, but **prints full exam text** in PDF (no clipping).
  - Result printout includes:
    - Candidate name
    - Test start time
    - Test end time
    - Report print time
    - Prompt, stats, graph, and typed text on separate pages for clear evaluation.

- **Examiner / Admin side**
  - Static examiner login: `admin / scadmin`.
  - Exam builder UI to configure:
    - Exam text (stored in `Exam.txt` and served to all candidates)
    - Duration (seconds)
    - Allow/disallow retake
    - Accuracy mode (words/chars) and backspace permission
  - Admin dashboard:
    - Total tests, unique users, average WPM, average accuracy.
    - Per-user aggregate stats table.
  - Admin results:
    - All results across users.
    - Filters: username, date range, minimum WPM.
    - CSV export and print/PDF for record keeping.

---

## 2. Architecture & Tech Stack

- **Backend**
  - Node.js + Express
  - `express-session` for cookie-based sessions
  - REST-style JSON endpoints under `/api/...` (login, exam config, results, admin analytics)

- **Database**
  - SQLite DB file: `typing_master.db`
  - Tables:
    - `users(id, username, password_hash)`
    - `results(id, user_id, duration_seconds, total_chars, correct_chars, wpm, accuracy, created_at, typed_text)`

- **Frontend**
  - Static HTML pages in `/public` (login, dashboard, typing, examiner, admin dashboard, admin results, result view).
  - Styling: **Bootstrap 5** + custom CSS in `public/styles.css`.
  - Charts: **Chart.js** for WPM/error time series.

---

## 3. Installation & Running Locally

From the project root:

### 3.1 Install dependencies

```bash
npm install
```

### 3.2 Start the server

```bash
npm start
```

The server runs at:

```text
http://localhost:3000
```

The Express server serves all static assets from `/public` and exposes the JSON APIs.

---

## 4. User Flow

### 4.1 Candidate login & dashboard

- Open `http://localhost:3000/`.
- Register a new account or log in with an existing username/password.
- After login, the **user dashboard** shows:
  - Basic stats and recent sessions.
  - Links to start a new **Typing test**.

### 4.2 Typing test screen

URL: `http://localhost:3000/typing.html`

- **Prompt area**
  - The exam text is loaded from `/api/exam`.
  - The prompt is rendered character-by-character inside a scrollable shell.
  - As you type, the current character is highlighted and the container scrolls so the active character stays visible.

- **Hidden textarea**
  - The candidate actually types into a visually hidden `<textarea>`.
  - Keystrokes update internal `typedText`, which re-renders the prompt with per-character classes:
    - `char-correct`, `char-incorrect`, `char-current`.

- **Timer behavior**
  - The test is **armed** when the page loads.
  - The timer actually starts on the **first key press** inside the typing area.
  - Time remaining is displayed in the header and the test ends automatically when duration is reached.

- **Restrictions**
  - Backspace, arrows, Home/End, Delete, etc., can be disabled depending on exam configuration (for strict exam mode).
  - Focus is forced back to the typing area if the candidate clicks elsewhere and then types.

---

## 5. Exam Configuration (Examiner)

### 5.1 Examiner login

- Go to `http://localhost:3000/examiner-login.html`.
- Default credentials:
  - Username: `admin`
  - Password: `scadmin`

On success, the examiner can access:

- **Exam builder:** `/examiner.html`
- **Admin dashboard:** `/admin-dashboard.html`
- **All results:** `/admin-results.html`

### 5.2 Exam builder (`/examiner.html`)

Fields:

- **Exam text**
  - Multiline textarea where you paste/type the full passage.
  - Saved to `Exam.txt` on the server.

- **Time limit (seconds)**
  - Any positive integer.
  - Controls the duration of each candidate’s test.

- **Accuracy based on**
  - `Characters` or `Complete words`.

- **Allow retake**
  - If disabled, UI hides the "Retake" / "New test" buttons in the result view.

- **Allow backspace (corrections)**
  - If disabled, backspace does nothing during the test.

Configuration is stored in `exam-config.json` and served via `/api/exam`.

---

## 6. Scoring Logic (WPM, Accuracy, Errors)

Implemented in `public/js/typing.js`.

### 6.1 Character-level stats

- For the overlap between `typedText` and `sampleText`:
  - `correctChars`: same character at the same index.
  - `incorrectChars`: different character at the same index.
- Additional counts:
  - `extraChars`: extra typed characters beyond the sample length.
  - `missedChars`: remaining characters in the sample that weren’t typed.

### 6.2 Word normalization

Before computing accuracy and WPM:

- Collapse all whitespace to single spaces.
- Split into words.
- Normalize each word by:
  - Trimming punctuation at the start/end.
  - Comparing case-insensitively.

### 6.3 Word-level alignment and accuracy

- A **Longest Common Subsequence (LCS)** is computed between prompt words and typed words.
- `correctWords` = LCS length (words correctly typed in order, allowing insertions/deletions).
- `totalWords` = number of non-empty words the candidate typed.
- **Accuracy (%)**:

```text
accuracy = (correctWords / totalWords) * 100
```

### 6.4 WPM and Net WPM

- `elapsedSeconds` = total test duration.
- `minutes = elapsedSeconds / 60`.
- **WPM** is based **only** on correctly typed words:

```text
wpm = correctWords / minutes
```

- **Net WPM** (shown when available) applies the accuracy penalty:

```text
netWpm = wpm * (accuracy / 100)
```

### 6.5 Consistency metric

- During the test, every second the code samples:
  - Words typed so far
  - WPM so far
  - Errors so far
- After the test:
  - Computes mean and standard deviation of WPM samples.
  - Converts this into a **consistency %** (100% = perfectly steady speed).

---

## 7. Results, Printing & PDF

### 7.1 Candidate result view

After finishing a test, the result panel shows:

- WPM and Accuracy.
- Raw WPM, character stats, and consistency.
- A WPM vs Errors line chart (Chart.js).
- "What you typed" with incorrect characters highlighted.

### 7.2 Autoscroll & print behavior for exam text

- While typing, the exam text is displayed inside `.typing-shell` which is scrollable (`max-height: 70vh`).
- The **current character** is tracked and the container scrolls automatically to keep it visible.
- For printing (`@media print`), `.typing-shell` overrides `max-height` and `overflow` so **the full exam text** is printed (no clipping to the scroll viewport).

### 7.3 Timestamps on PDF

On the typing page (`typing.html`), above the prompt you’ll see:

- Candidate name (from `/api/me`).
- Test start time.
- Test end time.
- Report print time.

Behavior:

- Start time is set when the timer starts (first key press).
- End time is set when the test finishes.
- Print time is set immediately before `window.print()` is called.
These values are visible in the UI and on printed/PDF reports.

### 7.4 Print layout

- Prompt page: exam text with incorrect characters highlighted.
- Results page: stats card + graph.
- Typed text page: full user input with mistakes highlighted.

---

## 8. Admin & Analytics

### 8.1 Admin dashboard (`/admin-dashboard.html`)

- Top navbar with:
  - `Exam builder`, `All results`, `Logout` buttons.
- Summary stats:
  - Total tests
  - Unique users
  - Average WPM
  - Average accuracy
- Per-user table with tests count, average WPM, and average accuracy.

### 8.2 Admin results (`/admin-results.html`)

- Full table of all attempts.
- Filters:
  - Username
  - From/to date
  - Minimum WPM
- Actions:
  - Print / PDF (formatted table)
  - Download CSV

Data is served from `/api/admin/results` and `/api/admin/summary` and is only available to examiner sessions.

---

## 9. Data & Storage

- **Database file:** `typing_master.db` in the project root.
- Created and migrated automatically by `src/db.js` on server startup.
- **Exam text:** stored in `Exam.txt` and read on each `/api/exam` request.
- **Exam config:** stored in `exam-config.json`.

Backups: you can safely backup/restore `typing_master.db`, `Exam.txt`, and `exam-config.json` to move between machines.

---

## 10. Deployment Notes

- This is a stateful Node/Express + SQLite app.
- For production hosting use any environment that supports Node.js and persistent storage, e.g.:
  - Render, Fly.io, Railway, VPS, etc.
- Static-only hosts (Netlify, GitHub Pages) are **not** sufficient on their own because the backend APIs and database must run on a server.

Environment variables:

- The current implementation mainly uses defaults:
  - `PORT` (optional) – HTTP port, defaults to `3000`.

If you introduce more secrets (e.g., different admin password), keep them in `.env` and never commit real secrets publicly.

---

## 11. Development Tips

- **Start server:** `npm start`
- **Watch logs:** server logs WPM, accuracy, and any DB errors to the console.
- **Database inspection:** you can open `typing_master.db` with any SQLite viewer.

---

## 12. Author

- **Developer:** Safwan Hashmi

