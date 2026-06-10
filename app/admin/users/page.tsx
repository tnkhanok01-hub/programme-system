'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut, Shield,
  Search, UserPlus, Trash2, X, AlertCircle, QrCode,
  Star, UserCircle, Sun, Moon,
} from 'lucide-react'
import { useTheme } from '../../provider/ThemeContext'

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
  programme_id: string
  points: number
  status: string
  updated_at: string
  programmes?: { name: string | null } | { name: string | null }[] | null
}

type NavItem = 'dashboard' | 'programmes' | 'users' | 'settings' | 'attendance' | 'profile'
type RoleJoin = { name?: string | null } | { name?: string | null }[] | null
type AdminProfile = { full_name?: string | null; roles?: RoleJoin }
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

function HighlightMatch({ text = '', query = '' }) {
  if (!query.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${query})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <span key={i} style={{ background: 'rgba(167,139,250,0.25)', color: '#c4b5fd', borderRadius: '3px', padding: '0 2px' }}>{part}</span>
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
      background: points > 0 ? 'rgba(167,139,250,0.15)' : t.bgInput,
      color: points > 0 ? '#a78bfa' : t.textFaint,
      border: `1px solid ${points > 0 ? 'rgba(167,139,250,0.3)' : t.border}`,
      borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700,
    }}>
      <Star size={10} fill={points > 0 ? 'currentColor' : 'none'} />
      {points} pt{points !== 1 ? 's' : ''}
    </span>
  )
}

/* ─── MERIT DRAWER ───────────────────────────────────────────────────────── */
function MeritDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t } = useTheme()
  const [records, setRecords] = useState<MeritRecord[]>([])
  const [displayTotal, setDisplayTotal] = useState(100)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    load()
  }, [userId])

  const earnedPts = records.reduce((s, r) => s + r.points, 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, backdropFilter: 'blur(4px)', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: t.bgCard, border: '1px solid rgba(167,139,250,0.25)', borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={15} color="#a78bfa" fill="#a78bfa" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: t.text }}>Merit Points</p>
              <p style={{ margin: 0, fontSize: '11px', color: t.textFaint }}>{records.length} record{records.length !== 1 ? 's' : ''} · {displayTotal} pts total</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '7px', padding: '6px', cursor: 'pointer', color: t.textFaint }}><X size={16} /></button>
        </div>

        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: '12px', flexShrink: 0 }}>
          {[
            { label: 'Total Points', value: displayTotal,    color: '#a78bfa' },
            { label: 'Earned',       value: earnedPts,       color: '#38bdf8' },
            { label: 'Programmes',   value: records.length,  color: '#38bdf8' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: s.color }}>{s.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', color: t.textFaint }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '3px solid rgba(167,139,250,0.2)', borderTopColor: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textFaint }}>
              <Star size={28} style={{ margin: '0 auto 10px', color: t.textFaintest }} />
              <p style={{ margin: 0, fontSize: '13px' }}>No merit records yet.</p>
            </div>
          ) : records.map(r => (
            <div key={r.id} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {programmeName(r.programmes)}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '10px', color: t.textFaint }}>
                    {new Date(r.updated_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <MeritBadge points={r.points} />
              </div>
            </div>
          ))}
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
  const fields: { label: string; key: keyof StudentForm; type: string }[] = [
    { label: 'Full Name *',        key: 'fullName',        type: 'text' },
    { label: 'Matric Number *',    key: 'matricNumber',    type: 'text' },
    { label: 'UTM Email *',        key: 'email',           type: 'email' },
    { label: 'Phone Number',       key: 'phone',           type: 'tel' },
    { label: 'Password *',         key: 'password',        type: 'password' },
    { label: 'Confirm Password *', key: 'confirmPassword', type: 'password' },
  ]
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ background: t.bgCard, width: '100%', maxWidth: '420px', borderRadius: '14px', padding: '24px', border: `1px solid ${t.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={15} color="#a78bfa" />Add New Student
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '11px', color: t.textFaint, display: 'block', marginBottom: '5px', fontWeight: 500 }}>{f.label}</label>
              <input type={f.type} value={form[f.key] || ''} onChange={e => onChange({ ...form, [f.key]: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '7px', padding: '9px 12px', color: t.text, fontSize: '13px', outline: 'none' }} />
            </div>
          ))}
        </div>
        {formError && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '12px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '6px' }}>
            <AlertCircle size={14} />{formError}
          </p>
        )}
        <button onClick={onSubmit} disabled={formLoading}
          style={{ width: '100%', padding: '10px', marginTop: '20px', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: formLoading ? 'not-allowed' : 'pointer', opacity: formLoading ? 0.7 : 1 }}>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
      <div style={{ background: t.bgCard, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '340px', textAlign: 'center', border: `1px solid ${t.border}` }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={24} color="#ef4444" />
        </div>
        <h3 style={{ margin: '0 0 8px', color: t.text, fontSize: '16px', fontWeight: 600 }}>Confirm Deletion</h3>
        <p style={{ margin: '0 0 24px', color: t.textMuted, fontSize: '13px', lineHeight: 1.5 }}>
          Are you sure you want to delete <strong style={{ color: t.text }}>{user.full_name}</strong>? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Yes, Delete</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminUsersPage() {
  const router = useRouter()
  const { t, mode, setMode } = useTheme()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
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
  const [meritDrawerUserId, setMeritDrawerUserId] = useState<string | null>(null)
  const [form, setForm] = useState({ fullName: '', matricNumber: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

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
      const { data: profileData } = await supabase.from('users').select('*, roles(name)').eq('id', session.user.id).single()
      const currentRole = getRoleName(profileData?.roles as RoleJoin)
      if (currentRole !== 'admin' && currentRole !== 'superadmin') { router.replace('/login'); return }
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
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'AD'

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

  const filteredUsers = users
  const totalPages = Math.max(Math.ceil(totalUsers / pageSize), 1)

  const navItems: { id: NavItem; icon: React.ElementType; label: string; path: string }[] = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',      path: '/admin' },
    { id: 'programmes', icon: BookOpen,         label: 'Add Programmes', path: '/create-programme-form' },
    { id: 'attendance', icon: QrCode,           label: 'Attendance',     path: '/superadmin/attendance' },
    { id: 'users',      icon: Users,            label: 'Users',          path: '/admin/users' },
    { id: 'profile',    icon: UserCircle,       label: 'Profile',        path: '/profile' },
    { id: 'settings',   icon: Settings,         label: 'Settings',       path: '/settings' },
  ]

  const sharedModals = (
    <>
      <AddStudentModal show={showAddModal} form={form} formLoading={formLoading} formError={formError} onChange={setForm} onSubmit={handleAddUser} onClose={() => setShowAddModal(false)} />
      <DeleteModal user={userToDelete} onConfirm={handleDeleteConfirm} onClose={() => setUserToDelete(null)} />
      {meritDrawerUserId && <MeritDrawer userId={meritDrawerUserId} onClose={() => setMeritDrawerUserId(null)} />}
    </>
  )

  if (loading || isMobile === null) return <div style={{ minHeight: '100vh', background: t.bg }} />

  /* ══════════════════ MOBILE ══════════════════ */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: '70px' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        <div style={{ background: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={13} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: t.text }}>UTM-SPMS</p>
              <p style={{ fontSize: '9px', color: t.textFaintest, margin: 0, fontWeight: 500, letterSpacing: '0.04em' }}>ADMIN PANEL</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textFaint }}>
              {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#5b21b6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
              {getInitials(profile?.full_name)}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: t.text }}>Student Users</h1>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textFaintest }}>{totalUsers} student{totalUsers !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(135deg,#6d28d9,#7c3aed)', border: 'none', borderRadius: '7px', padding: '7px 12px', color: 'white', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
              <UserPlus size={12} />Add Student
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint }} />
            <input type="text" placeholder="Search by name or matric..." value={searchQuery} onChange={e => { setPage(1); setSearchQuery(e.target.value) }}
              style={{ width: '100%', boxSizing: 'border-box', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 12px 8px 28px', color: t.text, fontSize: '12px', outline: 'none' }} />
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: t.textFaintest, fontSize: '13px' }}>No students found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredUsers.map(u => {
                const pts = u.merit_points
                const isSelected = selectedUserId === u.id
                return (
                  <div key={u.id} onClick={() => setSelectedUserId(isSelected ? null : u.id)}
                    style={{ padding: '12px 14px', background: isSelected ? 'rgba(124,58,237,0.08)' : t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isSelected ? '10px' : 0 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <HighlightMatch text={u.full_name} query={searchQuery} />
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: '10px', color: t.textFaint }}>{u.matric_number}</p>
                      </div>
                      <MeritBadge points={pts} />
                    </div>
                    {isSelected && (
                      <div style={{ paddingTop: '10px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: '6px' }}>
                        <button onClick={e => { e.stopPropagation(); setMeritDrawerUserId(u.id) }}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Star size={11} />Merit
                        </button>
                        <button onClick={e => { e.stopPropagation(); setUserToDelete(u) }}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
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
              style={{ flex: 1, padding: '8px 10px', borderRadius: '7px', border: `1px solid ${t.border}`, background: t.bgCard, color: page <= 1 ? t.textFaintest : t.textFaint, fontSize: '12px', cursor: page <= 1 || usersLoading ? 'not-allowed' : 'pointer' }}>
              Previous
            </button>
            <span style={{ fontSize: '11px', color: t.textFaint, whiteSpace: 'nowrap' }}>
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || usersLoading}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '7px', border: `1px solid ${t.border}`, background: t.bgCard, color: page >= totalPages ? t.textFaintest : t.textFaint, fontSize: '12px', cursor: page >= totalPages || usersLoading ? 'not-allowed' : 'pointer' }}>
              Next
            </button>
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.bgCard, borderTop: `1px solid ${t.border}`, display: 'flex', zIndex: 20 }}>
          {navItems.map(item => {
            const Icon = item.icon; const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', cursor: 'pointer', gap: '3px', border: 'none', background: 'transparent' }}>
                <Icon size={16} color={isActive ? '#a78bfa' : t.textFaintest} />
                <span style={{ fontSize: '9px', fontWeight: 500, color: isActive ? '#a78bfa' : t.textFaintest }}>{item.label}</span>
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
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif", color: t.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <aside style={{ width: '220px', background: t.bgCard, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: t.text }}>UTM-SPMS</p>
              <p style={{ fontSize: '10px', color: t.textFaintest, margin: 0, fontWeight: 500, letterSpacing: '0.04em' }}>ADMIN PANEL</p>
            </div>
          </div>
        </div>
        <nav style={{ padding: '14px 10px', flex: 1 }}>
          <p style={{ fontSize: '9px', fontWeight: 600, color: t.textFaintest, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>Navigation</p>
          {navItems.map(item => {
            const Icon = item.icon; const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent', color: isActive ? '#a78bfa' : t.textFaint, fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                <Icon size={15} />{item.label}
                {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: '#7c3aed' }} />}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '14px', borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px', borderRadius: '9px', background: t.bgInput }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #5b21b6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
              {getInitials(profile?.full_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Admin'}</p>
              <p style={{ margin: 0, fontSize: '10px', color: t.textFaint, textTransform: 'capitalize' }}>Administrator</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textFaint, padding: '3px' }}><LogOut size={13} /></button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: '220px', padding: '28px 32px', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 3px', color: t.text }}>Student Users</h1>
            <p style={{ margin: 0, fontSize: '13px', color: t.textFaintest }}>Page {page} of {totalPages} · {totalUsers} students</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '9px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textFaint }}>
              {mode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint }} />
              <input type="text" placeholder="Search by Name or Matric Number..." value={searchQuery} onChange={e => { setPage(1); setSearchQuery(e.target.value) }}
                style={{ width: '280px', boxSizing: 'border-box', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '9px', padding: '10px 14px 10px 36px', color: t.text, fontSize: '13px', outline: 'none' }} />
            </div>
            <button onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', border: 'none', borderRadius: '9px', padding: '10px 20px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <UserPlus size={15} />Add Student
            </button>
          </div>
        </div>

        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}`, color: t.textFaint, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {['Full Name', 'Matric Number', 'Email', 'Merit Points', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: t.textFaint }}>No students found.</td></tr>
              ) : filteredUsers.map((u) => {
                const pts = u.merit_points
                const isSelected = selectedUserId === u.id
                return (
                  <tr key={u.id} onClick={() => setSelectedUserId(isSelected ? null : u.id)}
                    style={{ borderBottom: `1px solid ${t.border}`, cursor: 'pointer', background: isSelected ? 'rgba(124,58,237,0.08)' : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.04)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <td style={{ padding: '14px 20px', color: t.text, fontWeight: 500 }}>
                      <HighlightMatch text={u.full_name} query={searchQuery} />
                    </td>
                    <td style={{ padding: '14px 20px', color: t.textMuted }}>
                      <HighlightMatch text={u.matric_number} query={searchQuery} />
                    </td>
                    <td style={{ padding: '14px 20px', color: t.textMuted }}>{u.email}</td>
                    <td style={{ padding: '14px 20px' }}><MeritBadge points={pts} /></td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={e => { e.stopPropagation(); setMeritDrawerUserId(u.id) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page <= 1 || usersLoading}
            style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgCard, color: page <= 1 ? t.textFaintest : t.textFaint, fontSize: '12px', cursor: page <= 1 || usersLoading ? 'not-allowed' : 'pointer' }}>
            Previous
          </button>
          <span style={{ fontSize: '12px', color: t.textFaint }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages || usersLoading}
            style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgCard, color: page >= totalPages ? t.textFaintest : t.textFaint, fontSize: '12px', cursor: page >= totalPages || usersLoading ? 'not-allowed' : 'pointer' }}>
            Next
          </button>
        </div>
      </main>
      {sharedModals}
    </div>
  )
}
