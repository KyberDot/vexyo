import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  cycle: z.enum(["monthly", "yearly", "weekly", "quarterly"]),
  category: z.string().default("Other"),
  icon: z.string().optional(),
  color: z.string().default("#6366F1"),
  next_date: z.string().optional(),
  member_id: z.number().optional().nullable(),
  notes: z.string().optional(),
  trial: z.boolean().default(false),
  active: z.boolean().default(true),
  payment_method_id: z.number().optional().nullable(),
});

async function getUserId(req: NextRequest): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
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
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.parse(await req.json());
  const db = getDb();
  const r = db.prepare(`
    INSERT INTO subscriptions (user_id, name, amount, currency, cycle, category, icon, color, next_date, member_id, notes, trial, active, payment_method_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, body.name, body.amount, body.currency, body.cycle, body.category, body.icon || null, body.color, body.next_date || null, body.member_id || null, body.notes || null, body.trial ? 1 : 0, body.active ? 1 : 0, body.payment_method_id || null);
  const sub = db.prepare(`
    SELECT s.*, fm.name as member_name, pm.label as payment_method_label
    FROM subscriptions s
    LEFT JOIN family_members fm ON fm.id = s.member_id
    LEFT JOIN payment_methods pm ON pm.id = s.payment_method_id
    WHERE s.id = ?
  `).get(r.lastInsertRowid);
  return NextResponse.json(sub, { status: 201 });
}
