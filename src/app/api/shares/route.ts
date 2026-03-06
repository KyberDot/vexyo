import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import crypto from "crypto";

async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  return NextResponse.json(db.prepare("SELECT * FROM shared_links WHERE user_id = ? AND active = 1 ORDER BY created_at DESC").all(userId));
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { label } = await req.json();
  const token = crypto.randomBytes(24).toString("base64url");
  const db = getDb();
  // Store sharer's currency in the link
  const settings = db.prepare("SELECT currency FROM user_settings WHERE user_id = ?").get(userId) as any;
  const currency = settings?.currency || "USD";
  const r = db.prepare("INSERT INTO shared_links (user_id, token, label, currency) VALUES (?, ?, ?, ?)").run(userId, token, label || "Shared", currency);
  return NextResponse.json(db.prepare("SELECT * FROM shared_links WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
}
