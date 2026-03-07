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
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscription_ids } = await req.json();
  if (!Array.isArray(subscription_ids) || subscription_ids.length === 0) {
    return NextResponse.json({ error: "Selection required" }, { status: 400 });
  }

  const db = getDb();
  const token = crypto.randomBytes(16).toString("hex");
  const userId = (session.user as any).id;

  // 1. Create the shared link record
  const result = db.prepare(`
    INSERT INTO shared_links (user_id, token, active) 
    VALUES (?, ?, 1)
  `).run(userId, token);
  
  const linkId = result.lastInsertRowid;

  // 2. Map the specific subscriptions to this link
  // NOTE: You'll need a table named shared_link_items (link_id, subscription_id)
  const insertStmt = db.prepare(`INSERT INTO shared_link_items (link_id, subscription_id) VALUES (?, ?)`);
  
  const transaction = db.transaction((ids: number[]) => {
    for (const id of ids) insertStmt.run(linkId, id);
  });

  transaction(subscription_ids);

  return NextResponse.json({ token });
}
