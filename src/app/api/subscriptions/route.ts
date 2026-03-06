import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().nonnegative().optional().default(0),
  currency: z.string().default("USD"),
  cycle: z.enum(["monthly", "yearly", "weekly", "quarterly", "6-months", "variable"]),
  category: z.string().default("Other"),
  icon: z.string().optional(),
  color: z.string().default("#6366F1"),
  next_date: z.string().optional(),
  member_id: z.number().optional().nullable(),
  notes: z.string().optional(),
  trial: z.boolean().default(false),
  active: z.boolean().default(true),
  payment_method_id: z.number().optional().nullable(),
  type: z.enum(["subscription", "bill"]).default("subscription"),
  remind_1d: z.boolean().default(false),
  remind_3d: z.boolean().default(false),
  remind_7d: z.boolean().default(false),
  remind_14d: z.boolean().default(false),
});

async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const subs = db.prepare(`
    SELECT s.*, fm.name as member_name, pm.label as payment_method_label
    FROM subscriptions s
    LEFT JOIN family_members fm ON fm.id = s.member_id
    LEFT JOIN payment_methods pm ON pm.id = s.payment_method_id
    WHERE s.user_id = ?
    ORDER BY s.name
  `).all(userId);
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.parse(await req.json());
  const db = getDb();
  const r = db.prepare(`
    INSERT INTO subscriptions (user_id, type, name, amount, currency, cycle, category, icon, color, next_date, member_id, notes, trial, active, payment_method_id, remind_1d, remind_3d, remind_7d, remind_14d)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, body.type, body.name, body.amount, body.currency, body.cycle, body.category, body.icon || null, body.color, body.next_date || null, body.member_id || null, body.notes || null, body.trial ? 1 : 0, body.active ? 1 : 0, body.payment_method_id || null, body.remind_1d ? 1 : 0, body.remind_3d ? 1 : 0, body.remind_7d ? 1 : 0, body.remind_14d ? 1 : 0);
  const sub = db.prepare("SELECT s.*, fm.name as member_name, pm.label as payment_method_label FROM subscriptions s LEFT JOIN family_members fm ON fm.id=s.member_id LEFT JOIN payment_methods pm ON pm.id=s.payment_method_id WHERE s.id=?").get(r.lastInsertRowid);
  return NextResponse.json(sub, { status: 201 });
}
