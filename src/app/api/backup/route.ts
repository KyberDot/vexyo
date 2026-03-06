import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import path from "path";
import fs from "fs";

const BACKUP_DIR = process.env.BACKUP_PATH || "/data/backups";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const backups = db.prepare("SELECT * FROM backups WHERE user_id = ? ORDER BY created_at DESC").all(userId);
  return NextResponse.json(backups);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();

  // Create backup data
  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    subscriptions: db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").all(userId),
    bills: db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND type = 'bill'").all(userId),
    debts: db.prepare("SELECT * FROM debts WHERE user_id = ?").all(userId),
    payment_methods: db.prepare("SELECT * FROM payment_methods WHERE user_id = ?").all(userId),
    categories: db.prepare("SELECT * FROM user_categories WHERE user_id = ?").all(userId),
    family_members: db.prepare("SELECT * FROM family_members WHERE user_id = ?").all(userId),
    settings: db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId),
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `backup_user${userId}_${Date.now()}.json`;
  const size = Buffer.byteLength(json, "utf8");

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(path.join(BACKUP_DIR, filename), json, "utf8");

  const r = db.prepare("INSERT INTO backups (user_id, filename, size) VALUES (?, ?, ?)").run(userId, filename, size);
  return NextResponse.json({ id: r.lastInsertRowid, filename, size, created_at: new Date().toISOString() }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const db = getDb();
  const backup = db.prepare("SELECT * FROM backups WHERE id = ? AND user_id = ?").get(id, userId) as any;
  if (!backup) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const filePath = path.join(BACKUP_DIR, backup.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
  db.prepare("DELETE FROM backups WHERE id = ? AND user_id = ?").run(id, userId);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  let data;

  // Determine if we are restoring an existing ID or a JSON upload
  if (body.action === "restore" && body.id) {
    const backup = db.prepare("SELECT * FROM backups WHERE id = ? AND user_id = ?").get(body.id, userId) as any;
    if (!backup) return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    const filePath = path.join(BACKUP_DIR, backup.filename);
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: "File missing" }, { status: 404 });
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } else if (body.action === "upload" && body.data) {
    data = body.data;
  } else {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!data || data.version !== 1) return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });

  // Use a database transaction to safely wipe and restore
  db.transaction(() => {
    // 1. Wipe current user data
    db.prepare("DELETE FROM subscriptions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM debts WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM payment_methods WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_categories WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM family_members WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_settings WHERE user_id = ?").run(userId);

    // 2. Dynamic bulk-insert function
    const insertObjects = (table: string, items: any[]) => {
      if (!items || !items.length) return;
      // Extract columns dynamically from the JSON object
      const columns = Object.keys(items[0]).filter(k => k !== 'user_id'); 
      columns.push('user_id'); // We force the user_id to prevent hijacking
      
      const placeholders = columns.map(c => `@${c}`).join(', ');
      const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
      
      for (const item of items) {
        try { stmt.run({ ...item, user_id: userId }); } catch(e) { /* Ignore dupe constraints */ }
      }
    };

    // 3. Restore everything
    insertObjects("subscriptions", data.subscriptions || []);
    insertObjects("subscriptions", data.bills || []);
    insertObjects("debts", data.debts || []);
    insertObjects("payment_methods", data.payment_methods || []);
    insertObjects("user_categories", data.categories || []);
    insertObjects("family_members", data.family_members || []);

    if (data.settings) {
      const stmt = db.prepare("INSERT INTO user_settings (user_id, currency, theme, remind_3d, remind_7d, remind_14d, monthly_budget, date_format, week_start, language, updated_at) VALUES (@user_id, @currency, @theme, @remind_3d, @remind_7d, @remind_14d, @monthly_budget, @date_format, @week_start, @language, @updated_at)");
      try { stmt.run({ ...data.settings, user_id: userId }); } catch(e) {}
    }
  })();

  return NextResponse.json({ ok: true });
}