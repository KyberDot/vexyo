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
  return NextResponse.json(db.prepare("SELECT * FROM family_members WHERE user_id = ? ORDER BY name").all(userId));
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, avatar, color } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const db = getDb();
  const r = db.prepare("INSERT INTO family_members (user_id, name, avatar, color) VALUES (?, ?, ?, ?)").run(userId, name, avatar || null, color || "#6366F1");
  return NextResponse.json(db.prepare("SELECT * FROM family_members WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
}
