import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_PATH || "/data";
const DB_FILE = path.join(DB_DIR, "vexyo.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

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
  // 1. Initial Table Creation (The Baseline)
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
      type TEXT DEFAULT 'subscription',
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
      remind_1d INTEGER DEFAULT 0,
      remind_3d INTEGER DEFAULT 0,
      remind_7d INTEGER DEFAULT 0,
      remind_14d INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      invited_by TEXT, 
      used INTEGER DEFAULT 0,
      expires_at TEXT DEFAULT (datetime('now', '+3 days')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      app_name TEXT DEFAULT 'Vexyo',
      logo TEXT,
      favicon TEXT,
      primary_color TEXT DEFAULT '#6366F1',
      allow_registration INTEGER DEFAULT 1,
      magic_link_enabled INTEGER DEFAULT 0,
      mail_host TEXT,
      mail_port INTEGER DEFAULT 587,
      mail_user TEXT,
      mail_pass TEXT,
      mail_from TEXT,
      mail_secure INTEGER DEFAULT 0,
      app_url TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO platform_settings (id) VALUES (1);
  `);

  // 2. Progressive Enhancements (Alters)
  // We wrap these in a loop with individual try/catch to ensure one failure doesn't stop others
  const alters = [
    "ALTER TABLE users ADD COLUMN avatar TEXT",
    "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
    "ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1",
    "ALTER TABLE subscriptions ADD COLUMN member_id INTEGER",
    "ALTER TABLE subscriptions ADD COLUMN payment_method_id INTEGER",
    "ALTER TABLE subscriptions ADD COLUMN type TEXT DEFAULT 'subscription'",
    "ALTER TABLE subscriptions ADD COLUMN remind_1d INTEGER DEFAULT 0",
    "ALTER TABLE subscriptions ADD COLUMN remind_3d INTEGER DEFAULT 0",
    "ALTER TABLE subscriptions ADD COLUMN remind_7d INTEGER DEFAULT 0",
    "ALTER TABLE subscriptions ADD COLUMN remind_14d INTEGER DEFAULT 0",
    "ALTER TABLE platform_settings ADD COLUMN favicon TEXT",
    "ALTER TABLE platform_settings ADD COLUMN magic_link_enabled INTEGER DEFAULT 0",
    "ALTER TABLE platform_settings ADD COLUMN mail_host TEXT",
    "ALTER TABLE platform_settings ADD COLUMN mail_port INTEGER DEFAULT 587",
    "ALTER TABLE platform_settings ADD COLUMN mail_user TEXT",
    "ALTER TABLE platform_settings ADD COLUMN mail_pass TEXT",
    "ALTER TABLE platform_settings ADD COLUMN mail_from TEXT",
    "ALTER TABLE platform_settings ADD COLUMN mail_secure INTEGER DEFAULT 0",
    "ALTER TABLE platform_settings ADD COLUMN app_url TEXT",
    "ALTER TABLE users ADD COLUMN plan_id INTEGER",
    "ALTER TABLE users ADD COLUMN plan_expires_at TEXT"
  ];

  for (const sql of alters) {
    try {
      db.exec(sql);
    } catch (e) {
      // Ignore "duplicate column" errors
    }
  }

  // 3. CRITICAL: Explicit check for invites table schema
  // This ensures your API route doesn't crash even if the loop above skipped it
  const inviteCols = db.prepare("PRAGMA table_info(invites)").all() as any[];
  const hasExpiresAt = inviteCols.some(c => c.name === 'expires_at');
  
  if (!hasExpiresAt) {
    try {
      db.exec("ALTER TABLE invites ADD COLUMN expires_at TEXT DEFAULT (datetime('now', '+3 days'))");
      console.log("Successfully migrated invites table: added expires_at column.");
    } catch (e) {
      console.error("Critical Migration Error: Could not add expires_at to invites table.", e);
    }
  }
}