'use client'

import { PhaseDoc } from '@/lib/types'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock,
  Calendar, MapPin, DollarSign, BookOpen, RefreshCw,
  FileText, Download, Eye, X, Trash2,
  Users, UserCheck, WalletCards,
} from 'lucide-react'

import { useTheme } from '@/app/provider/ThemeContext'
import { generateApprovalLetter } from '@/lib/generateApprovalLetter'
import {getDocuments} from '@/services/documentService'
import CommitteeSection from '@/components/programmes/CommitteeSection'
import ChecklistPhaseTab from '@/components/programmes/ChecklistPhaseTab'
import DuringPhaseTab from '@/components/programmes/DuringPhaseTab'
import SurveyReportTab from '@/components/programmes/SurveyReportTab'
import { PHASES, PRE_CHECKLIST, POST_CHECKLIST, SINGLE_ROLE_LIMIT, APPROVAL_CHECKLIST } from '@/lib/constants'
import { canUseProgrammeFinance } from '@/lib/financeAccess.js'

interface Programme {
  id: string; name: string; description: string; category: string
  organiser: string; venue: string; budget: number; start_date: string; end_date: string
  status: string; created_at: string; rejection_reason: string | null
  programme_director_id: string
  approved_by_admin_name?: string | null
  approved_by_superadmin_name?: string | null
  approved_at?: string | null
  no_rujukan?: string | null
  advisor_id?: string | null
}

type Phase = 'pre' | 'during' | 'post' | 'survey'
type RoleJoin = { name?: string | null } | { name?: string | null }[] | null

function getRoleName(roles: RoleJoin) {
  return (Array.isArray(roles) ? roles[0]?.name : roles?.name)?.toLowerCase()
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', marginTop: '6px' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', lineHeight: 1.5 }}>{msg}</p>
    </div>
  )
}

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  Pending:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  icon: AlertCircle },
  'Under Review': { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)',  icon: Clock },
  Approved:       { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)',  icon: CheckCircle },
  Completed:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.22)',   icon: CheckCircle },
  Rejected:       { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',   icon: XCircle },
}

/* ─── LIFECYCLE BADGE ────────────────────────────────────────────────────── */
function LifecycleBadge({ start, end }: { start: string; end: string }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const s = new Date(start); s.setHours(0, 0, 0, 0)
  const e = new Date(end);   e.setHours(0, 0, 0, 0)

  let label: string, color: string, bg: string, border: string

  if (today < s) {
    label = 'Pre-Programme'; color = '#38bdf8'
    bg = 'rgba(56,189,248,0.12)'; border = 'rgba(56,189,248,0.25)'
  } else if (today <= e) {
    label = 'In Progress'; color = '#10b981'
    bg = 'rgba(16,185,129,0.12)'; border = 'rgba(16,185,129,0.25)'
  } else {
    label = 'Post-Programme'; color = '#94a3b8'
    bg = 'rgba(148,163,184,0.12)'; border = 'rgba(148,163,184,0.25)'
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: bg, color, border: `1px solid ${border}`,
      borderRadius: '8px', padding: '5px 11px',
      fontSize: '11px', fontWeight: 600, flexShrink: 0,
    }}>
      <Clock size={11} />{label}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function ProgrammeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { mode, t } = useTheme()

  const [programme, setProgramme] = useState<Programme | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Phase>('pre')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [phaseDocs, setPhaseDocs] = useState<PhaseDoc[]>([])
  const [sessionToken, setSessionToken] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const [form, setForm] = useState({ name: '', category: '', organiser: '', venue: '', budget: '', start_date: '', end_date: '', description: '' })
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
  const [programmeFinanceRole, setProgrammeFinanceRole] = useState('')
  const [userRole, setUserRole] = useState('student')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [completionLoading, setCompletionLoading] = useState(false)
  const [completionError, setCompletionError] = useState('')
  const [completionSuccess, setCompletionSuccess] = useState('')
  const [approvalPreviewDoc, setApprovalPreviewDoc] = useState<PhaseDoc | null>(null)
  const [directorInfo, setDirectorInfo] = useState<{ full_name: string; matric_number: string } | null>(null)
  const [advisorInfo, setAdvisorInfo] = useState<{ full_name: string; email?: string } | null>(null)
  useEffect(() => {
    if (!id) return
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setSessionToken(session.access_token)
      setCurrentUserId(session.user.id)

      const { data: userData } = await supabase.from('users').select('roles(name)').eq('id', session.user.id).single()
      const role = getRoleName(userData?.roles as RoleJoin) ?? 'student'
      setUserRole(role)
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
        setProgrammeFinanceRole(committeeEntry?.role ?? '')
      }
      setProgramme(prog)
      const { data: dirData } = await supabase
        .from('users')
        .select('full_name, matric_number')
        .eq('id', prog.programme_director_id)
        .single()
      if (dirData) setDirectorInfo(dirData)
      if (prog.advisor_id) {
        const { data: advData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', prog.advisor_id)
          .single()
        if (advData) setAdvisorInfo(advData)
      }
      setForm({
        name: prog.name ?? '', category: prog.category ?? '', organiser: prog.organiser ?? '', venue: prog.venue ?? '',
        budget: prog.budget != null ? Number(prog.budget).toFixed(2) : '0.00',
        start_date: prog.start_date ? prog.start_date.slice(0, 10) : '',
        end_date: prog.end_date ? prog.end_date.slice(0, 10) : '',
        description: prog.description ?? '',
      })
      setResubmitBudgetCents(prog.budget != null ? Math.round(prog.budget * 100) : 0)

      const docs = await getDocuments(id).catch(() => [])
      const docsData = Array.isArray(docs) ? docs : (docs?.data ?? [])
      setPhaseDocs(docsData)
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

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const res = await fetch(`/api/programmes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const dest = userRole === 'superadmin' ? '/superadmin' : userRole === 'admin' ? '/admin' : '/student'
      router.replace(dest)
    } else {
      const data = await res.json()
      setDeleteError(data.error ?? 'Failed to delete programme.')
      setIsDeleting(false)
    }
  }

  const handleGenerateApprovalLetter = async () => {
    if (!programme) return
    await generateApprovalLetter(programme, directorInfo, programme.no_rujukan ?? '')
  }

  const handleCompleteProgramme = async () => {
    if (!programme) return
    setCompletionLoading(true)
    setCompletionError('')
    setCompletionSuccess('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const res = await fetch(`/api/programmes/${programme.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()

    if (res.ok) {
      setProgramme(data.programme)
      setCompletionSuccess('Programme completed. Committee merit has been awarded.')
    } else {
      const missing = Array.isArray(data.missingDocs) && data.missingDocs.length > 0
        ? ` Missing: ${data.missingDocs.join(', ')}.`
        : ''
      setCompletionError(`${data.error ?? 'Failed to complete programme.'}${missing}`)
    }

    setCompletionLoading(false)
  }

  const canUpload          = isAdmin || isOwner || isElevatedMember
  const canManageCommittee = isAdmin || isOwner
  const canManageFinance   = canUseProgrammeFinance({ appRole: userRole, programmeRole: programmeFinanceRole })

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
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${t.accentBg}`, borderTopColor: t.accent, animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: t.textFaint, fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>Loading programme...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error || !programme) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#f87171', fontSize: '14px' }}>{error || 'Programme not found.'}</p>
      <button onClick={() => router.back()} style={{ color: t.accentText, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={14} />Go back</button>
    </div>
  )

  const sc = statusConfig[programme.status] ?? statusConfig['Pending']
  const StatusIcon      = sc.icon
  const isRejected      = programme.status === 'Rejected'
  const canResubmit     = isRejected && isOwner
  const hasResubmitError = !!resubmitDateError || !!resubmitBudgetError
  const postChecklistComplete = POST_CHECKLIST.every(item =>
    phaseDocs.some(d => d.phase === 'post' && d.doc_type === item.key)
  )
  const canCompleteProgramme = isAdmin && programme.status === 'Approved'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "'DM Sans', sans-serif", color: t.text, padding: isMobile ? '0' : '28px 20px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {isMobile && (
            <div style={{ background: t.bgCardAlt, borderBottom: `1px solid ${t.border}`, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 20 }}>
              <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}><ArrowLeft size={20} /></button>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{programme.name}</h1>
            </div>
          )}

          {!isMobile && (
            <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '13px', marginBottom: '24px', padding: 0 }}>
              <ArrowLeft size={14} />Back to Programmes
            </button>
          )}

          <div style={{ padding: isMobile ? '16px' : '0' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
              {/* Title — hidden on mobile since it's in the sticky nav */}
              {!isMobile && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>{programme.name}</h1>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: t.textFaintest }}>
                    Submitted {new Date(programme.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}

              {/* Mobile: submitted date + badges stacked full width */}
              {isMobile && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: t.textFaintest }}>
                    Submitted {new Date(programme.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {/* Row 1: status + delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}>
                      <StatusIcon size={13} />{programme.status}
                    </span>
                    {programme.status === 'Approved' && programme.start_date && programme.end_date && (
                      <LifecycleBadge start={programme.start_date} end={programme.end_date} />
                    )}
                    {(isOwner || isAdmin) && (
                      <button onClick={() => setShowDeleteModal(true)} title="Delete programme"
                        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {/* Row 2: approval letter full width */}
                  {programme.status === 'Approved' && (isOwner || isAdmin) && !!programme.no_rujukan && (
                    <button
                      onClick={handleGenerateApprovalLetter}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '13px', fontWeight: 500, cursor: 'pointer', width: '100%' }}
                    >
                      <Download size={13} />Download Approval Letter
                    </button>
                  )}
                </div>
              )}

              {/* Desktop: right-side badges */}
              {!isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}>
                      <StatusIcon size={13} />{programme.status}
                    </span>
                    {programme.status === 'Approved' && (isOwner || isAdmin) && !!programme.no_rujukan && (
                      <button
                        onClick={handleGenerateApprovalLetter}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        <Download size={13} />Approval Letter
                      </button>
                    )}
                    {(isOwner || isAdmin) && (
                      <button onClick={() => setShowDeleteModal(true)} title="Delete programme"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {programme.status === 'Approved' && programme.start_date && programme.end_date && (
                    <LifecycleBadge start={programme.start_date} end={programme.end_date} />
                  )}
                </div>
              )}
            </div>

            {/* Rejection banner */}
            {isRejected && programme.rejection_reason && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}><XCircle size={13} />Rejection Comment</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#fca5a5', lineHeight: 1.7 }}>{programme.rejection_reason}</p>
              </div>
            )}

            {/* Details card */}
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: isMobile ? '16px' : '24px', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Programme Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                {[
                  { label: 'Category',   value: programme.category  || '—', icon: BookOpen },
                  { label: 'Organiser',  value: programme.organiser || '—', icon: Users },
                  { label: 'Venue',      value: programme.venue     || '—', icon: MapPin },
                  { label: 'Start Date', value: programme.start_date ? new Date(programme.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '—', icon: Calendar },
                  { label: 'End Date',   value: programme.end_date   ? new Date(programme.end_date).toLocaleDateString('en-MY',   { day: 'numeric', month: 'long', year: 'numeric' }) : '—', icon: Calendar },
                  { label: 'Budget',     value: programme.budget != null ? `RM ${Number(programme.budget).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—', icon: DollarSign },
                ].map(f => {
                  const Icon = f.icon
                  return (
                    <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: t.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={13} color={t.accentText} /></div>
                      <div>
                        <p style={{ margin: 0, fontSize: '10px', color: t.textFaintest, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: t.text }}>{f.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              {programme.description && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
                  <p style={{ margin: '0 0 6px', fontSize: '10px', color: t.textFaintest, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</p>
                  <p style={{ margin: 0, fontSize: '13px', color: t.textMuted, lineHeight: 1.7 }}>{programme.description}</p>
                </div>
              )}
            </div>

            {/* ── ADVISOR ───────────────────────────────────────────── */}
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: isMobile ? '16px' : '24px', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 600, color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Advisor</h2>
              {advisorInfo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserCheck size={18} color="white" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: t.text }}>{advisorInfo.full_name}</p>
                    {advisorInfo.email && <p style={{ margin: '2px 0 0', fontSize: '12px', color: t.textFaint }}>{advisorInfo.email}</p>}
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: t.textFaintest }}>No advisor assigned.</p>
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
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, overflowX: 'auto' }}>
                {PHASES.map(phase => {
                  const isActive   = activeTab === phase.id
                  const count      = tabDocCount(phase.id)
                  const total      = checklistTotal(phase.id)
                  const isComplete = total !== null && count === total
                  return (
                    <button key={phase.id} onClick={() => setActiveTab(phase.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: isMobile ? '12px 6px' : '14px 10px', border: 'none', borderBottom: isActive ? `2px solid ${phase.color}` : '2px solid transparent', background: isActive ? phase.activeBg : 'transparent', color: isActive ? phase.color : t.textFaint, fontSize: '13px', fontWeight: isActive ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      <Clock size={13} />{phase.label}
                      {count > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '9px', fontSize: '10px', fontWeight: 700, background: isComplete ? 'rgba(16,185,129,0.2)' : isActive ? phase.color : t.bgInput, color: isComplete ? '#10b981' : isActive ? '#070e1a' : t.textMuted }}>
                          {total !== null ? `${count}/${total}` : count}
                        </span>
                      )}
                    </button>
                  )
                })}
                {(isAdmin || isOwner) && (
                  <button onClick={() => setActiveTab('survey')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: isMobile ? '12px 6px' : '14px 10px', border: 'none', borderBottom: activeTab === 'survey' ? '2px solid #f59e0b' : '2px solid transparent', background: activeTab === 'survey' ? 'rgba(245,158,11,0.12)' : 'transparent', color: activeTab === 'survey' ? '#f59e0b' : t.textFaint, fontSize: '13px', fontWeight: activeTab === 'survey' ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                    <Users size={13} />Surveys
                  </button>
                )}
              </div>
              <div style={{ padding: isMobile ? '14px' : '20px' }}>
                {activeTab === 'pre'    && <ChecklistPhaseTab key="pre"    phase="pre"  checklist={PRE_CHECKLIST}  programmeId={programme.id} docs={phaseDocs} onDocsChange={(u) => setPhaseDocs(u)} canUpload={canUpload} />}
                {activeTab === 'during' && <DuringPhaseTab    key="during"              programmeId={programme.id} docs={phaseDocs} onDocsChange={setPhaseDocs} canUpload={canUpload} />}
                {activeTab === 'post'   && (
                  <>
                    {canCompleteProgramme && (
                      <div style={{ marginBottom: '16px', padding: '14px 16px', borderRadius: '11px', background: postChecklistComplete ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${postChecklistComplete ? 'rgba(34,197,94,0.18)' : 'rgba(245,158,11,0.18)'}`, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: postChecklistComplete ? '#22c55e' : '#f59e0b' }}>
                            Complete Programme
                          </p>
                          <p style={{ margin: '3px 0 0', fontSize: '12px', color: t.textMuted, lineHeight: 1.5 }}>
                            {postChecklistComplete
                              ? 'Finalise this programme and award committee merit.'
                              : 'Upload all post-programme documents before completion.'}
                          </p>
                        </div>
                        <button
                          onClick={handleCompleteProgramme}
                          disabled={!postChecklistComplete || completionLoading}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '9px 14px', borderRadius: '8px', border: postChecklistComplete ? '1px solid rgba(34,197,94,0.28)' : '1px solid rgba(148,163,184,0.12)', background: postChecklistComplete ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.08)', color: postChecklistComplete ? '#22c55e' : t.textFaint, fontSize: '12px', fontWeight: 700, cursor: !postChecklistComplete || completionLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                        >
                          {completionLoading ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={13} />}
                          {completionLoading ? 'Completing...' : 'Complete & Award'}
                        </button>
                      </div>
                    )}
                    {completionError && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', marginBottom: '12px' }}>
                        <XCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', lineHeight: 1.5 }}>{completionError}</p>
                      </div>
                    )}
                    {completionSuccess && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 13px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: '8px', marginBottom: '12px' }}>
                        <CheckCircle size={14} color="#22c55e" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <p style={{ margin: 0, fontSize: '12px', color: '#22c55e', lineHeight: 1.5 }}>{completionSuccess}</p>
                      </div>
                    )}
                    <ChecklistPhaseTab key="post" phase="post" checklist={POST_CHECKLIST} programmeId={programme.id} docs={phaseDocs} onDocsChange={(u) => setPhaseDocs(u)} canUpload={canUpload} />
                  </>
                )}
                {activeTab === 'survey' && (isAdmin || isOwner) && <SurveyReportTab key="survey" programmeId={programme.id} programmeName={programme.name} />}
              </div>
            </div>

            {/* FINANCE */}
            {canManageFinance && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: isMobile ? '16px' : '20px', marginBottom: '24px', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(20,184,166,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <WalletCards size={17} color="#14b8a6" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: t.text }}>Finance</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: t.textFaint }}>Manage budget, transactions and reports for this programme.</p>
                  </div>
                </div>
                <Link
                  href={`/treasurer/finance?programmeId=${programme.id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 16px', borderRadius: '9px', border: '1px solid rgba(20,184,166,0.35)', background: 'rgba(20,184,166,0.12)', color: '#14b8a6', fontSize: '13px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  <WalletCards size={14} />Open Finance
                </Link>
              </div>
            )}

            {/* APPROVAL DOCUMENTS */}
            {(isAdmin || isOwner) && phaseDocs.some(d => d.phase === 'approval') && (
              <div style={{ background: t.bgCard, border: '1px solid rgba(167,139,250,0.15)', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: isMobile ? '14px 14px 10px' : '18px 20px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={13} color="#a78bfa" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: t.text }}>Approval Documentation</p>
                    <p style={{ margin: '1px 0 0', fontSize: '11px', color: t.textFaintest }}>Documents issued upon programme approval</p>
                  </div>
                </div>
                <div style={{ padding: isMobile ? '12px 14px' : '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {APPROVAL_CHECKLIST.map(item => {
                    const doc = phaseDocs.find(d => d.phase === 'approval' && d.doc_type === item.key)
                    return (
                      <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 13px', background: doc ? 'rgba(167,139,250,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${doc ? 'rgba(167,139,250,0.2)' : t.border}`, borderRadius: '9px' }}>
                        {doc
                          ? <CheckCircle size={14} color="#10b981" style={{ flexShrink: 0 }} />
                          : <FileText size={14} color={t.textFaintest} style={{ flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: doc ? t.text : t.textFaintest }}>{item.label}</p>
                          <p style={{ margin: '1px 0 0', fontSize: '11px', color: doc ? '#a78bfa' : t.textFaintest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc ? (doc.file_name || 'Uploaded') : 'Not yet available'}
                          </p>
                        </div>
                        {doc && (
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={() => setApprovalPreviewDoc(doc)}
                              style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 9px', borderRadius: '5px', border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                              <Eye size={11} />View
                            </button>
                            <button
                              onClick={async () => {
                                if (!doc.file_path) return
                                const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${doc.file_path}`
                                const res = await fetch(url)
                                const blob = await res.blob()
                                const blobUrl = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = blobUrl; a.download = doc.file_name || 'file'
                                document.body.appendChild(a); a.click()
                                document.body.removeChild(a)
                                window.URL.revokeObjectURL(blobUrl)
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 9px', borderRadius: '5px', border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.08)', color: '#34d399', fontSize: '11px', cursor: 'pointer' }}>
                              <Download size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* RESUBMIT FORM */}
            {canResubmit && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.accentBorder}`, borderRadius: '14px', padding: isMobile ? '16px' : '24px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={15} color={t.accentText} />Revise & Resubmit</h2>
                <p style={{ margin: '0 0 20px', fontSize: '12px', color: t.textFaintest }}>Address the rejection comment above, update the fields below, then resubmit for review.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textFaint, marginBottom: '5px', fontWeight: 500 }}>Programme Name</label>
                    <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: t.bgInput, border: `1px solid ${t.borderInput}`, color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textFaint, marginBottom: '5px', fontWeight: 500 }}>Organiser</label>
                    <input type="text" value={form.organiser} onChange={e => setForm(prev => ({ ...prev, organiser: e.target.value }))} style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: t.bgInput, border: `1px solid ${t.borderInput}`, color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textFaint, marginBottom: '5px', fontWeight: 500 }}>Venue</label>
                    <input type="text" value={form.venue} onChange={e => setForm(prev => ({ ...prev, venue: e.target.value }))} style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: t.bgInput, border: `1px solid ${t.borderInput}`, color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: t.textFaint, marginBottom: '5px', fontWeight: 500 }}>Start Date</label>
                      <input type="date" style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: t.bgInput, border: `1px solid ${resubmitDateError ? 'rgba(239,68,68,0.5)' : t.borderInput}`, color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box', colorScheme: mode === 'dark' ? 'dark' : 'light' }} value={form.start_date} onChange={e => { setForm(prev => ({ ...prev, start_date: e.target.value })); validateResubmitDates(e.target.value, form.end_date) }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: t.textFaint, marginBottom: '5px', fontWeight: 500 }}>End Date</label>
                      <input type="date" style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: t.bgInput, border: `1px solid ${resubmitDateError ? 'rgba(239,68,68,0.5)' : t.borderInput}`, color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box', colorScheme: mode === 'dark' ? 'dark' : 'light' }} value={form.end_date} onChange={e => { setForm(prev => ({ ...prev, end_date: e.target.value })); validateResubmitDates(form.start_date, e.target.value) }} />
                    </div>
                  </div>
                  {resubmitDateError && <ErrorBox msg={resubmitDateError} />}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: t.textFaint, marginBottom: '5px', fontWeight: 500 }}>Budget (RM)</label>
                      <input type="text" inputMode="numeric" style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: t.bgInput, border: `1px solid ${resubmitBudgetError ? 'rgba(239,68,68,0.5)' : t.borderInput}`, color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} value={centsToDisplay(resubmitBudgetCents)}
                        onChange={() => {}}
                        onKeyDown={handleResubmitBudgetKeyDown}
                        onBlur={handleResubmitBudgetBlur} />
                      {resubmitBudgetError && <ErrorBox msg={resubmitBudgetError} />}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: t.textFaint, marginBottom: '5px', fontWeight: 500 }}>Category</label>
                      <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: t.bgCardAlt, border: `1px solid ${t.borderInput}`, color: t.text, fontSize: '13px', outline: 'none' }}>
                        {['Academic', 'Sports', 'Community Service', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textFaint, marginBottom: '5px', fontWeight: 500 }}>Description</label>
                    <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: t.bgInput, border: `1px solid ${t.borderInput}`, color: t.text, fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
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

      {/* Approval document preview modal */}
      {approvalPreviewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, backdropFilter: 'blur(6px)', padding: '16px' }}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.borderInput}`, width: '100%', maxWidth: '960px', height: '90vh', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={15} color="#a78bfa" />
                </div>
                <span style={{ color: t.text, fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {approvalPreviewDoc.file_name}
                </span>
              </div>
              <button onClick={() => setApprovalPreviewDoc(null)} style={{ background: t.bgInput, border: `1px solid ${t.borderInput}`, borderRadius: '7px', padding: '6px', color: t.textFaint, cursor: 'pointer', flexShrink: 0, marginLeft: '12px' }}>
                <X size={16} />
              </button>
            </div>
            <iframe
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${approvalPreviewDoc.file_path}`}
              style={{ width: '100%', flex: 1, background: 'white', borderRadius: '8px', border: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => { if (!isDeleting) setShowDeleteModal(false) }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: t.bgCard, border: '1px solid rgba(239,68,68,0.25)', borderRadius: '16px', padding: '28px 28px 24px', maxWidth: '420px', width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Trash2 size={20} color="#ef4444" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: t.text }}>Delete Programme</h2>
            <p style={{ margin: '0 0 6px', fontSize: '13px', color: t.textMuted, lineHeight: 1.6 }}>
              You are about to permanently delete <strong style={{ color: t.text }}>{programme.name}</strong>.
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: t.textMuted, lineHeight: 1.6 }}>
              This will remove all associated documents and committee records. This action cannot be undone.
            </p>
            {deleteError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', marginBottom: '16px' }}>
                <XCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', lineHeight: 1.5 }}>{deleteError}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowDeleteModal(false); setDeleteError('') }} disabled={isDeleting} style={{ padding: '9px 18px', borderRadius: '8px', background: t.bgInput, border: `1px solid ${t.borderInput}`, color: t.textMuted, fontSize: '13px', fontWeight: 500, cursor: isDeleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={isDeleting} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '8px', background: isDeleting ? 'rgba(239,68,68,0.35)' : '#ef4444', border: 'none', color: 'white', fontSize: '13px', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                <Trash2 size={13} />{isDeleting ? 'Deleting…' : 'Delete Programme'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
