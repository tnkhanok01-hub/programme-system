'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut,
  CirclePlus, Shield, Search, ArrowUpCircle, ArrowDownCircle,
  Trash2, X, Crown, ArrowRightLeft, UserCheck,
} from 'lucide-react'

interface SystemUser {
  id: string
  full_name: string
  email?: string
  role: string
  matric_number?: string
  phone?: string
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

const navItems = [
  { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard',      path: '/superadmin' },
  { id: 'programmes',    icon: BookOpen,         label: 'Programmes',     path: '/create-programme' },
  { id: 'createAdmin',   icon: CirclePlus,       label: 'Create Admin',   path: '/superadmin/create-admin' },
  { id: 'exchangeAdmin', icon: ArrowRightLeft,   label: 'Exchange Admin', path: '/superadmin/exchange-admin' },
  { id: 'settings',      icon: Settings,         label: 'Settings',       path: '/profile' },
]

/* ─── HIGHLIGHT MATCH ────────────────────────────────────────────────────── */
function HighlightText({ text = '', query = '' }) {
  if (!query.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${query})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((p, i) =>
        regex.test(p)
          ? <span key={i} style={{ background: 'rgba(245,158,11,0.25)', color: '#fbbf24', padding: '0 2px', borderRadius: '3px' }}>{p}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

/* ─── FILTER BAR ─────────────────────────────────────────────────────────── */
function FilterBar({ roleFilter, setRoleFilter }: {
  roleFilter: 'all' | 'admin' | 'student'
  setRoleFilter: (f: 'all' | 'admin' | 'student') => void
}) {
  const filters: { key: 'all' | 'admin' | 'student'; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'admin',   label: 'Admin' },
    { key: 'student', label: 'Student' },
  ]
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
      {filters.map(f => {
        const isActive = roleFilter === f.key
        const activeBg    = f.key === 'admin' ? SA.accentBg : f.key === 'student' ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.07)'
        const activeColor = f.key === 'admin' ? SA.accentText : f.key === 'student' ? '#38bdf8' : '#e2e8f0'
        const activeBorder= f.key === 'admin' ? SA.accentBorder : f.key === 'student' ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.15)'
        return (
          <button key={f.key} onClick={() => setRoleFilter(f.key)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: '1px solid',
              fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.12s',
              background:   isActive ? activeBg     : 'transparent',
              color:        isActive ? activeColor  : '#4b5563',
              borderColor:  isActive ? activeBorder : 'rgba(255,255,255,0.06)',
            }}>
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── USER ROW ───────────────────────────────────────────────────────────── */
function UserRow({
  u, search, isSelected, isAdmin, onClick, onPromote, onDemote, onDelete,
}: {
  u: SystemUser; search: string; isSelected: boolean; isAdmin: boolean
  onClick: () => void
  onPromote?: () => void
  onDemote?: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: isSelected ? (isAdmin ? SA.accentBg : 'rgba(56,189,248,0.08)') : 'transparent', transition: 'background 0.12s' }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isAdmin ? SA.accentSoft : 'rgba(255,255,255,0.02)' }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ overflow: 'hidden', paddingRight: '10px', flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 500, fontSize: '13px', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <HighlightText text={u.full_name} query={search} />
          </p>
          <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.matric_number} • {u.email}
          </p>
        </div>
        <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '5px', background: isAdmin ? SA.accentBg : 'rgba(56,189,248,0.1)', color: isAdmin ? SA.accentText : '#38bdf8', fontWeight: 500, flexShrink: 0 }}>
          {isAdmin ? 'Admin' : 'Student'}
        </span>
      </div>

      {isSelected && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${isAdmin ? SA.accentBorder : 'rgba(255,255,255,0.06)'}`, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {isAdmin && onDemote && (
            <button onClick={e => { e.stopPropagation(); onDemote() }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <ArrowDownCircle size={12} />Demote to Student
            </button>
          )}
          {!isAdmin && onPromote && (
            <button onClick={e => { e.stopPropagation(); onPromote() }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <ArrowUpCircle size={12} />Promote to Admin
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Trash2 size={12} />Delete
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── CREATE MODAL ───────────────────────────────────────────────────────── */
function CreateModal({ show, loading, formError, form, onChange, onSubmit, onClose }: {
  show: boolean; loading: boolean; formError: string
  form: Record<string, string>
  onChange: (f: Record<string, string>) => void
  onSubmit: () => void
  onClose: () => void
}) {
  if (!show) return null
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: '#0f1a24', border: `1px solid ${SA.accentBorder}`, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CirclePlus size={15} color={SA.accentText} />Create Admin
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
        </div>

        {/* Staff-only notice banner */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: '9px',
          padding: '10px 13px',
          marginBottom: '18px',
        }}>
          <UserCheck size={15} color="#a78bfa" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#a78bfa' }}>Staff Accounts Only</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7280', lineHeight: 1.5 }}>
              This form creates <strong style={{ color: '#c4b5fd' }}>ADMIN</strong> role accounts for <strong style={{ color: '#c4b5fd' }}>STAFF</strong> only.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: 'Full Name *',        key: 'fullName',        type: 'text' },
            { label: 'Staff ID *',         key: 'matricNumber',    type: 'text' },
            { label: 'UTM Email *',        key: 'email',           type: 'email' },
            { label: 'Phone Number',       key: 'phone',           type: 'tel' },
            { label: 'Password *',         key: 'password',        type: 'password' },
            { label: 'Confirm Password *', key: 'confirmPassword', type: 'password' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>{f.label}</label>
              <input type={f.type} value={form[f.key] || ''} onChange={e => onChange({ ...form, [f.key]: e.target.value })}
                style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          {formError && (
            <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', padding: '8px 12px', borderRadius: '7px' }}>{formError}</p>
          )}
          <button onClick={onSubmit} disabled={loading}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: SA.gradientBtn, color: 'white', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating...' : 'Confirm & Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── CONFIRM DIALOG ─────────────────────────────────────────────────────── */
function ConfirmDialog({ dialog, onConfirm, onClose }: {
  dialog: { isOpen: boolean; type: 'promote' | 'demote' | 'delete'; target: SystemUser | null }
  onConfirm: () => void
  onClose: () => void
}) {
  if (!dialog.isOpen) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: '#0f1a24', border: `1px solid ${SA.accentBorder}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: SA.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Shield size={20} color={SA.accentText} />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>Confirm Action</h3>
        <p style={{ margin: '0 0 22px', fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
          Are you sure you want to <strong style={{ color: '#e2e8f0' }}>{dialog.type}</strong> <br />
          <strong style={{ color: '#f1f5f9' }}>{dialog.target?.full_name}</strong>?
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: SA.gradientBtn, color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function CreateAdminPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<SystemUser[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all')
  const [showForm, setShowForm] = useState(false)
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({})
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: 'promote' | 'demote' | 'delete'; target: SystemUser | null }>({ isOpen: false, type: 'promote', target: null })
  const [form, setForm] = useState({ fullName: '', matricNumber: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchData = useCallback(async () => {
    const { data: rolesData } = await supabase.from('roles').select('*')
    const rMap: Record<string, string> = {}
    if (rolesData) { rolesData.forEach(r => rMap[r.name.toLowerCase()] = r.id); setRolesMap(rMap) }
    const { data } = await supabase.from('users').select('*, roles!inner(name)')
    if (data) setAllUsers(data.map(u => ({ ...u, role: u.roles?.name?.toLowerCase() || 'student', email: u.email || 'N/A' })))
  }, [])

  useEffect(() => {
    setProfile({ full_name: 'Super Admin' })
    fetchData()
  }, [fetchData])

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/login') }
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SA'

  const handleCreateAdmin = async () => {
    setFormError('')
    if (!form.fullName || !form.matricNumber || !form.email || !form.password || !form.confirmPassword)
      return setFormError('Please fill in all required fields (*)')
    if (form.password !== form.confirmPassword) return setFormError("Passwords don't match")
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ email: form.email, password: form.password, full_name: form.fullName, matric_number: form.matricNumber, phone: form.phone }),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ fullName: '', matricNumber: '', email: '', phone: '', password: '', confirmPassword: '' })
      fetchData()
    } else {
      const e = await res.json()
      setFormError(e.error || 'Failed to create admin')
    }
    setLoading(false)
  }

  const handleActionConfirm = async () => {
    const { type, target } = confirmDialog
    if (!target) return
    if (type === 'delete') {
      await supabase.from('users').delete().eq('id', target.id)
    } else {
      const newRoleId = rolesMap[type === 'promote' ? 'admin' : 'student']
      if (newRoleId) await supabase.from('users').update({ role_id: newRoleId }).eq('id', target.id)
    }
    setConfirmDialog({ isOpen: false, type: 'promote', target: null })
    setSelectedUser(null)
    fetchData()
  }

  const filtered = allUsers.filter(u =>
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.matric_number?.toLowerCase().includes(search.toLowerCase())) &&
    (roleFilter === 'all' || u.role === roleFilter)
  )
  const adminsList   = filtered.filter(u => u.role === 'admin')
  const studentsList = filtered.filter(u => u.role === 'student')

  const userRowProps = (u: SystemUser, isAdmin: boolean) => ({
    u,
    search,
    isSelected: selectedUser?.id === u.id,
    isAdmin,
    onClick: () => setSelectedUser(selectedUser?.id === u.id ? null : u),
    onPromote: !isAdmin ? () => setConfirmDialog({ isOpen: true, type: 'promote', target: u }) : undefined,
    onDemote:  isAdmin  ? () => setConfirmDialog({ isOpen: true, type: 'demote',  target: u }) : undefined,
    onDelete:  () => setConfirmDialog({ isOpen: true, type: 'delete', target: u }),
  })

  if (isMobile === null) return <div style={{ minHeight: '100vh', background: '#080f1a' }} />

  const sharedModals = (
    <>
      <CreateModal
        show={showForm} loading={loading} formError={formError} form={form as any}
        onChange={f => setForm(f as any)} onSubmit={handleCreateAdmin} onClose={() => setShowForm(false)}
      />
      <ConfirmDialog dialog={confirmDialog} onConfirm={handleActionConfirm} onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
    </>
  )

  /* ══════════════════════════════════════════════════════
     MOBILE LAYOUT
  ══════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#080f1a', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: '70px' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* Sticky top bar */}
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
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: SA.gradientLogo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
            {getInitials(profile?.full_name || '')}
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>Manage Roles & Admins</h1>
                <span style={{ fontSize: '9px', fontWeight: 600, background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.06em', flexShrink: 0 }}>SA ONLY</span>
              </div>
              <p style={{ fontSize: '11px', color: '#4b5563', margin: 0 }}>Promote, demote, or remove users</p>
            </div>
            <button onClick={() => setShowForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: SA.gradientBtn, border: 'none', borderRadius: '7px', padding: '8px 12px', color: 'white', fontSize: '11px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <CirclePlus size={12} />New Admin
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
            <input type="text" placeholder="Search by name or matric..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '9px 12px 9px 30px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Filter buttons */}
          <FilterBar roleFilter={roleFilter} setRoleFilter={setRoleFilter} />

          {/* Admins list */}
          {(roleFilter === 'all' || roleFilter === 'admin') && (
            <>
              <p style={{ fontSize: '9px', fontWeight: 600, color: SA.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.7 }}>
                Administrators ({adminsList.length})
              </p>
              <div style={{ background: '#0b1118', border: `1px solid ${SA.accentBorder}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                {adminsList.length === 0 ? (
                  <p style={{ padding: '20px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>No admins found.</p>
                ) : adminsList.map((u, i) => (
                  <div key={u.id} style={{ borderBottom: i < adminsList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <UserRow {...userRowProps(u, true)} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Students list */}
          {(roleFilter === 'all' || roleFilter === 'student') && (
            <>
              <p style={{ fontSize: '9px', fontWeight: 600, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Students ({studentsList.length})
              </p>
              <div style={{ background: '#0b1118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
                {studentsList.length === 0 ? (
                  <p style={{ padding: '20px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>No students found.</p>
                ) : studentsList.map((u, i) => (
                  <div key={u.id} style={{ borderBottom: i < studentsList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <UserRow {...userRowProps(u, false)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Fixed bottom tab bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0b1118', borderTop: `1px solid rgba(245,158,11,0.08)`, display: 'flex', zIndex: 20 }}>
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = item.id === 'createAdmin'
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

  /* ══════════════════════════════════════════════════════
     DESKTOP LAYOUT
  ══════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif", color: '#e2e8f0' }}>

      {/* SIDEBAR */}
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
          {navItems.slice(0, 2).map(item => {
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#6b7280', fontSize: '13px', fontWeight: 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                <Icon size={15} />{item.label}
              </button>
            )
          })}

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid rgba(245,158,11,0.07)` }}>
            <p style={{ fontSize: '9px', fontWeight: 600, color: SA.accent, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px', opacity: 0.6 }}>Superadmin Only</p>
            {navItems.slice(2, 4).map(item => {
              const Icon = item.icon
              const isActive = item.id === 'createAdmin'
              return (
                <button key={item.id} onClick={() => router.push(item.path)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? SA.accentBg : 'transparent', color: isActive ? SA.accentText : '#6b7280', fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                  <Icon size={15} />{item.label}
                  {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: SA.accent }} />}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {navItems.slice(4).map(item => {
              const Icon = item.icon
              return (
                <button key={item.id} onClick={() => router.push(item.path)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#6b7280', fontSize: '13px', fontWeight: 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                  <Icon size={15} />{item.label}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: '12px' }}>
            <button onClick={() => setShowForm(true)}
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
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '3px' }}>
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
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>Manage Roles & Admins</h1>
              <span style={{ fontSize: '10px', fontWeight: 600, background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.06em' }}>SUPERADMIN ONLY</span>
            </div>
            <p style={{ fontSize: '13px', color: '#4b5563', margin: 0 }}>Promote, demote, or remove user accounts</p>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', background: SA.gradientBtn, border: 'none', borderRadius: '9px', padding: '9px 16px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            <CirclePlus size={14} />Create New Admin
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '10px', maxWidth: '400px' }}>
          <Search size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
          <input type="text" placeholder="Search users by name or matric..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px', padding: '9px 12px 9px 34px', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Filter buttons */}
        <FilterBar roleFilter={roleFilter} setRoleFilter={setRoleFilter} />

        {/* Admins */}
        {(roleFilter === 'all' || roleFilter === 'admin') && (
          <>
            <p style={{ fontSize: '9px', fontWeight: 600, color: SA.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', opacity: 0.7 }}>
              Administrators ({adminsList.length})
            </p>
            <div style={{ background: '#0b1118', border: `1px solid ${SA.accentBorder}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
              {adminsList.length === 0 ? (
                <p style={{ padding: '20px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>No admins found.</p>
              ) : adminsList.map((u, i) => (
                <div key={u.id} style={{ borderBottom: i < adminsList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <UserRow {...userRowProps(u, true)} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Students */}
        {(roleFilter === 'all' || roleFilter === 'student') && (
          <>
            <p style={{ fontSize: '9px', fontWeight: 600, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Students ({studentsList.length})
            </p>
            <div style={{ background: '#0b1118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
              {studentsList.length === 0 ? (
                <p style={{ padding: '20px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>No students found.</p>
              ) : studentsList.map((u, i) => (
                <div key={u.id} style={{ borderBottom: i < studentsList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <UserRow {...userRowProps(u, false)} />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {sharedModals}
    </div>
  )
}