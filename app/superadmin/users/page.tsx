'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { useTheme } from '@/app/provider/ThemeContext'
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut, Bell,
  CirclePlus, ArrowRightLeft, Shield, Crown, Search, TrendingUp,
  UserPlus, Trash2, X, AlertCircle, QrCode, Star, CheckCircle, XCircle, Clock,
  UserCircle, CalendarCheck, Menu
} from 'lucide-react'

interface UserData {
  id: string
  full_name: string
  email?: string
  role: string
  matric_number: string
  phone?: string
  earned_merit_points: number
  merit_points: number
}

interface MeritRecord {
  id: string
  programme_id: string | null
  points: number
  status: string
  reason?: string
  updated_at: string
  programmes?: { name: string | null } | { name: string | null }[] | null
}

const SA = {
  accent:       '#f59e0b',
  accentBg:     'rgba(245,158,11,0.12)',
  accentBorder: 'rgba(245,158,11,0.2)',
  accentText:   '#fbbf24',
  accentSoft:   'rgba(245,158,11,0.06)',
  gradientBtn:  'linear-gradient(135deg, #b45309, #d97706)',
  gradientLogo: 'linear-gradient(135deg, #92400e, #d97706)',
}

type NavItem = 'dashboard' | 'programmes' | 'attendance' | 'users' | 'createAdmin' | 'exchangeAdmin' | 'settings' | 'profile' | 'schedule'
type RoleJoin = { name?: string | null } | { name?: string | null }[] | null
type SuperadminProfile = { full_name?: string | null; roles?: RoleJoin }
type StudentForm = {
  fullName: string
  matricNumber: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

function getRoleName(roles: RoleJoin) {
  return (Array.isArray(roles) ? roles[0]?.name : roles?.name)?.toLowerCase()
}

function programmeName(programmes: MeritRecord['programmes']) {
  return (Array.isArray(programmes) ? programmes[0]?.name : programmes?.name) ?? 'Unknown Programme'
}

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

const getInitials = (name: string) =>
  name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SA'

function HighlightMatch({ text = '', query = '' }) {
  if (!query.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${query})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <span key={i} style={{ background: 'rgba(245,158,11,0.25)', color: '#fbbf24', borderRadius: '3px', padding: '0 2px' }}>{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function MeritBadge({ points }: { points: number }) {
  const { t } = useTheme()
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: points > 0 ? SA.accentBg : t.bgInput,
      color: points > 0 ? SA.accentText : t.textMuted,
      border: `1px solid ${points > 0 ? SA.accentBorder : t.border}`,
      borderRadius: '6px', padding: '4px 10px', fontSize: '13px', fontWeight: 700,
    }}>
      <Star size={12} fill={points > 0 ? 'currentColor' : 'none'} />
      {points} pt{points !== 1 ? 's' : ''}
    </span>
  )
}

/* ─── MERIT DRAWER ───────────────────────────────────────────────────────── */
function MeritDrawer({ userId, userName, onClose }: {
  userId: string; userName: string; onClose: () => void
}) {
  const { t } = useTheme()
  const [records, setRecords] = useState<MeritRecord[]>([])
  const [displayTotal, setDisplayTotal] = useState(100)
  const [loading, setLoading] = useState(true)
  const [undoingId, setUndoingId] = useState<string | null>(null)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const res = await fetch(`/api/merit/user/${userId}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.ok) {
      const { merit, displayTotal } = await res.json()
      setRecords(merit as MeritRecord[])
      setDisplayTotal(Number(displayTotal || 100))
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [userId])

  const handleUndo = async (meritId: string) => {
    setUndoingId(meritId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUndoingId(null); return }
    const res = await fetch('/api/merit/demerit', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ merit_id: meritId }),
    })
    if (res.ok) await load()
    setUndoingId(null)
  }

  const earnedPts = records.reduce((s, r) => s + r.points, 0)
  const pendingCount = records.filter(r => r.status === 'awarded' || r.status === 'pending').length

  const statusCfg = (s: string) => {
    if (s === 'approved') return { color: t.success,    bg: t.successBg, border: t.successBorder, Icon: CheckCircle }
    if (s === 'rejected') return { color: t.danger,     bg: t.dangerBg,  border: t.dangerBorder,  Icon: XCircle }
    if (s === 'demerit')  return { color: t.danger,     bg: t.dangerBg,  border: t.dangerBorder,  Icon: AlertCircle }
    return                       { color: SA.accentText, bg: SA.accentBg, border: SA.accentBorder, Icon: Clock }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, backdropFilter: 'blur(6px)', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: t.bgCard, border: `1px solid ${SA.accentBorder}`, borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: SA.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={16} color={SA.accentText} fill={SA.accentText} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: t.text }}>Merit Points</p>
              <p style={{ margin: 0, fontSize: '13px', color: t.textFaint }}>{userName}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: SA.accentSoft, border: `1px solid ${SA.accentBorder}`, borderRadius: '7px', padding: '6px', cursor: 'pointer', color: SA.accentText }}><X size={16} /></button>
        </div>

        {/* Summary */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: '12px', flexShrink: 0 }}>
          {[
            { label: 'Total pts',    value: displayTotal,  color: t.success },
            { label: 'Earned',       value: earnedPts,     color: '#38bdf8' },
            { label: 'Pending',      value: pendingCount,  color: SA.accentText },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: t.textFaint }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Records */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `3px solid ${SA.accentBg}`, borderTopColor: SA.accent, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: t.textFaint }}>
              <Star size={32} style={{ margin: '0 auto 12px', color: t.textFaintest }} />
              <p style={{ margin: 0, fontSize: '13px' }}>No merit records yet.</p>
            </div>
          ) : records.map(r => {
            const isDemerit = r.status === 'demerit'
            const cfg = statusCfg(r.status)
            return (
              <div key={r.id} style={{ background: isDemerit ? t.dangerBg : t.bgCardAlt, border: `1px solid ${isDemerit ? t.dangerBorder : t.border}`, borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: isDemerit ? t.danger : t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isDemerit ? 'Demerit' : programmeName(r.programmes)}
                    </p>
                    {isDemerit && r.reason && (
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: t.textMuted, fontStyle: 'italic' }}>{r.reason}</p>
                    )}
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: t.textFaint }}>
                      {new Date(r.updated_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <MeritBadge points={r.points} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 500 }}>
                      <cfg.Icon size={12} />{r.status}
                    </span>
                    {isDemerit && (
                      <button onClick={() => handleUndo(r.id)} disabled={undoingId === r.id}
                        style={{ background: 'transparent', border: `1px solid ${t.borderInput}`, color: t.textMuted, borderRadius: '5px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: undoingId === r.id ? 'not-allowed' : 'pointer', opacity: undoingId === r.id ? 0.6 : 1, fontFamily: 'inherit' }}>
                        {undoingId === r.id ? '…' : 'Undo'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── DEMERIT MODAL ──────────────────────────────────────────────────────── */
function DemeritModal({ user, onClose, onDone }: { user: UserData | null; onClose: () => void; onDone: () => void }) {
  const { t } = useTheme()
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null

  const handleSubmit = async () => {
    setError('')
    const pts = parseInt(points)
    if (!pts || pts <= 0) { setError('Enter a valid number of points.'); return }
    if (!reason.trim()) { setError('Please provide a reason.'); return }
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Session expired.'); setLoading(false); return }
    const res = await fetch('/api/merit/demerit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ user_id: user.id, points: pts, reason: reason.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to apply demerit.'); setLoading(false); return }
    setLoading(false)
    onDone()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: t.bgCard, border: `1px solid ${t.dangerBorder}`, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: t.text }}>Give Demerit Points</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: t.textFaint }}>{user.full_name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: t.textFaint, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demerit Points</label>
            <input type="number" min="1" placeholder="e.g. 2" value={points} onChange={e => setPoints(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: t.bgInput, border: `1px solid ${t.dangerBorder}`, borderRadius: '8px', padding: '10px 12px', color: t.text, fontSize: '14px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: t.textFaint, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</label>
            <textarea rows={3} placeholder="State the reason for this demerit..." value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: t.bgInput, border: `1px solid ${t.borderInput}`, borderRadius: '8px', padding: '10px 12px', color: t.text, fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>

        {error && (
          <p style={{ color: t.danger, fontSize: '12px', margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: '5px', background: t.dangerBg, padding: '8px 12px', borderRadius: '7px' }}>
            <AlertCircle size={13} />{error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${t.borderInput}`, color: t.textMuted, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ flex: 1, padding: '10px', background: t.danger, border: 'none', color: 'white', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
            {loading ? 'Applying…' : `Apply −${points || '0'} pts`}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── ADD STUDENT MODAL ──────────────────────────────────────────────────── */
function AddStudentModal({ show, form, formLoading, formError, onChange, onSubmit, onClose }: {
  show: boolean; form: StudentForm; formLoading: boolean; formError: string
  onChange: (f: StudentForm) => void; onSubmit: () => void; onClose: () => void
}) {
  const { t } = useTheme()
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: t.bgCard, border: `1px solid ${SA.accentBorder}`, width: '100%', maxWidth: '420px', borderRadius: '14px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={15} color={SA.accentText} />Add New Student
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {([
            { label: 'Full Name *', key: 'fullName', type: 'text' },
            { label: 'Matric Number *', key: 'matricNumber', type: 'text' },
            { label: 'UTM Email *', key: 'email', type: 'email' },
            { label: 'Phone Number', key: 'phone', type: 'tel' },
            { label: 'Password *', key: 'password', type: 'password' },
            { label: 'Confirm Password *', key: 'confirmPassword', type: 'password' },
          ] satisfies { label: string; key: keyof StudentForm; type: string }[]).map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '11px', color: t.textFaint, display: 'block', marginBottom: '5px', fontWeight: 500 }}>{f.label}</label>
              <input type={f.type} value={form[f.key] || ''} onChange={e => onChange({ ...form, [f.key]: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', background: t.bgInput, border: `1px solid ${t.borderInput}`, borderRadius: '7px', padding: '9px 12px', color: t.text, fontSize: '13px', outline: 'none' }} />
            </div>
          ))}
        </div>
        {formError && (
          <p style={{ color: t.danger, fontSize: '12px', marginTop: '12px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '5px', background: t.dangerBg, padding: '8px 12px', borderRadius: '7px' }}>
            <AlertCircle size={14} />{formError}
          </p>
        )}
        <button onClick={onSubmit} disabled={formLoading}
          style={{ width: '100%', padding: '10px', marginTop: '20px', background: SA.gradientBtn, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: formLoading ? 'not-allowed' : 'pointer', opacity: formLoading ? 0.7 : 1 }}>
          {formLoading ? 'Processing...' : 'Confirm & Add'}
        </button>
      </div>
    </div>
  )
}

/* ─── DELETE MODAL ───────────────────────────────────────────────────────── */
function DeleteModal({ user, onConfirm, onClose }: { user: UserData | null; onConfirm: () => void; onClose: () => void }) {
  const { t } = useTheme()
  if (!user) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: t.bgCard, border: `1px solid ${SA.accentBorder}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: t.dangerBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={24} color={t.danger} />
        </div>
        <h3 style={{ margin: '0 0 8px', color: t.text, fontSize: '16px', fontWeight: 600 }}>Confirm Deletion</h3>
        <p style={{ margin: '0 0 24px', color: t.textMuted, fontSize: '13px', lineHeight: 1.5 }}>
          Delete <strong style={{ color: t.text }}>{user.full_name}</strong>? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${t.borderInput}`, color: t.textMuted, borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', background: t.danger, border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function SuperAdminUsersPage() {
  const router = useRouter()
  const { t, mode } = useTheme()
  const [profile, setProfile] = useState<SuperadminProfile | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [sessionToken, setSessionToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [activeNav] = useState<NavItem>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)
  const [meritDrawerUser, setMeritDrawerUser] = useState<UserData | null>(null)
  const [demeritUser, setDemeritUser] = useState<UserData | null>(null)
  const [form, setForm] = useState({ fullName: '', matricNumber: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [currentTime] = useState(new Date())

  const rowAltBg = mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.02)'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const loadStudents = async (token: string, nextPage: number, query: string) => {
    setUsersLoading(true)
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
      q: query,
    })
    const res = await fetch(`/api/users/students?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users ?? [])
      setTotalUsers(data.total ?? 0)
    }
    setUsersLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setSessionToken(session.access_token)
      const { data: profileData } = await supabase.from('users').select('id, full_name, roles(name)').eq('id', session.user.id).single()
      const role = getRoleName(profileData?.roles as RoleJoin) ?? ''
      if (role !== 'superadmin') { router.replace('/login'); return }
      setProfile(profileData)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!sessionToken) return
    const timer = setTimeout(() => {
      void loadStudents(sessionToken, page, searchQuery)
    }, 250)
    return () => clearTimeout(timer)
  }, [sessionToken, page, searchQuery])

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/login') }

  const handleAddUser = async () => {
    setFormError('')
    if (!form.email || !form.password || !form.confirmPassword || !form.fullName || !form.matricNumber) { setFormError('Please fill in all required fields.'); return }
    if (form.password !== form.confirmPassword) { setFormError('Passwords do not match.'); return }
    setFormLoading(true)
    const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, password: form.password, full_name: form.fullName, matric_number: form.matricNumber, phone: form.phone }) })
    const data = await res.json()
    if (!res.ok) { setFormError(data.error || 'Failed to create user'); setFormLoading(false); return }
    setShowAddModal(false)
    setForm({ fullName: '', matricNumber: '', email: '', phone: '', password: '', confirmPassword: '' })
    window.location.reload()
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/admins?id=${userToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return
    setUsers(users.filter(u => u.id !== userToDelete.id))
    setUserToDelete(null); setSelectedUserId(null)
  }

  const filteredUsers = users
  const totalPages = Math.max(Math.ceil(totalUsers / pageSize), 1)

  const totalApprovedPts = users.reduce((s, u) => s + u.merit_points, 0)
  const studentsWithMerit = users.filter(u => u.earned_merit_points > 0).length

  if (loading || isMobile === null) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `3px solid ${SA.accentBg}`, borderTopColor: SA.accent, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const handleDemeritDone = async () => {
    setDemeritUser(null)
    if (sessionToken) void loadStudents(sessionToken, page, searchQuery)
  }

  const sharedModals = (
    <>
      <AddStudentModal show={showAddModal} form={form} formLoading={formLoading} formError={formError} onChange={setForm} onSubmit={handleAddUser} onClose={() => setShowAddModal(false)} />
      <DeleteModal user={userToDelete} onConfirm={handleDeleteConfirm} onClose={() => setUserToDelete(null)} />
      {meritDrawerUser && <MeritDrawer userId={meritDrawerUser.id} userName={meritDrawerUser.full_name} onClose={() => setMeritDrawerUser(null)} />}
      <DemeritModal user={demeritUser} onClose={() => setDemeritUser(null)} onDone={handleDemeritDone} />
    </>
  )

  /* ══════════════════ MOBILE ══════════════════ */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* Top bar */}
        <div style={{ background: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: SA.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Shield size={12} color="white" />
              <Crown size={7} color="#fef3c7" style={{ position: 'absolute', top: '-3px', right: '-3px' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: t.text, letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '9px', color: SA.accent, margin: 0, fontWeight: 600, letterSpacing: '0.06em' }}>SUPERADMIN</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: SA.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
              {getInitials(profile?.full_name || '')}
            </div>
            <button onClick={() => setShowMobileMenu(v => !v)}
              style={{ width: '32px', height: '32px', borderRadius: '8px', background: showMobileMenu ? SA.accentBg : 'rgba(255,255,255,0.04)', border: `1px solid ${showMobileMenu ? SA.accentBorder : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              {showMobileMenu ? <X size={16} color={SA.accentText} /> : <Menu size={16} color={t.textFaint} />}
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <>
            <div onClick={() => setShowMobileMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 25, backdropFilter: 'blur(2px)' }} />
            <div style={{ position: 'fixed', top: '57px', left: 0, right: 0, zIndex: 26, background: t.bgCard, borderBottom: `1px solid ${t.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {navItems.map(item => {
                  const Icon = item.icon
                  const isActive = activeNav === item.id
                  return (
                    <button key={item.id} onClick={() => { router.push(item.path); setShowMobileMenu(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', background: isActive ? SA.accentBg : 'transparent', color: isActive ? SA.accentText : t.textFaint, fontSize: '14px', fontWeight: isActive ? 600 : 400, textAlign: 'left', fontFamily: 'inherit' }}>
                      <Icon size={17} />
                      <span>{item.label}</span>
                      {isActive && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: SA.accent, flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        <div style={{ padding: '16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: t.text }}>Student Users</h1>
                <span style={{ fontSize: '9px', fontWeight: 600, background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.06em' }}>ELEVATED</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: t.textFaint }}>{currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: SA.gradientBtn, border: 'none', borderRadius: '7px', padding: '8px 12px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              <UserPlus size={12} />Add
            </button>
          </div>

          {/* Stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Total Students', value: totalUsers,          color: SA.accentText, bg: SA.accentBg,  border: SA.accentBorder },
              { label: 'Merit Awarded',  value: studentsWithMerit,   color: t.success,     bg: t.successBg,  border: t.successBorder },
              { label: 'Total Pts',      value: totalApprovedPts,    color: SA.accentText, bg: SA.accentBg,  border: SA.accentBorder },
            ].map((s, i) => (
              <div key={i} style={{ background: t.bgCard, border: `1px solid ${s.border}`, borderRadius: '10px', padding: '12px' }}>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
                <p style={{ margin: '2px 0 0', fontSize: '9px', color: t.textFaint }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint }} />
            <input type="text" placeholder="Search by name or matric..." value={searchQuery} onChange={e => { setPage(1); setSearchQuery(e.target.value) }}
              style={{ width: '100%', boxSizing: 'border-box', background: t.bgCard, border: `1px solid ${SA.accentBorder}`, borderRadius: '8px', padding: '8px 12px 8px 28px', color: t.text, fontSize: '12px', outline: 'none' }} />
          </div>

          {/* Cards */}
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textFaintest, fontSize: '13px' }}>No students found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredUsers.map(u => {
                const pts = u.merit_points
                const isSelected = selectedUserId === u.id
                return (
                  <div key={u.id} onClick={() => setSelectedUserId(isSelected ? null : u.id)}
                    style={{ padding: '12px 14px', background: isSelected ? SA.accentBg : t.bgCard, border: `1px solid ${isSelected ? SA.accentBorder : t.border}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.12s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isSelected ? '10px' : 0 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <HighlightMatch text={u.full_name} query={searchQuery} />
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: '10px', color: t.textFaint }}>
                          {u.matric_number}{u.email !== 'N/A' ? ` · ${u.email}` : ''}
                        </p>
                      </div>
                      <MeritBadge points={pts} />
                    </div>
                    {isSelected && (
                      <div style={{ paddingTop: '10px', borderTop: `1px solid ${SA.accentBorder}`, display: 'flex', gap: '6px' }}>
                        <button onClick={e => { e.stopPropagation(); setMeritDrawerUser(u) }}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '7px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Star size={11} />Merit
                        </button>
                        <button onClick={e => { e.stopPropagation(); setDemeritUser(u) }}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: t.dangerBg, color: t.danger, border: `1px solid ${t.dangerBorder}`, padding: '7px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <AlertCircle size={11} />Demerit
                        </button>
                        <button onClick={e => { e.stopPropagation(); setUserToDelete(u) }}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: t.dangerBg, color: t.danger, border: `1px solid ${t.dangerBorder}`, padding: '7px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Trash2 size={11} />Delete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', gap: '10px' }}>
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page <= 1 || usersLoading}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '7px', border: `1px solid ${SA.accentBorder}`, background: t.bgCard, color: page <= 1 ? t.textFaintest : SA.accentText, fontSize: '12px', cursor: page <= 1 || usersLoading ? 'not-allowed' : 'pointer' }}>
              Previous
            </button>
            <span style={{ fontSize: '11px', color: t.textFaint, whiteSpace: 'nowrap' }}>
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || usersLoading}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '7px', border: `1px solid ${SA.accentBorder}`, background: t.bgCard, color: page >= totalPages ? t.textFaintest : SA.accentText, fontSize: '12px', cursor: page >= totalPages || usersLoading ? 'not-allowed' : 'pointer' }}>
              Next
            </button>
          </div>
        </div>

        {sharedModals}
      </div>
    )
  }

  /* ══════════════════ DESKTOP ══════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif", color: t.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* SIDEBAR */}
      <aside style={{ width: '220px', background: t.bgCard, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: SA.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Shield size={14} color="white" />
              <Crown size={8} color="#fef3c7" style={{ position: 'absolute', top: '-4px', right: '-4px' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: t.text, letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '10px', color: SA.accent, margin: 0, fontWeight: 600, letterSpacing: '0.06em' }}>SUPERADMIN</p>
            </div>
          </div>
        </div>
        <nav style={{ padding: '14px 10px', flex: 1 }}>
          <p style={{ fontSize: '9px', fontWeight: 600, color: t.textFaintest, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>Navigation</p>
          {navItems.slice(0, 4).map(item => {
            const Icon = item.icon; const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? SA.accentBg : 'transparent', color: isActive ? SA.accentText : t.textFaint, fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                <Icon size={15} />{item.label}
                {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: SA.accent }} />}
              </button>
            )
          })}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${t.border}` }}>
            <p style={{ fontSize: '9px', fontWeight: 600, color: SA.accent, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px', opacity: 0.6 }}>Superadmin Only</p>
            {navItems.slice(4, 9).map(item => {
              const Icon = item.icon; const isActive = activeNav === item.id
              return (
                <button key={item.id} onClick={() => router.push(item.path)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? SA.accentBg : 'transparent', color: isActive ? SA.accentText : t.textFaint, fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                  <Icon size={15} />{item.label}
                  {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: SA.accent }} />}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: '12px' }}>
            <button onClick={() => router.push('/superadmin/create-admin')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: SA.accentSoft, color: SA.accentText, fontSize: '13px', fontWeight: 500, textAlign: 'left' }}>
              <CirclePlus size={15} />New Admin
            </button>
          </div>
        </nav>
        <div style={{ padding: '14px', borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px', borderRadius: '9px', background: SA.accentSoft }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: SA.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
              {getInitials(profile?.full_name || '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Superadmin'}</p>
              <p style={{ margin: 0, fontSize: '10px', color: SA.accent, fontWeight: 500 }}>Superadmin</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textFaint, padding: '3px' }}><LogOut size={13} /></button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: '220px', padding: '28px 32px', overflowX: 'hidden' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: t.text, letterSpacing: '-0.02em' }}>Student Users</h1>
              <span style={{ fontSize: '10px', fontWeight: 600, background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.06em' }}>ELEVATED ACCESS</span>
            </div>
            <p style={{ fontSize: '13px', color: t.textFaint, margin: 0 }}>{currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button style={{ position: 'relative', background: t.bgInput, border: `1px solid ${t.borderInput}`, borderRadius: '9px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textFaint }}>
              <Bell size={15} />
            </button>
            <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: SA.gradientBtn, border: 'none', borderRadius: '9px', padding: '9px 16px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <UserPlus size={14} />Add Student
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Students',   value: totalUsers,           icon: Users,      color: SA.accentText, bg: SA.accentBg,  border: SA.accentBorder },
            { label: 'Merit Awarded',    value: studentsWithMerit,    icon: Star,       color: t.success,     bg: t.successBg,  border: t.successBorder },
            { label: 'Total Merit Pts',  value: totalApprovedPts,     icon: TrendingUp, color: SA.accentText, bg: SA.accentBg,  border: SA.accentBorder },
            { label: 'Showing',          value: filteredUsers.length, icon: Search,     color: '#38bdf8',     bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.15)' },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} style={{ background: t.bgCard, border: `1px solid ${card.border}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={card.color} />
                  </div>
                  <TrendingUp size={11} color={t.textFaintest} />
                </div>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: t.text, letterSpacing: '-0.03em' }}>{card.value}</p>
                <p style={{ margin: '3px 0 0', fontSize: '10px', color: t.textFaint }}>{card.label}</p>
              </div>
            )
          })}
        </div>

        {/* Table */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={15} color={SA.accent} />Student Directory
              </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: t.textFaint }}>Page {page} of {totalPages} · {totalUsers} students</p>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint }} />
              <input type="text" placeholder="Search by name or matric..." value={searchQuery} onChange={e => { setPage(1); setSearchQuery(e.target.value) }}
                style={{ background: t.bgInput, border: `1px solid ${t.borderInput}`, borderRadius: '7px', padding: '7px 10px 7px 30px', color: t.text, fontSize: '12px', outline: 'none', width: '260px' }} />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}`, color: t.textFaintest, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {['Full Name', 'Matric Number', 'Email', 'Phone', 'Merit Points', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: t.textFaintest, fontSize: '13px' }}>No students found.</td></tr>
                ) : filteredUsers.map((u, i) => {
                  const pts = u.merit_points
                  const isSelected = selectedUserId === u.id
                  return (
                    <tr key={u.id} onClick={() => setSelectedUserId(isSelected ? null : u.id)}
                      style={{ borderBottom: `1px solid ${t.border}`, cursor: 'pointer', background: isSelected ? SA.accentBg : (i % 2 === 0 ? 'transparent' : rowAltBg), transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = SA.accentSoft }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : rowAltBg }}>
                      <td style={{ padding: '12px 14px', color: t.text, fontWeight: 500, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <HighlightMatch text={u.full_name} query={searchQuery} />
                      </td>
                      <td style={{ padding: '12px 14px', color: t.textMuted }}>
                        <HighlightMatch text={u.matric_number} query={searchQuery} />
                      </td>
                      <td style={{ padding: '12px 14px', color: t.textMuted, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                      <td style={{ padding: '12px 14px', color: t.textMuted }}>{u.phone || '—'}</td>
                      <td style={{ padding: '12px 14px' }}><MeritBadge points={pts} /></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={e => { e.stopPropagation(); setMeritDrawerUser(u) }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Star size={11} />Merit
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDemeritUser(u) }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.dangerBg, color: t.danger, border: `1px solid ${t.dangerBorder}`, padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <AlertCircle size={11} />Demerit
                          </button>
                          <button onClick={e => { e.stopPropagation(); setUserToDelete(u) }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.dangerBg, color: t.danger, border: `1px solid ${t.dangerBorder}`, padding: '5px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Trash2 size={11} />Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page <= 1 || usersLoading}
            style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${SA.accentBorder}`, background: t.bgCard, color: page <= 1 ? t.textFaintest : SA.accentText, fontSize: '12px', cursor: page <= 1 || usersLoading ? 'not-allowed' : 'pointer' }}>
            Previous
          </button>
          <span style={{ fontSize: '12px', color: t.textFaint }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages || usersLoading}
            style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${SA.accentBorder}`, background: t.bgCard, color: page >= totalPages ? t.textFaintest : SA.accentText, fontSize: '12px', cursor: page >= totalPages || usersLoading ? 'not-allowed' : 'pointer' }}>
            Next
          </button>
        </div>
      </main>
      {sharedModals}
    </div>
  )
}
