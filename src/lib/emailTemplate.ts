import { getDb } from "@/lib/db";

export function emailTemplate(opts: {
  appName: string;
  primaryColor?: string;
  title: string;
  body: string;
  buttonText?: string;
  buttonUrl?: string;
  footer?: string;
}) {
  const { appName, primaryColor = "#6366F1", title, body, buttonText, buttonUrl, footer } = opts;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td align="center" style="padding-bottom:28px">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:${primaryColor};border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;font-size:22px">💰</td>
            <td style="padding-left:10px;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">${appName}</td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#1A1D27;border:1px solid #2A2D3A;border-radius:16px;padding:36px 40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3">${title}</h1>
          <div style="height:3px;width:40px;background:${primaryColor};border-radius:2px;margin-bottom:20px"></div>
          <div style="font-size:15px;color:#9CA3AF;line-height:1.6;margin-bottom:${buttonText ? "28px" : "0"}">${body}</div>
          ${buttonText && buttonUrl ? `
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="${buttonUrl}" style="display:inline-block;background:${primaryColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;letter-spacing:0.2px">${buttonText}</a>
          </td></tr></table>
          <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6B7280">Or copy this link:<br><a href="${buttonUrl}" style="color:${primaryColor};word-break:break-all;font-size:11px">${buttonUrl}</a></p>
          ` : ""}
        </td></tr>
        <tr><td align="center" style="padding-top:24px;font-size:12px;color:#4B5563">
          ${footer || `Sent by ${appName} · If you didn't request this, you can ignore this email.`}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Load a template from DB, substitute vars, and return HTML
export function renderDbTemplate(name: string, vars: Record<string, string>): { subject: string; html: string } | null {
  try {
    const db = getDb();
    const tpl = db.prepare("SELECT subject, body_html FROM email_templates WHERE name = ?").get(name) as any;
    if (!tpl) return null;
    let subject = tpl.subject;
    let html = tpl.body_html;
    for (const [k, v] of Object.entries(vars)) {
      const re = new RegExp(`\\{\\{${k}\\}\\}`, "g");
      subject = subject.replace(re, v);
      html = html.replace(re, v);
    }
    return { subject, html };
  } catch { return null; }
}
