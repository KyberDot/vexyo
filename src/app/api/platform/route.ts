import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const p = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get();
  return NextResponse.json(p || {});
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get((session.user as any).id) as any;
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const fields = ["app_name", "logo", "primary_color", "allow_registration"];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = ?`);
      values.push(typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]);
    }
  }
  if (updates.length) {
    updates.push("updated_at = datetime('now')");
    db.prepare(`UPDATE platform_settings SET ${updates.join(", ")} WHERE id = 1`).run(...values);
  }
  return NextResponse.json({ ok: true });
}
