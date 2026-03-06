import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate } from "@/lib/emailTemplate";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!checkRateLimit(`magic:${email}`, 3, 10 * 60 * 1000)) return NextResponse.json({ error: "Too many requests. Please wait before trying again." }, { status: 429 });
  const db = getDb();
  const platform = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get() as any;
  if (!platform?.magic_link_enabled) return NextResponse.json({ error: "Magic link login is not enabled" }, { status: 403 });
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
  db.prepare("INSERT INTO magic_tokens (email, token, expires_at) VALUES (?, ?, ?)").run(email, token, expires);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/login?magic=${token}`;
  const mail = getMailTransporter();
  if (mail) {
    try {
      await mail.transporter.sendMail({
        from: mail.from, to: email,
        subject: `Sign in to ${mail.appName}`,
        html: emailTemplate({
          appName: mail.appName,
          title: "Sign in to your account",
          body: "Click the button below to sign in to your account. This link is valid for 15 minutes and can only be used once.",
          buttonText: "Sign In Now",
          buttonUrl: link,
          footer: `Sent to ${email} · If you didn't request this, you can safely ignore it.`,
        }),
      });
      return NextResponse.json({ ok: true, sent: true });
    } catch (e: any) {
      // NEVER expose the link to the user - just show error
      return NextResponse.json({ ok: false, error: "Failed to send email. Please try password login or contact your administrator." }, { status: 500 });
    }
  }
  // No mail configured - admin only mode, don't expose link to end users
  return NextResponse.json({ ok: false, error: "Email service not configured. Please contact your administrator." }, { status: 503 });
}
