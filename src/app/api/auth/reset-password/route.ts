import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const db = getDb();
    
    // Generate the current time in the exact same format Next.js uses to create it
    const now = new Date().toISOString(); 

    // Use the JavaScript 'now' variable for a perfectly safe string comparison
    const rt = db.prepare(`
      SELECT * FROM password_reset_tokens 
      WHERE token = ? AND used = 0 AND expires_at > ?
    `).get(token, now) as any;

    if (!rt) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);

    // Wrap both updates in a transaction so they both succeed, or neither do
    const performReset = db.transaction(() => {
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, rt.user_id);
      db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(rt.id);
    });

    performReset();

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Password Reset Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}