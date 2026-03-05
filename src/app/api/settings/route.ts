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
  let settings = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId) as any;
  if (!settings) {
    db.prepare("INSERT INTO user_settings (user_id) VALUES (?)").run(userId);
    settings = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId);
  }
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  const fields = ["currency", "theme", "remind_3d", "remind_7d", "remind_14d", "monthly_budget"];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = ?`);
      values.push(typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]);
    }
  }
  if (!updates.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  updates.push("updated_at = datetime('now')");
  values.push(userId);
  db.prepare(`UPDATE user_settings SET ${updates.join(", ")} WHERE user_id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}
