import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  return NextResponse.json(db.prepare("SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, label").all(userId));
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { label, type, last4, brand, icon, account_type, currency, balance, is_default } = await req.json();
  if (!label) return NextResponse.json({ error: "Label required" }, { status: 400 });
  const db = getDb();
  if (is_default) db.prepare("UPDATE payment_methods SET is_default = 0 WHERE user_id = ?").run(userId);
  const r = db.prepare("INSERT INTO payment_methods (user_id, label, type, last4, brand, icon, account_type, currency, balance, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(userId, label, type || "card", last4 || null, brand || null, icon || null, account_type || "other", currency || "USD", Number(balance) || 0, is_default ? 1 : 0);
  return NextResponse.json(db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
}
