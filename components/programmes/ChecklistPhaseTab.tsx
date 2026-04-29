'use client'

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

type PhaseDoc = {
  id: string
  phase: 'pre' | 'during' | 'post'
  doc_type: string
  file_url?: string
  [key: string]: any
}

/* ─── ChecklistPhaseTab ─────────────────────────────────────────────────── */
export default function ChecklistPhaseTab({ phase, checklist, programmeId, docs, onDocsChange, canUpload }: {
  phase: 'pre' | 'during' | 'post'; checklist: { key: string; label: string; hint: string }[]
  programmeId: string; docs: PhaseDoc[]; onDocsChange: (u: PhaseDoc[]) => void; canUpload: boolean
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
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checklist Progress</p>
          <span style={{ fontSize: '11px', fontWeight: 600, color: completedCount === checklist.length ? '#10b981' : phaseInfo.color }}>
            {completedCount} / {checklist.length} completed
          </span>
        </div>

        <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
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
                border: `1px solid ${isDone ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '11px',
                overflow: 'hidden',
                background: isDone ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)'
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
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: isDone ? '#f1f5f9' : '#94a3b8' }}>
                    {item.label}
                    {isDone && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 500, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '4px' }}>
                        Uploaded
                      </span>
                    )}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#475569' }}>
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
                      style={{ display: 'none' }}
                      disabled={isUploading}
                      ref={el => { fileRefs.current[item.key] = el }}
                      onChange={e => handleUpload(e, item.key)}
                    />
                  </label>
                )}
              </div>

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
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '960px', height: '90vh', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: phaseInfo.activeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
