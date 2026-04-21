'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut, Shield,
  Search, UserPlus, Trash2, X, AlertCircle, CheckCircle
} from 'lucide-react'

// interface defines the shape of user data joining users and roles
interface UserData {
  id: string
  full_name: string
  email?: string
  role: string
  matric_number: string
  phone?: string
}

type NavItem = 'dashboard' | 'programmes' | 'users' | 'settings'

// helper component to highlight matching search text
const HighlightMatch = ({ text = '', query = '' }) => {
  if (!query.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${query})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} style={{ background: 'rgba(234, 179, 8, 0.3)', color: '#fde047', borderRadius: '3px', padding: '0 2px' }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState<NavItem>('users')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)
  
  // updated form state matching new requirements
  const [form, setForm] = useState({ fullName: '', matricNumber: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      // get current user profile and role mapping based on new schema
      const { data: profileData } = await supabase
        .from('users')
        .select('*, roles(name)')
        .eq('id', session.user.id)
        .single()

      const currentRole = profileData?.roles?.name?.toLowerCase()
      if (currentRole !== 'admin' && currentRole !== 'superadmin') {
        router.replace('/login')
        return
      }
      setProfile(profileData)

      // fetch students based on roles table join
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, phone, matric_number, roles!inner(name)')
        .eq('roles.name', 'student')
        
      if (usersData) {
        // since email might not exist in public.users, we assign a placeholder or fetch differently in prod
        const formatted = usersData.map((u: any) => ({
          ...u,
          role: u.roles?.name || 'student',
          matric_number: u.matric_number || 'N/A',
          email: u.email || 'N/A' // backend needs to expose email to public.users if required here
        }))
        setUsers(formatted)
      }
      setLoading(false)
    }
    init()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // registers a new student
  const handleAddUser = async () => {
    setFormError('')
    if (!form.email || !form.password || !form.confirmPassword || !form.fullName || !form.matricNumber) {
      setFormError('Please fill in all required fields.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }
    
    setFormLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email, password: form.password,
        full_name: form.fullName, matric_number: form.matricNumber, phone: form.phone
      })
    })
    const data = await res.json()
    
    if (!res.ok) {
      setFormError(data.error || 'Failed to create user')
      setFormLoading(false)
      return
    }
    
    setShowAddModal(false)
    setForm({ fullName: '', matricNumber: '', email: '', phone: '', password: '', confirmPassword: '' })
    window.location.reload() 
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    // depending on your rls policies and schema, you might need to call an admin api to delete auth user as well
    await supabase.from('users').delete().eq('id', userToDelete.id)
    setUsers(users.filter(u => u.id !== userToDelete.id))
    setUserToDelete(null)
    setSelectedUserId(null)
  }

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'AD'

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase()
    return u.full_name?.toLowerCase().includes(q) || u.matric_number?.toLowerCase().includes(q)
  })

  const navItems: { id: NavItem; icon: React.ElementType; label: string; path: string }[] = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { id: 'programmes', icon: BookOpen, label: 'Programmes', path: '/create-programme' },
    { id: 'users', icon: Users, label: 'Users', path: '/admin/users' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/profile' },
  ]

  if (loading) return <div style={{ minHeight: '100vh', background: '#080f1a' }} />

  return (
    <div className="admin-container" style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif", color: '#e2e8f0' }}>
      {/* injected styles for mobile responsiveness without altering existing inline logic */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          .main-content { margin-left: 0 !important; padding: 16px !important; }
          .top-controls { flex-direction: column; }
        }
      `}</style>

      {/* SIDEBAR perfectly matched to /admin */}
      <aside className="sidebar" style={{ width: '220px', background: '#0c1526', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: '#f1f5f9', letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '10px', color: '#4b5563', margin: 0, fontWeight: 500, letterSpacing: '0.04em' }}>ADMIN PANEL</p>
            </div>
          </div>
        </div>

        <nav style={{ padding: '14px 10px', flex: 1 }}>
          <p style={{ fontSize: '9px', fontWeight: 600, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>Navigation</p>
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent', color: isActive ? '#a78bfa' : '#6b7280', fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                <Icon size={15} />{item.label}
                {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: '#7c3aed' }} />}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px', borderRadius: '9px', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #5b21b6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
              {getInitials(profile?.full_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Admin'}</p>
              <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', textTransform: 'capitalize' }}>Administrator</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '3px' }}><LogOut size={13} /></button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content" style={{ flex: 1, marginLeft: '220px', padding: '28px 32px', overflowX: 'hidden' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 24px 0', color: '#f8fafc', letterSpacing: '-0.02em' }}>Student Users</h1>

        <div className="top-controls" style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input 
              type="text" 
              placeholder="Search by Name or Matric Number..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', padding: '10px 14px 10px 38px', color: '#e2e8f0', fontSize: '13px', outline: 'none' }} 
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', border: 'none', borderRadius: '9px', padding: '0 20px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', height: '40px' }}>
            <UserPlus size={15} /> Add Student
          </button>
        </div>

        <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 20px', fontWeight: 500 }}>Full Name</th>
                <th style={{ padding: '14px 20px', fontWeight: 500 }}>Matric Number</th>
                <th style={{ padding: '14px 20px', fontWeight: 500 }}>Email</th>
                <th style={{ padding: '14px 20px', fontWeight: 500 }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                 <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>No students found.</td></tr>
              ) : filteredUsers.map((u, i) => (
                <tr key={u.id} 
                  onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: selectedUserId === u.id ? 'rgba(124,58,237,0.08)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'), transition: 'background 0.1s' }}>
                  <td style={{ padding: '14px 20px', color: '#f1f5f9', fontWeight: 500 }}>
                    <HighlightMatch text={u.full_name} query={searchQuery} />
                    {selectedUserId === u.id && (
                      <div style={{ marginTop: '10px' }}>
                        <button onClick={(e) => { e.stopPropagation(); setUserToDelete(u) }} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Trash2 size={12} /> Delete Student
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#94a3b8' }}>
                    <HighlightMatch text={u.matric_number} query={searchQuery} />
                  </td>
                  <td style={{ padding: '14px 20px', color: '#94a3b8' }}>{u.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ display: 'inline-flex', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 500, textTransform: 'capitalize' }}>{u.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#0f1e30', width: '100%', maxWidth: '420px', borderRadius: '14px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)', margin: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={15} color="#a78bfa" />Add New Student</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[{ label: 'Full Name *', key: 'fullName', type: 'text' },
                { label: 'Matric Number *', key: 'matricNumber', type: 'text' },
                { label: 'UTM Email *', key: 'email', type: 'email' },
                { label: 'Phone Number', key: 'phone', type: 'tel' },
                { label: 'Password *', key: 'password', type: 'password' },
                { label: 'Confirm Password *', key: 'confirmPassword', type: 'password' }
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '9px 12px', color: '#e2e8f0', fontSize: '13px', outline: 'none' }} />
                </div>
              ))}
            </div>

            {formError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '14px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '6px' }}><AlertCircle size={14} />{formError}</p>}

            <button onClick={handleAddUser} disabled={formLoading} style={{ width: '100%', padding: '10px', marginTop: '24px', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: formLoading ? 'not-allowed' : 'pointer', opacity: formLoading ? 0.7 : 1 }}>
              {formLoading ? 'Processing...' : 'Confirm & Add'}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {userToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#0f1e30', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '340px', margin: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: '16px', fontWeight: 600 }}>Confirm Deletion</h3>
            <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '13px', lineHeight: '1.5' }}>Are you sure you want to delete <strong>{userToDelete.full_name}</strong>? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setUserToDelete(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Cancel</button>
              <button onClick={handleDeleteConfirm} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}