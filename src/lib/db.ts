import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_PATH || "/data";
const DB_FILE = path.join(DB_DIR, "subtrack.db");

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_FILE);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      role TEXT DEFAULT 'user',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      cycle TEXT DEFAULT 'monthly',
      category TEXT DEFAULT 'Other',
      icon TEXT,
      color TEXT DEFAULT '#6366F1',
      next_date TEXT,
      member_id INTEGER,
      notes TEXT,
      trial INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      payment_method_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      avatar TEXT,
      color TEXT DEFAULT '#6366F1',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      type TEXT DEFAULT 'card',
      last4 TEXT,
      brand TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sub_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT DEFAULT 'USD',
      theme TEXT DEFAULT 'dark',
      remind_3d INTEGER DEFAULT 0,
      remind_7d INTEGER DEFAULT 1,
      remind_14d INTEGER DEFAULT 0,
      monthly_budget REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      app_name TEXT DEFAULT 'Nexyo',
      logo TEXT,
      primary_color TEXT DEFAULT '#6366F1',
      allow_registration INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shared_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      label TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO platform_settings (id) VALUES (1);
  `);

  try { db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN member_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN payment_method_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE user_settings ADD COLUMN monthly_budget REAL DEFAULT 0`); } catch {}
}
