import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  if (body.is_default) db.prepare("UPDATE payment_methods SET is_default = 0 WHERE user_id = ?").run(userId);
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of ["label", "type", "last4", "brand", "is_default"]) {
    if (f in body) { updates.push(`${f} = ?`); values.push(typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]); }
  }
  if (!updates.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  values.push(params.id, userId);
  db.prepare(`UPDATE payment_methods SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  return NextResponse.json(db.prepare("SELECT * FROM payment_methods WHERE id = ?").get(params.id));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  db.prepare("DELETE FROM payment_methods WHERE id = ? AND user_id = ?").run(params.id, userId);
  return NextResponse.json({ ok: true });
}
