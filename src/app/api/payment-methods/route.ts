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
  const methods = db.prepare("SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, label").all(userId) as any[];
  return NextResponse.json(methods.map(m => ({
    ...m,
    attachments: m.attachments ? JSON.parse(m.attachments) : []
  })));
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const {
    label, type, last4, brand, icon, account_type,
    currency, balance_currency, balance, is_default, attachments,
    credit_limit, bnpl_limit, bnpl_flexible, bnpl_owed, bnpl_paid, member_id,
  } = await req.json();
  if (!label) return NextResponse.json({ error: "Label required" }, { status: 400 });
  const db = getDb();
  if (is_default) db.prepare("UPDATE payment_methods SET is_default = 0 WHERE user_id = ?").run(userId);
  const r = db.prepare(`
    INSERT INTO payment_methods (
      user_id, label, type, last4, brand, icon,
      account_type, currency, balance_currency, balance, is_default, attachments,
      credit_limit, bnpl_limit, bnpl_flexible, bnpl_owed, bnpl_paid, member_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, label, type || "card", last4 || null, brand || null, icon || null,
    account_type || "other",
    currency || "USD",
    balance_currency || currency || "USD",
    Number(balance) || 0,
    is_default ? 1 : 0,
    attachments ? JSON.stringify(attachments) : "[]",
    credit_limit != null ? Number(credit_limit) : null,
    bnpl_limit != null ? Number(bnpl_limit) : null,
    bnpl_flexible ? 1 : 0,
    bnpl_owed != null ? Number(bnpl_owed) : null,
    bnpl_paid != null ? Number(bnpl_paid) : null,
    member_id || null,
  );
  const m = db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(r.lastInsertRowid) as any;
  return NextResponse.json({ ...m, attachments: m.attachments ? JSON.parse(m.attachments) : [] }, { status: 201 });
}
