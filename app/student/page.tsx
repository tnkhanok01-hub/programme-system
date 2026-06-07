'use client'
import NotificationBell from "../../components/notifications/NotificationBell";
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { useTheme } from '@/app/provider/ThemeContext'
import {
  BookOpen,
  Calendar,
  Bell,
  LogOut,
  User,
  ChevronRight,
  Clock,
  MapPin,
  Award,
  CheckCircle,
  AlertCircle,
  Search,
  LayoutDashboard,
  FileText,
  Settings,
  Plus,
  QrCode,
  WalletCards
} from 'lucide-react'

interface Programme {
  id: string
  name: string
  code: string
  description: string
  status: string
  created_at: string
  venue?: string
  start_date?: string
  end_date?: string
  programme_director_id?: string
}

interface Profile {
  id: string
  full_name: string
  email: string
  matric_no?: string
  faculty?: string
  role: string
}

/* ─── PROGRAMME CARD ─────────────────────────────────────────────────────── */
function ProgrammeCard({
  prog, userId, onClick, t,
}: { prog: Programme; userId: string | null; onClick: () => void; t: any }) {
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':    return { bg: '#eaf3de', color: '#3b6d11', dot: '#639922' }
      case 'upcoming':  return { bg: '#e6f1fb', color: '#185fa5', dot: '#378add' }
      case 'completed': return { bg: '#f1efe8', color: '#5f5e5a', dot: '#888780' }
      default:          return { bg: '#faeeda', color: '#854f0b', dot: '#ef9f27' }
    }
  }
  const statusStyle = getStatusStyle(prog.status)
  const isMine = prog.programme_director_id === userId

  return (
    <div
      onClick={onClick}
      style={{
        background: isMine ? t.accentBg : t.bgInput,
        border: `1px solid ${isMine ? t.accentBorder : t.border}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = isMine ? 'rgba(99,102,241,0.14)' : t.bgCard
        ;(e.currentTarget as HTMLElement).style.borderColor = isMine ? t.accentBorder : 'rgba(59,130,246,0.3)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = isMine ? t.accentBg : t.bgInput
        ;(e.currentTarget as HTMLElement).style.borderColor = isMine ? t.accentBorder : t.border
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '11px', fontWeight: 600,
            background: statusStyle.bg, color: statusStyle.color,
            padding: '3px 8px', borderRadius: '5px',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusStyle.dot, flexShrink: 0 }} />
            {prog.status || 'Open'}
          </span>
          {isMine && (
            <span style={{ fontSize: '10px', fontWeight: 700, background: t.accentBg, color: t.accentText, padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.04em' }}>
              MINE
            </span>
          )}
        </div>
        {prog.code && (
          <span style={{ fontSize: '11px', color: t.textFaint, fontFamily: 'monospace' }}>{prog.code}</span>
        )}
      </div>

      <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: t.text, lineHeight: 1.4 }}>
        {prog.name}
      </h3>

      {prog.description && (
        <p style={{
          margin: '0 0 12px', fontSize: '12px', color: t.textFaint, lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {prog.description}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {prog.start_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: t.textFaint }}>
            <Clock size={11} />
            {new Date(prog.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
            {prog.end_date && prog.end_date !== prog.start_date && (
              <> – {new Date(prog.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</>
            )}
          </div>
        )}
        {prog.venue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: t.textFaint }}>
            <MapPin size={11} /> {prog.venue}
          </div>
        )}
        {!prog.start_date && !prog.venue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: t.textFaint }}>
            <Clock size={11} /> Added {new Date(prog.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>

      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          View details <ChevronRight size={12} />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: t.textFaint }}>
          <CheckCircle size={11} /> Available
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function StudentHomepage() {
  const router = useRouter()
  const { t } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [enrolledCount, setEnrolledCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [showMineOnly, setShowMineOnly] = useState(false)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [userId, setUserId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [hasTreasurerFinanceAccess, setHasTreasurerFinanceAccess] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: profileData } = await supabase
        .from('users').select('*').eq('id', session.user.id).single()

      setUserId(session.user.id)
      if (profileData) setProfile(profileData)

      const { data: programmeData } = await supabase
        .from('programmes').select('*').order('created_at', { ascending: false })

      if (programmeData) {
        const sorted = [...programmeData].sort((a, b) => {
          const aOwn = a.programme_director_id === session.user.id ? 0 : 1
          const bOwn = b.programme_director_id === session.user.id ? 0 : 1
          return aOwn - bOwn
        })
        setProgrammes(sorted)
      }

      const { count } = await supabase
        .from('programme_roles').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id)

      setEnrolledCount(count ?? 0)

      const { count: financeRoleCount } = await supabase
        .from('programme_roles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'approved')
        .in('role', ['Treasurer', 'Vice Treasurer'])

      setHasTreasurerFinanceAccess((financeRoleCount ?? 0) > 0)
      setLoading(false)
    }
    init()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const getGreeting = () => {
    const h = currentTime.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'ST'

  const availableMonths = Array.from(
    new Set(
      programmes
        .map(p => p.start_date?.slice(0, 7))
        .filter((m): m is string => !!m)
    )
  ).sort()

  const filtered = programmes.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMonth = !selectedMonth || p.start_date?.startsWith(selectedMonth)
    const matchesMine = !showMineOnly || p.programme_director_id === userId
    return matchesSearch && matchesMonth && matchesMine
  })

  const displayList = filtered

  const navItems = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'schedule',   icon: Calendar,         label: 'Schedule' },
    { id: 'attendance', icon: QrCode,           label: 'Attendance' },
    ...(hasTreasurerFinanceAccess ? [{ id: 'finance', icon: WalletCards, label: 'Finance' }] : []),
  ]

  const mobileNavItems = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'schedule',   icon: Calendar,         label: 'Schedule' },
    { id: 'attendance', icon: QrCode,           label: 'Attendance' },
    ...(hasTreasurerFinanceAccess ? [{ id: 'finance', icon: WalletCards, label: 'Finance' }] : []),
    { id: 'profile',    icon: User,             label: 'Profile' },
    { id: 'settings',   icon: Settings,         label: 'Settings' },
  ]

  const handleNavClick = (id: string) => {
    setActiveNav(id)
    if (id === 'dashboard')  router.push('/student')
    if (id === 'schedule')   router.push('/student/schedule')
    if (id === 'attendance') router.push('/student/attendance')
    if (id === 'finance')    router.push('/treasurer/finance')
    if (id === 'profile')    router.push('/profile')
    if (id === 'settings')   router.push('/settings')
  }

  const statCards = [
    { label: 'Enrolled',  value: enrolledCount,                                         icon: BookOpen,  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)' },
    { label: 'Available', value: programmes.length,                                      icon: FileText,  color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)' },
    { label: 'Upcoming',  value: programmes.filter(p => p.status === 'upcoming').length, icon: Calendar,  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${t.accentBg}`, borderTopColor: t.accentText, animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: t.textMuted, fontSize: '14px', letterSpacing: '0.05em' }}>Loading your dashboard...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (isMobile === null) return <div style={{ minHeight: '100vh', background: t.bg }} />

  /* ══════════════════════════════════════════════════════
     MOBILE LAYOUT
  ══════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: '70px' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* Sticky top bar */}
        <div style={{ background: t.bgCardAlt, borderBottom: `1px solid ${t.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#1e40af,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={13} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: t.text, letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '9px', color: t.textFaint, margin: 0 }}>STUDENT PORTAL</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ zIndex: 99999, position: "relative" }}>
  <NotificationBell />
</div>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
              {getInitials(profile?.full_name || '')}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Greeting */}
          <div style={{ marginBottom: '16px' }}>
            <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: t.text }}>
              {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
            </h1>
            <p style={{ fontSize: '11px', color: t.textFaint, margin: '2px 0 0' }}>
              {currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {statCards.map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} style={{ background: t.bgCard, border: `1px solid ${stat.border}`, borderRadius: '10px', padding: '12px 10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                    <Icon size={13} color={stat.color} />
                  </div>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: t.text, letterSpacing: '-0.03em' }}>{stat.value}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '9px', color: t.textFaint }}>{stat.label}</p>
                </div>
              )
            })}
          </div>

          {/* Programmes section */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: t.text }}>Available Programmes</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textFaint }}>Explore and enroll</p>
                </div>
                <button onClick={() => router.push('/create-programme-form')} style={{ background: '#1d4ed8', border: 'none', borderRadius: '7px', padding: '6px 10px', color: 'white', fontSize: '11px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                  Add Programme <Plus size={12} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint, pointerEvents: 'none' }} />
                  <input
                    type="text" placeholder="Search..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 28px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '7px', color: t.text, fontSize: '12px', outline: 'none', boxSizing: 'border-box' as const }}
                  />
                </div>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Calendar size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint, pointerEvents: 'none', zIndex: 1 }} />
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 28px', background: t.bgInput, border: `1px solid ${selectedMonth ? '#3b82f6' : t.border}`, borderRadius: '7px', color: t.text, fontSize: '12px', outline: 'none', boxSizing: 'border-box' as const, appearance: 'none' as const, cursor: 'pointer' }}
                  >
                    <option value="" style={{ background: '#1e293b', color: '#f1f5f9' }}>All months</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m} style={{ background: '#1e293b', color: '#f1f5f9' }}>
                        {new Date(m + '-01').toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => setShowMineOnly(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '7px', border: `1px solid ${showMineOnly ? '#6366f1' : t.border}`, background: showMineOnly ? 'rgba(99,102,241,0.15)' : t.bgInput, color: showMineOnly ? '#818cf8' : t.textFaint, fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const, alignSelf: 'flex-start' }}
              >
                <User size={11} /> My Programmes
              </button>
            </div>

            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: t.textFaint }}>
                  <AlertCircle size={22} style={{ marginBottom: '8px', color: t.textFaintest }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>No programmes found{searchQuery ? ` for "${searchQuery}"` : ''}{selectedMonth ? ` in ${new Date(selectedMonth + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}` : ''}</p>
                </div>
              ) : displayList.map(prog => (
                <ProgrammeCard key={prog.id} prog={prog} userId={userId} onClick={() => router.push(`/programmes/${prog.id}`)} t={t} />
              ))}
            </div>
          </div>
        </div>

        {/* Fixed bottom tab bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.bgCardAlt, borderTop: `1px solid ${t.border}`, display: 'flex', zIndex: 20 }}>
          {mobileNavItems.map(item => {
            const Icon = item.icon
            const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', cursor: 'pointer', gap: '3px', border: 'none', background: 'transparent' }}>
                <Icon size={16} color={isActive ? '#3b82f6' : t.textFaint} />
                <span style={{ fontSize: '9px', fontWeight: 500, color: isActive ? '#3b82f6' : t.textFaint }}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     DESKTOP LAYOUT
  ══════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: t.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Sidebar */}
      <aside style={{ width: '240px', background: t.bgCardAlt, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10 }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '15px', margin: 0, letterSpacing: '-0.02em', color: t.text }}>UTM-SPMS</p>
              <p style={{ fontSize: '11px', color: t.textFaint, margin: 0 }}>STUDENT PORTAL</p>
            </div>
          </div>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: t.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px', marginBottom: '8px' }}>Main Menu</p>
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent', color: isActive ? '#60a5fa' : t.textMuted, fontSize: '14px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.15s' }}>
                <Icon size={16} />{item.label}
                {isActive && <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6' }} />}
              </button>
            )
          })}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: t.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px', marginBottom: '8px' }}>Account</p>
            <button onClick={() => router.push('/profile')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent', color: t.textMuted, fontSize: '14px', textAlign: 'left', marginBottom: '2px', transition: 'all 0.15s' }}>
              <User size={16} />Profile
            </button>
    
            <button onClick={() => router.push('/settings')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent', color: t.textMuted, fontSize: '14px', textAlign: 'left', marginBottom: '2px', transition: 'all 0.15s' }}>
              <Settings size={16} />Settings
            </button>
          </div>
        </nav>

        <div style={{ padding: '16px', borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: t.bgInput }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
              {getInitials(profile?.full_name || '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Student'}</p>
              <p style={{ margin: 0, fontSize: '11px', color: t.textFaint }}>{profile?.matric_no || 'UTM Student'}</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textFaint, padding: '4px', borderRadius: '4px' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: '240px', padding: '32px 36px', maxWidth: '100%', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.03em', color: t.text }}>
              {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
            </h1>
            <p style={{ fontSize: '14px', color: t.textFaint, margin: '4px 0 0' }}>
              {currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <NotificationBell />
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {statCards.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} style={{ background: t.bgCard, border: `1px solid ${stat.border}`, borderRadius: '14px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={stat.color} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: t.text, letterSpacing: '-0.03em' }}>{stat.value}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: t.textFaint }}>{stat.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Programmes section */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: t.text }}>Available Programmes</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: t.textFaint }}>Explore and enroll in upcoming programmes</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint }} />
                <input type="text" placeholder="Search programmes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 12px 8px 32px', color: t.text, fontSize: '13px', outline: 'none', width: '200px' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint, pointerEvents: 'none', zIndex: 1 }} />
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  style={{ background: t.bgInput, border: `1px solid ${selectedMonth ? '#3b82f6' : t.border}`, borderRadius: '8px', padding: '8px 12px 8px 32px', color: t.text, fontSize: '13px', outline: 'none', width: '170px', appearance: 'none' as const, cursor: 'pointer' }}
                >
                  <option value="" style={{ background: '#1e293b', color: '#f1f5f9' }}>All months</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m} style={{ background: '#1e293b', color: '#f1f5f9' }}>
                      {new Date(m + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowMineOnly(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: `1px solid ${showMineOnly ? '#6366f1' : t.border}`, background: showMineOnly ? 'rgba(99,102,241,0.15)' : t.bgInput, color: showMineOnly ? '#818cf8' : t.textMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const }}
              >
                <User size={14} /> My Programmes
              </button>
              <button onClick={() => router.push('/create-programme-form')} style={{ background: '#1d4ed8', border: 'none', borderRadius: '8px', padding: '8px 16px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                New Programme <Plus size={14} />
              </button>
            </div>
          </div>

          <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {displayList.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: t.textFaint }}>
                <AlertCircle size={24} style={{ marginBottom: '8px', color: t.textFaintest }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No programmes found{searchQuery ? ` for "${searchQuery}"` : ''}{selectedMonth ? ` in ${new Date(selectedMonth + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}` : ''}</p>
              </div>
            ) : displayList.map(prog => (
              <ProgrammeCard key={prog.id} prog={prog} userId={userId} onClick={() => router.push(`/programmes/${prog.id}`)} t={t} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
