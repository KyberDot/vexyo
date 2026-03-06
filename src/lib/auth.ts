import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb } from "./db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const db = getDb();
        const user = db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(credentials.email) as any;
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;
        return { id: String(user.id), email: user.email, name: user.name, role: user.role };
      },
    }),
    CredentialsProvider({
      id: "magic-link",
      name: "magic-link",
      credentials: { token: { label: "Token", type: "text" } },
      async authorize(credentials) {
        if (!credentials?.token) return null;
        const db = getDb();
        const mt = db.prepare("SELECT * FROM magic_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')").get(credentials.token) as any;
        if (!mt) return null;
        db.prepare("UPDATE magic_tokens SET used = 1 WHERE id = ?").run(mt.id);
        let user = db.prepare("SELECT * FROM users WHERE email = ?").get(mt.email) as any;
        if (!user) {
          const platform = db.prepare("SELECT allow_registration FROM platform_settings WHERE id = 1").get() as any;
          if (!platform?.allow_registration) return null;
          const r = db.prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)").run(mt.email, mt.email.split("@")[0], `!magic:${crypto.randomBytes(16).toString("hex")}`);
          db.prepare("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)").run(r.lastInsertRowid);
          user = db.prepare("SELECT * FROM users WHERE id = ?").get(r.lastInsertRowid) as any;
        }
        if (!user.active) return null;
        return { id: String(user.id), email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role; }
      // Enforce plan expiry for non-admin users
      if (token.id && token.role !== "admin") {
        try {
          const db = getDb();
          const u = db.prepare("SELECT active, plan_expires_at FROM users WHERE id = ?").get(token.id as number) as any;
          if (!u?.active) token.disabled = true;
          else if (u.plan_expires_at && new Date(u.plan_expires_at) < new Date()) {
            db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(token.id);
            token.disabled = true;
          }
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).id = token.id; (session.user as any).role = token.role; }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
