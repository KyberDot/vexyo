import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate, renderDbTemplate } from "@/lib/emailTemplate";
import crypto from "crypto";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return { ok: false };
  const db = getDb();
  const u = db.prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any;
  return { ok: u?.role === "admin", session: s };
}

export async function GET(req: NextRequest) {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
  const db = getDb();
  try {
    // Joins the invites table with the users table to get the invited_by_name
    const invites = db.prepare(`
      SELECT i.*, u.name as invited_by_name 
      FROM invites i 
      LEFT JOIN users u ON i.invited_by = u.id 
      ORDER BY i.created_at DESC
    `).all();
    return NextResponse.json(invites);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { ok, session } = await isAdmin();
  if (!ok || !session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const db = getDb();

  // Handle the "Clear Log" action triggered by the button in the UI
  if (body.action === "clear-log") {
    const now = new Date().toISOString().replace("T", " ").split(".")[0];
    db.prepare("DELETE FROM invites WHERE used > 0 OR expires_at < ?").run(now);
    return NextResponse.json({ ok: true });
  }

  const { email } = body;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
  db.prepare("INSERT INTO invites (email, token, invited_by, expires_at) VALUES (?, ?, ?, ?)").run(email, token, (session.user as any).id, expiresAt);

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const invite_url = `${baseUrl}/register?invite=${token}`;
  const mail = getMailTransporter();

  if (mail) {
    try {
      const dbTpl = await renderDbTemplate("invite", { appName: mail.appName, link: invite_url });
      await mail.transporter.sendMail({
        from: mail.from,
        to: email,
        subject: dbTpl?.subject || `You're invited to join ${mail.appName}`,
        html: dbTpl?.html || emailTemplate({
          appName: mail.appName,
          title: "You've been invited!",
          body: `You've been invited to join <strong style="color:#ffffff">${mail.appName}</strong>.`,
          buttonText: "Accept Invitation",
          buttonUrl: invite_url,
        }),
      });
    } catch (e) { console.error(e); }
  }
  return NextResponse.json({ invite_url, token, emailed: !!mail });
}

export async function DELETE(req: NextRequest) {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
  const { id } = await req.json();
  getDb().prepare("DELETE FROM invites WHERE id = ?").run(id);
  
  return NextResponse.json({ ok: true });
}