import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate, renderDbTemplate } from "@/lib/emailTemplate";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
  if (!user) return NextResponse.json({ ok: true }); // silent - don't reveal if email exists
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
  try { db.prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expires); } catch {}
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${token}`;
  const mail = getMailTransporter();
  if (mail) {
    try {
      await mail.transporter.sendMail({
        from: mail.from, to: email,
        subject: (renderDbTemplate("password_reset", { appName: mail.appName, link }))?.subject || `Reset your ${mail.appName} password`,
        html: (() => { const t = renderDbTemplate("password_reset", { appName: mail.appName, link }); return t?.html || emailTemplate({ appName: mail.appName, title: "Reset your password", body: "Click the button below to reset your password. This link expires in 1 hour.", buttonText: "Reset Password", buttonUrl: link }); })(),
      });
      return NextResponse.json({ ok: true, sent: true });
    } catch {}
  }
  return NextResponse.json({ ok: true, sent: false });
}
