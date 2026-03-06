import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import path from "path";
import fs from "fs";

const BACKUP_DIR = process.env.BACKUP_PATH || "/data/backups";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const backup = db.prepare("SELECT * FROM backups WHERE id = ? AND user_id = ?").get(params.id, userId) as any;
  if (!backup) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const filePath = path.join(BACKUP_DIR, backup.filename);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "File not found" }, { status: 404 });
  const content = fs.readFileSync(filePath, "utf8");
  return new NextResponse(content, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${backup.filename}"`,
    },
  });
}
