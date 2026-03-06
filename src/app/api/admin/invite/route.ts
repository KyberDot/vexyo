import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate, renderDbTemplate } from "@/lib/emailTemplate";
import crypto from "crypto";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return { ok: false, session: null };
  const db = getDb();
  const u = db.prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any;
  return { ok: u?.role === "admin", session: s };
}

export async function GET() {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  // Mark expired invites automatically
  db.prepare("UPDATE invites SET used = 2 WHERE used = 0 AND expires_at IS NOT NULL AND datetime(expires_at) < datetime('now')").run();
  return NextResponse.json(db.prepare(`
    SELECT i.*, u.name as invited_by_name 
    FROM invites i LEFT JOIN users u ON u.id = i.invited_by 
    ORDER BY i.created_at DESC
  `).all());
}

export async function POST(req: NextRequest) {
  const { ok, session } = await isAdmin();
  if (!ok || !session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  // Handle clear-log action
  if (body.action === "clear-log") {
    getDb().prepare("DELETE FROM invites WHERE used != 0").run();
    return NextResponse.json({ ok: true });
  }
  const { email } = body;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
  if (existing) return NextResponse.json({ error: "A user with this email already exists on the platform." }, { status: 409 });
  const pendingInvite = db.prepare("SELECT id FROM invites WHERE email = ? AND used = 0 AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))").get(email) as any;
  if (pendingInvite) return NextResponse.json({ error: "An active invite has already been sent to this email." }, { status: 409 });
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
  db.prepare("INSERT INTO invites (email, token, invited_by, expires_at) VALUES (?, ?, ?, ?)").run(email, token, (session.user as any).id, expiresAt);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const invite_url = `${baseUrl}/register?invite=${token}`;
  const mail = getMailTransporter();
  let emailed = false;
  if (mail) {
    try {
      await mail.transporter.sendMail({
        from: mail.from, to: email,
        subject: `You're invited to join ${mail.appName}`,
html: (() => { const t = renderDbTemplate("invite", { appName: mail.appName, link: invite_url }); return t?.html || emailTemplate({ appName: mail.appName, title: "You've been invited!", body: `You've been invited to join <strong style="color:#ffffff">${mail.appName}</strong>. Click below to create your account. Expires in 3 days.`, buttonText: "Accept Invitation", buttonUrl: invite_url }); })(),
      });
      emailed = true;
    } catch {}
  }
  return NextResponse.json({ invite_url, emailed, token });
}

export async function DELETE(req: NextRequest) {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM invites WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
