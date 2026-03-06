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
