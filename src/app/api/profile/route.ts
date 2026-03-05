import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const user = db.prepare("SELECT id, email, name, avatar, role, created_at FROM users WHERE id = ?").get((session.user as any).id);
  return NextResponse.json(user || {});
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((session.user as any).id);
  const body = await req.json();
  const db = getDb();
  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) { updates.push("name = ?"); values.push(body.name); }
  if (body.avatar !== undefined) { updates.push("avatar = ?"); values.push(body.avatar); }
  if (body.email) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(body.email, userId);
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    updates.push("email = ?"); values.push(body.email);
  }
  if (body.password) {
    const hash = await bcrypt.hash(body.password, 12);
    updates.push("password_hash = ?"); values.push(hash);
  }

  if (!updates.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  updates.push("updated_at = datetime('now')");
  values.push(userId);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT id, email, name, avatar, role FROM users WHERE id = ?").get(userId);
  return NextResponse.json(updated);
}
