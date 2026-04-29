'use client'

import { PhaseDoc } from '@/lib/types'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock,
  Calendar, MapPin, DollarSign, BookOpen, RefreshCw,
  Upload, FileText, Download, Eye, X, Trash2,
  Users, UserPlus, UserX, Hash,
} from 'lucide-react'

import {getDocuments} from '@/services/documentService'
import CommitteeSection from '@/components/programmes/CommitteeSection'
import ChecklistPhaseTab from '@/components/programmes/ChecklistPhaseTab'
import DuringPhaseTab from '@/components/programmes/DuringPhaseTab'
import DocRow from '@/components/programmes/DocRow'
import { PHASES, PRE_CHECKLIST, POST_CHECKLIST, SINGLE_ROLE_LIMIT } from '@/lib/constants'

interface Programme {
  id: string; name: string; description: string; category: string
  venue: string; budget: number; start_date: string; end_date: string
  status: string; created_at: string; rejection_reason: string | null
  programme_director_id: string
}

interface CommitteeMember {
  id: string
  role: string
  created_at: string
  user_id: string
  users: { id: string; full_name: string; matric_number: string; phone?: string }
}

type Phase = 'pre' | 'during' | 'post'

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  Pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  icon: AlertCircle },
  Approved: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  icon: CheckCircle },
  Rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   icon: XCircle },
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
  const [sessionToken, setSessionToken] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const [form, setForm] = useState({ name: '', category: '', venue: '', budget: '', start_date: '', end_date: '', description: '' })
  const [resubmitDateError, setResubmitDateError] = useState('')
  const [resubmitBudgetError, setResubmitBudgetError] = useState('')
  const [resubmitBudgetCents, setResubmitBudgetCents] = useState(0)
  const [resubmitSuccess, setResubmitSuccess] = useState(false)
  const [resubmitApiError, setResubmitApiError] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isElevatedMember, setIsElevatedMember] = useState(false)

  useEffect(() => {
    if (!id) return
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setSessionToken(session.access_token)
      setCurrentUserId(session.user.id)

      const { data: userData } = await supabase.from('users').select('roles(name)').eq('id', session.user.id).single()
      const role = (userData?.roles as any)?.name?.toLowerCase() ?? 'student'
      setIsAdmin(role === 'admin' || role === 'superadmin')

      const res = await fetch(`/api/programmes/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) { setError('Programme not found or you do not have access.'); setLoading(false); return }

      const data = await res.json()
      const prog: Programme = data.programme
      setIsOwner(!!data.isDirector)

      // Check if user is an approved committee member with an elevated role
      if (!data.isDirector) {
        const { data: committeeEntry } = await supabase
          .from("programme_roles")
          .select("role")
          .eq("programme_id", id)
          .eq("user_id", session.user.id)
          .eq("status", "approved")
          .maybeSingle()
        setIsElevatedMember(
          committeeEntry != null && SINGLE_ROLE_LIMIT.includes(committeeEntry.role)
        )
      }
      setProgramme(prog)
      setForm({
        name: prog.name ?? '', category: prog.category ?? '', venue: prog.venue ?? '',
        budget: prog.budget != null ? Number(prog.budget).toFixed(2) : '0.00',
        start_date: prog.start_date ? prog.start_date.slice(0, 10) : '',
        end_date: prog.end_date ? prog.end_date.slice(0, 10) : '',
        description: prog.description ?? '',
      })
      setResubmitBudgetCents(prog.budget != null ? Math.round(prog.budget * 100) : 0)

      const docs = await getDocuments(id)
      const docsData = Array.isArray(docs) ? docs : docs.data
      setPhaseDocs(docsData ?? [])
      setLoading(false)
    }
    init()
  }, [id, router])

  const validateResubmitDates = (start: string, end: string) => {
    if (start && end && new Date(end) < new Date(start)) { setResubmitDateError('End date cannot be before the start date.'); return false }
    setResubmitDateError(''); return true
  }

  const centsToDisplay = (cents: number) => {
    const ringgit = Math.floor(cents / 100)
    const sen = cents % 100
    return `${ringgit.toLocaleString('en-MY')}.${sen.toString().padStart(2, '0')}`
  }

  const handleResubmitBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const next = resubmitBudgetCents * 10 + Number(e.key)
      setResubmitBudgetCents(next)
      setForm(prev => ({ ...prev, budget: (next / 100).toFixed(2) }))
      if (next > 499999) { setResubmitBudgetError('Budget must be below RM 5,000.00'); return }
      setResubmitBudgetError('')
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const next = Math.floor(resubmitBudgetCents / 10)
      setResubmitBudgetCents(next)
      setForm(prev => ({ ...prev, budget: (next / 100).toFixed(2) }))
      setResubmitBudgetError('')
    } else if (e.key === 'Delete') {
      e.preventDefault()
      setResubmitBudgetCents(0)
      setForm(prev => ({ ...prev, budget: '0.00' }))
      setResubmitBudgetError('')
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
    }
  }

  const handleResubmitBudgetBlur = () => {
    if (resubmitBudgetCents <= 0) { setResubmitBudgetError('Budget must be more than RM 0.00'); return }
    if (resubmitBudgetCents > 499999) { setResubmitBudgetError('Budget must be below RM 5,000.00'); return }
    setResubmitBudgetError('')
  }

  const handleResubmit = async () => {
    if (!form.name || !form.start_date || !form.end_date) { setResubmitApiError('Name, start date, and end date are required.'); return }
    const datesOk = validateResubmitDates(form.start_date, form.end_date)
    if (!datesOk) return
    if (resubmitBudgetCents <= 0) { setResubmitBudgetError('Budget must be more than RM 0.00'); return }
    if (resubmitBudgetCents > 499999) { setResubmitBudgetError('Budget must be below RM 5,000.00'); return }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const res = await fetch(`/api/programmes/${id}/resubmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...form, budget: parseFloat(form.budget) }),
    })
    if (res.ok) { const data = await res.json(); setProgramme(data.programme); setResubmitSuccess(true); setResubmitApiError('') }
    else { const data = await res.json(); setResubmitApiError(data.error ?? 'Failed to resubmit.') }
    setSaving(false)
  }

  const canUpload     = isAdmin || isOwner || isElevatedMember
  const canManageCommittee = isAdmin || isOwner

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

  const ErrorBox = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', marginTop: '6px' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', lineHeight: 1.5 }}>{msg}</p>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#475569', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>Loading programme...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error || !programme) return (
    <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#f87171', fontSize: '14px' }}>{error || 'Programme not found.'}</p>
      <button onClick={() => router.back()} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={14} />Go back</button>
    </div>
  )

  const sc = statusConfig[programme.status] ?? statusConfig['Pending']
  const StatusIcon = sc.icon
  const isRejected = programme.status === 'Rejected'
  const canResubmit = isRejected && isOwner
  const hasResubmitError = !!resubmitDateError || !!resubmitBudgetError

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#070e1a', fontFamily: "'DM Sans', sans-serif", color: '#e2e8f0', padding: isMobile ? '0' : '28px 20px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {isMobile && (
            <div style={{ background: '#0a1220', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 20 }}>
              <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}><ArrowLeft size={20} /></button>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{programme.name}</h1>
            </div>
          )}

          {!isMobile && (
            <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', marginBottom: '24px', padding: 0 }}>
              <ArrowLeft size={14} />Back to Programmes
            </button>
          )}

          <div style={{ padding: isMobile ? '16px' : '0' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{programme.name}</h1>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#4b5563' }}>Submitted {new Date(programme.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                <StatusIcon size={13} />{programme.status}
              </span>
            </div>

            {/* Rejection banner */}
            {isRejected && programme.rejection_reason && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}><XCircle size={13} />Rejection Comment</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#fca5a5', lineHeight: 1.7 }}>{programme.rejection_reason}</p>
              </div>
            )}

            {/* Details card */}
            <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: isMobile ? '16px' : '24px', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Programme Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
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
                      <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={13} color="#818cf8" /></div>
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

            {/* ── COMMITTEE MEMBERS ─────────────────────────────────── */}
            {sessionToken && currentUserId && (
              <CommitteeSection
                programmeId={programme.id}
                canManage={canManageCommittee}
                token={sessionToken}
                currentUserId={currentUserId}
                programmeStatus={programme.status}
              />
            )}

            {/* LIFECYCLE TABS */}
            <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {PHASES.map(phase => {
                  const isActive = activeTab === phase.id
                  const count = tabDocCount(phase.id)
                  const total = checklistTotal(phase.id)
                  const isComplete = total !== null && count === total
                  return (
                    <button key={phase.id} onClick={() => setActiveTab(phase.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: isMobile ? '12px 6px' : '14px 10px', border: 'none', borderBottom: isActive ? `2px solid ${phase.color}` : '2px solid transparent', background: isActive ? phase.activeBg : 'transparent', color: isActive ? phase.color : '#6b7280', fontSize: '13px', fontWeight: isActive ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}>
                      <Clock size={13} />{phase.label}
                      {count > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '9px', fontSize: '10px', fontWeight: 700, background: isComplete ? 'rgba(16,185,129,0.2)' : isActive ? phase.color : 'rgba(255,255,255,0.08)', color: isComplete ? '#10b981' : isActive ? '#070e1a' : '#94a3b8' }}>
                          {total !== null ? `${count}/${total}` : count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div style={{ padding: isMobile ? '14px' : '20px' }}>
                {activeTab === 'pre'    && <ChecklistPhaseTab key="pre"    phase="pre"  checklist={PRE_CHECKLIST}  programmeId={programme.id} docs={phaseDocs} onDocsChange={(u) => setPhaseDocs(u)} canUpload={canUpload} />}
                {activeTab === 'during' && <DuringPhaseTab    key="during"              programmeId={programme.id} docs={phaseDocs} onDocsChange={setPhaseDocs} canUpload={canUpload} />}
                {activeTab === 'post'   && <ChecklistPhaseTab key="post"   phase="post" checklist={POST_CHECKLIST} programmeId={programme.id} docs={phaseDocs} onDocsChange={(u) => setPhaseDocs(u)} canUpload={canUpload} />}
              </div>
            </div>

            {/* RESUBMIT FORM */}
            {canResubmit && (
              <div style={{ background: '#0c1526', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px', padding: isMobile ? '16px' : '24px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={15} color="#818cf8" />Revise & Resubmit</h2>
                <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#4b5563' }}>Address the rejection comment above, update the fields below, then resubmit for review.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Programme Name</label>
                    <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Venue</label>
                    <input type="text" value={form.venue} onChange={e => setForm(prev => ({ ...prev, venue: e.target.value }))} style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Start Date</label>
                      <input type="date" style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${resubmitDateError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`, color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} value={form.start_date} onChange={e => { setForm(prev => ({ ...prev, start_date: e.target.value })); validateResubmitDates(e.target.value, form.end_date) }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>End Date</label>
                      <input type="date" style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${resubmitDateError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`, color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} value={form.end_date} onChange={e => { setForm(prev => ({ ...prev, end_date: e.target.value })); validateResubmitDates(form.start_date, e.target.value) }} />
                    </div>
                  </div>
                  {resubmitDateError && <ErrorBox msg={resubmitDateError} />}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Budget (RM)</label>
                      <input type="text" inputMode="numeric" style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${resubmitBudgetError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`, color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} value={centsToDisplay(resubmitBudgetCents)}
                        onChange={() => {}}
                        onKeyDown={handleResubmitBudgetKeyDown}
                        onBlur={handleResubmitBudgetBlur} />
                      {resubmitBudgetError && <ErrorBox msg={resubmitBudgetError} />}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Category</label>
                      <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: '#0a1628', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}>
                        {['Academic', 'Sports', 'Community Service', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Description</label>
                    <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
                  </div>
                </div>
                {resubmitApiError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '11px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', marginTop: '20px' }}>
                    <XCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', lineHeight: 1.5 }}>{resubmitApiError}</p>
                  </div>
                )}
                {!resubmitSuccess && (
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleResubmit} disabled={saving || hasResubmitError}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: saving || hasResubmitError ? 'rgba(99,102,241,0.35)' : 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: '8px', padding: '10px 20px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: saving || hasResubmitError ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                      <RefreshCw size={14} />{saving ? 'Resubmitting...' : 'Resubmit for Review'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success banner */}
            {resubmitSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', marginBottom: '24px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle size={20} color="#10b981" /></div>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#10b981' }}>Resubmitted successfully!</p>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#059669', lineHeight: 1.5 }}>Your programme is now Pending review by the admin.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
