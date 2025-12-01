# Typing Master

A full-stack typing test and exam platform built with Node.js, Express, SQLite, and a custom Monkeytype-like front end.

## Features

- **User side**
  - User registration and login
  - Monkeytype-style typing interface (per-character highlighting, no backspace/corrections)
  - Timer fully controlled by examiner; starts on first key press
  - Test auto-finishes only when time is over
  - Detailed results: WPM, accuracy, characters (correct/incorrect/extra/missed), consistency
  - Results saved in SQLite and visible on a personal dashboard
  - View any past result with:
    - Highlighted prompt (errors marked)
    - Full "what you typed" section with mistakes highlighted
    - Clean print/PDF layout (prompt on page 1, graph/stats on page 2, typed text on page 3)

- **Examiner / Admin side**
  - Static examiner login: `admin / scadmin`
  - Exam builder to set:
    - Exam text (from UI, also stored in `Exam.txt`)
    - Time limit (any positive seconds)
    - Allow/disallow retakes
    - Accuracy mode: **characters** or **complete words**
  - Admin dashboard with analytics:
    - Total tests, unique users, average WPM and accuracy
    - Per-user aggregated stats
  - Admin results page:
    - All users' attempts in a table
    - Filters (username, date range, min WPM)
    - Print / PDF and CSV export

## Tech Stack

- **Backend:** Node.js, Express, express-session
- **Database:** SQLite (file `typing_master.db`)
- **Frontend:** Vanilla HTML/CSS/JS, Bootstrap 5, Chart.js
- **Auth:** Session-based login for users, static credentials for examiner

## Getting Started

### 1. Install dependencies

From the project root:

```bash
npm install
```

### 2. Run the server

```bash
npm start
```

By default the app runs on:

```text
http://localhost:3000
```

### 3. Use the app

- **User login / register:**
  - Open `http://localhost:3000/`
  - Register or log in as a normal user
  - Go to **Typing test** and start typing; timer begins on the first key press

- **Examiner (admin):**
  - Go to `http://localhost:3000/examiner-login.html`
  - Login: `admin` / `scadmin`
  - Set exam text, time limit, accuracy mode, and retake option on `examiner.html`
  - Access admin dashboard: `admin-dashboard.html`
  - Access all results: `admin-results.html`

## Accuracy and WPM logic

- **Accuracy mode** (chosen by examiner):
  - **Characters:**
    - `accuracy = correct_chars / total_typed_chars`
  - **Complete words:**
    - Words are compared position-by-position to the exam text
    - `accuracy = correct_words / total_typed_words`

- **WPM:**
  - Calculated **only from correctly typed words**
  - `wpm = correct_words / minutes_elapsed`

## Printing & PDF

- **Current result** and **past results** can be printed or saved as PDF.
- Layout:
  1. Page 1 – Exam text (prompt) with incorrect chars highlighted
  2. Page 2 – Result card with graph and statistics
  3. Page 3 – "What you typed" with mistakes highlighted

## Notes

- This app is designed for controlled exam environments: no backspace, no arrow keys, and the user cannot change the test duration.
- For production deployment, the Node/Express server must run on a Node-capable host (Render, Fly.io, etc.); static-only hosts like Netlify can serve the front-end but not the APIs without an additional backend.

## Developer

- **Name:** Safwan Hashmi
