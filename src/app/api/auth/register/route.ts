import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("invite");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });
  const db = getDb();
  const invite = db.prepare("SELECT * FROM invites WHERE token = ? AND used = 0").get(token) as any;
  if (!invite) return NextResponse.json({ error: "Invalid or used invite" }, { status: 404 });
  return NextResponse.json({ email: invite.email, valid: true });
}

export async function POST(req: NextRequest) {
  const { name, email, password, invite_token } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  const db = getDb();
  const platform = db.prepare("SELECT allow_registration FROM platform_settings WHERE id = 1").get() as any;
  if (!platform?.allow_registration && !invite_token) return NextResponse.json({ error: "Registration is currently closed" }, { status: 403 });
  if (invite_token) {
    const invite = db.prepare("SELECT * FROM invites WHERE token = ? AND used = 0").get(invite_token) as any;
    if (!invite) return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
    if (invite.email.toLowerCase() !== email.toLowerCase()) return NextResponse.json({ error: "This invite is for a different email address" }, { status: 400 });
    db.prepare("UPDATE invites SET used = 1 WHERE token = ?").run(invite_token);
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
  const hash = await bcrypt.hash(password, 12);
  const r = db.prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)").run(email, name || email.split("@")[0], hash);
  db.prepare("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)").run(r.lastInsertRowid);
  return NextResponse.json({ ok: true });
}
