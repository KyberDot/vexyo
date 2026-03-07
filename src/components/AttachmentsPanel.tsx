"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useRef } from "react";

interface Attachment { id: number; name: string; mime_type: string; size: number; created_at: string; }
interface Props { subId?: number; debtId?: number; methodId?: number; label?: string; }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string) {
  if (mime?.startsWith("image/")) return "🖼️";
  if (mime?.includes("pdf")) return "📄";
  if (mime?.includes("spreadsheet") || mime?.includes("csv")) return "📊";
  if (mime?.includes("word") || mime?.includes("document")) return "📝";
  return "📎";
}

export default function AttachmentsPanel({ subId, debtId, methodId, label = "Attachments" }: Props) {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const params = subId ? `sub_id=${subId}` : debtId ? `debt_id=${debtId}` : `method_id=${methodId}`;

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/attachments?${params}`);
    const d = await r.json();
    setAttachments(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async e => {
      await fetch("/api/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub_id: subId, debt_id: debtId, method_id: methodId, name: file.name, mime_type: file.type, data: e.target?.result as string, size: file.size })
      });
      await load();
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const download = async (att: Attachment) => {
    const r = await fetch(`/api/attachments/${att.id}`);
    const d = await r.json();
    if (att.mime_type?.startsWith("image/") || att.mime_type?.includes("pdf")) {
      setViewing({ ...att, data: d.data });
      return;
    }
    const a = document.createElement("a");
    a.href = d.data;
    a.download = att.name;
    a.click();
  };

  const del = async (id: number) => {
    if (!confirm("Delete this attachment?")) return;
    await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "var(--muted)", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}>
        📎 {label}
      </button>

      {open && (
        <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}
          onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>📎 {label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{attachments.length} file{attachments.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input ref={fileRef} type="file" style={{ display: "none" }} multiple onChange={e => { Array.from(e.target.files || []).forEach(f => upload(f)); e.target.value = ""; }} />
                <button className="btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? "Uploading..." : "+ Upload"}
                </button>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)", fontSize: 14 }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
              {loading ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Loading...</div>
                : attachments.length === 0
                  ? <div style={{ textAlign: "center", padding: "32px 0" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>No attachments yet</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Upload receipts, invoices, or any related files</div>
                      <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => fileRef.current?.click()}>Upload First File</button>
                    </div>
                  : attachments.map((att, i) => (
                    <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < attachments.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{fileIcon(att.mime_type)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{formatSize(att.size)} · {new Date(att.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => download(att)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--muted)", fontSize: 11 }}>View/DL</button>
                        <button onClick={() => del(att.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: "4px" }}>🗑️</button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {viewing && (
        <ModalPortal><div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden" }}
          onClick={() => setViewing(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "85vh", background: "var(--surface)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{viewing.name}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={viewing.data} download={viewing.name} className="btn-primary" style={{ fontSize: 12, padding: "5px 10px", textDecoration: "none" }}>Download</a>
                <button onClick={() => setViewing(null)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)" }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
              {viewing.mime_type?.startsWith("image/") && <img src={viewing.data} style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }} alt={viewing.name} />}
              {viewing.mime_type?.includes("pdf") && <iframe src={viewing.data} style={{ width: "80vw", height: "75vh", border: "none" }} />}
            </div>
          </div>
        </div></ModalPortal>
      )}
    </>
  );
}
