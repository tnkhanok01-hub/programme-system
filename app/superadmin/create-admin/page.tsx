"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut,
  CirclePlus, Shield, Search, ArrowUpCircle, ArrowDownCircle, Trash2, X
} from "lucide-react"

// defines the standard shape based on users table + roles
interface SystemUser {
  id: string
  full_name: string
  email?: string
  role: string
  matric_number?: string
  phone?: string
}

const HighlightText = ({ text = '', query = '' }) => {
  if (!query.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${query})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((p, i) => regex.test(p) ? <span key={i} className="bg-yellow-500/30 text-yellow-300 px-0.5 rounded-sm">{p}</span> : <span key={i}>{p}</span>)}
    </>
  )
}

export default function CreateAdminPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<SystemUser[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({})
  
  // modal and selection state
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, type: 'promote' | 'demote' | 'delete', target: SystemUser | null }>({ isOpen: false, type: 'promote', target: null })

  // form state exactly matching student register but for admin
  const [form, setForm] = useState({ fullName: '', matricNumber: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchData = useCallback(async () => {
    // 1. fetch roles mapping mapping id <-> name
    const { data: rolesData } = await supabase.from('roles').select('*')
    const rMap: Record<string, string> = {}
    if (rolesData) {
      rolesData.forEach(r => rMap[r.name.toLowerCase()] = r.id)
      setRolesMap(rMap)
    }

    // 2. fetch all users joining with roles
    const { data } = await supabase.from('users').select('*, roles!inner(name)')
    if (data) {
      setAllUsers(data.map(u => ({ 
        ...u, 
        role: u.roles?.name?.toLowerCase() || 'student',
        email: u.email || 'N/A' // placeholder if email is missing in users
      })))
    }
  }, [])

  useEffect(() => {
    // simple mock auth check
    setProfile({ full_name: "Super Admin" })
    fetchData()
  }, [fetchData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase() || "SA"

  const handleCreateAdmin = async () => {
    setFormError('')
    if (!form.fullName || !form.matricNumber || !form.email || !form.password || !form.confirmPassword) {
      return setFormError("Please fill in all required fields (*) ")
    }
    if (form.password !== form.confirmPassword) return setFormError("Passwords don't match")
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    // hit api (must support same fields + sets role to admin or user manually modifies after)
    const res = await fetch('/api/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ 
        email: form.email, password: form.password, 
        full_name: form.fullName, matric_number: form.matricNumber, phone: form.phone 
      })
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
      const newRoleName = type === 'promote' ? 'admin' : 'student'
      const newRoleId = rolesMap[newRoleName]
      if (newRoleId) {
        await supabase.from('users').update({ role_id: newRoleId }).eq('id', target.id)
      }
    }
    setConfirmDialog({ isOpen: false, type: 'promote', target: null })
    setSelectedUser(null)
    fetchData()
  }

  const filtered = allUsers.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.matric_number?.toLowerCase().includes(search.toLowerCase()))
  const adminsList = filtered.filter(u => u.role === 'admin')
  const studentsList = filtered.filter(u => u.role === 'student')

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: '/superadmin' },
    { id: "programmes", icon: BookOpen, label: "Programmes", path: '/create-programme' },
    { id: "createAdmin", icon: CirclePlus, label: "Create Admin", path: '/superadmin/create-admin' },
    { id: "exchangeAdmin", icon: Users, label: "Exchange Admin", path: '/superadmin/exchange-admin' },
    { id: "settings", icon: Settings, label: "Settings", path: '/profile' }
  ]

  return (
    <div className="flex min-h-screen bg-slate-900 text-white font-sans">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-[220px] bg-slate-950 border-r border-white/5 fixed h-full flex-col z-10">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center"><Shield size={16} /></div>
          <div><p className="font-bold text-sm">UTM-SPMS</p><p className="text-xs text-slate-500">SUPERADMIN</p></div>
        </div>
        <div className="p-3 flex-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => router.push(item.path)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition ${item.id === 'createAdmin' ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-white/5"}`}>
              <item.icon size={16} />{item.label}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">{getInitials(profile?.full_name)}</div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-500">SuperAdmin</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400"><LogOut size={16} /></button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="md:ml-[220px] p-4 md:p-8 w-full max-w-full">
        <h1 className="text-xl font-bold mb-6">Manage Roles & Admins</h1>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Search users by name or matric..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-purple-500 transition" />
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            <CirclePlus size={16} /> Create New Admin
          </button>
        </div>

        {/* ADMINS SECTION */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Administrators</h2>
        <div className="bg-slate-800 rounded-lg border border-slate-700 mb-8 overflow-hidden">
          {adminsList.length === 0 ? <p className="p-4 text-sm text-slate-500">No admins found.</p> : adminsList.map(u => (
            <div key={u.id} onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)} className={`p-4 border-b border-slate-700/50 cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-slate-700/30' : 'hover:bg-slate-700/10'}`}>
              <div className="flex justify-between items-center">
                <div className="overflow-hidden pr-4">
                  <p className="font-medium text-sm truncate"><HighlightText text={u.full_name} query={search} /></p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{u.matric_number} • {u.email}</p>
                </div>
                <span className="bg-purple-500/10 text-purple-400 text-xs px-2.5 py-1 rounded-md font-medium shrink-0">Admin</span>
              </div>
              {selectedUser?.id === u.id && (
                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-700/50">
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDialog({ isOpen: true, type: 'demote', target: u }) }} className="flex items-center gap-1.5 text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded transition"><ArrowDownCircle size={14}/> Demote to Student</button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDialog({ isOpen: true, type: 'delete', target: u }) }} className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded transition"><Trash2 size={14}/> Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* STUDENTS SECTION */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Students</h2>
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {studentsList.length === 0 ? <p className="p-4 text-sm text-slate-500">No students found.</p> : studentsList.map(u => (
            <div key={u.id} onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)} className={`p-4 border-b border-slate-700/50 cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-slate-700/30' : 'hover:bg-slate-700/10'}`}>
              <div className="flex justify-between items-center">
                <div className="overflow-hidden pr-4">
                  <p className="font-medium text-sm truncate"><HighlightText text={u.full_name} query={search} /></p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{u.matric_number} • {u.email}</p>
                </div>
                <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-md font-medium shrink-0">Student</span>
              </div>
              {selectedUser?.id === u.id && (
                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-700/50">
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDialog({ isOpen: true, type: 'promote', target: u }) }} className="flex items-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded transition"><ArrowUpCircle size={14}/> Promote to Admin</button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDialog({ isOpen: true, type: 'delete', target: u }) }} className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded transition"><Trash2 size={14}/> Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* CREATE MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 border border-slate-700 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold flex items-center gap-2"><CirclePlus size={18} className="text-purple-400"/> Create Admin</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              {[{ label: 'Full Name *', key: 'fullName', type: 'text' },
                { label: 'Matric Number *', key: 'matricNumber', type: 'text' },
                { label: 'UTM Email *', key: 'email', type: 'email' },
                { label: 'Phone Number', key: 'phone', type: 'tel' },
                { label: 'Password *', key: 'password', type: 'password' },
                { label: 'Confirm Password *', key: 'confirmPassword', type: 'password' }
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg p-2.5 text-sm outline-none transition" />
                </div>
              ))}
              {formError && <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded">{formError}</p>}
              <button onClick={handleCreateAdmin} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 py-2.5 rounded-lg text-sm font-semibold mt-6 transition disabled:opacity-50">
                {loading ? 'Creating...' : 'Confirm & Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm text-center border border-slate-700 shadow-xl">
            <h3 className="font-bold text-lg mb-2">Confirm Action</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to {confirmDialog.type} <br/><strong className="text-white text-base">{confirmDialog.target?.full_name}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="flex-1 py-2.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 transition font-medium">Cancel</button>
              <button onClick={handleActionConfirm} className="flex-1 py-2.5 rounded-lg text-sm bg-purple-600 hover:bg-purple-700 transition font-medium text-white">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}