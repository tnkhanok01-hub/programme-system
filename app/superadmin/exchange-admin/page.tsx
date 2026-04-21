"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut, CirclePlus, Shield, Search, ArrowRightLeft
} from "lucide-react"

interface AdminData {
  id: string
  full_name: string
  email?: string
  role: string
  matric_number?: string
}

const HighlightText = ({ text = '', query = '' }) => {
  if (!query.trim() || !text) return <>{text}</>
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return <>{parts.map((p, i) => p.toLowerCase() === query.toLowerCase() ? <span key={i} className="bg-yellow-500/30 text-yellow-300 px-0.5 rounded-sm">{p}</span> : <span key={i}>{p}</span>)}</>
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
      // Mock session set for UI sync
      setProfile({ full_name: "Super Admin" })

      // 1. fetch roles mapping 
      const { data: rolesData } = await supabase.from('roles').select('*')
      const rMap: Record<string, string> = {}
      if (rolesData) {
        rolesData.forEach(r => rMap[r.name.toLowerCase()] = r.id)
        setRolesMap(rMap)
      }

      // 2. get standard admins via users table inner join
      const { data } = await supabase.from('users').select('*, roles!inner(name)').eq('roles.name', 'admin')
      if (data) {
        setAdmins(data.map(a => ({ ...a, email: a.email || 'N/A' })))
      }
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  const executeTransfer = async () => {
    if (!selectedAdmin) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const superadminRoleId = rolesMap['superadmin']
    const adminRoleId = rolesMap['admin']

    if (!superadminRoleId || !adminRoleId) return alert("System Roles missing in DB")

    // transaction logic: promote target, demote self, insert log
    await Promise.all([
      supabase.from('users').update({ role_id: superadminRoleId }).eq('id', selectedAdmin.id),
      supabase.from('users').update({ role_id: adminRoleId }).eq('id', session.user.id),
      supabase.from('superadmin_transfers').insert({ from_user_id: session.user.id, to_user_id: selectedAdmin.id })
    ])

    // push the demoted user immediately out of superadmin scope
    router.replace('/admin')
  }

  const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase() || "SA"

  const filteredAdmins = admins.filter(a => a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.matric_number?.toLowerCase().includes(search.toLowerCase()))

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
            <button key={item.id} onClick={() => router.push(item.path)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition ${item.id === 'exchangeAdmin' ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-white/5"}`}>
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

      {/* MAIN CONTENT */}
      <main className="md:ml-[220px] p-6 md:p-8 w-full max-w-4xl mx-auto md:mx-0">
        <h1 className="text-xl font-bold mb-2">Exchange Superadmin Access</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-2xl">
          Transfer your superadmin privileges to another administrator. You will instantly be demoted to a regular admin upon confirmation and redirected to the admin dashboard.
        </p>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search admins by name or matric..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-purple-500 transition shadow-sm" />
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
          {filteredAdmins.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No administrators found.</div>
          ) : filteredAdmins.map(admin => (
            <div key={admin.id} onClick={() => setSelectedAdmin(selectedAdmin?.id === admin.id ? null : admin)} className={`p-5 border-b border-slate-700/50 cursor-pointer transition-all ${selectedAdmin?.id === admin.id ? 'bg-purple-900/20' : 'hover:bg-slate-700/10'}`}>
              <div className="flex justify-between items-center">
                <div className="overflow-hidden pr-4">
                  <p className="font-medium text-sm truncate"><HighlightText text={admin.full_name} query={search} /></p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{admin.matric_number} • <HighlightText text={admin.email} query={search} /></p>
                </div>
              </div>
              {selectedAdmin?.id === admin.id && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <button onClick={(e) => { e.stopPropagation(); setConfirmTransfer(true) }} className="flex items-center justify-center w-full md:w-auto gap-2 text-sm bg-purple-600 hover:bg-purple-700 px-5 py-2.5 rounded-lg font-medium transition-colors">
                    <ArrowRightLeft size={16}/> Transfer Superadmin Privileges
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* FINAL CONFIRMATION MODAL */}
      {confirmTransfer && selectedAdmin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md border border-slate-700 text-center shadow-2xl">
            <div className="mx-auto w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-5"><Shield size={28} /></div>
            <h3 className="font-bold text-xl mb-3 text-white">Transfer Superadmin?</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Are you absolutely sure you want to transfer your superadmin role to <br/><strong className="text-white text-base block mt-2">{selectedAdmin.full_name} ({selectedAdmin.matric_number})</strong> <br/> You will lose your superadmin access immediately.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setConfirmTransfer(false)} className="flex-1 py-3 rounded-xl text-sm bg-slate-700 hover:bg-slate-600 font-medium transition">Cancel</button>
              <button onClick={executeTransfer} className="flex-1 py-3 rounded-xl text-sm bg-red-600 hover:bg-red-700 font-medium transition text-white shadow-lg shadow-red-600/20">Yes, Transfer Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}