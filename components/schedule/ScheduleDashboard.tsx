'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/app/provider/ThemeContext'
import {
  Calendar, User, LayoutDashboard, LogOut, Award, Bell,
  Settings, ChevronLeft, ChevronRight, List, Grid,
  Filter, X, MapPin, Clock, Info, QrCode, Shield, Crown,
  Users, BookOpen, ArrowRightLeft, CirclePlus, UserCircle, Menu,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Programme {
  id: string; name: string; category: string; description: string
  start_date: string; end_date: string; status: string; venue: string
  advisor_id: string | null; advisor_name?: string
}
interface Profile { id: string; full_name: string; email: string; matric_no?: string; role: string }
interface CalendarEvent {
  id: string; programmeId: string; date: string; type: 'start' | 'end' | 'same-day'
  title: string; programme: Programme; isParticipant: boolean; isEnded: boolean
}

type SysRole = 'student' | 'admin' | 'superadmin'

// ── Nav config per role ───────────────────────────────────────────────────────

function getNavItems(sysRole: SysRole) {
  if (sysRole === 'superadmin') return [
    { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard',      path: '/superadmin' },
    { id: 'programmes',    icon: BookOpen,         label: 'Add Programmes', path: '/create-programme-form' },
    { id: 'attendance',    icon: QrCode,           label: 'Attendance',     path: '/superadmin/attendance' },
    { id: 'schedule',      icon: Calendar,         label: 'Schedule',       path: '/superadmin/schedule' },
    { id: 'users',         icon: Users,            label: 'Users',          path: '/superadmin/users' },
    { id: 'createAdmin',   icon: CirclePlus,       label: 'Create Admin',   path: '/superadmin/create-admin' },
    { id: 'exchangeAdmin', icon: ArrowRightLeft,   label: 'Exchange Admin', path: '/superadmin/exchange-admin' },
    { id: 'profile',       icon: UserCircle,       label: 'Profile',        path: '/profile' },
    { id: 'settings',      icon: Settings,         label: 'Settings',       path: '/settings' },
  ]
  if (sysRole === 'admin') return [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',      path: '/admin' },
    { id: 'programmes', icon: BookOpen,         label: 'Add Programmes', path: '/create-programme-form' },
    { id: 'attendance', icon: QrCode,           label: 'Attendance',     path: '/admin/attendance' },
    { id: 'schedule',   icon: Calendar,         label: 'Schedule',       path: '/admin/schedule' },
    { id: 'users',      icon: Users,            label: 'Users',          path: '/admin/users' },
    { id: 'profile',    icon: UserCircle,       label: 'Profile',        path: '/profile' },
    { id: 'settings',   icon: Settings,         label: 'Settings',       path: '/settings' },
  ]
  return [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',  path: '/student' },
    { id: 'schedule',   icon: Calendar,        label: 'Schedule',   path: '/student/schedule' },
    { id: 'attendance', icon: QrCode,          label: 'Attendance', path: '/student/attendance' },
    { id: 'profile',    icon: UserCircle,      label: 'Profile',    path: '/profile' },
    { id: 'settings',   icon: Settings,        label: 'Settings',   path: '/settings' },
  ]
}

function getHomeRoute(sysRole: SysRole) {
  if (sysRole === 'superadmin') return '/superadmin'
  if (sysRole === 'admin') return '/admin'
  return '/student'
}

// ── Logo accent per role ──────────────────────────────────────────────────────

function LogoIcon({ sysRole }: { sysRole: SysRole }) {
  if (sysRole === 'superadmin') return (
    <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #92400e, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Shield size={16} color="white" />
      <Crown size={8} color="#fef3c7" style={{ position: 'absolute', top: '-4px', right: '-4px' }} />
    </div>
  )
  if (sysRole === 'admin') return (
    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Shield size={16} color="white" />
    </div>
  )
  return (
    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Award size={18} color="white" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScheduleDashboard({ sysRole }: { sysRole: SysRole }) {
  const router = useRouter()
  const { t } = useTheme()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [userRoles, setUserRoles] = useState<{ [key: string]: string }>({})
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'calendar' | 'timeline'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const navItems = getNavItems(sysRole)
  const homeRoute = getHomeRoute(sysRole)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: profileData } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      if (profileData) setProfile(profileData)

      // Admins/superadmins see ALL approved programmes; students see all too but participation is highlighted
      const { data: progData } = await supabase.from('programmes').select('*').eq('status', 'Approved')

      // For students: fetch their roles to show participation
      if (sysRole === 'student') {
        const { data: rolesData } = await supabase.from('programme_roles').select('programme_id, role').eq('user_id', session.user.id)
        const roleMap: { [key: string]: string } = {}
        if (rolesData) rolesData.forEach(r => { roleMap[r.programme_id] = r.role })
        setUserRoles(roleMap)
      }

      // For admins: highlight programmes they advise
      if (sysRole === 'admin') {
        const roleMap: { [key: string]: string } = {}
        if (progData) progData.forEach(p => { if (p.advisor_id === session.user.id) roleMap[p.id] = 'Advisor' })
        setUserRoles(roleMap)
      }

      if (progData) {
        const advisorIds = [...new Set(progData.map((p: any) => p.advisor_id).filter(Boolean))]
        let advisorMap: { [key: string]: string } = {}
        if (advisorIds.length > 0) {
          const { data: advData } = await supabase.from('users').select('id, full_name').in('id', advisorIds)
          if (advData) advData.forEach((a: any) => { advisorMap[a.id] = a.full_name })
        }
        const mapped = progData.map((p: any) => ({ ...p, advisor_name: p.advisor_id ? advisorMap[p.advisor_id] || 'Unknown' : 'None' }))
        setProgrammes(mapped)
        setCategories(['All', ...Array.from(new Set(mapped.map((p: any) => p.category).filter(Boolean)))])
      }

      setLoading(false)
    }
    init()
  }, [sysRole, router])

  // ── Events ──────────────────────────────────────────────────────────────────

  const events = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    let all: CalendarEvent[] = []
    programmes.forEach(prog => {
      if (selectedCategory !== 'All' && prog.category !== selectedCategory) return
      const isParticipant = !!userRoles[prog.id]
      const isEnded = prog.end_date < todayStr
      if (prog.start_date === prog.end_date) {
        all.push({ id: `${prog.id}-sameday`, programmeId: prog.id, date: prog.start_date, type: 'same-day', title: `${prog.name} (1-day)`, programme: prog, isParticipant, isEnded })
      } else {
        if (prog.start_date) all.push({ id: `${prog.id}-start`, programmeId: prog.id, date: prog.start_date, type: 'start', title: `${prog.name} starts`, programme: prog, isParticipant, isEnded })
        if (prog.end_date)   all.push({ id: `${prog.id}-end`,   programmeId: prog.id, date: prog.end_date,   type: 'end',   title: `${prog.name} ends`,  programme: prog, isParticipant, isEnded })
      }
    })
    return all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [programmes, userRoles, selectedCategory])

  // ── Calendar helpers ────────────────────────────────────────────────────────

  const daysInMonth   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'

  const getProgrammeStatus = (start: string, end: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (end < today) return 'Ended'
    if (start <= today && end >= today) return 'Ongoing'
    return 'Upcoming'
  }

  const getEventStyle = (event: CalendarEvent) => {
    if (event.isEnded)       return { bg: t.bgInput,    text: t.textFaint,   border: t.border }
    if (event.isParticipant) return { bg: t.successBg,  text: t.success,     border: t.successBorder }
    return                          { bg: roleAccent.bg, text: roleAccent.text, border: roleAccent.border }
  }

  // ── Role accent colours ──────────────────────────────────────────────────────
  // Superadmin uses amber (matching dashboard), admin uses purple, student uses indigo

  const roleAccent = sysRole === 'superadmin'
    ? { text: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)', dot: '#f59e0b' }
    : sysRole === 'admin'
    ? { text: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.2)', dot: '#7c3aed' }
    : { text: t.accentText, bg: t.accentBg, border: t.accentBorder, dot: t.accent }

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/login') }

  const legendItems = [
    { label: sysRole === 'student' ? 'Participated' : 'You advise', dot: { border: t.successBorder, bg: t.successBg } },
    { label: sysRole === 'student' ? 'Not Participated' : 'Other programmes', dot: { border: roleAccent.border, bg: roleAccent.bg } },
    { label: 'Ended', dot: { border: t.border, bg: t.bgInput } },
  ]

  if (loading || isMobile === null) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `3px solid ${roleAccent.bg}`, borderTopColor: roleAccent.text, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── Sub-renders ─────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!selectedEvent) return null
    const { programme, isParticipant } = selectedEvent
    const status = getProgrammeStatus(programme.start_date, programme.end_date)
    const role = userRoles[programme.id]
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }} onClick={() => setSelectedEvent(null)}>
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setSelectedEvent(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: t.textFaint, cursor: 'pointer' }}>
            <X size={20} />
          </button>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: t.text, paddingRight: '24px' }}>{programme.name}</h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', background: t.bgInput, color: t.textMuted, padding: '4px 10px', borderRadius: '6px' }}>{programme.category || 'General'}</span>
            <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
              background: status === 'Ended' ? t.bgInput : status === 'Ongoing' ? t.successBg : roleAccent.bg,
              color:      status === 'Ended' ? t.textFaint : status === 'Ongoing' ? t.success : roleAccent.text }}>
              {status}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: t.textMuted }}>
              <Clock size={16} color={t.textFaint} style={{ marginTop: '2px' }} />
              <div>
                <div><strong>Start:</strong> {new Date(programme.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div><strong>End:</strong>   {new Date(programme.end_date).toLocaleDateString('en-MY',   { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: t.textMuted }}>
              <MapPin size={16} color={t.textFaint} /><span>{programme.venue || 'TBA'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: t.textMuted }}>
              <User size={16} color={t.textFaint} /><span>Advisor: {programme.advisor_name}</span>
            </div>
          </div>
          <div style={{ background: t.bgInput, padding: '12px', borderRadius: '8px', fontSize: '13px', color: t.textMuted, marginBottom: '20px', maxHeight: '100px', overflowY: 'auto', lineHeight: 1.5 }}>
            {programme.description || 'No description provided.'}
          </div>
          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={18} color={isParticipant ? t.success : '#f59e0b'} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: isParticipant ? t.success : '#f59e0b' }}>
              {isParticipant
                ? `${sysRole === 'admin' ? 'You advise this programme' : `Your role: ${role}`}`
                : sysRole === 'student' ? 'You are not a participant in this programme.' : 'You are not the advisor for this programme.'}
            </span>
          </div>
          {/* Admin/superadmin: quick link to programme detail */}
          {(sysRole === 'admin' || sysRole === 'superadmin') && (
            <button
              onClick={() => router.push(`/programmes/${programme.id}`)}
              style={{ marginTop: '14px', width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${roleAccent.border}`, background: roleAccent.bg, color: roleAccent.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              View Programme Details →
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderSidebar = () => {
    const isSuper  = sysRole === 'superadmin'
    const isStudent = sysRole === 'student'

    // Superadmin: first 4 = Navigation, rest = Superadmin Only
    // Admin: all items flat under Navigation
    // Student: first 4 = Main Menu, last 1 (Settings) = Account
    const mainItems    = isSuper   ? navItems.slice(0, 4)
                       : isStudent ? navItems.slice(0, 3)
                       : navItems
    const superItems   = isSuper   ? navItems.slice(4) : []
    const accountItems = isStudent ? navItems.slice(3) : []

    return (
      <aside style={{ width: '240px', background: t.bgCardAlt, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10 }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogoIcon sysRole={sysRole} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '15px', margin: 0, letterSpacing: '-0.02em', color: t.text }}>UTM-SPMS</p>
              <p style={{ fontSize: '11px', color: sysRole === 'superadmin' ? '#f59e0b' : t.textFaint, margin: 0, textTransform: 'uppercase', fontWeight: sysRole === 'superadmin' ? 600 : 400, letterSpacing: sysRole === 'superadmin' ? '0.06em' : 0 }}>
                {sysRole === 'superadmin' ? 'Superadmin' : sysRole === 'admin' ? 'Admin Panel' : 'Student Portal'}
              </p>
            </div>
          </div>
        </div>

        <nav style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '9px', fontWeight: 600, color: t.textFaintest, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>
            {isStudent ? 'Main Menu' : 'Navigation'}
          </p>
          {mainItems.map(item => {
            const Icon = item.icon
            const isActive = item.id === 'schedule'
            return (
              <button key={item.id} onClick={() => router.push(item.path)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? roleAccent.bg : 'transparent', color: isActive ? roleAccent.text : t.textMuted, fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                <Icon size={15} />{item.label}
                {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: roleAccent.dot }} />}
              </button>
            )
          })}

          {/* Student: Account section with Settings */}
          {isStudent && accountItems.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
              <p style={{ fontSize: '9px', fontWeight: 600, color: t.textFaintest, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>Account</p>
              {accountItems.map(item => {
                const Icon = item.icon
                const isActive = item.id === 'schedule'
                return (
                  <button key={item.id} onClick={() => router.push(item.path)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? roleAccent.bg : 'transparent', color: isActive ? roleAccent.text : t.textMuted, fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                    <Icon size={15} />{item.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Superadmin Only section */}
          {isSuper && superItems.length > 0 && (
            <>
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${t.border}` }}>
                <p style={{ fontSize: '9px', fontWeight: 600, color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px', opacity: 0.7 }}>Superadmin Only</p>
                {superItems.map(item => {
                  const Icon = item.icon
                  const isActive = item.id === 'schedule'
                  return (
                    <button key={item.id} onClick={() => router.push(item.path)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? roleAccent.bg : 'transparent', color: isActive ? roleAccent.text : t.textMuted, fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                      <Icon size={15} />{item.label}
                      {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: roleAccent.dot }} />}
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: '12px' }}>
                <button onClick={() => router.push('/superadmin/create-admin')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(245,158,11,0.06)', color: '#f59e0b', fontSize: '13px', fontWeight: 500, textAlign: 'left' }}>
                  <CirclePlus size={15} />New Admin
                </button>
              </div>
            </>
          )}
        </nav>

        <div style={{ padding: '14px', borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px', borderRadius: '9px', background: sysRole === 'superadmin' ? 'rgba(245,158,11,0.06)' : t.bgInput }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
              {getInitials(profile?.full_name || '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'User'}</p>
              <p style={{ margin: 0, fontSize: '10px', color: sysRole === 'superadmin' ? '#f59e0b' : t.textFaint, textTransform: 'capitalize', fontWeight: sysRole === 'superadmin' ? 500 : 400 }}>{sysRole}</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textFaint, padding: '3px' }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    )
  }

  const renderMobileHeader = () => (
    <div style={{ background: t.bgCardAlt, borderBottom: `1px solid ${t.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LogoIcon sysRole={sysRole} />
        <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: t.text }}>UTM-SPMS</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
          {getInitials(profile?.full_name || '')}
        </div>
        {sysRole === 'superadmin' && (
          <button onClick={() => setShowMobileMenu(v => !v)} style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fbbf24' }}>
            {showMobileMenu ? <X size={16} /> : <Menu size={16} />}
          </button>
        )}
      </div>
    </div>
  )

  const renderSuperadminMobileMenu = () => {
    if (sysRole !== 'superadmin' || !showMobileMenu) return null
    return (
      <>
        <div onClick={() => setShowMobileMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 25 }} />
        <div style={{ position: 'fixed', top: '57px', left: 0, right: 0, background: t.bgCardAlt, borderBottom: `1px solid rgba(245,158,11,0.2)`, zIndex: 26, padding: '8px 0', maxHeight: '80vh', overflowY: 'auto' }}>
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = item.id === 'schedule'
            return (
              <button key={item.id} onClick={() => { router.push(item.path); setShowMobileMenu(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', border: 'none', background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent', color: isActive ? '#fbbf24' : t.textMuted, fontSize: '14px', fontWeight: isActive ? 600 : 400, cursor: 'pointer', textAlign: 'left', borderLeft: isActive ? '3px solid #f59e0b' : '3px solid transparent' }}>
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
          <div style={{ borderTop: `1px solid ${t.border}`, margin: '8px 0' }} />
          <button onClick={() => { handleLogout(); setShowMobileMenu(false) }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', border: 'none', background: 'transparent', color: t.textFaint, fontSize: '14px', cursor: 'pointer', textAlign: 'left', borderLeft: '3px solid transparent' }}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </>
    )
  }

  const renderMobileBottomNav = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.bgCardAlt, borderTop: `1px solid ${t.border}`, display: 'flex', zIndex: 20 }}>
      {navItems.map(item => {
        const Icon = item.icon
        const isActive = item.id === 'schedule'
        return (
          <button key={item.id} onClick={() => router.push(item.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', cursor: 'pointer', gap: '3px', border: 'none', background: 'transparent' }}>
            <Icon size={16} color={isActive ? roleAccent.text : t.textFaint} />
            <span style={{ fontSize: '9px', fontWeight: 500, color: isActive ? roleAccent.text : t.textFaint }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )

  const renderCalendarView = () => {
    const today = new Date()
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()
    const currentDay = today.getDate()
    return (
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden', width: '100%' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: t.text }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ fn: prevMonth, Icon: ChevronLeft }, { fn: nextMonth, Icon: ChevronRight }].map(({ fn, Icon }, i) => (
                <button key={i} onClick={fn} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textMuted }}>
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: `1px solid ${t.border}`, background: t.bgInput }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
              <div key={day} style={{ padding: '10px 0', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: t.textFaint }}>{day}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(100px, auto)' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{ borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, background: t.bgInput }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayEvents = events.filter(e => e.date === dateStr)
              const isToday = isCurrentMonth && day === currentDay
              return (
                <div key={day} style={{ borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, padding: '8px', minHeight: '100px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: isToday ? 600 : 400, color: isToday ? roleAccent.text : t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', border: isToday ? `2px solid ${roleAccent.text}` : 'none' }}>
                      {day}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    {dayEvents.map(evt => {
                      const s = getEventStyle(evt)
                      return (
                        <div key={evt.id} onClick={() => setSelectedEvent(evt)} title={evt.title}
                          style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, fontSize: '10px', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', boxSizing: 'border-box' }}>
                          ⭕️ {evt.title}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ width: isMobile ? '100%' : '200px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', flexShrink: 0 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: t.text }}>Legend</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {legendItems.map(({ label, dot }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: t.textMuted }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: `2px solid ${dot.border}`, background: dot.bg, flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${t.border}` }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', color: t.textFaint, fontWeight: 500 }}>Total: {programmes.length} programmes</p>
            <p style={{ margin: 0, fontSize: '11px', color: t.textFaint }}>Filtered: {events.length / 2 | 0} shown</p>
          </div>
        </div>
      </div>
    )
  }

  const renderTimelineView = () => {
    const grouped: { [key: string]: CalendarEvent[] } = {}
    events.forEach(evt => {
      const key = new Date(evt.date).toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(evt)
    })
    const sortedKeys = Object.keys(grouped).sort((a, b) => new Date(grouped[a][0].date).getTime() - new Date(grouped[b][0].date).getTime())
    if (sortedKeys.length === 0) return (
      <div style={{ textAlign: 'center', padding: '40px', color: t.textFaint, background: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}` }}>
        No scheduled programmes found for the selected filter.
      </div>
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
        {sortedKeys.map(dateKey => (
          <div key={dateKey}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: t.text, paddingBottom: '8px', borderBottom: `1px solid ${t.border}` }}>{dateKey}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {grouped[dateKey].map(evt => {
                const s = getEventStyle(evt)
                return (
                  <div key={evt.id} onClick={() => setSelectedEvent(evt)}
                    style={{ background: s.bg, border: `1px solid ${s.border}`, padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'transform 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                    <span style={{ color: s.text, fontSize: '14px' }}>⭕️</span>
                    <span style={{ color: s.text, fontSize: '14px', fontWeight: 500 }}>{evt.title}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: t.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {!isMobile && renderSidebar()}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: isMobile ? '0' : '240px', paddingBottom: isMobile && sysRole !== 'superadmin' ? '70px' : '0' }}>
        {isMobile && renderMobileHeader()}
        {isMobile && renderSuperadminMobileMenu()}

        <main style={{ padding: isMobile ? '16px' : '32px 36px', maxWidth: '100%', overflowX: 'hidden' }}>

          {/* Page header */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
            <div>
              <button onClick={() => router.push(homeRoute)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: t.textFaint, fontSize: '13px', cursor: 'pointer', padding: '0 0 8px', fontFamily: 'inherit' }}>
                ← Back
              </button>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: t.text }}>Schedule</h1>
              <p style={{ fontSize: '13px', color: t.textFaint, margin: '4px 0 0' }}>
                {sysRole === 'student' ? 'Your programme timeline and events.' : 'All approved programme events.'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
              <div style={{ position: 'relative' }}>
                <Filter size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint }} />
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                  style={{ appearance: 'none', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 30px 8px 32px', color: t.text, fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', background: t.bgInput, borderRadius: '8px', padding: '4px' }}>
                {[{ id: 'calendar', Icon: Grid, label: 'Calendar' }, { id: 'timeline', Icon: List, label: 'Timeline' }].map(({ id, Icon, label }) => (
                  <button key={id} onClick={() => setView(id as 'calendar' | 'timeline')}
                    style={{ background: view === id ? roleAccent.text : 'transparent', border: 'none', padding: '6px 10px', borderRadius: '6px', color: view === id ? 'white' : t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500 }}>
                    <Icon size={14} /><span style={{ display: isMobile ? 'none' : 'inline' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {view === 'calendar' ? renderCalendarView() : renderTimelineView()}
        </main>

        {isMobile && sysRole !== 'superadmin' && renderMobileBottomNav()}
      </div>

      {renderModal()}
    </div>
  )
}