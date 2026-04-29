'use client'
import { PhaseDoc } from '@/lib/types'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock,
  Calendar, MapPin, DollarSign, BookOpen, RefreshCw,
  Upload, FileText, Download, Eye, X, Trash2,
  Users, UserPlus, UserX, Hash,
} from 'lucide-react'
import { uploadDocument, getDocuments, deleteDocument } from '@/services/documentService'
import { PHASES } from '@/lib/constants'
import DocRow from '@/components/programmes/DocRow'

/* ─── DuringPhaseTab ────────────────────────────────────────────────────── */
export default function DuringPhaseTab({ programmeId, docs, onDocsChange, canUpload }: {
  programmeId: string; docs: PhaseDoc[]; onDocsChange: (u: PhaseDoc[]) => void; canUpload: boolean
}) {
  const phaseInfo = PHASES[1]
  const phaseDocs = docs.filter(d => d.phase === 'during')
  const [uploading, setUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<PhaseDoc | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('programme_id', programmeId)
    fd.append('phase', 'during')

    const { data: { session } } = await supabase.auth.getSession()

    try {
      await uploadDocument(fd, session?.access_token || '')

      const updatedDocs = await getDocuments(programmeId)
      const docsData = Array.isArray(updatedDocs) ? updatedDocs : updatedDocs.data
      onDocsChange(docsData ?? [])

    } catch (err: any) {
      alert(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (doc: PhaseDoc) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return

    try {
      await deleteDocument(doc.id)

      const updatedDocs = await getDocuments(programmeId)
      const docsData = Array.isArray(updatedDocs) ? updatedDocs : updatedDocs.data
      onDocsChange(docsData ?? [])

    } catch (err: any) {
      alert(err.message || 'Delete failed')
    }
  }

  const handleDownload = async (doc: PhaseDoc) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${doc.file_path}`
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = blobUrl
    a.download = doc.file_name
    document.body.appendChild(a)
    a.click()
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

          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 18px',
            background: phaseInfo.activeBg,
            border: `1px solid ${phaseInfo.activeBorder}`,
            color: phaseInfo.color,
            borderRadius: '7px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            opacity: uploading ? 0.6 : 1
          }}>
            {uploading ? (
              <>
                <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={13} />
                Choose File
              </>
            )}

            <input
              ref={fileRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {phaseDocs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <FileText size={24} color="#334155" style={{ margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>No photos uploaded yet.</p>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, backdropFilter: 'blur(6px)', padding: '16px' }}>
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '960px', height: '90vh', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: phaseInfo.activeBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={15} color={phaseInfo.color} />
                </div>
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500 }}>
                  {previewDoc.file_name}
                </span>
              </div>

              <button onClick={() => setPreviewDoc(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '6px', color: '#64748b', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <iframe
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${previewDoc.file_path}`}
              style={{ width: '100%', flex: 1, background: 'white', borderRadius: '8px', border: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
