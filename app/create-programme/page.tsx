"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import {
  Pencil, Trash, CirclePlus, ArrowLeft, Upload,
  Eye, Download, X, FileText, ChevronDown, ChevronUp, Clock
} from "lucide-react"

function getLifecycle(start_date: string | null, end_date: string | null) {
  if (!start_date || !end_date) return "N/A"
  const today = new Date()
  const start = new Date(start_date)
  const end = new Date(end_date)
  if (today < start) return "Pre"
  if (today >= start && today <= end) return "During"
  return "Post"
}

const lifecycleConfig: Record<string, { color: string; bg: string }> = {
  Pre:    { color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  During: { color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  Post:   { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  "N/A":  { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
}

const statusConfig: Record<string, { color: string; bg: string }> = {
  Pending:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  Approved: { color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  Rejected: { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
}

export default function ProgrammePage() {
  const router = useRouter()
  const [programmes, setProgrammes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<any | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      const { data, error } = await supabase.from("programmes").select("*").order("created_at", { ascending: false })
      if (error) setError(error.message)
      else setProgrammes(data || [])
      const { data: docs } = await supabase.from("programme_documents").select("*")
      setDocuments(docs || [])
      setLoading(false)
    }
    fetchData()
  }, [router])

  const handleBack = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace("/login"); return }
    const { data } = await supabase.from("users").select("roles(name)").eq("id", session.user.id).single()
    const role = (data?.roles as any)?.name
    if (role === "superadmin") router.replace("/superadmin")
    else if (role === "admin") router.replace("/admin")
    else router.replace("/student")
  }

  const handleUpload = async (programmeId: string) => {
    if (!file) { alert("Please select a file first"); return }
    setUploadLoading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("programme_id", programmeId)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    const data = await res.json()
    setUploadLoading(false)
    if (!res.ok) { alert("Upload failed: " + (data.error || "Unknown error")); return }
    const { data: docs } = await supabase.from("programme_documents").select("*")
    setDocuments(docs || [])
    setFile(null)
    setSelectedProgrammeId(null)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/programmes/${id}`, { method: "DELETE" })
    setProgrammes(prev => prev.filter(p => p.id !== id))
    setDeleteConfirmId(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#070e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "36px", height: "36px", border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#64748b", fontSize: "14px", fontFamily: "'DM Sans', sans-serif" }}>Loading programmes...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const COLS = ["#", "Name", "Category", "Venue", "Date Range", "Budget (RM)", "Lifecycle", "Status", "Docs", "Actions"]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070e1a; }

        .tbl-wrap { overflow-x: auto; }
        .tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-family: 'DM Sans', sans-serif; }

        .tbl thead tr th {
          padding: 13px 16px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
          color: #475569; white-space: nowrap; text-align: left;
          background: #0a1422;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .tbl thead tr th:first-child { border-radius: 10px 0 0 0; padding-left: 20px; }
        .tbl thead tr th:last-child  { border-radius: 0 10px 0 0; text-align: center; }
        .tbl thead tr th.center { text-align: center; }

        .tbl tbody tr.main-row { transition: background 0.12s; }
        .tbl tbody tr.main-row:hover { background: rgba(99,102,241,0.05); }
        .tbl tbody tr.main-row td {
          padding: 14px 16px;
          font-size: 14px; color: #94a3b8;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          vertical-align: middle; white-space: nowrap;
        }
        .tbl tbody tr.main-row td:first-child { color: #334155; font-size: 12px; padding-left: 20px; }
        .tbl tbody tr.main-row td.name-cell { color: #f1f5f9; font-weight: 600; font-size: 15px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
        .tbl tbody tr.main-row td.center { text-align: center; }

        .tbl tbody tr.expand-row td { padding: 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .expand-inner { padding: 16px 24px; background: rgba(0,0,0,0.25); border-left: 3px solid rgba(99,102,241,0.3); }

        .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap; }
        .badge-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

        .act-btn { display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: 7px; padding: 7px; cursor: pointer; transition: all 0.13s; font-family: 'DM Sans', sans-serif; }
        .act-btn:hover { transform: translateY(-1px); filter: brightness(1.15); }

        .doc-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 7px; transition: background 0.1s; }
        .doc-item:hover { background: rgba(255,255,255,0.04); }

        .upload-zone { border: 1.5px dashed rgba(99,102,241,0.3); border-radius: 8px; padding: 12px 16px; background: rgba(99,102,241,0.04); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; transition: border-color 0.2s; }
        .upload-zone:hover { border-color: rgba(99,102,241,0.55); }

        .mini-btn { display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; padding: 5px 11px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; border: 1px solid transparent; transition: opacity 0.1s; }
        .mini-btn:hover { opacity: 0.8; }

        input[type="file"] { color: #94a3b8; font-size: 13px; font-family: 'DM Sans', sans-serif; flex: 1; min-width: 220px; }
        input[type="file"]::file-selector-button { background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); border-radius: 5px; padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; margin-right: 10px; }
        input[type="file"]::file-selector-button:hover { background: rgba(99,102,241,0.25); }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <main style={{ minHeight: "100vh", background: "#070e1a", padding: "28px 24px", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ width: "100%", margin: "0 auto" }}>

          {/* ── HEADER ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <button
                onClick={handleBack}
                style={{ display: "flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "9px 15px", color: "#94a3b8", fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
                onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.03em" }}>Programme List</h1>
                <p style={{ fontSize: "13px", color: "#475569", marginTop: "2px" }}>{programmes.length} programme{programmes.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/create-programme-form")}
              style={{ display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #4f46e5, #6366f1)", border: "none", borderRadius: "9px", padding: "10px 20px", color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}
            >
              <CirclePlus size={15} /> New Programme
            </button>
          </div>

          {error && (
            <div style={{ marginBottom: "16px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "8px", padding: "12px 16px", color: "#f87171", fontSize: "14px" }}>
              {error}
            </div>
          )}

          {/* ── TABLE ── */}
          <div style={{ background: "#0c1526", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", overflow: "hidden" }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    {COLS.map(col => (
                      <th key={col} className={col === "Actions" || col === "Docs" ? "center" : ""}>{col}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {programmes.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} style={{ padding: "60px 20px", textAlign: "center", color: "#334155", fontFamily: "'DM Sans', sans-serif", border: "none" }}>
                        <FileText size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
                        <p style={{ fontSize: "15px", fontWeight: 500, color: "#475569" }}>No programmes yet</p>
                        <p style={{ fontSize: "13px", marginTop: "4px" }}>Create your first programme to get started</p>
                      </td>
                    </tr>
                  ) : programmes.map((p, idx) => {
                    const lifecycle = getLifecycle(p.start_date, p.end_date)
                    const lc = lifecycleConfig[lifecycle] || lifecycleConfig["N/A"]
                    const sc = statusConfig[p.status] || { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" }
                    const programmeFiles = documents.filter(d => d.programme_id === p.id)
                    const isDocsOpen = openDocsId === p.id
                    const isUploadOpen = selectedProgrammeId === p.id

                    return (
                      <React.Fragment key={p.id}>

                        {/* ── MAIN DATA ROW ── */}
                        <tr className="main-row">
                          <td>{idx + 1}</td>

                          <td className="name-cell">{p.name}</td>

                          <td>{p.category || <span style={{ color: "#2d3d52" }}>—</span>}</td>

                          <td>{p.venue || <span style={{ color: "#2d3d52" }}>—</span>}</td>

                          <td style={{ fontSize: "13px", fontFamily: "'DM Mono', monospace" }}>
                            {p.start_date || p.end_date
                              ? `${p.start_date ?? "—"} → ${p.end_date ?? "—"}`
                              : <span style={{ color: "#2d3d52" }}>—</span>}
                          </td>

                          <td style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>
                            {p.budget != null ? Number(p.budget).toLocaleString() : <span style={{ color: "#2d3d52" }}>—</span>}
                          </td>

                          <td>
                            <span className="badge" style={{ background: lc.bg, color: lc.color }}>
                              <Clock size={10} />{lifecycle}
                            </span>
                          </td>

                          <td>
                            <span className="badge" style={{ background: sc.bg, color: sc.color }}>
                              <span className="badge-dot" style={{ background: sc.color }} />{p.status ?? "—"}
                            </span>
                          </td>

                          {/* Docs toggle */}
                          <td className="center">
                            <button
                              className="act-btn"
                              onClick={() => setOpenDocsId(isDocsOpen ? null : p.id)}
                              style={{ background: isDocsOpen ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)", color: isDocsOpen ? "#818cf8" : "#64748b", border: `1px solid ${isDocsOpen ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`, gap: "5px", padding: "6px 10px", fontSize: "13px" }}
                            >
                              <FileText size={13} />
                              <span>{programmeFiles.length}</span>
                              {isDocsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                          </td>

                          {/* Action buttons */}
                          <td className="center">
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button className="act-btn" title="Upload document" onClick={() => setSelectedProgrammeId(isUploadOpen ? null : p.id)}
                                style={{ background: isUploadOpen ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)", color: isUploadOpen ? "#34d399" : "#64748b", border: `1px solid ${isUploadOpen ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.07)"}` }}>
                                <Upload size={14} />
                              </button>
                              <button className="act-btn" title="Edit"
                                style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <Pencil size={14} />
                              </button>
                              <button className="act-btn" title="Delete" onClick={() => setDeleteConfirmId(p.id)}
                                style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.15)" }}>
                                <Trash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ── UPLOAD EXPAND ROW ── */}
                        {isUploadOpen && (
                          <tr className="expand-row">
                            <td colSpan={COLS.length}>
                              <div className="expand-inner">
                                <p style={{ fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Upload Document</p>
                                <div className="upload-zone">
                                  <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
                                  <button
                                    onClick={() => handleUpload(p.id)}
                                    disabled={uploadLoading || !file}
                                    style={{ display: "flex", alignItems: "center", gap: "6px", background: file ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(255,255,255,0.05)", color: file ? "white" : "#475569", border: "none", borderRadius: "7px", padding: "8px 18px", fontSize: "13px", fontWeight: 600, cursor: file ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}
                                  >
                                    <Upload size={13} />{uploadLoading ? "Uploading..." : "Upload"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* ── DOCUMENTS EXPAND ROW ── */}
                        {isDocsOpen && (
                          <tr className="expand-row">
                            <td colSpan={COLS.length}>
                              <div className="expand-inner">
                                <p style={{ fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                                  Documents ({programmeFiles.length})
                                </p>
                                {programmeFiles.length === 0 ? (
                                  <p style={{ color: "#334155", fontSize: "13px" }}>No documents uploaded yet.</p>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxWidth: "640px" }}>
                                    {programmeFiles.map(f => (
                                      <div key={f.id} className="doc-item">
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                          <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <FileText size={14} color="#818cf8" />
                                          </div>
                                          <span style={{ fontSize: "14px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "320px" }}>{f.file_name}</span>
                                        </div>
                                        <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginLeft: "12px" }}>
                                          <button className="mini-btn" onClick={() => setPreviewFile(f)} style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", borderColor: "rgba(96,165,250,0.2)" }}>
                                            <Eye size={12} /> View
                                          </button>
                                          <button className="mini-btn"
                                            style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", borderColor: "rgba(52,211,153,0.2)" }}
                                            onClick={async () => {
                                              const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${f.file_path}`
                                              const res = await fetch(url)
                                              const blob = await res.blob()
                                              const blobUrl = window.URL.createObjectURL(blob)
                                              const a = document.createElement("a")
                                              a.href = blobUrl; a.download = f.file_name
                                              document.body.appendChild(a); a.click()
                                              document.body.removeChild(a)
                                              window.URL.revokeObjectURL(blobUrl)
                                            }}>
                                            <Download size={12} /> Download
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}

                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* ── DELETE MODAL ── */}
      {deleteConfirmId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#0c1526", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "14px", padding: "28px", width: "100%", maxWidth: "340px", margin: "16px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(248,113,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash size={22} color="#f87171" />
            </div>
            <h3 style={{ color: "#f1f5f9", fontSize: "17px", fontWeight: 700, marginBottom: "8px" }}>Delete Programme?</h3>
            <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>This action cannot be undone. All associated data will be permanently removed.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirmId)} style={{ flex: 1, padding: "10px", background: "#ef4444", border: "none", color: "white", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewFile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, backdropFilter: "blur(6px)" }}>
          <div style={{ background: "#0c1526", border: "1px solid rgba(255,255,255,0.08)", width: "90%", maxWidth: "700px", borderRadius: "14px", padding: "20px", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={15} color="#818cf8" />
                </div>
                <span style={{ color: "#e2e8f0", fontSize: "15px", fontWeight: 500, maxWidth: "440px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewFile.file_name}</span>
              </div>
              <button onClick={() => setPreviewFile(null)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "7px", padding: "6px", color: "#64748b", cursor: "pointer", display: "flex" }}>
                <X size={16} />
              </button>
            </div>
            <iframe
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${previewFile.file_path}`}
              style={{ width: "100%", height: "440px", background: "white", borderRadius: "8px", border: "none" }}
            />
          </div>
        </div>
      )}
    </>
  )
}
