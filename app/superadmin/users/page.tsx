'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut, Bell,
  CirclePlus, ArrowRightLeft, Shield, Crown, Search, TrendingUp,
  UserPlus, Trash2, X, AlertCircle, QrCode, Star, CheckCircle, XCircle, Clock
} from 'lucide-react'

interface UserData {
  id: string
  full_name: string
  email?: string
  role: string
  matric_number: string
  phone?: string
}

interface MeritRecord {
  id: string
  programme_id: string
  points: number
  status: string
  updated_at: string
  programmes?: { name: string }
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

type NavItem = 'dashboard' | 'programmes' | 'attendance' | 'users' | 'createAdmin' | 'exchangeAdmin' | 'settings'

const navItems: { id: NavItem; icon: React.ElementType; label: string; path: string }[] = [
  { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard',      path: '/superadmin' },
  { id: 'programmes',    icon: BookOpen,         label: 'Add Programmes', path: '/create-programme-form' },
  { id: 'attendance',    icon: QrCode,           label: 'Attendance',     path: '/superadmin/attendance' },
  { id: 'users',         icon: Users,            label: 'Users',          path: '/superadmin/users' },
  { id: 'createAdmin',   icon: CirclePlus,       label: 'Create Admin',   path: '/superadmin/create-admin' },
  { id: 'exchangeAdmin', icon: ArrowRightLeft,   label: 'Exchange Admin', path: '/superadmin/exchange-admin' },
  { id: 'settings',      icon: Settings,         label: 'Settings',       path: '/profile' },
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
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: points > 0 ? SA.accentBg : 'rgba(255,255,255,0.04)',
      color: points > 0 ? SA.accentText : '#475569',
      border: `1px solid ${points > 0 ? SA.accentBorder : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700,
    }}>
      <Star size={10} fill={points > 0 ? 'currentColor' : 'none'} />
      {points} pt{points !== 1 ? 's' : ''}
    </span>
  )
}

/* ─── MERIT DRAWER ───────────────────────────────────────────────────────── */
function MeritDrawer({ userId, userName, onClose }: {
  userId: string; userName: string; onClose: () => void
}) {
  const [records, setRecords] = useState<MeritRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('merit')
        .select('id, programme_id, points, status, updated_at, programmes(name)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
      setRecords((data ?? []) as unknown as MeritRecord[])
      setLoading(false)
    }
    load()
  }, [userId])

  const approvedPts  = records.filter(r => r.status === 'approved').reduce((s, r) => s + r.points, 0)
  const pendingCount = records.filter(r => r.status === 'awarded' || r.status === 'pending').length

  const statusCfg = (s: string) => {
    if (s === 'approved') return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  Icon: CheckCircle }
    if (s === 'rejected') return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   Icon: XCircle }
    return                       { color: SA.accentText, bg: SA.accentBg,          border: SA.accentBorder,         Icon: Clock }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, backdropFilter: 'blur(6px)', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#0f1a24', border: `1px solid ${SA.accentBorder}`, borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid rgba(245,158,11,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: SA.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={16} color={SA.accentText} fill={SA.accentText} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>Merit Points</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#4b5563' }}>{userName}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: SA.accentSoft, border: `1px solid ${SA.accentBorder}`, borderRadius: '7px', padding: '6px', cursor: 'pointer', color: SA.accentText }}><X size={16} /></button>
        </div>

        {/* Summary */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid rgba(245,158,11,0.08)`, display: 'flex', gap: '12px', flexShrink: 0 }}>
          {[
            { label: 'Approved pts', value: approvedPts,  color: '#10b981' },
            { label: 'Pending',      value: pendingCount,  color: SA.accentText },
            { label: 'Total',        value: records.length, color: '#38bdf8' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(245,158,11,0.06)`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#4b5563' }}>{s.label}</p>
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
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#4b5563' }}>
              <Star size={32} style={{ margin: '0 auto 12px', color: '#374151' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>No merit records yet.</p>
            </div>
          ) : records.map(r => {
            const cfg = statusCfg(r.status)
            return (
              <div key={r.id} style={{ background: '#0b1118', border: `1px solid rgba(245,158,11,0.06)`, borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(r.programmes as any)?.name || 'Unknown Programme'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#4b5563' }}>
                      {new Date(r.updated_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <MeritBadge points={r.points} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 500 }}>
                      <cfg.Icon size={10} />{r.status}
                    </span>
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

/* ─── ADD STUDENT MODAL ──────────────────────────────────────────────────── */
function AddStudentModal({ show, form, formLoading, formError, onChange, onSubmit, onClose }: {
  show: boolean; form: Record<string, string>; formLoading: boolean; formError: string
  onChange: (f: Record<string, string>) => void; onSubmit: () => void; onClose: () => void
}) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: '#0f1a24', border: `1px solid ${SA.accentBorder}`, width: '100%', maxWidth: '420px', borderRadius: '14px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={15} color={SA.accentText} />Add New Student
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: 'Full Name *',        key: 'fullName',        type: 'text' },
            { label: 'Matric Number *',    key: 'matricNumber',    type: 'text' },
            { label: 'UTM Email *',        key: 'email',           type: 'email' },
            { label: 'Phone Number',       key: 'phone',           type: 'tel' },
            { label: 'Password *',         key: 'password',        type: 'password' },
            { label: 'Confirm Password *', key: 'confirmPassword', type: 'password' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{f.label}</label>
              <input type={f.type} value={form[f.key] || ''} onChange={e => onChange({ ...form, [f.key]: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '9px 12px', color: '#e2e8f0', fontSize: '13px', outline: 'none' }} />
            </div>
          ))}
        </div>
        {formError && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '12px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: '7px' }}>
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
  if (!user) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: '#0f1a24', border: `1px solid ${SA.accentBorder}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={24} color="#ef4444" />
        </div>
        <h3 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: '16px', fontWeight: 600 }}>Confirm Deletion</h3>
        <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>
          Delete <strong style={{ color: '#f1f5f9' }}>{user.full_name}</strong>? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Delete</button>
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
  const [profile, setProfile] = useState<any>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [meritTotals, setMeritTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [activeNav] = useState<NavItem>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)
  const [meritDrawerUser, setMeritDrawerUser] = useState<UserData | null>(null)
  const [form, setForm] = useState({ fullName: '', matricNumber: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [currentTime] = useState(new Date())

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: profileData } = await supabase.from('users').select('id, full_name, roles(name)').eq('id', session.user.id).single()
      const role = (profileData?.roles as any)?.name?.toLowerCase?.() ?? ''
      if (role !== 'superadmin') { router.replace('/login'); return }
      setProfile(profileData)

      const { data: usersData } = await supabase.from('users').select('id, email, full_name, phone, matric_number, roles!inner(name)').eq('roles.name', 'student')
      if (usersData) {
        setUsers(usersData.map((u: any) => ({ ...u, role: u.roles?.name || 'student', matric_number: u.matric_number || 'N/A', email: u.email || 'N/A' })))
      }

      const { data: meritData } = await supabase.from('merit').select('user_id, points').eq('status', 'approved')
      if (meritData) {
        const totals: Record<string, number> = {}
        meritData.forEach((m: any) => { totals[m.user_id] = (totals[m.user_id] || 0) + m.points })
        setMeritTotals(totals)
      }
      setLoading(false)
    }
    init()
  }, [router])

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
    await supabase.from('users').delete().eq('id', userToDelete.id)
    setUsers(users.filter(u => u.id !== userToDelete.id))
    setUserToDelete(null); setSelectedUserId(null)
  }

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase()
    return u.full_name?.toLowerCase().includes(q) || u.matric_number?.toLowerCase().includes(q)
  })

  const totalApprovedPts = Object.values(meritTotals).reduce((s, v) => s + v, 0)
  const studentsWithMerit = Object.keys(meritTotals).filter(k => meritTotals[k] > 0).length

  if (loading || isMobile === null) return (
    <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `3px solid ${SA.accentBg}`, borderTopColor: SA.accent, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const sharedModals = (
    <>
      <AddStudentModal show={showAddModal} form={form as any} formLoading={formLoading} formError={formError} onChange={f => setForm(f as any)} onSubmit={handleAddUser} onClose={() => setShowAddModal(false)} />
      <DeleteModal user={userToDelete} onConfirm={handleDeleteConfirm} onClose={() => setUserToDelete(null)} />
      {meritDrawerUser && <MeritDrawer userId={meritDrawerUser.id} userName={meritDrawerUser.full_name} onClose={() => setMeritDrawerUser(null)} />}
    </>
  )

  /* ══════════════════ MOBILE ══════════════════ */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#080f1a', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: '70px' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* Top bar — matches superadmin dashboard */}
        <div style={{ background: '#0b1118', borderBottom: `1px solid rgba(245,158,11,0.08)`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: SA.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Shield size={12} color="white" />
              <Crown size={7} color="#fef3c7" style={{ position: 'absolute', top: '-3px', right: '-3px' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: '#f1f5f9', letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '9px', color: SA.accent, margin: 0, fontWeight: 600, letterSpacing: '0.06em' }}>SUPERADMIN</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: SA.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
              {getInitials(profile?.full_name || '')}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>Student Users</h1>
                <span style={{ fontSize: '9px', fontWeight: 600, background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.06em' }}>ELEVATED</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#4b5563' }}>{currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: SA.gradientBtn, border: 'none', borderRadius: '7px', padding: '8px 12px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              <UserPlus size={12} />Add
            </button>
          </div>

          {/* Stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Total Students', value: users.length,        color: SA.accentText, bg: SA.accentBg,             border: SA.accentBorder },
              { label: 'Merit Awarded',  value: studentsWithMerit,   color: '#10b981',     bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
              { label: 'Total Pts',      value: totalApprovedPts,    color: SA.accentText, bg: SA.accentBg,             border: SA.accentBorder },
            ].map((s, i) => (
              <div key={i} style={{ background: '#0b1118', border: `1px solid ${s.border}`, borderRadius: '10px', padding: '12px' }}>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
                <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#4b5563' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
            <input type="text" placeholder="Search by name or matric..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: '#0b1118', border: `1px solid rgba(245,158,11,0.1)`, borderRadius: '8px', padding: '8px 12px 8px 28px', color: '#e2e8f0', fontSize: '12px', outline: 'none' }} />
          </div>

          {/* Cards */}
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#374151', fontSize: '13px' }}>No students found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredUsers.map(u => {
                const pts = meritTotals[u.id] || 0
                const isSelected = selectedUserId === u.id
                return (
                  <div key={u.id} onClick={() => setSelectedUserId(isSelected ? null : u.id)}
                    style={{ padding: '12px 14px', background: isSelected ? SA.accentBg : '#0b1118', border: `1px solid ${isSelected ? SA.accentBorder : 'rgba(245,158,11,0.08)'}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.12s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isSelected ? '10px' : 0 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <HighlightMatch text={u.full_name} query={searchQuery} />
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#6b7280' }}>
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
                        <button onClick={e => { e.stopPropagation(); setUserToDelete(u) }}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '7px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Trash2 size={11} />Delete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom nav — same as superadmin dashboard */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0b1118', borderTop: `1px solid rgba(245,158,11,0.08)`, display: 'flex', zIndex: 20 }}>
          {navItems.map(item => {
            const Icon = item.icon; const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', cursor: 'pointer', gap: '3px', border: 'none', background: 'transparent' }}>
                <Icon size={15} color={isActive ? SA.accentText : '#4b5563'} />
                <span style={{ fontSize: '8px', fontWeight: 500, color: isActive ? SA.accentText : '#4b5563', textAlign: 'center', lineHeight: 1.1 }}>{item.label}</span>
              </button>
            )
          })}
        </div>
        {sharedModals}
      </div>
    )
  }

  /* ══════════════════ DESKTOP ══════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif", color: '#e2e8f0' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* SIDEBAR — identical structure to superadmin/page.tsx */}
      <aside style={{ width: '220px', background: '#0b1118', borderRight: `1px solid rgba(245,158,11,0.07)`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: `1px solid rgba(245,158,11,0.07)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: SA.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Shield size={14} color="white" />
              <Crown size={8} color="#fef3c7" style={{ position: 'absolute', top: '-4px', right: '-4px' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: '#f1f5f9', letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '10px', color: SA.accent, margin: 0, fontWeight: 600, letterSpacing: '0.06em' }}>SUPERADMIN</p>
            </div>
          </div>
        </div>
        <nav style={{ padding: '14px 10px', flex: 1 }}>
          <p style={{ fontSize: '9px', fontWeight: 600, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>Navigation</p>
          {navItems.slice(0, 3).map(item => {
            const Icon = item.icon; const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? SA.accentBg : 'transparent', color: isActive ? SA.accentText : '#6b7280', fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                <Icon size={15} />{item.label}
                {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: SA.accent }} />}
              </button>
            )
          })}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid rgba(245,158,11,0.07)` }}>
            <p style={{ fontSize: '9px', fontWeight: 600, color: SA.accent, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px', opacity: 0.6 }}>Superadmin Only</p>
            {navItems.slice(3, 7).map(item => {
              const Icon = item.icon; const isActive = activeNav === item.id
              return (
                <button key={item.id} onClick={() => router.push(item.path)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? SA.accentBg : 'transparent', color: isActive ? SA.accentText : '#6b7280', fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
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
        <div style={{ padding: '14px', borderTop: `1px solid rgba(245,158,11,0.07)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px', borderRadius: '9px', background: SA.accentSoft }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: SA.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
              {getInitials(profile?.full_name || '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Superadmin'}</p>
              <p style={{ margin: 0, fontSize: '10px', color: SA.accent, fontWeight: 500 }}>Superadmin</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '3px' }}><LogOut size={13} /></button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: '220px', padding: '28px 32px', overflowX: 'hidden' }}>

        {/* Page header — matches superadmin dashboard style */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>Student Users</h1>
              <span style={{ fontSize: '10px', fontWeight: 600, background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.06em' }}>ELEVATED ACCESS</span>
            </div>
            <p style={{ fontSize: '13px', color: '#4b5563', margin: 0 }}>{currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button style={{ position: 'relative', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
              <Bell size={15} />
            </button>
            <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: SA.gradientBtn, border: 'none', borderRadius: '9px', padding: '9px 16px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <UserPlus size={14} />Add Student
            </button>
          </div>
        </div>

        {/* Stat cards — same style as superadmin dashboard StatCards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Students',   value: users.length,       icon: Users,       color: SA.accentText, bg: SA.accentBg,             border: SA.accentBorder },
            { label: 'Merit Awarded',    value: studentsWithMerit,  icon: Star,        color: '#10b981',     bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.15)' },
            { label: 'Total Merit Pts',  value: totalApprovedPts,   icon: TrendingUp,  color: SA.accentText, bg: SA.accentBg,             border: SA.accentBorder },
            { label: 'Showing',          value: filteredUsers.length, icon: Search,    color: '#38bdf8',     bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.15)' },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} style={{ background: '#0b1118', border: `1px solid ${card.border}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={card.color} />
                  </div>
                  <TrendingUp size={11} color="#374151" />
                </div>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em' }}>{card.value}</p>
                <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#4b5563' }}>{card.label}</p>
              </div>
            )
          })}
        </div>

        {/* Table — same container style as superadmin dashboard */}
        <div style={{ background: '#0b1118', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={15} color={SA.accent} />Student Directory
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4b5563' }}>{filteredUsers.length} of {users.length} students</p>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
              <input type="text" placeholder="Search by name or matric..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px', padding: '7px 10px 7px 30px', color: '#e2e8f0', fontSize: '12px', outline: 'none', width: '260px' }} />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {['Full Name', 'Matric Number', 'Email', 'Phone', 'Merit Points', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#374151', fontSize: '13px' }}>No students found.</td></tr>
                ) : filteredUsers.map((u, i) => {
                  const pts = meritTotals[u.id] || 0
                  const isSelected = selectedUserId === u.id
                  return (
                    <tr key={u.id} onClick={() => setSelectedUserId(isSelected ? null : u.id)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: isSelected ? SA.accentBg : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'), transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = SA.accentSoft }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '12px 14px', color: '#f1f5f9', fontWeight: 500, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <HighlightMatch text={u.full_name} query={searchQuery} />
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>
                        <HighlightMatch text={u.matric_number} query={searchQuery} />
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{u.phone || '—'}</td>
                      <td style={{ padding: '12px 14px' }}><MeritBadge points={pts} /></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={e => { e.stopPropagation(); setMeritDrawerUser(u) }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Star size={11} />Merit
                          </button>
                          <button onClick={e => { e.stopPropagation(); setUserToDelete(u) }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.12)', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
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
      </main>
      {sharedModals}
    </div>
  )
}