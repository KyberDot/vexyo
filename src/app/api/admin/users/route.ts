import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return false;
  const db = getDb();
  return (db.prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any)?.role === "admin";
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  return NextResponse.json(db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.active, u.created_at, u.plan_id, u.plan_expires_at, u.avatar,
           sp.name as plan_name
    FROM users u
    LEFT JOIN subscription_plans sp ON sp.id = u.plan_id
    ORDER BY u.created_at DESC
  `).all());
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, plan_id, plan_expires_at, active, role } = await req.json();
  const db = getDb();
  const updates: string[] = [];
  const vals: any[] = [];
  if (plan_id !== undefined) { updates.push("plan_id = ?"); vals.push(plan_id || null); }
  if (plan_expires_at !== undefined) { updates.push("plan_expires_at = ?"); vals.push(plan_expires_at || null); }
  if (active !== undefined) { updates.push("active = ?"); vals.push(active ? 1 : 0); }
  if (role !== undefined) { updates.push("role = ?"); vals.push(role); }
  if (!updates.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...vals, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const db = getDb();
  // Prevent deleting the only admin
  const admins = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'").get() as any;
  const target = db.prepare("SELECT role FROM users WHERE id = ?").get(id) as any;
  if (target?.role === "admin" && admins.cnt <= 1) return NextResponse.json({ error: "Cannot delete the only admin account" }, { status: 400 });
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
