"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  LogOut,
  CirclePlus,
  Shield
} from "lucide-react"

type NavItem =
  | "dashboard"
  | "programmes"
  | "createAdmin"
  | "exchangeAdmin"
  | "settings"

export default function SuperAdminPage() {
  const router = useRouter()

  const [activeNav, setActiveNav] = useState<NavItem>("dashboard")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)



  // In production, you would fetch the profile from Supabase like this:
    useEffect(() => {
    // bypass login for development
    setProfile({
        full_name: "Super Admin"
    })
    setLoading(false)
    }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  const getInitials = (name: string) =>
    name?.split(" ").map(n => n[0]).join("").toUpperCase() || "SA"

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "programmes", icon: BookOpen, label: "Programmes" },
    { id: "createAdmin", icon: CirclePlus, label: "Create Admin" },
    { id: "exchangeAdmin", icon: Users, label: "Exchange Admin" },
    { id: "settings", icon: Settings, label: "Settings" }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        Loading SuperAdmin Panel...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-white">

      {/* SIDEBAR */}
      <aside className="w-[220px] bg-slate-950 border-r border-white/5 fixed h-full flex flex-col">

        {/* LOGO */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
            <Shield size={16} />
          </div>
          <div>
            <p className="font-bold text-sm">UTM-SPMS</p>
            <p className="text-xs text-slate-500">SUPERADMIN PANEL</p>
          </div>
        </div>

        {/* NAV */}
        <div className="p-3 flex-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activeNav === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id)

                  if (item.id === "dashboard") router.push("/superadmin")
                  if (item.id === "programmes") router.push("/create-programme")
                  if (item.id === "createAdmin") router.push("/superadmin/create-admin")
                  if (item.id === "exchangeAdmin") router.push("/superadmin/exchange-admin")
                  if (item.id === "settings") router.push("/profile")
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition
                  ${isActive
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-slate-400 hover:bg-white/5"}
                `}
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* USER */}
        <div className="p-3 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
            {getInitials(profile?.full_name)}
          </div>

          <div className="flex-1">
            <p className="text-sm">{profile?.full_name}</p>
            <p className="text-xs text-slate-500">SuperAdmin</p>
          </div>

          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-[220px] p-8 w-full">

        <h1 className="text-xl font-bold mb-2">SuperAdmin Dashboard</h1>
        <p className="text-slate-400 mb-6">
          Manage admins, programmes, and system settings
        </p>

        {/* SIMPLE CARDS */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Admin Control</p>
            <p className="text-lg font-semibold">Manage Admins</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">System</p>
            <p className="text-lg font-semibold">Full Access</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Security</p>
            <p className="text-lg font-semibold">Role Management</p>
          </div>
        </div>

      </main>
    </div>
  )
}