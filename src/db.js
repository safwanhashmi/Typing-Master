const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'typing_master.db');
const db = new sqlite3.Database(dbPath);

function initDb(callback) {
  db.serialize(() => {
    db.run(
      'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)'
    );
    db.run(
      'CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, duration_seconds INTEGER NOT NULL, total_chars INTEGER NOT NULL, correct_chars INTEGER NOT NULL, wpm REAL NOT NULL, accuracy REAL NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id))'
    );
    // Add optional typed_text column for storing full user input (ignore error if it already exists)
    db.run('ALTER TABLE results ADD COLUMN typed_text TEXT', () => {});
    if (callback) callback();
  });
}

module.exports = { db, initDb };
