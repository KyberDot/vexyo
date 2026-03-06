import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { emailTemplate } from "@/lib/emailTemplate";

function buildDefaults(appName: string, color: string) {
  return [
    {
      name: "magic_link",
      subject: "Sign in to {{appName}}",
      body_html: emailTemplate({ appName, primaryColor: color, title: "Magic Sign-In Link 🔐", body: `Click the button below to securely sign in to your <strong>{{appName}}</strong> account.<br><br>This link is valid for <strong>15 minutes</strong> and can only be used once.`, buttonText: "Sign In Now", buttonUrl: "{{link}}", footer: `Sent to {{email}} · If you didn't request this, you can safely ignore this email.` }),
    },
    {
      name: "invite",
      subject: "You're invited to join {{appName}} 🎉",
      body_html: emailTemplate({ appName, primaryColor: color, title: "You've Been Invited!", body: `You've been invited to join <strong>{{appName}}</strong>, a smart subscription and bill tracker.<br><br>Click the button below to create your account and start tracking your finances.`, buttonText: "Accept Invitation", buttonUrl: "{{link}}", footer: `This invitation expires in 3 days.` }),
    },
    {
      name: "password_reset",
      subject: "Reset your {{appName}} password",
      body_html: emailTemplate({ appName, primaryColor: color, title: "Reset Your Password 🔑", body: `We received a request to reset the password for your <strong>{{appName}}</strong> account.<br><br>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.`, buttonText: "Reset Password", buttonUrl: "{{link}}", footer: `If you didn't request this, you can safely ignore this email. Your password will not be changed.` }),
    },
    {
      name: "renewal_reminder",
      subject: "{{name}} renews in {{days}} days — {{appName}}",
      body_html: emailTemplate({ appName, primaryColor: color, title: "Upcoming Renewal Reminder 📅", body: `Your subscription to <strong>{{name}}</strong> is scheduled to renew in <strong>{{days}} days</strong> on {{date}}.<br><br>Amount: <strong>{{amount}}</strong><br><br>You can manage this subscription in your {{appName}} dashboard.`, buttonText: "Manage Subscriptions", buttonUrl: "{{link}}" }),
    },
  ];
}

async function isAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return false;
  return (getDb().prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any)?.role === "admin";
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  const platform = db.prepare("SELECT app_name, primary_color FROM platform_settings WHERE id = 1").get() as any;
  const defaults = buildDefaults(platform?.app_name || "Vexyo", platform?.primary_color || "#6366F1");
  // Seed defaults if not present
  for (const t of defaults) {
    const exists = db.prepare("SELECT id FROM email_templates WHERE name = ?").get(t.name);
    if (!exists) db.prepare("INSERT INTO email_templates (name, subject, body_html) VALUES (?, ?, ?)").run(t.name, t.subject, t.body_html);
  }
  return NextResponse.json(db.prepare("SELECT * FROM email_templates ORDER BY id").all());
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const db = getDb();
  if (body.reset && body.name) {
    // Reset to default
    const platform = db.prepare("SELECT app_name, primary_color FROM platform_settings WHERE id = 1").get() as any;
    const defaults = buildDefaults(platform?.app_name || "Vexyo", platform?.primary_color || "#6366F1");
    const def = defaults.find(d => d.name === body.name);
    if (def) db.prepare("UPDATE email_templates SET subject = ?, body_html = ?, updated_at = datetime('now') WHERE name = ?").run(def.subject, def.body_html, body.name);
  } else {
    const { id, subject, body_html } = body;
    db.prepare("UPDATE email_templates SET subject = ?, body_html = ?, updated_at = datetime('now') WHERE id = ?").run(subject, body_html, id);
  }
  return NextResponse.json({ ok: true });
}
