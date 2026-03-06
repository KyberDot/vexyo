"use client";
import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status } = useSession();
  
  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"password" | "magic" | "forgot">("password");
  const [sent, setSent] = useState(false);

  // Load platform from localStorage immediately (no flash)
  const [platform, setPlatform] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const c = localStorage.getItem("vexyo_platform");
        if (c) return JSON.parse(c);
      } catch {}
    }
    return { app_name: "Vexyo", primary_color: "#6366F1", logo: "", allow_registration: true, magic_link_enabled: false };
  });

  useEffect(() => {
    fetch("/api/platform").then(r => r.json()).then(d => {
      if (d && !d.error) {
        setPlatform({ ...platform, ...d, allow_registration: !!d.allow_registration, magic_link_enabled: !!d.magic_link_enabled });
        try { localStorage.setItem("vexyo_platform", JSON.stringify({ ...platform, ...d })); } catch {}
      }
    });
    const magic = params.get("magic");
    if (magic) {
      setLoading(true);
      signIn("magic-link", { token: magic, redirect: false }).then(r => {
        if (r?.ok) router.push("/dashboard");
        else { setError("Invalid or expired magic link."); setLoading(false); }
      });
    }
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const r = await signIn("credentials", { email, password, redirect: false });
    if (r?.ok) { router.push("/dashboard"); return; }
    setError("Invalid email or password");
    setLoading(false);
  };

  const sendMagic = async () => {
    if (!email) { setError("Enter your email first"); return; }
    setLoading(true); setError("");
    const r = await fetch("/api/auth/magic-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const d = await r.json();
    if (!r.ok || !d.ok) { setError(d.error || "Failed to send magic link. Please try password login."); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  const sendReset = async () => {
    if (!email) { setError("Enter your email first"); return; }
    setLoading(true); setError("");
    const r = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const d = await r.json();
    setSent(true); setLoading(false);
  };

  const acc = platform.primary_color || "#6366F1";

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 16, overflow: "auto" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px", overflow: "hidden" }}>
            {platform.logo ? <img src={platform.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>{platform.app_name || "Vexyo"}</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
            {mode === "forgot" ? "Reset your password" : mode === "magic" ? "Sign in with magic link" : "Sign in to your account"}
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {/* Mode tabs */}
          {mode !== "forgot" && !!platform.magic_link_enabled && (
            <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 8, padding: 3, marginBottom: 20, gap: 2 }}>
              <button onClick={() => { setMode("password"); setError(""); setSent(false); }} style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", background: mode === "password" ? "var(--surface)" : "transparent", color: mode === "password" ? "var(--text)" : "var(--muted)", fontWeight: mode === "password" ? 600 : 400, fontSize: 13, cursor: "pointer" }}>🔑 Password</button>
              <button onClick={() => { setMode("magic"); setError(""); setSent(false); }} style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", background: mode === "magic" ? "var(--surface)" : "transparent", color: mode === "magic" ? "var(--text)" : "var(--muted)", fontWeight: mode === "magic" ? 600 : 400, fontSize: 13, cursor: "pointer" }}>✨ Magic Link</button>
            </div>
          )}

          {error && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 13, color: "#EF4444" }}>{error}</div>}

          {(mode === "magic" || mode === "forgot") && sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{mode === "magic" ? "✨" : "📧"}</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{mode === "magic" ? "Check your email" : "Reset email sent"}</div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 14 }}>
                {mode === "magic" ? `A magic sign-in link has been sent to ${email}` : `If an account exists, a password reset link was sent to ${email}`}
              </div>

              <button className="btn-ghost" onClick={() => { setSent(false); setMode("password"); }} style={{ fontSize: 13 }}>← Back to login</button>
            </div>
          ) : mode === "password" ? (
            <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>EMAIL</label>
                <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>PASSWORD</label>
                <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", background: acc }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); setSent(false); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", textAlign: "center" }}>
                Forgot your password?
              </button>
            </form>
          ) : mode === "magic" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>EMAIL</label>
                <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={sendMagic} disabled={loading || !email} style={{ width: "100%", justifyContent: "center", background: acc }}>
                {loading ? "Sending..." : "✨ Send Magic Link"}
              </button>
              <button onClick={() => { setMode("password"); setError(""); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", textAlign: "center" }}>← Back to password</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>EMAIL</label>
                <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={sendReset} disabled={loading || !email} style={{ width: "100%", justifyContent: "center", background: acc }}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button onClick={() => { setMode("password"); setError(""); setSent(false); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", textAlign: "center" }}>← Back to login</button>
            </div>
          )}

          {!!platform.allow_registration && mode === "password" && (
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 18 }}>
              No account? <Link href="/register" style={{ color: acc, fontWeight: 600, textDecoration: "none" }}>Create one</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><div style={{ color: "var(--muted)" }}>Loading...</div></div>}><LoginContent /></Suspense>;
}
