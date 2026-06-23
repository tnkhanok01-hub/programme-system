'use client'
import { PhaseDoc } from '@/lib/types'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  CheckCircle, XCircle, RefreshCw, Upload, FileText, Download, Eye, X, Trash2,
} from 'lucide-react'
import { uploadDocument, getDocuments, deleteDocument } from '@/services/documentService'
import { PHASES } from '@/lib/constants'
import { useTheme } from '@/app/provider/ThemeContext'

const REQUIRED_PHOTOS = 5

/* ─── DuringPhaseTab ────────────────────────────────────────────────────── */
export default function DuringPhaseTab({ programmeId, docs, onDocsChange, canUpload }: {
  programmeId: string; docs: PhaseDoc[]; onDocsChange: (u: PhaseDoc[]) => void; canUpload: boolean
}) {
  const { t } = useTheme()
  const phaseInfo = PHASES[1]
  const phaseDocs = docs.filter(d => d.phase === 'during')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [previewDoc, setPreviewDoc] = useState<PhaseDoc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<PhaseDoc | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const completedCount = phaseDocs.length
  const allDone = completedCount >= REQUIRED_PHOTOS

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const invalid = files.filter(f => f.type !== 'image/png' && f.type !== 'image/jpeg')
    if (invalid.length > 0) {
      alert(`${invalid.length} file(s) skipped — only PNG or JPG allowed:\n${invalid.map(f => f.name).join(', ')}`)
    }

    const remaining = REQUIRED_PHOTOS - completedCount
    const toUpload = files.filter(f => f.type === 'image/png' || f.type === 'image/jpeg').slice(0, remaining)
    if (toUpload.length === 0) {
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    setUploadProgress({ current: 0, total: toUpload.length })

    const { data: { session } } = await supabase.auth.getSession()

    try {
      for (let i = 0; i < toUpload.length; i++) {
        setUploadProgress({ current: i + 1, total: toUpload.length })
        const fd = new FormData()
        fd.append('file', toUpload[i])
        fd.append('programme_id', programmeId)
        fd.append('phase', 'during')
        await uploadDocument(fd, session?.access_token || '')
      }
      const updatedDocs = await getDocuments(programmeId)
      const docsData = Array.isArray(updatedDocs) ? updatedDocs : updatedDocs.data
      onDocsChange(docsData ?? [])
    } catch (err: any) {
      alert(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const confirmDelete = async () => {
    if (!deleteDoc) return
    setIsDeleting(true)
    try {
      await deleteDocument(deleteDoc.id)
      const updatedDocs = await getDocuments(programmeId)
      const docsData = Array.isArray(updatedDocs) ? updatedDocs : updatedDocs.data
      onDocsChange(docsData ?? [])
      setDeleteDoc(null)
    } catch (err: any) {
      alert(err.message || 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = async (doc: PhaseDoc) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${doc.file_path}`
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = doc.file_name || 'file'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(blobUrl)
  }

  const slots = Array.from({ length: REQUIRED_PHOTOS }, (_, i) => ({
    index: i + 1,
    doc: phaseDocs[i] ?? null,
  }))

  return (
    <div>
      {/* Progress */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Photo Checklist</p>
          <span style={{ fontSize: '11px', fontWeight: 600, color: allDone ? '#10b981' : phaseInfo.color }}>
            {completedCount} / {REQUIRED_PHOTOS} photos uploaded
          </span>
        </div>
        <div style={{ height: '5px', background: t.bgInput, borderRadius: '99px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(completedCount / REQUIRED_PHOTOS, 1) * 100}%`,
              background: allDone
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : `linear-gradient(90deg, ${phaseInfo.color}aa, ${phaseInfo.color})`,
              borderRadius: '99px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Checklist slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {slots.map(({ index, doc }) => (
          <div
            key={index}
            style={{
              border: `1px solid ${doc ? 'rgba(16,185,129,0.25)' : t.border}`,
              borderRadius: '11px',
              overflow: 'hidden',
              background: doc ? 'rgba(16,185,129,0.03)' : t.bgInput,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
              {/* Status icon */}
              <div style={{ flexShrink: 0 }}>
                {doc ? (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={16} color="#10b981" />
                  </div>
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={15} color="#ef4444" />
                  </div>
                )}
              </div>

              {/* Label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: doc ? t.text : t.textMuted }}>
                  Photo {index}
                  {doc && (
                    <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 500, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '4px' }}>
                      Uploaded
                    </span>
                  )}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc ? doc.file_name : 'No image uploaded yet — PNG or JPG'}
                </p>
              </div>

              {/* Actions for an uploaded slot */}
              {doc && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '7px', border: `1px solid ${phaseInfo.activeBorder}`, background: phaseInfo.activeBg, color: phaseInfo.color, fontSize: '11px', cursor: 'pointer' }}
                  >
                    <Eye size={11} />View
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 8px', borderRadius: '7px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.textFaint, fontSize: '11px', cursor: 'pointer' }}
                  >
                    <Download size={11} />
                  </button>
                  {canUpload && (
                    <button
                      onClick={() => setDeleteDoc(doc)}
                      style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 8px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              )}

              {/* Upload button on the next empty slot only */}
              {!doc && canUpload && completedCount === index - 1 && (
                <label
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px', borderRadius: '7px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    border: `1px solid ${phaseInfo.color}4d`,
                    background: `${phaseInfo.color}1a`,
                    color: phaseInfo.color, fontSize: '12px', fontWeight: 500,
                    flexShrink: 0, opacity: uploading ? 0.6 : 1,
                  }}
                >
                  {uploading ? (
                    <><RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
                    {uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : 'Uploading...'}</>
                  ) : (
                    <><Upload size={12} />Upload</>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    multiple
                    style={{ display: 'none' }}
                    disabled={uploading}
                    onChange={handleUpload}
                  />
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image preview modal */}
      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, backdropFilter: 'blur(6px)', padding: '16px' }}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.borderInput}`, width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: phaseInfo.activeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={15} color={phaseInfo.color} />
                </div>
                <span style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewDoc.file_name}
                </span>
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ background: t.bgInput, border: `1px solid ${t.borderInput}`, borderRadius: '7px', padding: '6px', color: t.textFaint, cursor: 'pointer', flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${previewDoc.file_path}`}
                alt={previewDoc.file_name ?? 'Photo preview'}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: '16px', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.borderInput}`, width: '100%', maxWidth: '360px', padding: '20px', borderRadius: '14px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={18} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: t.text, fontWeight: 700 }}>Delete this photo?</h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {deleteDoc.file_name} — this action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeleteDoc(null)}
                disabled={isDeleting}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, fontSize: '13px', fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 12px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontSize: '13px', fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.7 : 1 }}
              >
                {isDeleting ? (
                  <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />Deleting...</>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
