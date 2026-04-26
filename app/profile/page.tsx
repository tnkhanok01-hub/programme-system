'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowLeft, User, Mail, Phone, Hash, Calendar,
  Shield, LogOut, Crown, Pencil, Check, X, Loader2,
} from 'lucide-react'

type UserProfile = {
  name: string
  email: string | null
  id: string
  matric: string | null
  staff: string | null
  role: string
  created_at: string | null
  phone: string | null
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  // ── Edit state ───────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '', phone: '', matric: '', staff: '',
  })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let isMounted = true
    const getUser = async () => {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) { router.replace('/login'); return }

      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) { setLoading(false); return }
      if (isMounted) {
        const profile: UserProfile = {
          name: data.name, email: data.email ?? null, id: data.id,
          matric: data.matric ?? null, staff: data.staff ?? null,
          role: data.role, created_at: data.created_at ?? null, phone: data.phone ?? null,
        }
        setUser(profile)
        setEditForm({ name: data.name ?? '', phone: data.phone ?? '', matric: data.matric ?? '', staff: data.staff ?? '' })
        setLoading(false)
      }
    }
    getUser()
    return () => { isMounted = false }
  }, [router])

  const handleBack = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
    const data = await res.json()
    if (!res.ok) return
    if (data.role === 'superadmin') router.push('/superadmin')
    else if (data.role === 'admin') router.push('/admin')
    else router.push('/student')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleStartEdit = () => {
    setSaveError('')
    setSaveSuccess(false)
    setEditing(true)
  }

  const handleCancelEdit = () => {
    // reset form to current user values
    setEditForm({
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      matric: user?.matric ?? '',
      staff: user?.staff ?? '',
    })
    setSaveError('')
    setEditing(false)
  }

  const handleSave = async () => {
    if (!editForm.name.trim()) { setSaveError('Name cannot be empty.'); return }
    setSaving(true)
    setSaveError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    // Update users table using column names from /api/profile
    const updates: Record<string, string | null> = {
      full_name: editForm.name.trim(),
      phone: editForm.phone.trim() || null,
    }
    if (!isAdmin) updates.matric_number = editForm.matric.trim() || null
    else updates.staff_number = editForm.staff.trim() || null

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user!.id)

    if (error) {
      setSaveError(error.message || 'Failed to save changes.')
      setSaving(false)
      return
    }

    // Update local state
    setUser(prev => prev ? {
      ...prev,
      name: editForm.name.trim(),
      phone: editForm.phone.trim() || null,
      matric: isAdmin ? prev.matric : (editForm.matric.trim() || null),
      staff: isAdmin ? (editForm.staff.trim() || null) : prev.staff,
    } : prev)

    setSaving(false)
    setSaveSuccess(true)
    setEditing(false)
    setTimeout(() => setSaveSuccess(false), 4000)
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'

  const getRoleConfig = (role: string) => {
    if (role === 'superadmin') return { label: 'Super Admin', color: '#eab308', bg: 'rgba(234,179,8,0.12)', icon: Crown }
    if (role === 'admin')      return { label: 'Admin',       color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: Shield }
    return                            { label: 'Student',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: User }
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 11px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.4)',
    color: '#e2e8f0', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#475569', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>Loading profile...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const roleConfig = getRoleConfig(user?.role ?? 'student')
  const RoleIcon = roleConfig.icon

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus { border-color: rgba(99,102,241,0.6) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        input::placeholder { color: #374151; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#070e1a', fontFamily: "'DM Sans', sans-serif", color: '#e2e8f0' }}>

        {/* Mobile sticky top bar */}
        {isMobile && (
          <div style={{ background: '#0a1220', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={handleBack} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={20} />
              </button>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>My Profile</h1>
            </div>
            {!editing ? (
              <button onClick={handleStartEdit} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '7px', padding: '6px 11px', color: '#818cf8', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                <Pencil size={12} />Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleCancelEdit} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '6px 10px', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
                  <X size={12} />Cancel
                </button>
                <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: '7px', padding: '6px 11px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={12} />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ maxWidth: '560px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 20px' }}>

          {/* Desktop back + edit row */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                <ArrowLeft size={14} />Back
              </button>
              {!editing ? (
                <button onClick={handleStartEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '8px', padding: '8px 14px', color: '#818cf8', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }}>
                  <Pencil size={13} />Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCancelEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 14px', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>
                    <X size={13} />Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: '8px', padding: '8px 16px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={13} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success banner */}
          {saveSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', marginBottom: '16px' }}>
              <Check size={16} color="#10b981" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#10b981' }}>Profile updated successfully!</p>
            </div>
          )}

          {/* Error banner */}
          {saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', marginBottom: '16px' }}>
              <X size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}>{saveError}</p>
            </div>
          )}

          {/* Profile header card */}
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: isMobile ? '24px 20px' : '32px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 700, color: 'white', margin: '0 auto 16px' }}>
              {getInitials(editing ? editForm.name : (user?.name || ''))}
            </div>
            {editing ? (
              <input
                style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
              />
            ) : (
              <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                {user?.name ?? 'Unknown'}
              </h2>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: roleConfig.bg, color: roleConfig.color, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              <RoleIcon size={12} />{roleConfig.label}
            </div>
          </div>

          {/* Detail fields card */}
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>

            {/* Matric / Staff ID — editable */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Hash size={15} color="#818cf8" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isAdmin ? 'Staff ID' : 'Matric Number'}
                </p>
                {editing ? (
                  <input
                    style={inputStyle}
                    value={isAdmin ? editForm.staff : editForm.matric}
                    onChange={e => setEditForm(prev => isAdmin ? { ...prev, staff: e.target.value } : { ...prev, matric: e.target.value })}
                    placeholder={isAdmin ? 'e.g. A12345' : 'e.g. A22EC0001'}
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0' }}>{isAdmin ? (user?.staff ?? 'N/A') : (user?.matric ?? 'N/A')}</p>
                )}
              </div>
            </div>

            {/* Email — read only */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={15} color="#818cf8" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</p>
                <p style={{ margin: 0, fontSize: '14px', color: editing ? '#475569' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email ?? 'N/A'}</p>
                {editing && <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#374151' }}>Email cannot be changed</p>}
              </div>
            </div>

            {/* Phone — editable */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={15} color="#818cf8" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone Number</p>
                {editing ? (
                  <input
                    style={inputStyle}
                    value={editForm.phone}
                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 011-12345678"
                    inputMode="tel"
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0' }}>{user?.phone ?? 'N/A'}</p>
                )}
              </div>
            </div>

            {/* Account created — read only */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={15} color="#818cf8" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account Created</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0' }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          >
            <LogOut size={16} />Sign Out
          </button>

        </div>
      </div>
    </>
  )
}