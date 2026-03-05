"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState({ name: "", email: "", avatar: "" });
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(data => {
      setProfile({ name: data.name || "", email: data.email || "", avatar: data.avatar || "" });
      setLoading(false);
    });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: profile.name, email: profile.email, avatar: profile.avatar || null }) });
    const data = await res.json();
    if (data.error) { setMsg("Error: " + data.error); } else { setMsg("Profile saved ✓"); await update(); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const savePassword = async () => {
    if (password.new !== password.confirm) { setPwMsg("Passwords don't match"); return; }
    if (password.new.length < 8) { setPwMsg("Password must be at least 8 characters"); return; }
    setSavingPw(true);
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: password.new }) });
    const data = await res.json();
    if (data.error) setPwMsg("Error: " + data.error); else { setPwMsg("Password changed ✓"); setPassword({ current: "", new: "", confirm: "" }); }
    setSavingPw(false);
    setTimeout(() => setPwMsg(""), 3000);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setProfile(p => ({ ...p, avatar: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Profile</h1>

      {/* Avatar */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Profile Photo</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 99, background: "var(--surface2)", border: "2px solid var(--border-color)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
            {profile.avatar ? <img src={profile.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" /> : session?.user?.name?.[0]?.toUpperCase() || "👤"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => fileRef.current?.click()}>Upload Photo</button>
            {profile.avatar && <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setProfile(p => ({ ...p, avatar: "" }))}>Remove</button>}
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Account Info</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Display Name</label>
            <input className="input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Email Address</label>
            <input className="input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" />
          </div>
          {msg && <div style={{ fontSize: 13, padding: "8px 12px", borderRadius: 6, background: msg.startsWith("Error") ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", color: msg.startsWith("Error") ? "#EF4444" : "#10B981" }}>{msg}</div>}
          <button className="btn-primary" onClick={saveProfile} disabled={saving} style={{ alignSelf: "flex-start" }}>{saving ? "Saving..." : "Save Profile"}</button>
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Change Password</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>New Password</label>
            <input className="input" type="password" placeholder="Min 8 characters" value={password.new} onChange={e => setPassword(p => ({ ...p, new: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Confirm New Password</label>
            <input className="input" type="password" placeholder="Repeat new password" value={password.confirm} onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          {pwMsg && <div style={{ fontSize: 13, padding: "8px 12px", borderRadius: 6, background: pwMsg.startsWith("Error") || pwMsg.includes("don't") || pwMsg.includes("must") ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", color: pwMsg.startsWith("Error") || pwMsg.includes("don't") || pwMsg.includes("must") ? "#EF4444" : "#10B981" }}>{pwMsg}</div>}
          <button className="btn-primary" onClick={savePassword} disabled={savingPw || !password.new} style={{ alignSelf: "flex-start" }}>{savingPw ? "Saving..." : "Change Password"}</button>
        </div>
      </div>
    </div>
  );
}
