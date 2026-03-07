"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useRef } from "react";

interface Attachment { id: number; name: string; mime_type: string; size: number; created_at: string; data?: string; }

// ADDED: attachments and onChange to the interface
interface Props { 
  subId?: number; 
  debtId?: number; 
  label?: string; 
  attachments?: any[]; // For Wallet manual mode
  onChange?: (files: any[]) => void; // For Wallet manual mode
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${((bytes || 0) / 1024).toFixed(1)} KB`;
  return `${((bytes || 0) / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string) {
  if (mime?.startsWith("image/")) return "🖼️";
  if (mime?.includes("pdf")) return "📄";
  if (mime?.includes("spreadsheet") || mime?.includes("csv")) return "📊";
  if (mime?.includes("word") || mime?.includes("document")) return "📝";
  return "📎";
}

export default function AttachmentsPanel({ subId, debtId, label = "Attachments", attachments: manualAttachments, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [dbAttachments, setDbAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Determine if we are in "Manual Mode" (Wallet) or "API Mode" (Subs/Debts)
  const isManual = !!onChange;
  const currentAttachments = isManual ? (manualAttachments || []) : dbAttachments;

  const load = async () => {
    if (isManual || (!subId && !debtId)) return;
    setLoading(true);
    const params = subId ? `sub_id=${subId}` : `debt_id=${debtId}`;
    const r = await fetch(`/api/attachments?${params}`);
    const d = await r.json();
    setDbAttachments(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async e => {
      const base64Data = e.target?.result as string;

      if (isManual && onChange) {
        // Manual Mode: Just update the state in the parent (Wallet)
        const newFile = { 
          name: file.name, 
          mime_type: file.type, 
          size: file.size, 
          data: base64Data, 
          created_at: new Date().toISOString() 
        };
        onChange([...currentAttachments, newFile]);
      } else {
        // API Mode: Save to Database
        await fetch("/api/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sub_id: subId, debt_id: debtId, name: file.name, mime_type: file.type, data: base64Data, size: file.size })
        });
        await load();
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const download = async (att: any) => {
    if (att.data) { // If manual mode already has data
      if (att.mime_type?.startsWith("image/") || att.mime_type?.includes("pdf")) {
        setViewing(att);
      } else {
        const a = document.createElement("a");
        a.href = att.data;
        a.download = att.name;
        a.click();
      }
      return;
    }
    
    // API Mode download logic
    const r = await fetch(`/api/attachments/${att.id}`);
    const d = await r.json();
    if (att.mime_type?.startsWith("image/") || att.mime_type?.includes("pdf")) {
      setViewing({ ...att, data: d.data });
    } else {
      const a = document.createElement("a");
      a.href = d.data;
      a.download = att.name;
      a.click();
    }
  };

  const del = async (idOrIdx: any) => {
    if (!confirm("Delete this attachment?")) return;
    
    if (isManual && onChange) {
      const next = [...currentAttachments];
      next.splice(idOrIdx, 1);
      onChange(next);
    } else {
      await fetch(`/api/attachments/${idOrIdx}`, { method: "DELETE" });
      setDbAttachments(prev => prev.filter(a => a.id !== idOrIdx));
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "var(--muted)", fontSize: 12, fontWeight: 500 }}>
        📎 {label} {currentAttachments.length > 0 && `(${currentAttachments.length})`}
      </button>

      {open && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>📎 {label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{currentAttachments.length} file(s)</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input ref={fileRef} type="file" style={{ display: "none" }} multiple onChange={e => { Array.from(e.target.files || []).forEach(f => upload(f)); e.target.value = ""; }} />
                  <button type="button" className="btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? "Uploading..." : "+ Upload"}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, width: 28, height: 28, color: "var(--muted)" }}>✕</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
                {loading ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Loading...</div>
                  : currentAttachments.length === 0
                    ? <div style={{ textAlign: "center", padding: "32px 0" }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                        <div style={{ fontWeight: 600 }}>No attachments yet</div>
                      </div>
                    : currentAttachments.map((att, i) => (
                        <div key={att.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < currentAttachments.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                          <span style={{ fontSize: 22 }}>{fileIcon(att.mime_type)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{formatSize(att.size)}</div>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button type="button" onClick={() => download(att)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "var(--muted)" }}>View</button>
                            <button type="button" onClick={() => del(isManual ? i : att.id)} style={{ background: "none", border: "none", color: "#EF4444", fontSize: 14 }}>🗑️</button>
                          </div>
                        </div>
                      ))}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Viewer Modal (Same as your original code) */}
      {viewing && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setViewing(null)}>
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "85vh", background: "var(--surface)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{viewing.name}</span>
                <button onClick={() => setViewing(null)} style={{ background: "none", border: "none", color: "white", fontSize: 20 }}>✕</button>
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
                {viewing.mime_type?.startsWith("image/") && <img src={viewing.data} style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }} alt="" />}
                {viewing.mime_type?.includes("pdf") && <iframe src={viewing.data} style={{ width: "80vw", height: "75vh", border: "none" }} />}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}