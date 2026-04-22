'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  LayoutDashboard, BookOpen, Settings, LogOut,
  CirclePlus, Shield, Search, ArrowRightLeft, Crown, AlertTriangle,
} from 'lucide-react'

interface AdminData {
  id: string
  full_name: string
  email?: string
  role: string
  matric_number?: string
}

// ── Shared amber/gold tokens (same as page.tsx + create-admin) ──
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

const HighlightText = ({ text = '', query = '' }) => {
  if (!query.trim() || !text) return <>{text}</>
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <span key={i} style={{ background: 'rgba(245,158,11,0.25)', color: '#fbbf24', padding: '0 2px', borderRadius: '3px' }}>{p}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

export default function ExchangeAdminPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [admins, setAdmins] = useState<AdminData[]>([])
  const [search, setSearch] = useState('')
  const [selectedAdmin, setSelectedAdmin] = useState<AdminData | null>(null)
  const [confirmTransfer, setConfirmTransfer] = useState(false)
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const init = async () => {
      setProfile({ full_name: 'Super Admin' })
      const { data: rolesData } = await supabase.from('roles').select('*')
      const rMap: Record<string, string> = {}
      if (rolesData) { rolesData.forEach(r => rMap[r.name.toLowerCase()] = r.id); setRolesMap(rMap) }
      const { data } = await supabase.from('users').select('*, roles!inner(name)').eq('roles.name', 'admin')
      if (data) setAdmins(data.map(a => ({ ...a, email: a.email || 'N/A' })))
    }
    init()
  }, [])

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/login') }
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SA'

  const executeTransfer = async () => {
    if (!selectedAdmin) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const superadminRoleId = rolesMap['superadmin']
    const adminRoleId = rolesMap['admin']
    if (!superadminRoleId || !adminRoleId) return alert('System Roles missing in DB')
    await Promise.all([
      supabase.from('users').update({ role_id: superadminRoleId }).eq('id', selectedAdmin.id),
      supabase.from('users').update({ role_id: adminRoleId }).eq('id', session.user.id),
      supabase.from('superadmin_transfers').insert({ from_user_id: session.user.id, to_user_id: selectedAdmin.id }),
    ])
    router.replace('/admin')
  }

  const filteredAdmins = admins.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.matric_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif", color: '#e2e8f0' }}>

      {/* ── SIDEBAR ── */}
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
              const isActive = item.id === 'exchangeAdmin'
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
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '3px' }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, marginLeft: '220px', padding: '28px 32px', overflowX: 'hidden' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>Exchange Superadmin Access</h1>
            <span style={{ fontSize: '10px', fontWeight: 600, background: SA.accentBg, color: SA.accentText, border: `1px solid ${SA.accentBorder}`, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.06em' }}>IRREVERSIBLE</span>
          </div>
          <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, maxWidth: '560px', lineHeight: 1.6 }}>
            Transfer your superadmin privileges to another administrator. You will be demoted to a regular admin immediately and redirected to the admin dashboard.
          </p>
        </div>

        {/* Warning banner */}
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '12px', color: '#fca5a5', lineHeight: 1.5 }}>
            This action cannot be undone. Once transferred, you will lose all superadmin privileges immediately.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
          <Search size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
          <input type="text" placeholder="Search admins by name or matric..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: '#0b1118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px', padding: '9px 12px 9px 34px', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Admin list */}
        <p style={{ fontSize: '9px', fontWeight: 600, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Select an Administrator ({filteredAdmins.length})
        </p>
        <div style={{ background: '#0b1118', border: `1px solid ${SA.accentBorder}`, borderRadius: '12px', overflow: 'hidden' }}>
          {filteredAdmins.length === 0 ? (
            <p style={{ padding: '32px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>No administrators found.</p>
          ) : filteredAdmins.map((admin, i) => (
            <div key={admin.id}
              onClick={() => setSelectedAdmin(selectedAdmin?.id === admin.id ? null : admin)}
              style={{ padding: '14px 18px', borderBottom: i < filteredAdmins.length - 1 ? `1px solid rgba(245,158,11,0.07)` : 'none', cursor: 'pointer', background: selectedAdmin?.id === admin.id ? SA.accentBg : 'transparent', transition: 'background 0.12s' }}
              onMouseEnter={e => { if (selectedAdmin?.id !== admin.id) (e.currentTarget as HTMLElement).style.background = SA.accentSoft }}
              onMouseLeave={e => { if (selectedAdmin?.id !== admin.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ overflow: 'hidden', paddingRight: '12px' }}>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '13px', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <HighlightText text={admin.full_name} query={search} />
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {admin.matric_number} • <HighlightText text={admin.email} query={search} />
                  </p>
                </div>
                <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '5px', background: SA.accentBg, color: SA.accentText, fontWeight: 500, flexShrink: 0 }}>Admin</span>
              </div>
              {selectedAdmin?.id === admin.id && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${SA.accentBorder}` }}>
                  <button onClick={e => { e.stopPropagation(); setConfirmTransfer(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', background: SA.gradientBtn, color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>
                    <ArrowRightLeft size={14} />Transfer Superadmin Privileges
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* ── CONFIRM TRANSFER MODAL ── */}
      {confirmTransfer && selectedAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#0f1a24', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px', margin: '16px', textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Shield size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>Transfer Superadmin?</h3>
            <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              You are about to transfer your superadmin role to
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>
              {selectedAdmin.full_name}
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 400, color: '#6b7280', marginTop: '2px' }}>{selectedAdmin.matric_number}</span>
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '12px', color: '#fca5a5', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', padding: '10px 14px', borderRadius: '8px', lineHeight: 1.6 }}>
              You will lose superadmin access immediately and cannot reverse this action.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmTransfer(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={executeTransfer}
                style={{ flex: 1, padding: '11px', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg, #b91c1c, #ef4444)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Yes, Transfer Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
