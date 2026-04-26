'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock,
  Calendar, MapPin, DollarSign, BookOpen, RefreshCw,
  Upload, FileText, Download, Eye, X, Trash2,
} from 'lucide-react'

interface Programme {
  id: string; name: string; description: string; category: string
  venue: string; budget: number; start_date: string; end_date: string
  status: string; created_at: string; rejection_reason: string | null
  programme_director_id: string
}

interface PhaseDoc {
  id: string
  file_name: string
  file_path: string
  phase: 'pre' | 'during' | 'post'
  doc_type?: string
  programme_id: string
  created_at: string
}

type Phase = 'pre' | 'during' | 'post'

// ── Checklist definitions ────────────────────────────────────────────────
const PRE_CHECKLIST = [
  { key: 'paperwork', label: 'Paperwork',   hint: 'e.g. approval forms, permission letters' },
  { key: 'oshe',      label: 'OSHE HIRARC', hint: 'Hazard identification & risk assessment' },
  { key: 'poster',    label: 'Poster',      hint: 'Event poster or promotional material' },
]

const POST_CHECKLIST = [
  { key: 'program_report',   label: 'Program Report',   hint: 'Overall summary and outcomes of the programme' },
  { key: 'financial_report', label: 'Financial Report', hint: 'Budget breakdown and expenditure record' },
  { key: 'survey_report',    label: 'Survey Report',    hint: 'Participant feedback and survey results' },
]

const PHASES: { id: Phase; label: string; color: string; activeBg: string; activeBorder: string }[] = [
  { id: 'pre',    label: 'Pre',    color: '#60a5fa', activeBg: 'rgba(96,165,250,0.15)',  activeBorder: 'rgba(96,165,250,0.4)'  },
  { id: 'during', label: 'During', color: '#34d399', activeBg: 'rgba(52,211,153,0.15)',  activeBorder: 'rgba(52,211,153,0.4)'  },
  { id: 'post',   label: 'Post',   color: '#a78bfa', activeBg: 'rgba(167,139,250,0.15)', activeBorder: 'rgba(167,139,250,0.4)' },
]

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  Pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  icon: AlertCircle },
  Approved: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  icon: CheckCircle },
  Rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   icon: XCircle },
}

/* ─── SHARED: single doc row ────────────────────────────────────────────── */
function DocRow({
  doc, phaseInfo, canUpload, onPreview, onDownload, onDelete,
}: {
  doc: PhaseDoc
  phaseInfo: typeof PHASES[0]
  canUpload: boolean
  onPreview: (d: PhaseDoc) => void
  onDownload: (d: PhaseDoc) => void
  onDelete: (d: PhaseDoc) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: phaseInfo.activeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={13} color={phaseInfo.color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>{doc.file_name}</p>
          <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#475569' }}>
            {new Date(doc.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
        <button onClick={() => onPreview(doc)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: '11px', cursor: 'pointer' }}>
          <Eye size={11} />View
        </button>
        <button onClick={() => onDownload(doc)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: '11px', cursor: 'pointer' }}>
          <Download size={11} />
        </button>
        {canUpload && (
          <button onClick={() => onDelete(doc)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(248,113,113,0.15)', background: 'rgba(248,113,113,0.08)', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}>
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── REUSABLE CHECKLIST TAB (used by both Pre and Post) ────────────────── */
function ChecklistPhaseTab({
  phase, checklist, programmeId, docs, onDocsChange, canUpload,
}: {
  phase: 'pre' | 'post'
  checklist: { key: string; label: string; hint: string }[]
  programmeId: string
  docs: PhaseDoc[]
  onDocsChange: (updated: PhaseDoc[]) => void
  canUpload: boolean
}) {
  const phaseInfo = PHASES.find(p => p.id === phase)!
  const phaseDocs = docs.filter(d => d.phase === phase)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<PhaseDoc | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const docsForKey = (key: string) => phaseDocs.filter(d => d.doc_type === key)
  const completedCount = checklist.filter(item => docsForKey(item.key).length > 0).length

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingKey(docKey)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('programme_id', programmeId)
    formData.append('phase', phase)
    formData.append('doc_type', docKey)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: formData,
    })

    if (res.ok) {
      const { data } = await supabase
        .from('programme_documents').select('*').eq('programme_id', programmeId)
      onDocsChange((data ?? []) as PhaseDoc[])
    } else {
      const err = await res.json().catch(() => ({}))
      alert('Upload failed: ' + (err.error ?? 'Unknown error'))
    }

    setUploadingKey(null)
    const ref = fileRefs.current[docKey]
    if (ref) ref.value = ''
  }

  const handleDelete = async (doc: PhaseDoc) => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return
    await supabase.from('programme_documents').delete().eq('id', doc.id)
    onDocsChange(docs.filter(d => d.id !== doc.id))
  }

  const handleDownload = async (doc: PhaseDoc) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${doc.file_path}`
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl; a.download = doc.file_name
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(blobUrl)
  }

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Checklist Progress
          </p>
          <span style={{ fontSize: '11px', fontWeight: 600, color: completedCount === checklist.length ? '#10b981' : phaseInfo.color }}>
            {completedCount} / {checklist.length} completed
          </span>
        </div>
        <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(completedCount / checklist.length) * 100}%`,
            background: completedCount === checklist.length
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : `linear-gradient(90deg, ${phaseInfo.color}aa, ${phaseInfo.color})`,
            borderRadius: '99px',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Checklist items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {checklist.map((item, idx) => {
          const itemDocs = docsForKey(item.key)
          const isDone = itemDocs.length > 0
          const isUploading = uploadingKey === item.key

          return (
            <div key={item.key} style={{
              border: `1px solid ${isDone ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '11px',
              overflow: 'hidden',
              background: isDone ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)',
              transition: 'border-color 0.2s',
            }}>
              {/* Item header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                {/* Status icon */}
                <div style={{ flexShrink: 0 }}>
                  {isDone ? (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={16} color="#10b981" />
                    </div>
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>{idx + 1}</span>
                    </div>
                  )}
                </div>

                {/* Label + hint */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: isDone ? '#f1f5f9' : '#94a3b8' }}>
                    {item.label}
                    {isDone && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 500, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '4px' }}>
                        Uploaded
                      </span>
                    )}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#475569' }}>{item.hint}</p>
                </div>

                {/* Upload button */}
                {canUpload && (
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px', borderRadius: '7px', cursor: isUploading ? 'not-allowed' : 'pointer',
                    border: `1px solid ${isDone ? 'rgba(16,185,129,0.3)' : `${phaseInfo.color}4d`}`,
                    background: isDone ? 'rgba(16,185,129,0.1)' : `${phaseInfo.color}1a`,
                    color: isDone ? '#10b981' : phaseInfo.color,
                    fontSize: '12px', fontWeight: 500, flexShrink: 0,
                    opacity: isUploading ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}>
                    {isUploading
                      ? <><RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} />Uploading...</>
                      : <><Upload size={12} />{isDone ? 'Replace' : 'Upload'}</>}
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      disabled={isUploading}
                      ref={el => { fileRefs.current[item.key] = el }}
                      onChange={e => handleUpload(e, item.key)}
                    />
                  </label>
                )}
              </div>

              {/* Uploaded docs */}
              {itemDocs.length > 0 && (
                <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {itemDocs.map(doc => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      phaseInfo={phaseInfo}
                      canUpload={canUpload}
                      onPreview={setPreviewDoc}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Preview modal */}
      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, backdropFilter: 'blur(6px)', padding: '16px' }}>
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '700px', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: phaseInfo.activeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={15} color={phaseInfo.color} />
                </div>
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewDoc.file_name}</span>
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '6px', color: '#64748b', cursor: 'pointer', display: 'flex', flexShrink: 0, marginLeft: '10px' }}>
                <X size={16} />
              </button>
            </div>
            <iframe
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${previewDoc.file_path}`}
              style={{ width: '100%', height: '440px', background: 'white', borderRadius: '8px', border: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── DURING PHASE — free upload ────────────────────────────────────────── */
function DuringPhaseTab({
  programmeId, docs, onDocsChange, canUpload,
}: {
  programmeId: string
  docs: PhaseDoc[]
  onDocsChange: (updated: PhaseDoc[]) => void
  canUpload: boolean
}) {
  const phaseInfo = PHASES[1] // 'during'
  const phaseDocs = docs.filter(d => d.phase === 'during')
  const [uploading, setUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<PhaseDoc | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('programme_id', programmeId)
    formData.append('phase', 'during')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: formData,
    })

    if (res.ok) {
      const { data } = await supabase
        .from('programme_documents').select('*').eq('programme_id', programmeId)
      onDocsChange((data ?? []) as PhaseDoc[])
    } else {
      const err = await res.json().catch(() => ({}))
      alert('Upload failed: ' + (err.error ?? 'Unknown error'))
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (doc: PhaseDoc) => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return
    await supabase.from('programme_documents').delete().eq('id', doc.id)
    onDocsChange(docs.filter(d => d.id !== doc.id))
  }

  const handleDownload = async (doc: PhaseDoc) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${doc.file_path}`
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl; a.download = doc.file_name
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(blobUrl)
  }

  return (
    <div>
      {canUpload && (
        <div style={{ border: `1.5px dashed ${phaseInfo.activeBorder}`, borderRadius: '10px', padding: '20px', background: phaseInfo.activeBg, marginBottom: '16px', textAlign: 'center' }}>
          <Upload size={22} color={phaseInfo.color} style={{ margin: '0 auto 8px', display: 'block' }} />
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px' }}>
            Upload <strong style={{ color: phaseInfo.color }}>photos taken during the program</strong> — minimum <strong style={{ color: phaseInfo.color }}>5 photos</strong> required
          </p>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: phaseInfo.activeBg, border: `1px solid ${phaseInfo.activeBorder}`, color: phaseInfo.color, borderRadius: '7px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500, opacity: uploading ? 0.6 : 1 }}>
            {uploading ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />Uploading...</> : <><Upload size={13} />Choose File</>}
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}

      {phaseDocs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <FileText size={24} color="#334155" style={{ margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>No photos uploaded for the During phase yet.</p>
        </div>
      )}

      {phaseDocs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            During Documents ({phaseDocs.length}{phaseDocs.length < 5 ? ` — ${5 - phaseDocs.length} more needed` : ''})
          </p>
          {phaseDocs.map(doc => (
            <DocRow
              key={doc.id}
              doc={doc}
              phaseInfo={phaseInfo}
              canUpload={canUpload}
              onPreview={setPreviewDoc}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, backdropFilter: 'blur(6px)', padding: '16px' }}>
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '700px', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: phaseInfo.activeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={15} color={phaseInfo.color} />
                </div>
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewDoc.file_name}</span>
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '6px', color: '#64748b', cursor: 'pointer', display: 'flex', flexShrink: 0, marginLeft: '10px' }}>
                <X size={16} />
              </button>
            </div>
            <iframe
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${previewDoc.file_path}`}
              style={{ width: '100%', height: '440px', background: 'white', borderRadius: '8px', border: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function ProgrammeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [programme, setProgramme] = useState<Programme | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Phase>('pre')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [phaseDocs, setPhaseDocs] = useState<PhaseDoc[]>([])
  const [form, setForm] = useState({
    name: '', category: '', venue: '', budget: '', start_date: '', end_date: '', description: '',
  })

  const isAdminRef = useRef(false)
  const isOwnerRef = useRef(false)

  useEffect(() => {
    if (!id) return
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).single()

      const role = profileData?.role?.toLowerCase() ?? 'student'
      isAdminRef.current = role === 'admin' || role === 'superadmin'

      const res = await fetch(`/api/programmes/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        setError('Programme not found or you do not have access.')
        setLoading(false)
        return
      }

      const data = await res.json()
      const prog: Programme = data.programme
      isOwnerRef.current = !!data.isDirector

      setProgramme(prog)
      setForm({
        name:        prog.name        ?? '',
        category:    prog.category    ?? '',
        venue:       prog.venue       ?? '',
        budget:      prog.budget != null ? String(prog.budget) : '',
        start_date:  prog.start_date  ? prog.start_date.slice(0, 10) : '',
        end_date:    prog.end_date    ? prog.end_date.slice(0, 10)   : '',
        description: prog.description ?? '',
      })

      const { data: docs } = await supabase
        .from('programme_documents').select('*').eq('programme_id', id)
      setPhaseDocs((docs ?? []) as PhaseDoc[])

      setLoading(false)
    }
    init()
  }, [id])

  const handleResubmit = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      alert('Name, start date, and end date are required.')
      return
    }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const res = await fetch(`/api/programmes/${id}/resubmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...form, budget: form.budget ? parseFloat(form.budget) : null }),
    })

    if (res.ok) {
      const data = await res.json()
      setProgramme(data.programme)
      alert('Programme resubmitted successfully. Status reset to Pending.')
    } else {
      const data = await res.json()
      alert(data.error ?? 'Failed to resubmit.')
    }
    setSaving(false)
  }

  const isAdmin       = isAdminRef.current
  const isOwner       = isOwnerRef.current
  const showPhaseTabs = true
  const canUpload     = isAdmin || isOwner

  // Badge count per tab
  const tabDocCount = (phase: Phase) => {
    if (phase === 'pre')  return PRE_CHECKLIST.filter(item => phaseDocs.some(d => d.phase === 'pre'  && d.doc_type === item.key)).length
    if (phase === 'post') return POST_CHECKLIST.filter(item => phaseDocs.some(d => d.phase === 'post' && d.doc_type === item.key)).length
    return phaseDocs.filter(d => d.phase === phase).length
  }

  const checklistTotal = (phase: Phase) => {
    if (phase === 'pre')  return PRE_CHECKLIST.length
    if (phase === 'post') return POST_CHECKLIST.length
    return null
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#475569', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>Loading programme...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error || !programme) return (
    <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#f87171', fontSize: '14px', fontFamily: "'DM Sans', sans-serif" }}>{error || 'Programme not found.'}</p>
      <button onClick={() => router.back()} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ArrowLeft size={14} />Go back
      </button>
    </div>
  )

  const sc = statusConfig[programme.status] ?? statusConfig['Pending']
  const StatusIcon = sc.icon
  const isRejected = programme.status === 'Rejected'
  const canResubmit = isRejected && isOwner

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#070e1a', fontFamily: "'DM Sans', sans-serif", color: '#e2e8f0', padding: '28px 20px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Back */}
          <button onClick={() => router.back()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', marginBottom: '24px', padding: 0 }}>
            <ArrowLeft size={14} />Back to Programmes
          </button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{programme.name}</h1>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#4b5563' }}>
                Submitted {new Date(programme.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
              <StatusIcon size={13} />{programme.status}
            </span>
          </div>

          {/* Rejection banner */}
          {isRejected && programme.rejection_reason && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={13} />Rejection Comment
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#fca5a5', lineHeight: 1.7 }}>{programme.rejection_reason}</p>
            </div>
          )}

          {/* Details card */}
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Programme Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { label: 'Category',   value: programme.category || '—', icon: BookOpen },
                { label: 'Venue',      value: programme.venue    || '—', icon: MapPin },
                { label: 'Start Date', value: programme.start_date ? new Date(programme.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '—', icon: Calendar },
                { label: 'End Date',   value: programme.end_date   ? new Date(programme.end_date).toLocaleDateString('en-MY',   { day: 'numeric', month: 'long', year: 'numeric' }) : '—', icon: Calendar },
                { label: 'Budget',     value: programme.budget != null ? `RM ${Number(programme.budget).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—', icon: DollarSign },
              ].map(f => {
                const Icon = f.icon
                return (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} color="#818cf8" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '10px', color: '#4b5563', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#e2e8f0' }}>{f.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            {programme.description && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#4b5563', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.7 }}>{programme.description}</p>
              </div>
            )}
          </div>

          {/* ── LIFECYCLE TABS ─────────────────────────────────────────── */}
          {showPhaseTabs && (
            <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {PHASES.map(phase => {
                  const isActive = activeTab === phase.id
                  const count = tabDocCount(phase.id)
                  const total = checklistTotal(phase.id)
                  const isComplete = total !== null && count === total
                  return (
                    <button key={phase.id} onClick={() => setActiveTab(phase.id)} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '14px 10px', border: 'none',
                      borderBottom: isActive ? `2px solid ${phase.color}` : '2px solid transparent',
                      background: isActive ? phase.activeBg : 'transparent',
                      color: isActive ? phase.color : '#6b7280',
                      fontSize: '13px', fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                    }}>
                      <Clock size={13} />
                      {phase.label}
                      {count > 0 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '9px',
                          fontSize: '10px', fontWeight: 700,
                          background: isComplete ? 'rgba(16,185,129,0.2)' : isActive ? phase.color : 'rgba(255,255,255,0.08)',
                          color: isComplete ? '#10b981' : isActive ? '#070e1a' : '#94a3b8',
                        }}>
                          {total !== null ? `${count}/${total}` : count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Tab content */}
              <div style={{ padding: '20px' }}>
                {activeTab === 'pre' && (
                  <ChecklistPhaseTab
                    key="pre"
                    phase="pre"
                    checklist={PRE_CHECKLIST}
                    programmeId={programme.id}
                    docs={phaseDocs}
                    onDocsChange={setPhaseDocs}
                    canUpload={canUpload}
                  />
                )}
                {activeTab === 'during' && (
                  <DuringPhaseTab
                    key="during"
                    programmeId={programme.id}
                    docs={phaseDocs}
                    onDocsChange={setPhaseDocs}
                    canUpload={canUpload}
                  />
                )}
                {activeTab === 'post' && (
                  <ChecklistPhaseTab
                    key="post"
                    phase="post"
                    checklist={POST_CHECKLIST}
                    programmeId={programme.id}
                    docs={phaseDocs}
                    onDocsChange={setPhaseDocs}
                    canUpload={canUpload}
                  />
                )}
              </div>
            </div>
          )}

          {/* Resubmit form */}
          {canResubmit && (
            <div style={{ background: '#0c1526', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px', padding: '24px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={15} color="#818cf8" />Revise & Resubmit
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#4b5563' }}>
                Address the rejection comment above, update the fields below, then resubmit for review.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { label: 'Programme Name', key: 'name',       type: 'text',   span: 2 },
                  { label: 'Venue',          key: 'venue',       type: 'text',   span: 2 },
                  { label: 'Start Date',     key: 'start_date',  type: 'date',   span: 1 },
                  { label: 'End Date',       key: 'end_date',    type: 'date',   span: 1 },
                  { label: 'Budget (RM)',    key: 'budget',      type: 'number', span: 1 },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: `span ${f.span}` }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>{f.label}</label>
                    <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Category</label>
                  <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: '#0a1628', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}>
                    {['Academic', 'Sports', 'Community Service', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
                </div>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleResubmit} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: '8px', padding: '10px 20px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  <RefreshCw size={14} />{saving ? 'Resubmitting...' : 'Resubmit for Review'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}