'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  Calendar,
  User,
  LayoutDashboard,
  LogOut,
  Award,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  Filter,
  X,
  MapPin,
  Clock,
  Info,
  QrCode
} from 'lucide-react'

// --- Interfaces ---
interface Programme {
  id: string
  name: string
  category: string
  description: string
  start_date: string
  end_date: string
  status: string
  venue: string
  advisor_id: string | null
  advisor_name?: string
}

interface Profile {
  id: string
  full_name: string
  email: string
  matric_no?: string
  role: string
}

interface CalendarEvent {
  id: string
  programmeId: string
  date: string
  type: 'start' | 'end' | 'same-day'
  title: string
  programme: Programme
  isParticipant: boolean
  isEnded: boolean
}

export default function StudentSchedulePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [userRoles, setUserRoles] = useState<{ [key: string]: string }>({})
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // View States
  const [view, setView] = useState<'calendar' | 'timeline'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Layout States
  const [activeNav, setActiveNav] = useState('schedule')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Fetch Data
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      setUserId(session.user.id)

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (profileData) setProfile(profileData)

      // Fetch Approved Programmes
      const { data: progData } = await supabase
        .from('programmes')
        .select('*')
        .eq('status', 'Approved')

      // Fetch User Roles to determine participation
      const { data: rolesData } = await supabase
        .from('programme_roles')
        .select('programme_id, role')
        .eq('user_id', session.user.id)

      const roleMap: { [key: string]: string } = {}
      if (rolesData) {
        rolesData.forEach(r => { roleMap[r.programme_id] = r.role })
      }
      setUserRoles(roleMap)

      if (progData) {
        // Fetch Advisors manually if joined query isn't working directly
        const advisorIds = [...new Set(progData.map(p => p.advisor_id).filter(Boolean))]
        let advisorMap: { [key: string]: string } = {}
        
        if (advisorIds.length > 0) {
          const { data: advData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', advisorIds)
          
          if (advData) {
            advData.forEach(a => { advisorMap[a.id] = a.full_name })
          }
        }

        const mappedProgs = progData.map(p => ({
          ...p,
          advisor_name: p.advisor_id ? advisorMap[p.advisor_id] || 'Unknown Advisor' : 'None'
        }))

        setProgrammes(mappedProgs)

        // Extract categories for filter
        const uniqueCategories = Array.from(new Set(mappedProgs.map(p => p.category).filter(Boolean)))
        setCategories(['All', ...uniqueCategories])
      }

      setLoading(false)
    }
    init()
  }, [router])

  // Process Events
  const events = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    let allEvents: CalendarEvent[] = []

    programmes.forEach(prog => {
      if (selectedCategory !== 'All' && prog.category !== selectedCategory) return

      const isParticipant = !!userRoles[prog.id]
      const isEnded = prog.end_date < todayStr

      if (prog.start_date === prog.end_date) {
        allEvents.push({
          id: `${prog.id}-sameday`,
          programmeId: prog.id,
          date: prog.start_date,
          type: 'same-day',
          title: `${prog.name} started & ended`,
          programme: prog,
          isParticipant,
          isEnded
        })
      } else {
        if (prog.start_date) {
          allEvents.push({
            id: `${prog.id}-start`,
            programmeId: prog.id,
            date: prog.start_date,
            type: 'start',
            title: `${prog.name} started`,
            programme: prog,
            isParticipant,
            isEnded
          })
        }

        if (prog.end_date) {
          allEvents.push({
            id: `${prog.id}-end`,
            programmeId: prog.id,
            date: prog.end_date,
            type: 'end',
            title: `${prog.name} ended`,
            programme: prog,
            isParticipant,
            isEnded
          })
        }
      }
    })

    return allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [programmes, userRoles, selectedCategory])

  // Calendar Helpers
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

  // Navigation Logic
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const navItems = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard', path: '/student' },
    { id: 'schedule',   icon: Calendar,        label: 'Schedule', path: '/student/schedule' },
    { id: 'profile',    icon: User,            label: 'Profile', path: '/profile' },
    { id: 'attendance', icon: QrCode,          label: 'Attendance', path: '/student/attendance' },
  ]

  const handleNavClick = (path: string) => {
    router.push(path)
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'ST'

  const getProgrammeStatus = (start: string, end: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (end < today) return 'Ended'
    if (start <= today && end >= today) return 'Ongoing'
    return 'Upcoming'
  }

  // UI Event Styles
  const getEventStyle = (event: CalendarEvent) => {
    if (event.isEnded) {
      return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: '#475569' }
    }
    if (event.isParticipant) {
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '#059669' }
    }
    return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: '#2563eb' }
  }

  if (loading || isMobile === null) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #1e40af', borderTopColor: '#60a5fa', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const renderModal = () => {
    if (!selectedEvent) return null
    const { programme, isParticipant } = selectedEvent
    const status = getProgrammeStatus(programme.start_date, programme.end_date)
    const role = userRoles[programme.id]

    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }} onClick={() => setSelectedEvent(null)}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setSelectedEvent(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#f8fafc', paddingRight: '24px' }}>{programme.name}</h2>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', background: '#1e293b', color: '#cbd5e1', padding: '4px 10px', borderRadius: '6px' }}>{programme.category || 'General'}</span>
            <span style={{ fontSize: '11px', background: status === 'Ended' ? '#334155' : status === 'Ongoing' ? '#064e3b' : '#1e3a8a', color: status === 'Ended' ? '#94a3b8' : status === 'Ongoing' ? '#34d399' : '#60a5fa', padding: '4px 10px', borderRadius: '6px' }}>
              {status}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
              <Clock size={16} color="#64748b" style={{ marginTop: '2px' }} />
              <div>
                <div><strong>Start:</strong> {new Date(programme.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div><strong>End:</strong> {new Date(programme.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
              <MapPin size={16} color="#64748b" />
              <span>{programme.venue || 'TBA'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
              <User size={16} color="#64748b" />
              <span>Advisor: {programme.advisor_name}</span>
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '20px', maxHeight: '100px', overflowY: 'auto', lineHeight: 1.5 }}>
            {programme.description || 'No description provided.'}
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={18} color={isParticipant ? '#34d399' : '#f59e0b'} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: isParticipant ? '#34d399' : '#f59e0b' }}>
              {isParticipant ? `Your role: ${role}` : "You are not a participant in this programme."}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderSidebar = () => (
    <aside style={{ width: '240px', background: '#0a1628', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10 }}>
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={18} color="white" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>UTM-SPMS</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Student Portal</p>
          </div>
        </div>
      </div>

      <nav style={{ padding: '16px 12px', flex: 1 }}>
        <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px', marginBottom: '8px' }}>Main Menu</p>
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activeNav === item.id
          return (
            <button key={item.id} onClick={() => handleNavClick(item.path)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent', color: isActive ? '#60a5fa' : '#94a3b8', fontSize: '14px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.15s' }}>
              <Icon size={16} />{item.label}
              {isActive && <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6' }} />}
            </button>
          )
        })}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px', marginBottom: '8px' }}>Account</p>
          <button onClick={() => router.push('/profile')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: '14px', textAlign: 'left', marginBottom: '2px', transition: 'all 0.15s' }}>
            <Settings size={16} />Settings
          </button>
        </div>
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
            {getInitials(profile?.full_name || '')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Student'}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{profile?.matric_no || 'UTM Student'}</p>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '4px' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )

  const renderMobileHeader = () => (
    <div style={{ background: '#0a1628', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#1e40af,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Award size={13} color="white" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>UTM-SPMS</p>
          <p style={{ fontSize: '9px', color: '#475569', margin: 0 }}>Student Portal</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
          <Bell size={14} />
          <span style={{ position: 'absolute', top: '7px', right: '7px', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', border: '1.5px solid #0f172a' }} />
        </button>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
          {getInitials(profile?.full_name || '')}
        </div>
      </div>
    </div>
  )

  const renderMobileBottomNav = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a1628', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', zIndex: 20 }}>
      {navItems.map(item => {
        const Icon = item.icon
        const isActive = activeNav === item.id
        return (
          <button key={item.id} onClick={() => handleNavClick(item.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', cursor: 'pointer', gap: '3px', border: 'none', background: 'transparent' }}>
            <Icon size={16} color={isActive ? '#3b82f6' : '#475569'} />
            <span style={{ fontSize: '9px', fontWeight: 500, color: isActive ? '#3b82f6' : '#475569' }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )

  // --- Main Content Header ---
  const renderContentHeader = () => (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Schedule
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Manage your programme timeline and events.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
        <div style={{ position: 'relative' }}>
          <Filter size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <select 
            value={selectedCategory} 
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ appearance: 'none', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '8px 30px 8px 32px', color: '#f1f5f9', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', background: '#1e293b', borderRadius: '8px', padding: '4px' }}>
          <button onClick={() => setView('calendar')} style={{ background: view === 'calendar' ? '#3b82f6' : 'transparent', border: 'none', padding: '6px 10px', borderRadius: '6px', color: view === 'calendar' ? 'white' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500 }}>
            <Grid size={14} /> <span style={{ display: isMobile ? 'none' : 'inline' }}>Calendar</span>
          </button>
          <button onClick={() => setView('timeline')} style={{ background: view === 'timeline' ? '#3b82f6' : 'transparent', border: 'none', padding: '6px 10px', borderRadius: '6px', color: view === 'timeline' ? 'white' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500 }}>
            <List size={14} /> <span style={{ display: isMobile ? 'none' : 'inline' }}>Timeline</span>
          </button>
        </div>
      </div>
    </div>
  )

  // --- Views ---
  const renderCalendarView = () => {
    const today = new Date()
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()
    const currentDay = today.getDate()

    return (
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: '#0a1628', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', width: '100%' }}>
          
          {/* Calendar Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#cbd5e1' }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#cbd5e1' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Grid Header (Fixed Equal Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ padding: '10px 0', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{day}</div>
            ))}
          </div>

          {/* Calendar Grid Body (Fixed Equal Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(100px, auto)' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{ borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }} />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayEvents = events.filter(e => e.date === dateStr)
              const isToday = isCurrentMonth && day === currentDay

              return (
                <div key={day} style={{ borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '8px', minHeight: '100px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: isToday ? 600 : 400,
                      color: isToday ? '#3b82f6' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px', 
                      height: '24px',
                      borderRadius: '50%',
                      border: isToday ? '2px solid #3b82f6' : 'none'
                    }}>
                      {day}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    {dayEvents.map(evt => {
                      const style = getEventStyle(evt)
                      return (
                        <div 
                          key={evt.id} 
                          onClick={() => setSelectedEvent(evt)}
                          title={evt.title}
                          style={{ 
                            background: style.bg, border: `1px solid ${style.border}`, color: style.text,
                            fontSize: '10px', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', boxSizing: 'border-box'
                          }}>
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
        <div style={{ width: isMobile ? '100%' : '200px', background: '#0a1628', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', flexShrink: 0 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>Legend</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #059669', background: 'rgba(16, 185, 129, 0.2)' }} />
              Participated
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #2563eb', background: 'rgba(59, 130, 246, 0.2)' }} />
              Not Participated
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #475569', background: 'rgba(100, 116, 139, 0.2)' }} />
              Ended
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTimelineView = () => {
    // Group events by formatted date string
    const grouped: { [key: string]: CalendarEvent[] } = {}
    events.forEach(evt => {
      const dateObj = new Date(evt.date)
      const key = dateObj.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(evt)
    })

    const sortedKeys = Object.keys(grouped).sort((a, b) => new Date(grouped[a][0].date).getTime() - new Date(grouped[b][0].date).getTime())

    if (sortedKeys.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: '#0a1628', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          No scheduled programmes found for the selected filter.
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
        {sortedKeys.map(dateKey => (
          <div key={dateKey}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#f8fafc', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {dateKey}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {grouped[dateKey].map(evt => {
                const style = getEventStyle(evt)
                return (
                  <div 
                    key={evt.id} 
                    onClick={() => setSelectedEvent(evt)}
                    style={{ 
                      background: style.bg, border: `1px solid ${style.border}`, 
                      padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '12px', transition: 'transform 0.1s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <span style={{ color: style.text, fontSize: '14px' }}>⭕️</span>
                    <span style={{ color: style.text, fontSize: '14px', fontWeight: 500 }}>{evt.title}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // --- Main Render ---
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#f1f5f9' }}>
      
      {/* Sidebar (Desktop) */}
      {!isMobile && renderSidebar()}

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: isMobile ? '0' : '240px', paddingBottom: isMobile ? '70px' : '0' }}>
        
        {/* Mobile Header */}
        {isMobile && renderMobileHeader()}

        {/* Content Area */}
        <main style={{ padding: isMobile ? '16px' : '32px 36px', maxWidth: '100%', overflowX: 'hidden' }}>
          {renderContentHeader()}
          {view === 'calendar' ? renderCalendarView() : renderTimelineView()}
        </main>
        
        {/* Mobile Bottom Nav */}
        {isMobile && renderMobileBottomNav()}
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  )
}