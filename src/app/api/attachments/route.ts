import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function uid() {
  const s = await getServerSession(authOptions);
  return s?.user ? Number((s.user as any).id) : null;
}

export async function GET(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subId = req.nextUrl.searchParams.get("sub_id");
  const debtId = req.nextUrl.searchParams.get("debt_id");
  const methodId = req.nextUrl.searchParams.get("method_id");
  const db = getDb();
  let rows: any[];
  if (subId) rows = db.prepare("SELECT id, name, mime_type, size, created_at FROM attachments WHERE user_id = ? AND sub_id = ?").all(userId, subId);
  else if (debtId) rows = db.prepare("SELECT id, name, mime_type, size, created_at FROM attachments WHERE user_id = ? AND debt_id = ?").all(userId, debtId);
  else if (methodId) rows = db.prepare("SELECT id, name, mime_type, size, created_at FROM attachments WHERE user_id = ? AND method_id = ?").all(userId, methodId);
  else rows = [];
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sub_id, debt_id, method_id, name, mime_type, data, size } = await req.json();
  if (!name || !data) return NextResponse.json({ error: "Name and data required" }, { status: 400 });
  const db = getDb();
  const r = db.prepare(
    "INSERT INTO attachments (user_id, sub_id, debt_id, method_id, name, mime_type, data, size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, sub_id || null, debt_id || null, method_id || null, name, mime_type || "application/octet-stream", data, size || 0);
  return NextResponse.json({ id: r.lastInsertRowid, name, mime_type, size, created_at: new Date().toISOString() }, { status: 201 });
}
