import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate, renderDbTemplate } from "@/lib/emailTemplate";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const db = getDb();
    
    // Check if the user exists
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 900000).toISOString(); // 15 minutes
      
      // FIXED: Insert into the dedicated magic_tokens table
      db.prepare(`
        INSERT INTO magic_tokens (email, token, expires_at, used) 
        VALUES (?, ?, ?, 0)
      `).run(email, token, expires);

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const link = `${baseUrl}/api/auth/callback/credentials?magicToken=${token}`;
      const mail = getMailTransporter();

      if (mail) {
        try {
          // Note: Added `email` to the template variables so your new template works!
          const dbTpl = await renderDbTemplate("magic_link", { appName: mail.appName, link, email });
          await mail.transporter.sendMail({
            from: mail.from,
            to: email,
            subject: dbTpl?.subject || `Sign in to ${mail.appName}`,
            html: dbTpl?.html || emailTemplate({
              appName: mail.appName,
              title: "Magic Sign-in Link",
              body: "Click below to sign in instantly. This link expires in 15 minutes.",
              buttonText: "Sign In",
              buttonUrl: link,
            }),
          });
        } catch (e) { 
          console.error("Mail sending error:", e); 
        }
      }
    }
    
    // We always return OK so we don't leak which emails exist in the database
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error("Magic Link Route Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}