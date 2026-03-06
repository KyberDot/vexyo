import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function uid() {
  const s = await getServerSession(authOptions);
  return s?.user ? Number((s.user as any).id) : null;
}

export async function GET() {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  let ns = db.prepare("SELECT * FROM notification_settings WHERE user_id = ?").get(userId) as any;
  if (!ns) {
    db.prepare("INSERT INTO notification_settings (user_id) VALUES (?)").run(userId);
    ns = db.prepare("SELECT * FROM notification_settings WHERE user_id = ?").get(userId);
  }
  return NextResponse.json(ns);
}

export async function PATCH(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  const fields = ["email_enabled","push_enabled","remind_1d","remind_3d","remind_7d","remind_14d","renewal_alerts","price_change_alerts","trial_end_alerts","budget_alerts","overdue_alerts","weekly_digest","monthly_report"];
  const updates: string[] = []; const values: any[] = [];
  for (const f of fields) {
    if (f in body) { updates.push(`${f} = ?`); values.push(typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]); }
  }
  if (!updates.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  updates.push("updated_at = datetime('now')"); values.push(userId);
  db.prepare(`UPDATE notification_settings SET ${updates.join(", ")} WHERE user_id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}
