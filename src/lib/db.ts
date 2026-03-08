import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_PATH || "/data";
const DB_FILE = path.join(DB_DIR, "vexyo.db");
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
    CREATE TABLE IF NOT EXISTS payment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sub_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      amount REAL,
      currency TEXT DEFAULT 'USD',
      paid_at TEXT DEFAULT (datetime('now')),
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sub_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
      debt_id INTEGER,
      method_id INTEGER,
      name TEXT NOT NULL,
      mime_type TEXT,
      data TEXT NOT NULL,
      size INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      paid REAL DEFAULT 0,
      icon TEXT,
      color TEXT DEFAULT '#EF4444',
      member_id INTEGER,
      company TEXT,
      due_date TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      term TEXT DEFAULT 'short',
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
      icon TEXT,
      account_type TEXT DEFAULT 'other',
      currency TEXT DEFAULT 'USD',
      balance REAL DEFAULT 0,
      balance_currency TEXT DEFAULT 'USD',
      member_id INTEGER,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sub_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
      type TEXT DEFAULT 'renewal',
      title TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notification_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email_enabled INTEGER DEFAULT 0,
      push_enabled INTEGER DEFAULT 1,
      remind_1d INTEGER DEFAULT 1,
      remind_3d INTEGER DEFAULT 1,
      remind_7d INTEGER DEFAULT 1,
      remind_14d INTEGER DEFAULT 0,
      renewal_alerts INTEGER DEFAULT 1,
      price_change_alerts INTEGER DEFAULT 1,
      trial_end_alerts INTEGER DEFAULT 1,
      budget_alerts INTEGER DEFAULT 1,
      overdue_alerts INTEGER DEFAULT 1,
      weekly_digest INTEGER DEFAULT 0,
      monthly_report INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT DEFAULT 'USD',
      theme TEXT DEFAULT 'dark',
      remind_3d INTEGER DEFAULT 0,
      remind_7d INTEGER DEFAULT 1,
      remind_14d INTEGER DEFAULT 0,
      monthly_budget REAL DEFAULT 0,
      date_format TEXT DEFAULT 'MMM D, YYYY',
      week_start TEXT DEFAULT 'monday',
      language TEXT DEFAULT 'en',
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS user_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      color TEXT DEFAULT '#6366F1',
      budget REAL DEFAULT 0,
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
    CREATE TABLE IF NOT EXISTS magic_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      invited_by INTEGER REFERENCES users(id),
      used INTEGER DEFAULT 0,
      expires_at TEXT DEFAULT (datetime('now', '+3 days')),
      created_at TEXT DEFAULT (datetime('now'))
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
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      max_subscriptions INTEGER DEFAULT -1,
      max_bills INTEGER DEFAULT -1,
      max_family_members INTEGER DEFAULT -1,
      can_use_analytics INTEGER DEFAULT 1,
      can_use_ai INTEGER DEFAULT 1,
      can_export INTEGER DEFAULT 1,
      can_use_attachments INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS exchange_rate_cache (
      id INTEGER PRIMARY KEY DEFAULT 1,
      rates_json TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shared_link_items (
      link_id INTEGER NOT NULL,
      subscription_id INTEGER NOT NULL,
      PRIMARY KEY (link_id, subscription_id),
      FOREIGN KEY (link_id) REFERENCES shared_links(id) ON DELETE CASCADE,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
    );
  `);

  const alters = [
    `ALTER TABLE users ADD COLUMN avatar TEXT`,
    `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`,
    `ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1`,
    `ALTER TABLE users ADD COLUMN plan_id INTEGER`,
    `ALTER TABLE users ADD COLUMN plan_expires_at TEXT`,
    `ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'`,
    `ALTER TABLE subscriptions ADD COLUMN member_id INTEGER`,
    `ALTER TABLE subscriptions ADD COLUMN payment_method_id INTEGER`,
    `ALTER TABLE subscriptions ADD COLUMN type TEXT DEFAULT 'subscription'`,
    `ALTER TABLE subscriptions ADD COLUMN remind_1d INTEGER DEFAULT 0`,
    `ALTER TABLE subscriptions ADD COLUMN remind_3d INTEGER DEFAULT 0`,
    `ALTER TABLE subscriptions ADD COLUMN remind_7d INTEGER DEFAULT 0`,
    `ALTER TABLE subscriptions ADD COLUMN remind_14d INTEGER DEFAULT 0`,
    `ALTER TABLE user_settings ADD COLUMN monthly_budget REAL DEFAULT 0`,
    `ALTER TABLE user_settings ADD COLUMN date_format TEXT DEFAULT 'MMM D, YYYY'`,
    `ALTER TABLE user_settings ADD COLUMN week_start TEXT DEFAULT 'monday'`,
    `ALTER TABLE user_settings ADD COLUMN language TEXT DEFAULT 'en'`,
    `ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'renewal'`,
    `ALTER TABLE notifications ADD COLUMN title TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE platform_settings ADD COLUMN favicon TEXT`,
    `ALTER TABLE platform_settings ADD COLUMN magic_link_enabled INTEGER DEFAULT 0`,
    `ALTER TABLE platform_settings ADD COLUMN mail_host TEXT`,
    `ALTER TABLE platform_settings ADD COLUMN mail_port INTEGER DEFAULT 587`,
    `ALTER TABLE platform_settings ADD COLUMN mail_user TEXT`,
    `ALTER TABLE platform_settings ADD COLUMN mail_pass TEXT`,
    `ALTER TABLE platform_settings ADD COLUMN mail_from TEXT`,
    `ALTER TABLE platform_settings ADD COLUMN mail_secure INTEGER DEFAULT 0`,
    `ALTER TABLE platform_settings ADD COLUMN app_url TEXT`,
    `ALTER TABLE payment_methods ADD COLUMN icon TEXT`,
    `ALTER TABLE payment_methods ADD COLUMN member_id INTEGER`,
    `ALTER TABLE payment_methods ADD COLUMN account_type TEXT DEFAULT 'other'`,
    `ALTER TABLE payment_methods ADD COLUMN currency TEXT DEFAULT 'USD'`,
    `ALTER TABLE payment_methods ADD COLUMN balance REAL DEFAULT 0`,
    `ALTER TABLE payment_methods ADD COLUMN balance_currency TEXT DEFAULT 'USD'`,
    `ALTER TABLE payment_methods ADD COLUMN attachments TEXT`,
    `ALTER TABLE notification_settings ADD COLUMN overdue_alerts INTEGER DEFAULT 1`,
    `ALTER TABLE invites ADD COLUMN expires_at TEXT`,
    `ALTER TABLE shared_links ADD COLUMN currency TEXT`,
    `ALTER TABLE attachments ADD COLUMN method_id INTEGER`,
    `ALTER TABLE attachments ADD COLUMN debt_id INTEGER`,
    `ALTER TABLE debts ADD COLUMN term TEXT DEFAULT 'short'`,
	`ALTER TABLE subscriptions ADD COLUMN direct_debit INTEGER DEFAULT 0`,
	`ALTER TABLE payment_methods ADD COLUMN credit_limit REAL`,
    `ALTER TABLE payment_methods ADD COLUMN bnpl_owed REAL DEFAULT 0`,
    `ALTER TABLE payment_methods ADD COLUMN bnpl_paid REAL DEFAULT 0`,
	`ALTER TABLE payment_methods ADD COLUMN bnpl_limit REAL`,
    `ALTER TABLE payment_methods ADD COLUMN bnpl_flexible INTEGER DEFAULT 0`,
  ];
  for (const sql of alters) { try { db.exec(sql); } catch {} }
}
