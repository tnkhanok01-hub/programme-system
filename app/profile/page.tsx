'use client'
import { Award } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/app/provider/ThemeContext'
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
  const { t } = useTheme()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [meritPoints, setMeritPoints] = useState(0)
  const [meritRecords, setMeritRecords] = useState<any[]>([])
  const [showMeritBreakdown, setShowMeritBreakdown] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', matric: '', staff: '' })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let isMounted = true
    const getUser = async () => {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) { router.replace('/login'); return }

      const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
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

        const meritData = data.merit ?? []
        setMeritPoints(meritData.reduce((sum: number, item: any) => sum + (item.points || 0), 0))
        setMeritRecords(meritData)
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

  const handleStartEdit = () => { setSaveError(''); setSaveSuccess(false); setEditing(true) }

  const handleCancelEdit = () => {
    setEditForm({ name: user?.name ?? '', phone: user?.phone ?? '', matric: user?.matric ?? '', staff: user?.staff ?? '' })
    setSaveError(''); setEditing(false)
  }

  const capitalizeName = (name: string) =>
    name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

  const handleSave = async () => {
    if (!editForm.name.trim()) { setSaveError('Name cannot be empty.'); return }
    setSaving(true); setSaveError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const formattedName = capitalizeName(editForm.name.trim())
    const updates: Record<string, string | null> = {
      full_name: formattedName,
      phone: editForm.phone.trim() || null,
    }
    if (!isAdmin) updates.matric_number = editForm.matric.trim() || null
    else updates.staff_number = editForm.staff.trim() || null

    const { error } = await supabase.from('users').update(updates).eq('id', user!.id)
    if (error) { setSaveError(error.message || 'Failed to save changes.'); setSaving(false); return }

    setUser(prev => prev ? {
      ...prev, name: formattedName, phone: editForm.phone.trim() || null,
      matric: isAdmin ? prev.matric : (editForm.matric.trim() || null),
      staff: isAdmin ? (editForm.staff.trim() || null) : prev.staff,
    } : prev)
    setSaving(false); setSaveSuccess(true); setEditing(false)
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
    background: t.bgInput, border: `1px solid ${t.accentBorder}`,
    color: t.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
  }

  const fieldRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '16px 20px', borderBottom: `1px solid ${t.border}`,
  }

  const iconBoxStyle: React.CSSProperties = {
    width: '34px', height: '34px', borderRadius: '9px',
    background: t.accentBg, display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  }

  const fieldLabelStyle: React.CSSProperties = {
    margin: '0 0 4px', fontSize: '11px', color: t.textFaint,
    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${t.accentBg}`, borderTopColor: t.accentText, animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: t.textFaint, fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>Loading profile...</p>
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
        input:focus { border-color: ${t.accentBorder} !important; box-shadow: 0 0 0 3px ${t.accentBg}; }
        input::placeholder { color: ${t.textFaintest}; }
      `}</style>

      <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "'DM Sans', sans-serif", color: t.text }}>

        {/* Mobile sticky top bar */}
        {isMobile && (
          <div style={{ background: t.bgCardAlt, borderBottom: `1px solid ${t.border}`, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={handleBack} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={20} />
              </button>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>My Profile</h1>
            </div>
            {!editing ? (
              <button onClick={handleStartEdit} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: '7px', padding: '6px 11px', color: t.accentText, fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                <Pencil size={12} />Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleCancelEdit} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '7px', padding: '6px 10px', color: t.textFaint, fontSize: '12px', cursor: 'pointer' }}>
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
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                <ArrowLeft size={14} />Back
              </button>
              {!editing ? (
                <button onClick={handleStartEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: '8px', padding: '8px 14px', color: t.accentText, fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                  <Pencil size={13} />Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCancelEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 14px', color: t.textFaint, fontSize: '13px', cursor: 'pointer' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: t.successBg, border: `1px solid ${t.successBorder}`, borderRadius: '10px', marginBottom: '16px' }}>
              <Check size={16} color={t.success} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: t.success }}>Profile updated successfully!</p>
            </div>
          )}

          {/* Error banner */}
          {saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, borderRadius: '10px', marginBottom: '16px' }}>
              <X size={16} color={t.danger} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', color: t.danger }}>{saveError}</p>
            </div>
          )}

          {/* Profile header card */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: isMobile ? '24px 20px' : '32px', marginBottom: '16px', textAlign: 'center' }}>
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
              <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>
                {user?.name ?? 'Unknown'}
              </h2>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: roleConfig.bg, color: roleConfig.color, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              <RoleIcon size={12} />{roleConfig.label}
            </div>
          </div>

          {/* Detail fields card */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>

            {/* Matric / Staff ID */}
            <div style={fieldRowStyle}>
              <div style={iconBoxStyle}><Hash size={15} color={t.accentText} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={fieldLabelStyle}>{isAdmin ? 'Staff ID' : 'Matric Number'}</p>
                {editing ? (
                  <input style={inputStyle}
                    value={isAdmin ? editForm.staff : editForm.matric}
                    onChange={e => setEditForm(prev => isAdmin ? { ...prev, staff: e.target.value } : { ...prev, matric: e.target.value })}
                    placeholder={isAdmin ? 'e.g. A12345' : 'e.g. A22EC0001'}
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: '14px', color: t.text }}>{isAdmin ? (user?.staff ?? 'N/A') : (user?.matric ?? 'N/A')}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div style={fieldRowStyle}>
              <div style={iconBoxStyle}><Mail size={15} color={t.accentText} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...fieldLabelStyle, marginBottom: '3px' }}>Email</p>
                <p style={{ margin: 0, fontSize: '14px', color: editing ? t.textFaint : t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email ?? 'N/A'}</p>
                {editing && <p style={{ margin: '3px 0 0', fontSize: '11px', color: t.textFaintest }}>Email cannot be changed</p>}
              </div>
            </div>

            {/* Phone */}
            <div style={fieldRowStyle}>
              <div style={iconBoxStyle}><Phone size={15} color={t.accentText} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={fieldLabelStyle}>Phone Number</p>
                {editing ? (
                  <input style={inputStyle} value={editForm.phone}
                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 011-12345678" inputMode="tel"
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: '14px', color: t.text }}>{user?.phone ?? 'N/A'}</p>
                )}
              </div>
            </div>

            {/* Account created */}
            <div style={{ ...fieldRowStyle, borderBottom: 'none' }}>
              <div style={iconBoxStyle}><Calendar size={15} color={t.accentText} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...fieldLabelStyle, marginBottom: '3px' }}>Account Created</p>
                <p style={{ margin: 0, fontSize: '14px', color: t.text }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

          </div>

          {/* Merit section (students only) */}
          {user?.role === 'student' && (
            <>
              {/* Merit breakdown modal */}
              {showMeritBreakdown && (
                <div onClick={() => setShowMeritBreakdown(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, backdropFilter: 'blur(4px)', padding: '16px' }}>
                  <div onClick={e => e.stopPropagation()}
                    style={{ background: t.bgCard, border: `1px solid ${t.accentBorder}`, borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '24px 28px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Award size={22} color="#60a5fa" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: t.text }}>Merit Breakdown</p>
                          <p style={{ margin: 0, fontSize: '13px', color: t.textFaint }}>{meritRecords.length} programme{meritRecords.length !== 1 ? 's' : ''} · {meritPoints} pts total</p>
                        </div>
                      </div>
                      <button onClick={() => setShowMeritBreakdown(false)}
                        style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px', cursor: 'pointer', color: t.textFaint }}>
                        <X size={18} />
                      </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {meritRecords.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: t.textFaint }}>
                          <Award size={32} style={{ margin: '0 auto 12px', color: t.textFaintest }} />
                          <p style={{ margin: 0, fontSize: '15px' }}>No merit records yet.</p>
                        </div>
                      ) : meritRecords.map((r, i) => (
                        <div key={i} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(r.programmes as any)?.name || 'Unknown Programme'}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: t.textFaint }}>
                              {r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                            </p>
                          </div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '8px', padding: '6px 14px', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                            +{r.points} pt{r.points !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Merit card */}
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: t.textFaint, fontSize: '12px', margin: 0, marginBottom: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      Total Merit Points
                    </p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <h1 style={{ color: t.text, fontSize: '36px', fontWeight: 700, margin: 0, lineHeight: 1 }}>{meritPoints}</h1>
                      <span style={{ color: t.textFaint, fontSize: '14px' }}>points</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.12)' }}>
                      <Award size={28} color="#60a5fa" />
                    </div>
                    <button onClick={() => setShowMeritBreakdown(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '7px', padding: '5px 10px', color: '#60a5fa', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Logout */}
          <button onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', borderRadius: '12px', border: `1px solid ${t.dangerBorder}`, background: t.dangerBg, color: t.danger, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = t.dangerBg)}
          >
            <LogOut size={16} />Sign Out
          </button>

        </div>
      </div>
    </>
  )
}