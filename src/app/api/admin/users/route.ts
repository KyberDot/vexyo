import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const db = getDb();
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get((session.user as any).id) as any;
  if (user?.role !== "admin") return null;
  return Number((session.user as any).id);
}

export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.avatar, u.role, u.active, u.created_at,
      COUNT(s.id) as sub_count
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, role, active } = await req.json();
  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });
  const db = getDb();
  const updates: string[] = [];
  const values: any[] = [];
  if (role !== undefined) { updates.push("role = ?"); values.push(role); }
  if (active !== undefined) { updates.push("active = ?"); values.push(active ? 1 : 0); }
  if (!updates.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  if (id === adminId) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
