import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate, renderDbTemplate } from "@/lib/emailTemplate";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const db = getDb();
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;

    // If the user exists, generate the token and send the email
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      // FIXED: Insert into the correct password_reset_tokens table
      db.prepare(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
        VALUES (?, ?, ?, 0)
      `).run(user.id, token, expiresAt);

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const link = `${baseUrl}/reset-password?token=${token}`;
      const mail = getMailTransporter();

      if (mail) {
        try {
          const dbTpl = await renderDbTemplate("password_reset", { appName: mail.appName, link });
          await mail.transporter.sendMail({
            from: mail.from,
            to: email,
            subject: dbTpl?.subject || `Reset your ${mail.appName} password`,
            html: dbTpl?.html || emailTemplate({
              appName: mail.appName,
              title: "Reset your password",
              body: "Click below to reset your password. This link expires in 1 hour.",
              buttonText: "Reset Password",
              buttonUrl: link,
            }),
          });
        } catch (err) {
          console.error("Mail error:", err);
        }
      }
    }
    
    // We always return "ok: true" even if the email doesn't exist. 
    // This is a crucial security practice so hackers can't use this form to guess which emails are registered on your site.
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Password Reset Request Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}