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
import { useTheme } from '@/app/provider/ThemeContext'


/* ─── ChecklistPhaseTab ─────────────────────────────────────────────────── */
export default function ChecklistPhaseTab({ phase, checklist, programmeId, docs, onDocsChange, canUpload }: {
  phase: 'pre' | 'during' | 'post'; checklist: { key: string; label: string; hint: string }[]
  programmeId: string; docs: PhaseDoc[]; onDocsChange: (u: PhaseDoc[]) => void; canUpload: boolean
}) {
  const { t } = useTheme()
  const phaseInfo = PHASES.find(p => p.id === phase)!
  const phaseDocs = docs.filter(d => d.phase === phase)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<PhaseDoc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<PhaseDoc | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const docsForKey = (key: string) => phaseDocs.filter(d => d.doc_type === key)
  const completedCount = checklist.filter(item => docsForKey(item.key).length > 0).length

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileErrors(prev => ({ ...prev, [docKey]: 'Only PDF files are allowed.' }))
      const ref = fileRefs.current[docKey]
      if (ref) ref.value = ''
      return
    }

    setFileErrors(prev => {
      const next = { ...prev }
      delete next[docKey]
      return next
    })
    setUploadingKey(docKey)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('programme_id', programmeId)
    fd.append('phase', phase)
    fd.append('doc_type', docKey)

    const { data: { session } } = await supabase.auth.getSession()

    try {
      await uploadDocument(fd, session?.access_token || '')

      const updatedDocs = await getDocuments(programmeId)
      const docsData = Array.isArray(updatedDocs) ? updatedDocs : updatedDocs.data
      onDocsChange(docsData ?? [])

    } catch (err: any) {
      alert(err.message || 'Upload failed')
    } finally {
      setUploadingKey(null)
      const ref = fileRefs.current[docKey]
      if (ref) ref.value = ''
    }
  }

  const handleDelete = (doc: PhaseDoc) => {
    setDeleteDoc(doc)
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

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checklist Progress</p>
          <span style={{ fontSize: '11px', fontWeight: 600, color: completedCount === checklist.length ? '#10b981' : phaseInfo.color }}>
            {completedCount} / {checklist.length} completed
          </span>
        </div>

        <div style={{ height: '5px', background: t.bgInput, borderRadius: '99px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${(completedCount / checklist.length) * 100}%`,
              background: completedCount === checklist.length
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : `linear-gradient(90deg, ${phaseInfo.color}aa, ${phaseInfo.color})`,
              borderRadius: '99px',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {checklist.map(item => {
          const itemDocs = docsForKey(item.key)
          const isDone = itemDocs.length > 0
          const isUploading = uploadingKey === item.key

          return (
            <div
              key={item.key}
              style={{
                border: `1px solid ${isDone ? 'rgba(16,185,129,0.25)' : t.border}`,
                borderRadius: '11px',
                overflow: 'hidden',
                background: isDone ? 'rgba(16,185,129,0.03)' : t.bgInput
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                <div style={{ flexShrink: 0 }}>
                  {isDone ? (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={16} color="#10b981" />
                    </div>
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <XCircle size={15} color="#ef4444" />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: isDone ? t.text : t.textMuted }}>
                    {item.label}
                    {isDone && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 500, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '4px' }}>
                        Uploaded
                      </span>
                    )}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textFaint }}>
                    {item.hint}
                  </p>
                </div>

                {canUpload && (
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '7px',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      border: `1px solid ${isDone ? 'rgba(16,185,129,0.3)' : `${phaseInfo.color}4d`}`,
                      background: isDone ? 'rgba(16,185,129,0.1)' : `${phaseInfo.color}1a`,
                      color: isDone ? '#10b981' : phaseInfo.color,
                      fontSize: '12px',
                      fontWeight: 500,
                      flexShrink: 0,
                      opacity: isUploading ? 0.6 : 1
                    }}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={12} />
                        {isDone ? 'Replace' : 'Upload'}
                      </>
                    )}

                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      style={{ display: 'none' }}
                      disabled={isUploading}
                      ref={el => { fileRefs.current[item.key] = el }}
                      onChange={e => handleUpload(e, item.key)}
                    />
                  </label>
                )}
              </div>

              {fileErrors[item.key] && (
                <div style={{ margin: '0 16px 14px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={13} color="#ef4444" />
                  <span style={{ fontSize: '12px', color: '#ef4444' }}>{fileErrors[item.key]}</span>
                </div>
              )}

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

      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, backdropFilter: 'blur(6px)', padding: '16px' }}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.borderInput}`, width: '100%', maxWidth: '960px', height: '90vh', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: phaseInfo.activeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={15} color={phaseInfo.color} />
                </div>
                <span style={{ color: t.text, fontSize: '14px', fontWeight: 500 }}>
                  {previewDoc.file_name}
                </span>
              </div>

              <button onClick={() => setPreviewDoc(null)} style={{ background: t.bgInput, border: `1px solid ${t.borderInput}`, borderRadius: '7px', padding: '6px', color: t.textFaint, cursor: 'pointer' }}>
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

      {deleteDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: '16px', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.borderInput}`, width: '100%', maxWidth: '360px', padding: '20px', borderRadius: '14px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={18} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: t.text, fontWeight: 700 }}>Delete this document?</h3>
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
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
