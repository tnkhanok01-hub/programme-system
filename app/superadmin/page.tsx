'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { useTheme } from '@/app/provider/ThemeContext'
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut,
  CirclePlus, Pencil, Trash, Save, CircleX, TrendingUp, Clock,
  CheckCircle, XCircle, AlertCircle, Search, Shield, Calendar,
  MapPin, DollarSign, Activity, ArrowRightLeft, Crown, Eye, FileText, Upload, QrCode, X, UserCircle, CalendarCheck,
  Sun, Moon, Menu
} from 'lucide-react'
import { PRE_CHECKLIST } from '../../lib/constants'
import NotificationBell from '../../components/notifications/NotificationBell'
import OverduePanel from '../../components/programmes/OverduePanel'
import type { OverdueItem } from '../../lib/types'

/* ─── TYPES ──────────────────────────────────────────────────────────────── */
interface Programme {
  id: string; name: string; category: string; organiser: string; venue: string
  budget: number; start_date: string; end_date: string; status: string; created_at: string
  programme_director_id?: string; advisor_id?: string
}
interface Profile { id: string; full_name: string; email: string; roles: { name: string } | null }
type NavItem = 'dashboard' | 'programmes' | 'createAdmin' | 'exchangeAdmin' | 'settings' | 'attendance' | 'users' | 'profile' | 'schedule'
type Theme = 'dark' | 'light'

/* ─── THEME TOKENS ───────────────────────────────────────────────────────── */
function getTheme(mode: Theme) {
  if (mode === 'dark') {
    return {
      // backgrounds
      pageBg:        '#080f1a',
      surfaceBg:     '#0b1118',
      cardBg:        '#0b1118',
      modalBg:       '#0f1a24',
      inputBg:       'rgba(255,255,255,0.04)',
      rowAlt:        'rgba(255,255,255,0.01)',
      rowHover:      'rgba(245,158,11,0.06)',
      // borders
      border:        'rgba(255,255,255,0.05)',
      borderSoft:    'rgba(255,255,255,0.08)',
      accentBorder:  'rgba(245,158,11,0.2)',
      accentBorderSub: 'rgba(245,158,11,0.08)',
      // text
      textPrimary:   '#f1f5f9',
      textSecondary: '#6b7280',
      textMuted:     '#374151',
      textAccent:    '#fbbf24',
      textBody:      '#e2e8f0',
      // accent
      accent:        '#f59e0b',
      accentBg:      'rgba(245,158,11,0.12)',
      accentSoft:    'rgba(245,158,11,0.06)',
      gradientBtn:   'linear-gradient(135deg, #b45309, #d97706)',
      gradientLogo:  'linear-gradient(135deg, #92400e, #d97706)',
      // status
      approvedBg:    'rgba(16,185,129,0.12)',   approvedColor: '#10b981',
      rejectedBg:    'rgba(239,68,68,0.12)',    rejectedColor: '#ef4444',
      pendingBg:     'rgba(245,158,11,0.12)',   pendingColor:  '#f59e0b',
      reviewBg:      'rgba(56,189,248,0.12)',   reviewColor:   '#38bdf8',
      defaultBg:     'rgba(148,163,184,0.12)',  defaultColor:  '#94a3b8',
      // scrollbar
      scrollTrack:   '#0b1118',
      scrollThumb:   '#1e2d3d',
    }
  }
  return {
    // backgrounds
    pageBg:        '#f0f4f8',
    surfaceBg:     '#ffffff',
    cardBg:        '#ffffff',
    modalBg:       '#ffffff',
    inputBg:       'rgba(0,0,0,0.04)',
    rowAlt:        'rgba(0,0,0,0.015)',
    rowHover:      'rgba(245,158,11,0.05)',
    // borders
    border:        'rgba(0,0,0,0.07)',
    borderSoft:    'rgba(0,0,0,0.1)',
    accentBorder:  'rgba(180,83,9,0.25)',
    accentBorderSub: 'rgba(180,83,9,0.12)',
    // text
    textPrimary:   '#1a202c',
    textSecondary: '#6b7280',
    textMuted:     '#9ca3af',
    textAccent:    '#b45309',
    textBody:      '#374151',
    // accent
    accent:        '#d97706',
    accentBg:      'rgba(217,119,6,0.1)',
    accentSoft:    'rgba(217,119,6,0.06)',
    gradientBtn:   'linear-gradient(135deg, #b45309, #d97706)',
    gradientLogo:  'linear-gradient(135deg, #92400e, #d97706)',
    // status
    approvedBg:    'rgba(16,185,129,0.1)',    approvedColor: '#059669',
    rejectedBg:    'rgba(239,68,68,0.1)',     rejectedColor: '#dc2626',
    pendingBg:     'rgba(245,158,11,0.1)',    pendingColor:  '#d97706',
    reviewBg:      'rgba(14,165,233,0.1)',    reviewColor:   '#0284c7',
    defaultBg:     'rgba(107,114,128,0.1)',   defaultColor:  '#6b7280',
    // scrollbar
    scrollTrack:   '#e5e7eb',
    scrollThumb:   '#d1d5db',
  }
}

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
const getInitials = (name: string) =>
  name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SA'

function useStatusConfig(status: string, T: ReturnType<typeof getTheme>) {
  switch (status) {
    case 'Approved':    return { bg: T.approvedBg, color: T.approvedColor, icon: CheckCircle }
    case 'Rejected':    return { bg: T.rejectedBg, color: T.rejectedColor, icon: XCircle }
    case 'Pending':     return { bg: T.pendingBg,  color: T.pendingColor,  icon: AlertCircle }
    case 'Under Review':return { bg: T.reviewBg,   color: T.reviewColor,   icon: Clock }
    default:            return { bg: T.defaultBg,  color: T.defaultColor,  icon: Clock }
  }
}

/* ─── THEME TOGGLE BUTTON ────────────────────────────────────────────────── */
function ThemeToggle({ theme, onToggle, T }: { theme: Theme; onToggle: () => void; T: ReturnType<typeof getTheme> }) {
  return (
    <button
      onClick={onToggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: T.accentBg,
        border: `1px solid ${T.accentBorder}`,
        borderRadius: '8px',
        width: '34px', height: '34px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: T.textAccent,
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}

/* ─── STAT CARDS ─────────────────────────────────────────────────────────── */
function StatCards({ stats, userCount, adminCount, isMobile, T }: {
  stats: { total: number; pending: number; approved: number; rejected: number; totalBudget: number }
  userCount: number; adminCount: number; isMobile: boolean; T: ReturnType<typeof getTheme>
}) {
  const cards = [
    { label: 'Total Programmes', value: stats.total,    icon: BookOpen,    color: T.textAccent,   bg: T.accentBg,              border: T.accentBorder },
    { label: 'Pending Review',   value: stats.pending,  icon: AlertCircle, color: '#fb923c',      bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.2)' },
    { label: 'Approved',         value: stats.approved, icon: CheckCircle, color: T.approvedColor,bg: T.approvedBg,            border: `${T.approvedColor}33` },
    { label: 'Rejected',         value: stats.rejected, icon: XCircle,     color: T.rejectedColor,bg: T.rejectedBg,            border: `${T.rejectedColor}33` },
    { label: 'Total Users',      value: userCount,      icon: Users,       color: T.reviewColor,  bg: T.reviewBg,              border: `${T.reviewColor}33` },
    { label: 'Admins',           value: adminCount,     icon: Crown,       color: T.textAccent,   bg: T.accentBg,              border: T.accentBorder },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div key={i} style={{
            background: T.cardBg,
            border: `1px solid ${card.border}`,
            borderRadius: '10px',
            padding: isMobile ? '12px' : '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'background 0.2s, border-color 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={card.color} />
              </div>
              <TrendingUp size={11} color={T.textMuted} />
            </div>
            <p style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: T.textPrimary, letterSpacing: '-0.03em' }}>{card.value}</p>
            <p style={{ margin: '3px 0 0', fontSize: '10px', color: T.textSecondary }}>{card.label}</p>
          </div>
        )
      })}
    </div>
  )
}

/* ─── BUDGET BANNER ──────────────────────────────────────────────────────── */
function BudgetBanner({ stats, isMobile, T }: {
  stats: { total: number; approved: number; totalBudget: number }; isMobile: boolean; T: ReturnType<typeof getTheme>
}) {
  return (
    <div style={{
      background: T.accentBg,
      border: `1px solid ${T.accentBorder}`,
      borderRadius: '12px', padding: isMobile ? '14px' : '16px 20px', marginBottom: '16px',
      display: 'flex', alignItems: 'center', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap',
      transition: 'background 0.2s',
    }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${T.accentBorder}` }}>
        <DollarSign size={16} color={T.textAccent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '10px', color: T.textSecondary }}>Total Budget (Approved & Pending Only)</p>
        <p style={{ margin: '2px 0 0', fontSize: isMobile ? '18px' : '22px', fontWeight: 700, color: T.textAccent, letterSpacing: '-0.03em' }}>
          RM {stats.totalBudget.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div style={{ display: 'flex', gap: isMobile ? '16px' : '24px', flexShrink: 0 }}>
        {[
          { label: 'Avg per programme', value: stats.total > 0 ? `RM ${Math.round(stats.totalBudget / stats.total).toLocaleString()}` : 'RM 0' },
          { label: 'Approval rate',     value: stats.total > 0 ? `${Math.round((stats.approved / stats.total) * 100)}%` : '0%' },
        ].map((kpi, i) => (
          <div key={i} style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: T.accent }}>{kpi.value}</p>
            <p style={{ margin: '1px 0 0', fontSize: '10px', color: T.textSecondary }}>{kpi.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── EDIT MODAL ─────────────────────────────────────────────────────────── */
function EditModal({ show, isMobile, editForm, actionLoading, onClose, onChange, onUpdate, T }: {
  show: boolean; isMobile: boolean; editForm: Partial<Programme>; actionLoading: boolean
  onClose: () => void; onChange: (f: Partial<Programme>) => void; onUpdate: () => void
  T: ReturnType<typeof getTheme>
}) {
  const [budgetCents, setBudgetCents] = useState(0)
  const [budgetError, setBudgetError] = useState('')

  useEffect(() => {
    if (show) {
      const cents = Math.round((Number(editForm.budget) || 0) * 100)
      setBudgetCents(cents)
      setBudgetError('')
    }
  }, [show, editForm.id])

  if (!show) return null

  const dateError = (editForm.start_date && editForm.end_date && editForm.end_date < editForm.start_date)
    ? 'End date must be after start date.' : ''
  const hasErrors = !!budgetError || !!dateError

  const centsToDisplay = (cents: number) => {
    const ringgit = Math.floor(cents / 100)
    const sen = cents % 100
    return `${ringgit.toLocaleString('en-MY')}.${sen.toString().padStart(2, '0')}`
  }

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const next = budgetCents * 10 + Number(e.key)
      setBudgetCents(next)
      onChange({ ...editForm, budget: parseFloat((next / 100).toFixed(2)) as any })
      setBudgetError(next > 499999 ? 'Budget must be below RM 5,000.00' : '')
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const next = Math.floor(budgetCents / 10)
      setBudgetCents(next)
      onChange({ ...editForm, budget: parseFloat((next / 100).toFixed(2)) as any })
      setBudgetError('')
    } else if (e.key === 'Delete') {
      e.preventDefault(); setBudgetCents(0)
      onChange({ ...editForm, budget: 0 as any }); setBudgetError('')
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault() }
  }

  const handleBudgetBlur = () => {
    if (budgetCents <= 0)     { setBudgetError('Budget must be more than RM 0.00'); return }
    if (budgetCents > 499999) { setBudgetError('Budget must be below RM 5,000.00'); return }
    setBudgetError('')
  }

  const fieldErrStyle: React.CSSProperties = {
    fontSize: '11px', color: '#f87171', marginTop: '4px', marginBottom: 0,
    display: 'flex', alignItems: 'center', gap: '4px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 11px', borderRadius: '7px',
    background: T.inputBg, border: `1px solid ${T.borderSoft}`,
    color: T.textBody, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: T.modalBg, border: `1px solid ${T.accentBorder}`, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pencil size={15} color={T.textAccent} />Edit Programme
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textSecondary }}><CircleX size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
            <label style={{ display: 'block', fontSize: '11px', color: T.textSecondary, marginBottom: '5px', fontWeight: 500 }}>Programme Name</label>
            <input type="text" value={editForm.name || ''} onChange={e => onChange({ ...editForm, name: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
            <label style={{ display: 'block', fontSize: '11px', color: T.textSecondary, marginBottom: '5px', fontWeight: 500 }}>Venue</label>
            <input type="text" value={editForm.venue || ''} onChange={e => onChange({ ...editForm, venue: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: T.textSecondary, marginBottom: '5px', fontWeight: 500 }}>Budget (RM)</label>
            <input type="text" inputMode="numeric" value={centsToDisplay(budgetCents)} onChange={() => {}}
              onKeyDown={handleBudgetKeyDown} onBlur={handleBudgetBlur}
              style={{ ...inputStyle, border: `1px solid ${budgetError ? 'rgba(248,113,113,0.5)' : T.borderSoft}`, fontVariantNumeric: 'tabular-nums' }} />
            {budgetError
              ? <p style={fieldErrStyle}><AlertCircle size={11} />{budgetError}</p>
              : <p style={{ fontSize: '10px', color: T.textMuted, marginTop: '4px', marginBottom: 0 }}>Max RM 5,000.00 · type digits to fill</p>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: T.textSecondary, marginBottom: '5px', fontWeight: 500 }}>Start Date</label>
            <input type="date" value={editForm.start_date || ''} onChange={e => onChange({ ...editForm, start_date: e.target.value })}
              style={{ ...inputStyle, colorScheme: 'light dark' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: T.textSecondary, marginBottom: '5px', fontWeight: 500 }}>End Date</label>
            <input type="date" value={editForm.end_date || ''} min={editForm.start_date || undefined}
              onChange={e => onChange({ ...editForm, end_date: e.target.value })}
              style={{ ...inputStyle, border: `1px solid ${dateError ? 'rgba(248,113,113,0.5)' : T.borderSoft}`, colorScheme: 'light dark' }} />
            {dateError && <p style={fieldErrStyle}><AlertCircle size={11} />{dateError}</p>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: T.textSecondary, marginBottom: '5px', fontWeight: 500 }}>Category</label>
            <select value={editForm.category || ''} onChange={e => onChange({ ...editForm, category: e.target.value })}
              style={{ ...inputStyle, background: T.cardBg }}>
              {['Academic', 'Sports', 'Community Service', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {hasErrors && (
          <div style={{ marginTop: '16px', padding: '10px 13px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={13} color="#f87171" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>Please fix the errors above before saving.</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${T.borderSoft}`, background: 'transparent', color: T.textSecondary, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <CircleX size={14} />Cancel
          </button>
          <button onClick={onUpdate} disabled={actionLoading || hasErrors}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: hasErrors ? T.accentBg : T.gradientBtn, color: hasErrors ? T.textSecondary : 'white', fontSize: '13px', fontWeight: 500, cursor: hasErrors ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: actionLoading ? 0.7 : 1 }}>
            <Save size={14} />{actionLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── REVIEW MODAL ───────────────────────────────────────────────────────── */
function ReviewModal({ prog, isMobile, rejectComment, actionLoading, rejectLoading, preDocs, preDocsLoading, getToken, directorName, advisorName, onClose, onCommentChange, onApprove, onReject, onDocsChange, T }: {
  prog: Programme | null; isMobile: boolean; rejectComment: string; actionLoading: boolean; rejectLoading: boolean
  preDocs: Array<{ id: string; phase: string; doc_type?: string; file_name?: string; file_path?: string }>; preDocsLoading: boolean
  getToken: () => Promise<string | null>; directorName: string; advisorName: string
  onClose: () => void; onCommentChange: (v: string) => void; onApprove: (noRujukan: string, attendeeMeritPoints: number) => void; onReject: () => void
  onDocsChange: (docs: Array<{ id: string; phase: string; doc_type?: string; file_name?: string; file_path?: string }>) => void
  T: ReturnType<typeof getTheme>
}) {
  const [noRujukanInput, setNoRujukanInput] = React.useState('')
  const [meritPointsInput, setMeritPointsInput] = React.useState('1')
  const [updatedPaperworkFile, setUpdatedPaperworkFile] = useState<File | null>(null)
  const [updatedPaperworkDoc, setUpdatedPaperworkDoc] = useState<{ id: string; file_name: string; file_path: string } | null>(null)
  const [adminPaperworkDoc, setAdminPaperworkDoc] = useState<{ id: string; file_name: string; file_path: string } | null>(null)
  const [uploadingUpdatedPaperwork, setUploadingUpdatedPaperwork] = useState(false)
  const [removingUpdatedPaperwork, setRemovingUpdatedPaperwork] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string>('')

  useEffect(() => {
    setUpdatedPaperworkFile(null); setUploadError(null)
    const adminDoc = preDocs.find(d => d.phase === 'approval' && d.doc_type === 'updated_paperwork')
    setAdminPaperworkDoc(adminDoc ? { id: adminDoc.id, file_name: adminDoc.file_name || 'Paperwork', file_path: adminDoc.file_path || '' } : null)
    const saDoc = preDocs.find(d => d.phase === 'approval' && d.doc_type === 'superadmin_paperwork')
    setUpdatedPaperworkDoc(saDoc ? { id: saDoc.id, file_name: saDoc.file_name || 'Approval Document', file_path: saDoc.file_path || '' } : null)
  }, [prog?.id, preDocs])

  const refreshDocs = async () => {
    if (!prog) return
    const token = await getToken()
    if (!token) return
    const res = await fetch(`/api/programmes/${prog.id}/documents`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const data = await res.json(); onDocsChange(Array.isArray(data) ? data : (data.data ?? [])) }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const getPublicUrl = (filePath: string) => `${supabaseUrl}/storage/v1/object/public/documents/${filePath}`
  const isImage = (name: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(name)
  const isPdf   = (name: string) => /\.pdf$/i.test(name)
  const handleView = (doc: { file_name?: string; file_path?: string }) => { if (!doc.file_path) return; setPreviewName(doc.file_name || 'Document'); setPreviewUrl(getPublicUrl(doc.file_path)) }
  const handleDownload = async (doc: { file_name?: string; file_path?: string }) => {
    if (!doc.file_path) return
    const url = getPublicUrl(doc.file_path); const res = await fetch(url); const blob = await res.blob()
    const blobUrl = window.URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = blobUrl; a.download = doc.file_name || 'file'; document.body.appendChild(a); a.click()
    document.body.removeChild(a); window.URL.revokeObjectURL(blobUrl)
  }

  const handleUploadUpdatedPaperwork = async () => {
    if (!updatedPaperworkFile || !prog) return
    setUploadingUpdatedPaperwork(true)
    const token = await getToken()
    if (!token) { setUploadError('Not authenticated'); setUploadingUpdatedPaperwork(false); return }
    const formData = new FormData()
    formData.append('file', updatedPaperworkFile); formData.append('programme_id', prog.id)
    formData.append('phase', 'approval'); formData.append('doc_type', 'superadmin_paperwork')
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
    if (res.ok) { setUpdatedPaperworkFile(null); setUploadError(null); await refreshDocs() }
    else { const data = await res.json(); setUploadError(data.error ?? 'Upload failed') }
    setUploadingUpdatedPaperwork(false)
  }

  const handleRemoveUpdatedPaperwork = async () => {
    if (!updatedPaperworkDoc?.id || !prog) return
    setRemovingUpdatedPaperwork(true)
    const token = await getToken()
    if (!token) { setRemovingUpdatedPaperwork(false); return }
    const res = await fetch(`/api/programmes/${prog.id}/documents/${updatedPaperworkDoc.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { setUpdatedPaperworkDoc(null); onDocsChange(preDocs.filter(d => d.id !== updatedPaperworkDoc.id)) }
    else { const data = await res.json(); setUploadError(data.error ?? 'Remove failed') }
    setRemovingUpdatedPaperwork(false)
  }

  if (!prog) return null

  const sectionLabel: React.CSSProperties = {
    margin: 0, fontSize: '11px', fontWeight: 600, color: T.textSecondary,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  }

  return (
    <>
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T.modalBg, border: `1px solid ${T.accentBorder}`, borderRadius: '14px', width: '100%', maxWidth: '820px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <FileText size={14} color={T.textAccent} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: T.textBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewName}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                <a href={previewUrl} download={previewName} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: '12px', fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}>
                  <Activity size={12} />Download
                </a>
                <button onClick={() => setPreviewUrl(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: `1px solid ${T.borderSoft}`, background: T.inputBg, color: T.textSecondary, fontSize: '12px', cursor: 'pointer' }}>
                  <CircleX size={12} />Close
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', minHeight: '300px' }}>
              {isPdf(previewName) ? (
                <iframe src={previewUrl} title={previewName} style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none', borderRadius: '8px' }} />
              ) : isImage(previewName) ? (
                <img src={previewUrl} alt={previewName} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <FileText size={48} color={T.textMuted} style={{ marginBottom: '12px' }} />
                  <p style={{ color: T.textSecondary, fontSize: '13px', marginBottom: '16px' }}>Preview not available for this file type.</p>
                  <a href={previewUrl} download={previewName}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', background: T.gradientBtn, color: 'white', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                    <Activity size={14} />Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '16px' }}>
        <div style={{ background: T.modalBg, border: `1px solid ${T.accentBorder}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 70px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={15} color={T.textAccent} />Review Programme
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textSecondary }}><CircleX size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            {[
              { label: 'Programme Name',     value: prog.name,             span: isMobile ? 1 : 2 },
              { label: 'Programme Director', value: directorName || '—',   span: 1 },
              { label: 'Advisor',            value: advisorName  || '—',   span: 1 },
              { label: 'Category',  value: prog.category || '—', span: 1 },
              { label: 'Organiser', value: prog.organiser || '—', span: 1 },
              { label: 'Venue',     value: prog.venue || '—', span: isMobile ? 1 : 2 },
              { label: 'Start Date', value: prog.start_date ? new Date(prog.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '—', span: 1 },
              { label: 'End Date',   value: prog.end_date   ? new Date(prog.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '—', span: 1 },
              { label: 'Budget',    value: prog.budget ? `RM ${Number(prog.budget).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—', span: 1 },
              { label: 'Submitted', value: prog.created_at ? new Date(prog.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—', span: 1 },
            ].map(f => (
              <div key={f.label} style={{ gridColumn: `span ${f.span}`, background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '10px 13px' }}>
                <p style={{ margin: 0, fontSize: '10px', color: T.textSecondary, fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
                <p style={{ margin: 0, fontSize: '13px', color: T.textBody, fontWeight: 500 }}>{f.value}</p>
              </div>
            ))}
          </div>

          <div style={{ height: '1px', background: T.border, marginBottom: '18px' }} />

          {/* Admin paperwork */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <FileText size={13} color="#a78bfa" />
              <p style={sectionLabel}>Admin's Attached Paperwork</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 13px', background: adminPaperworkDoc ? 'rgba(167,139,250,0.06)' : T.inputBg, border: `1px solid ${adminPaperworkDoc ? 'rgba(167,139,250,0.2)' : T.borderSoft}`, borderRadius: '8px' }}>
              {adminPaperworkDoc ? <CheckCircle size={14} color="#a78bfa" style={{ flexShrink: 0 }} /> : <XCircle size={14} color={T.textMuted} style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: adminPaperworkDoc ? T.textBody : T.textSecondary }}>Updated Paperwork (Admin)</p>
                <p style={{ margin: '1px 0 0', fontSize: '11px', color: adminPaperworkDoc ? '#a78bfa' : T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {adminPaperworkDoc ? adminPaperworkDoc.file_name : 'No paperwork attached by admin'}
                </p>
              </div>
              {adminPaperworkDoc && (
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button onClick={() => handleView(adminPaperworkDoc)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 9px', borderRadius: '5px', border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}><Eye size={11} /></button>
                  <button onClick={() => handleDownload(adminPaperworkDoc)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 9px', borderRadius: '5px', border: '1px solid rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}><Activity size={11} />Download</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: T.border, marginBottom: '18px' }} />

          {/* Approval doc upload */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Upload size={13} color={T.textAccent} />
              <p style={sectionLabel}>Approval Document</p>
              <span style={{ fontSize: '10px', color: T.textAccent, fontWeight: 500 }}>(required to approve)</span>
            </div>
            {uploadError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#ef4444' }}>{uploadError}</p>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 13px', background: updatedPaperworkDoc ? T.approvedBg : T.inputBg, border: `1px solid ${updatedPaperworkDoc ? `${T.approvedColor}44` : T.borderSoft}`, borderRadius: '8px' }}>
              {updatedPaperworkDoc ? <CheckCircle size={14} color={T.approvedColor} style={{ flexShrink: 0 }} /> : <Upload size={14} color={T.textSecondary} style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: updatedPaperworkDoc ? T.textBody : T.textSecondary }}>Approval Document (Signed)</p>
                <p style={{ margin: '1px 0 0', fontSize: '11px', color: updatedPaperworkDoc ? T.approvedColor : (updatedPaperworkFile ? '#60a5fa' : T.textMuted), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {updatedPaperworkDoc ? updatedPaperworkDoc.file_name : (updatedPaperworkFile ? updatedPaperworkFile.name : 'No file selected')}
                </p>
              </div>
              {updatedPaperworkDoc ? (
                <button onClick={handleRemoveUpdatedPaperwork} disabled={removingUpdatedPaperwork}
                  style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 9px', borderRadius: '5px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '11px', fontWeight: 500, cursor: removingUpdatedPaperwork ? 'not-allowed' : 'pointer' }}>
                  <X size={11} />{removingUpdatedPaperwork ? '...' : 'Remove'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                  {updatedPaperworkFile && (
                    <button onClick={() => setUpdatedPaperworkFile(null)}
                      style={{ display: 'flex', alignItems: 'center', padding: '4px 7px', borderRadius: '5px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}><X size={11} /></button>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 9px', borderRadius: '5px', border: `1px solid ${T.accentBorder}`, background: T.accentBg, color: T.textAccent, fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                    <FileText size={11} />{updatedPaperworkFile ? 'Change' : 'Choose'}
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => { setUpdatedPaperworkFile(e.target.files?.[0] ?? null); e.target.value = '' }} style={{ display: 'none' }} />
                  </label>
                  {updatedPaperworkFile && (
                    <button onClick={handleUploadUpdatedPaperwork} disabled={uploadingUpdatedPaperwork}
                      style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 9px', borderRadius: '5px', border: 'none', background: uploadingUpdatedPaperwork ? 'rgba(16,185,129,0.4)' : '#059669', color: 'white', fontSize: '11px', fontWeight: 500, cursor: uploadingUpdatedPaperwork ? 'not-allowed' : 'pointer' }}>
                      <Upload size={11} />{uploadingUpdatedPaperwork ? '...' : 'Upload'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: T.border, marginBottom: '18px' }} />

          {/* Rejection comment */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: T.textSecondary, fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Rejection Comment <span style={{ color: '#ef4444' }}>*</span>
              <span style={{ color: T.textMuted, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '6px' }}>(required only when rejecting)</span>
            </label>
            <textarea value={rejectComment} onChange={e => onCommentChange(e.target.value)}
              placeholder="Explain why this programme is being rejected..." rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: T.inputBg, border: `1px solid ${rejectComment.trim() ? 'rgba(239,68,68,0.35)' : T.borderSoft}`, color: T.textBody, fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
          </div>

          {/* No Rujukan + Merit Points — required before Approve */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: T.textSecondary, fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                No. Rujukan Surat <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: UTM.KSJ/100-1/1 Jld.2(15)"
                value={noRujukanInput}
                onChange={e => setNoRujukanInput(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.textBody, fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: T.textSecondary, fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                Merit (Attendees) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                placeholder="1"
                value={meritPointsInput}
                onChange={e => setMeritPointsInput(e.target.value)}
                style={{ width: isMobile ? '100%' : '90px', padding: '9px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.textBody, fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${T.borderSoft}`, background: 'transparent', color: T.textSecondary, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <CircleX size={14} />Cancel
            </button>
            <button onClick={onReject} disabled={rejectLoading || !rejectComment.trim()}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: rejectComment.trim() ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.2)', color: rejectComment.trim() ? 'white' : T.textMuted, fontSize: '13px', fontWeight: 500, cursor: rejectComment.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: rejectLoading ? 0.7 : 1 }}>
              <XCircle size={14} />{rejectLoading ? 'Rejecting...' : 'Reject'}
            </button>
            <button onClick={() => onApprove(noRujukanInput.trim(), parseInt(meritPointsInput) || 1)} disabled={actionLoading || !updatedPaperworkDoc || !noRujukanInput.trim() || !(parseInt(meritPointsInput) >= 1)}
              title={!updatedPaperworkDoc ? 'Upload approval document first' : !noRujukanInput.trim() ? 'Enter No Rujukan first' : !(parseInt(meritPointsInput) >= 1) ? 'Enter valid merit points' : undefined}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: updatedPaperworkDoc && noRujukanInput.trim() && parseInt(meritPointsInput) >= 1 ? T.gradientBtn : T.accentBg, color: updatedPaperworkDoc && noRujukanInput.trim() && parseInt(meritPointsInput) >= 1 ? 'white' : T.textSecondary, fontSize: '13px', fontWeight: 500, cursor: updatedPaperworkDoc && noRujukanInput.trim() && parseInt(meritPointsInput) >= 1 && !actionLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: actionLoading ? 0.7 : 1 }}>
              <CheckCircle size={14} />{actionLoading ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── LOADING OVERLAY ────────────────────────────────────────────────────── */
function LoadingOverlay({ actionLoading, rejectLoading, deleteLoading, rejectComment, T }: {
  actionLoading: boolean; rejectLoading: boolean; deleteLoading: boolean; rejectComment: string; T: ReturnType<typeof getTheme>
}) {
  if (!actionLoading && !rejectLoading && !deleteLoading) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(6px)', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${T.accentBg}`, borderTopColor: T.accent, animation: 'spin 0.75s linear infinite' }} />
      <p style={{ color: T.textAccent, fontSize: '14px', fontWeight: 500, margin: 0 }}>
        {deleteLoading ? 'Deleting programme...' : rejectLoading ? 'Rejecting programme...' : !rejectComment ? 'Approving programme...' : 'Saving changes...'}
      </p>
    </div>
  )
}

/* ─── MOBILE PROGRAMME CARDS ─────────────────────────────────────────────── */
function MobileProgrammeCards({ filtered, onEdit, onDelete, onReview, onView, T }: {
  filtered: Programme[]; onEdit: (p: Programme) => void; onDelete: (id: string) => void
  onReview: (p: Programme) => void; onView: (id: string) => void; T: ReturnType<typeof getTheme>
}) {
  if (filtered.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 16px', color: T.textMuted, fontSize: '13px' }}>No programmes found</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {filtered.map(prog => {
        const sc = useStatusConfig(prog.status, T)
        const StatusIcon = sc.icon
        const sd = prog.start_date ? new Date(prog.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '—'
        const ed = prog.end_date   ? new Date(prog.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' }) : ''
        return (
          <div key={prog.id} style={{ background: T.cardBg, border: `1px solid ${T.accentBorderSub}`, borderRadius: '10px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'background 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ margin: 0, fontWeight: 600, color: T.textPrimary, fontSize: '13px', lineHeight: 1.3, flex: 1, marginRight: '8px' }}>{prog.name}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 500, background: sc.bg, color: sc.color, padding: '3px 7px', borderRadius: '4px', flexShrink: 0 }}>
                <StatusIcon size={10} />{prog.status || 'Pending'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {prog.category && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: T.accentBg, color: T.textAccent, fontWeight: 500 }}>{prog.category}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: T.textSecondary }}>
                <Calendar size={9} />{sd}{ed ? ` → ${ed}` : ''}
              </span>
              {prog.venue && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: T.textSecondary }}><MapPin size={9} />{prog.venue}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${T.accentBorderSub}`, paddingTop: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: T.textAccent }}>
                {prog.budget ? `RM ${Number(prog.budget).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—'}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {prog.status === 'Under Review' && (
                  <button onClick={() => onReview(prog)} style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', color: T.textAccent, display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 500 }}>
                    <Shield size={11} />Review
                  </button>
                )}
                {prog.status !== 'Approved' && (
                  <>
                    <button onClick={() => onEdit(prog)} style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: '5px', padding: '5px 7px', cursor: 'pointer', color: T.textAccent }}><Pencil size={12} /></button>
                    <button onClick={() => onDelete(prog.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '5px', padding: '5px 7px', cursor: 'pointer', color: '#ef4444' }}><Trash size={12} /></button>
                  </>
                )}
                <button onClick={() => onView(prog.id)} style={{ background: T.reviewBg, border: `1px solid ${T.reviewColor}33`, borderRadius: '5px', padding: '5px 7px', cursor: 'pointer', color: T.reviewColor }}><Eye size={12} /></button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── DESKTOP TABLE ──────────────────────────────────────────────────────── */
function DesktopTable({ filtered, onEdit, onDelete, onReview, onView, T }: {
  filtered: Programme[]; onEdit: (p: Programme) => void; onDelete: (id: string) => void
  onReview: (p: Programme) => void; onView: (id: string) => void; T: ReturnType<typeof getTheme>
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            {['Programme', 'Category', 'Dates', 'Venue', 'Budget', 'Status', 'Actions'].map(h => (
              <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: T.textMuted, fontWeight: 500, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: T.textMuted }}><p style={{ margin: 0, fontSize: '13px' }}>No programmes found</p></td></tr>
          ) : filtered.map((prog, i) => {
            const sc = useStatusConfig(prog.status, T)
            const StatusIcon = sc.icon
            return (
              <tr key={prog.id}
                style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? 'transparent' : T.rowAlt, transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.rowHover}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : T.rowAlt}>
                <td style={{ padding: '12px 14px', maxWidth: '200px' }}><p style={{ margin: 0, fontWeight: 500, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prog.name}</p></td>
                <td style={{ padding: '12px 14px' }}><span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', background: T.accentBg, color: T.textAccent, fontWeight: 500 }}>{prog.category || '—'}</span></td>
                <td style={{ padding: '12px 14px', color: T.textSecondary, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                    <Calendar size={11} />
                    {prog.start_date ? new Date(prog.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '—'}
                    {prog.end_date && <> → {new Date(prog.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</>}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', color: T.textSecondary, maxWidth: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><MapPin size={11} />{prog.venue || '—'}</div>
                </td>
                <td style={{ padding: '12px 14px', color: T.textBody, whiteSpace: 'nowrap' }}>{prog.budget ? `RM ${Number(prog.budget).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—'}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, background: sc.bg, color: sc.color, padding: '4px 9px', borderRadius: '5px' }}>
                    <StatusIcon size={11} />{prog.status || 'Pending'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {prog.status === 'Under Review' && (
                      <button onClick={() => onReview(prog)} style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: T.textAccent, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500 }}>
                        <Shield size={12} />Review
                      </button>
                    )}
                    {prog.status !== 'Approved' && (
                      <>
                        <button onClick={() => onEdit(prog)} style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: T.textAccent }}><Pencil size={13} /></button>
                        <button onClick={() => onDelete(prog.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: '#ef4444' }}><Trash size={13} /></button>
                      </>
                    )}
                    <button onClick={() => onView(prog.id)} style={{ background: T.reviewBg, border: `1px solid ${T.reviewColor}33`, borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: T.reviewColor }}><Eye size={13} /></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function SuperAdminDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [userCount, setUserCount] = useState(0)
  const [adminCount, setAdminCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Programme>>({})
  const [actionLoading, setActionLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [reviewProg, setReviewProg] = useState<Programme | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [reviewDocs, setReviewDocs] = useState<Array<{ id: string; phase: string; doc_type?: string; file_name?: string; file_path?: string }>>([])
  const [reviewDocsLoading, setReviewDocsLoading] = useState(false)
  const [reviewDirectorName, setReviewDirectorName] = useState('')
  const [reviewAdvisorName, setReviewAdvisorName] = useState('')
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [overdueItems, setOverdueItems] = useState<{ during: OverdueItem[]; post: OverdueItem[] }>({ during: [], post: [] })

  // ── THEME ──────────────────────────────────────────────────────────────
  const { mode: theme, setMode } = useTheme()
  const T = getTheme(theme)
  const toggleTheme = useCallback(() => setMode(theme === 'dark' ? 'light' : 'dark'), [theme, setMode])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) { router.replace('/login'); return }

      const { data: profileData, error: profileError } = await supabase
        .from('users').select('id, full_name, roles(name)').eq('id', session.user.id).single()

      if (profileError || !profileData) { setLoading(false); return }

      const role = (profileData.roles as any)?.name?.toLowerCase?.() ?? ''
      if (role !== 'superadmin') {
        router.replace(role === 'admin' ? '/admin' : role === 'student' ? '/student' : '/login'); return
      }

      setProfile(profileData as any)

      const [
        { data: programmeData },
        { count: totalUsers },
        { count: totalAdmins },
        overdueRes,
      ] = await Promise.all([
        supabase.from('programmes').select('*').neq('status', 'Pending').order('created_at', { ascending: false }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*, roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'admin'),
        fetch('/api/overdue/check', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .catch(() => new Response(null, { status: 503 })),
      ])

      if (programmeData) setProgrammes(programmeData)
      setUserCount(totalUsers ?? 0)
      setAdminCount(totalAdmins ?? 0)
      if (overdueRes.ok) {
        const overdueData = await overdueRes.json()
        setOverdueItems(overdueData)
      }
      setLoading(false)
    }
    init()
  }, [])

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const handleOpenReview = async (prog: Programme) => {
    setReviewProg(prog); setRejectComment(''); setReviewDocs([])
    setReviewDirectorName(''); setReviewAdvisorName(''); setReviewDocsLoading(true)
    try {
      const token = await getToken()
      const [docsRes] = await Promise.all([
        fetch(`/api/programmes/${prog.id}/documents`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        prog.programme_director_id
          ? supabase.from('users').select('full_name').eq('id', prog.programme_director_id).single()
              .then(({ data }) => { if (data?.full_name) setReviewDirectorName(data.full_name) })
          : Promise.resolve(),
        prog.advisor_id
          ? supabase.from('users').select('full_name').eq('id', prog.advisor_id).single()
              .then(({ data }) => { if (data?.full_name) setReviewAdvisorName(data.full_name) })
          : Promise.resolve(),
      ])
      if (docsRes.ok) { const data = await docsRes.json(); setReviewDocs(Array.isArray(data) ? data : (data.data ?? [])) }
    } catch (_) {}
    setReviewDocsLoading(false)
  }

  const handleCloseReview = () => {
    setReviewProg(null); setRejectComment(''); setReviewDocs([])
    setReviewDirectorName(''); setReviewAdvisorName('')
  }
  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/login') }
  const handleEdit = (prog: Programme) => {
    setEditForm({ ...prog, start_date: prog.start_date?.slice(0, 10), end_date: prog.end_date?.slice(0, 10) })
    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    setActionLoading(true)
    const token = await getToken()
    if (!token) { router.replace('/login'); return }
    const res = await fetch(`/api/programmes/${editForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editForm.name, category: editForm.category, venue: editForm.venue, budget: parseFloat(Number(editForm.budget).toFixed(2)), start_date: editForm.start_date, end_date: editForm.end_date }),
    })
    const data = await res.json()
    if (res.ok) { setProgrammes(prev => prev.map(p => p.id === editForm.id ? data.programme : p)); setShowEditModal(false) }
    setActionLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this programme? This cannot be undone.')) return
    const token = await getToken()
    if (!token) return
    setDeleteLoading(true)
    const res = await fetch(`/api/programmes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setProgrammes(prev => prev.filter(p => p.id !== id))
    setDeleteLoading(false)
  }

  const handleApprove = async (noRujukan: string, attendeeMeritPoints: number) => {
    if (!reviewProg) return
    const token = await getToken()
    if (!token) return
    setActionLoading(true)
    const res = await fetch(`/api/programmes/${reviewProg.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ no_rujukan: noRujukan, attendee_merit_points: attendeeMeritPoints }),
    })
    if (res.ok) { setProgrammes(prev => prev.map(p => p.id === reviewProg.id ? { ...p, status: 'Approved' } : p)); setReviewProg(null) }
    else { const d = await res.json(); alert(d.error ?? 'Failed to approve.') }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!reviewProg) return
    if (!rejectComment.trim()) { alert('Please provide a rejection comment before rejecting.'); return }
    const token = await getToken()
    if (!token) return
    setRejectLoading(true)
    const res = await fetch(`/api/programmes/${reviewProg.id}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: rejectComment.trim() }),
    })
    if (res.ok) { setProgrammes(prev => prev.map(p => p.id === reviewProg.id ? { ...p, status: 'Rejected' } : p)); setReviewProg(null); setRejectComment('') }
    else { const d = await res.json(); alert(d.error ?? 'Failed to reject.') }
    setRejectLoading(false)
  }

  const stats = {
    total:       programmes.length,
    pending:     programmes.filter(p => p.status === 'Pending').length,
    approved:    programmes.filter(p => p.status === 'Approved').length,
    rejected:    programmes.filter(p => p.status === 'Rejected').length,
    totalBudget: programmes.filter(p => p.status !== 'Rejected').reduce((sum, p) => sum + (Number(p.budget) || 0), 0),
  }

  const filtered = programmes.filter(p => {
    const q = searchQuery.toLowerCase()
    return (p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.venue?.toLowerCase().includes(q))
      && (filterStatus === 'All' || p.status === filterStatus)
  })

  const navItems: { id: NavItem; icon: React.ElementType; label: string; path: string }[] = [
    { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard',      path: '/superadmin' },
    { id: 'programmes',    icon: BookOpen,         label: 'Add Programmes', path: '/create-programme-form' },
    { id: 'attendance',    icon: QrCode,           label: 'Attendance',     path: '/superadmin/attendance' },
    { id: 'schedule',      icon: CalendarCheck,    label: 'Schedule',       path: '/superadmin/schedule' },
    { id: 'users',         icon: Users,            label: 'Users',          path: '/superadmin/users' },
    { id: 'createAdmin',   icon: CirclePlus,       label: 'Create Admin',   path: '/superadmin/create-admin' },
    { id: 'exchangeAdmin', icon: ArrowRightLeft,   label: 'Exchange Admin', path: '/superadmin/exchange-admin' },
    { id: 'profile',       icon: UserCircle,       label: 'Profile',        path: '/profile' },
    { id: 'settings',      icon: Settings,         label: 'Settings',       path: '/settings' },
  ]

  const handleNavClick = (item: typeof navItems[0]) => { setActiveNav(item.id); router.push(item.path) }

  const tableProps = {
    filtered, T,
    onEdit:   handleEdit,
    onDelete: handleDelete,
    onReview: handleOpenReview,
    onView:   (id: string) => router.push(`/programmes/${id}`),
  }

  const sharedModalProps = {
    isMobile: isMobile ?? false, T,
    actionLoading, rejectLoading,
    preDocs: reviewDocs, preDocsLoading: reviewDocsLoading,
    getToken,
    rejectComment,
    directorName: reviewDirectorName,
    advisorName:  reviewAdvisorName,
    onClose:         handleCloseReview,
    onCommentChange: setRejectComment,
    onApprove:       handleApprove,
    onReject:        handleReject,
    onDocsChange:    setReviewDocs,
  }

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `3px solid ${T.accentBg}`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: T.textSecondary, fontSize: '13px' }}>Initializing superadmin panel...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (isMobile === null) return <div style={{ minHeight: '100vh', background: T.pageBg }} />

  /* ══════════════════════════════════════════════════════
     MOBILE LAYOUT
  ══════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: T.pageBg, color: T.textBody, fontFamily: "'Inter', -apple-system, sans-serif", transition: 'background 0.25s, color 0.25s' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* Sticky top bar */}
        <div style={{ background: T.surfaceBg, borderBottom: `1px solid ${T.accentBorderSub}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30, transition: 'background 0.25s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: T.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Shield size={12} color="white" />
              <Crown size={7} color="#fef3c7" style={{ position: 'absolute', top: '-3px', right: '-3px' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: T.textPrimary, letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '9px', color: T.accent, margin: 0, fontWeight: 600, letterSpacing: '0.06em' }}>SUPERADMIN</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThemeToggle theme={theme} onToggle={toggleTheme} T={T} />
            <NotificationBell />
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: T.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
              {getInitials(profile?.full_name || '')}
            </div>
            <button
              onClick={() => setShowMobileMenu(v => !v)}
              style={{ width: '32px', height: '32px', borderRadius: '8px', background: showMobileMenu ? T.accentBg : T.inputBg, border: `1px solid ${showMobileMenu ? T.accentBorder : T.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              {showMobileMenu ? <X size={16} color={T.textAccent} /> : <Menu size={16} color={T.textSecondary} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {showMobileMenu && (
          <>
            <div
              onClick={() => setShowMobileMenu(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 25, backdropFilter: 'blur(2px)' }}
            />
            <div style={{
              position: 'fixed', top: '57px', left: 0, right: 0, zIndex: 26,
              background: T.surfaceBg, borderBottom: `1px solid ${T.accentBorderSub}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {navItems.map(item => {
                  const Icon = item.icon
                  const isActive = activeNav === item.id
                  return (
                    <button key={item.id} onClick={() => { handleNavClick(item); setShowMobileMenu(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '11px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                        background: isActive ? T.accentBg : 'transparent',
                        color: isActive ? T.textAccent : T.textSecondary,
                        fontSize: '14px', fontWeight: isActive ? 600 : 400,
                        textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.15s',
                      }}>
                      <Icon size={17} />
                      <span>{item.label}</span>
                      {isActive && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: T.accent, flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
              <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: T.textPrimary }}>Superadmin Dashboard</h1>
              <span style={{ fontSize: '9px', fontWeight: 600, background: T.accentBg, color: T.textAccent, border: `1px solid ${T.accentBorder}`, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.06em', flexShrink: 0 }}>ELEVATED</span>
            </div>
            <p style={{ fontSize: '11px', color: T.textSecondary, margin: 0 }}>
              {currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <StatCards stats={stats} userCount={userCount} adminCount={adminCount} isMobile={true} T={T} />
          <BudgetBanner stats={stats} isMobile={true} T={T} />
          <OverduePanel duringOverdue={overdueItems.during} postOverdue={overdueItems.post} isMobile={true} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { icon: CirclePlus,     label: 'Create Admin',  desc: 'Register new admin',  path: '/superadmin/create-admin' },
              { icon: ArrowRightLeft, label: 'Exchange Admin', desc: 'Transfer privileges', path: '/superadmin/exchange-admin' },
              { icon: Users,          label: 'Manage Users',  desc: 'View all users',      path: '/admin/users' },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <button key={i} onClick={() => router.push(item.path)}
                  style={{ background: T.cardBg, border: `1px solid ${T.accentBorder}`, borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'background 0.2s' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={T.textAccent} />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: T.textPrimary }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: '10px', color: T.textSecondary }}>{item.desc}</p>
                </button>
              )
            })}
          </div>

          {/* Programme section */}
          <div style={{ background: T.surfaceBg, border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden', transition: 'background 0.25s' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={13} color={T.accent} />Programme Management
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: T.textSecondary }}>{filtered.length} of {programmes.length} programmes</p>
                </div>
                <button onClick={() => router.push('/create-programme-form')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: T.gradientBtn, border: 'none', borderRadius: '7px', padding: '7px 12px', color: 'white', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                  <CirclePlus size={12} />New
                </button>
              </div>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
                <input type="text" placeholder="Search programmes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px 8px 28px', background: T.inputBg, border: `1px solid ${T.borderSoft}`, borderRadius: '7px', color: T.textBody, fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                {(['All', 'Under Review', 'Approved', 'Rejected'] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, background: filterStatus === s ? T.accentBg : T.inputBg, color: filterStatus === s ? T.textAccent : T.textSecondary, transition: 'all 0.15s' }}>
                    {s}{s !== 'All' && ` (${s === 'Under Review' ? programmes.filter(p => p.status === 'Under Review').length : s === 'Approved' ? stats.approved : stats.rejected})`}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px' }}>
              <MobileProgrammeCards {...tableProps} />
            </div>
          </div>
        </div>


        <EditModal show={showEditModal} isMobile={true} editForm={editForm} actionLoading={actionLoading}
          onClose={() => setShowEditModal(false)} onChange={setEditForm} onUpdate={handleUpdate} T={T} />
        <ReviewModal prog={reviewProg} {...sharedModalProps} isMobile={true} />
        <LoadingOverlay actionLoading={actionLoading} rejectLoading={rejectLoading} deleteLoading={deleteLoading} rejectComment={rejectComment} T={T} />
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     DESKTOP LAYOUT
  ══════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: T.pageBg, display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif", color: T.textBody, transition: 'background 0.25s, color 0.25s' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* SIDEBAR */}
      <aside style={{ width: '220px', background: T.surfaceBg, borderRight: `1px solid ${T.accentBorderSub}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20, transition: 'background 0.25s' }}>
        <div style={{ padding: '24px 20px', borderBottom: `1px solid ${T.accentBorderSub}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: T.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Shield size={14} color="white" />
              <Crown size={8} color="#fef3c7" style={{ position: 'absolute', top: '-4px', right: '-4px' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: T.textPrimary, letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '10px', color: T.accent, margin: 0, fontWeight: 600, letterSpacing: '0.06em' }}>SUPERADMIN</p>
            </div>
          </div>
        </div>

        <nav style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '9px', fontWeight: 600, color: T.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>Navigation</p>
          {navItems.slice(0, 4).map(item => {
            const Icon = item.icon; const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => handleNavClick(item)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? T.accentBg : 'transparent', color: isActive ? T.textAccent : T.textSecondary, fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                <Icon size={15} />{item.label}
                {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: T.accent }} />}
              </button>
            )
          })}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${T.accentBorderSub}` }}>
            <p style={{ fontSize: '9px', fontWeight: 600, color: T.accent, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px', opacity: 0.7 }}>Superadmin Only</p>
            {navItems.slice(4, 9).map(item => {
              const Icon = item.icon; const isActive = activeNav === item.id
              return (
                <button key={item.id} onClick={() => handleNavClick(item)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? T.accentBg : 'transparent', color: isActive ? T.textAccent : T.textSecondary, fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                  <Icon size={15} />{item.label}
                  {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: T.accent }} />}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: '12px' }}>
            <button onClick={() => router.push('/superadmin/create-admin')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: T.accentSoft, color: T.textAccent, fontSize: '13px', fontWeight: 500, textAlign: 'left' }}>
              <CirclePlus size={15} />New Admin
            </button>
          </div>
        </nav>

        <div style={{ padding: '14px', borderTop: `1px solid ${T.accentBorderSub}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px', borderRadius: '9px', background: T.accentSoft }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: T.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
              {getInitials(profile?.full_name || '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Superadmin'}</p>
              <p style={{ margin: 0, fontSize: '10px', color: T.accent, fontWeight: 500 }}>Superadmin</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textSecondary, padding: '3px' }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: '220px', padding: '28px 32px', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: T.textPrimary }}>Superadmin Dashboard</h1>
              <span style={{ fontSize: '10px', fontWeight: 600, background: T.accentBg, color: T.textAccent, border: `1px solid ${T.accentBorder}`, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.06em' }}>ELEVATED ACCESS</span>
            </div>
            <p style={{ fontSize: '13px', color: T.textSecondary, margin: 0 }}>{currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Theme toggle */}
            <ThemeToggle theme={theme} onToggle={toggleTheme} T={T} />
            <NotificationBell />
            <button onClick={() => router.push('/superadmin/create-admin')}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', background: T.gradientBtn, border: 'none', borderRadius: '9px', padding: '9px 16px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <CirclePlus size={14} />New Admin
            </button>
          </div>
        </div>

        <StatCards stats={stats} userCount={userCount} adminCount={adminCount} isMobile={false} T={T} />
        <BudgetBanner stats={stats} isMobile={false} T={T} />
        <OverduePanel duringOverdue={overdueItems.during} postOverdue={overdueItems.post} isMobile={false} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { icon: CirclePlus,     label: 'Create Admin',  desc: 'Register a new admin account',   path: '/superadmin/create-admin' },
            { icon: ArrowRightLeft, label: 'Exchange Admin', desc: 'Transfer superadmin privileges', path: '/superadmin/exchange-admin' },
            { icon: Users,          label: 'Manage Users',  desc: 'View and manage all users',      path: '/admin/users' },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <button key={i} onClick={() => router.push(item.path)}
                style={{ background: T.cardBg, border: `1px solid ${T.accentBorder}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, background 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = T.accent}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = T.accentBorder}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={T.textAccent} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: T.textPrimary }}>{item.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: T.textSecondary }}>{item.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* TABLE */}
        <div style={{ background: T.surfaceBg, border: `1px solid ${T.border}`, borderRadius: '14px', overflow: 'hidden', transition: 'background 0.25s' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={15} color={T.accent} />Programme Management</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: T.textSecondary }}>{filtered.length} of {programmes.length} programmes</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: T.inputBg, border: `1px solid ${T.borderSoft}`, borderRadius: '7px', padding: '7px 10px 7px 30px', color: T.textBody, fontSize: '12px', outline: 'none', width: '180px' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['All', 'Under Review', 'Approved', 'Rejected'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, background: filterStatus === s ? T.accentBg : T.inputBg, color: filterStatus === s ? T.textAccent : T.textSecondary, transition: 'all 0.15s' }}>
                    {s}{s !== 'All' && <span style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.7 }}>({s === 'Under Review' ? programmes.filter(p => p.status === 'Under Review').length : s === 'Approved' ? stats.approved : stats.rejected})</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DesktopTable {...tableProps} />
        </div>
      </main>

      <EditModal show={showEditModal} isMobile={false} editForm={editForm} actionLoading={actionLoading}
        onClose={() => setShowEditModal(false)} onChange={setEditForm} onUpdate={handleUpdate} T={T} />
      <ReviewModal prog={reviewProg} {...sharedModalProps} isMobile={false} />
      <LoadingOverlay actionLoading={actionLoading} rejectLoading={rejectLoading} deleteLoading={deleteLoading} rejectComment={rejectComment} T={T} />
    </div>
  )
}