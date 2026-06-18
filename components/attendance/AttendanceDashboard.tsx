'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/app/provider/ThemeContext'
import { QRCodeCanvas } from 'qrcode.react'
import { Scanner } from '@yudiel/react-qr-scanner'
import {
  QrCode, Calendar, MapPin, Search, AlertCircle,
  CheckCircle, XCircle, ArrowLeft, Maximize, X,
  ArrowUp, ArrowDown
} from 'lucide-react'

interface Programme {
  id: string
  name: string
  description: string
  venue: string
  start_date: string
  end_date: string
  status: string
  programme_director_id: string
}

interface UserSurvey {
  programme_id: string
  type: string
}

interface UserRole {
  programme_id: string
  role: string
  status: string
}

function CompletedList({ programmeId, t }: { programmeId: string; t: any }) {
  const [list, setList] = useState<{ full_name: string; matric_number: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('users(full_name, matric_number)')
        .eq('programme_id', programmeId)
        .eq('post_survey', true)
      setList((data ?? []).map((r: any) => r.users).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [programmeId])

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Attendance Completed
        </p>
        <span style={{ fontSize: '11px', fontWeight: 700, color: t.success, background: t.successBg, border: `1px solid ${t.successBorder}`, borderRadius: '6px', padding: '2px 8px' }}>
          {loading ? '…' : list.length}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${t.accentBg}`, borderTopColor: t.accentText, animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : list.length === 0 ? (
        <div style={{ padding: '12px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '12px', color: t.textFaint }}>No participants have completed both surveys yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
          {list.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: t.successBg, border: `1px solid ${t.successBorder}`, borderRadius: '8px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: t.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={13} color={t.success} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</p>
                <p style={{ margin: 0, fontSize: '11px', color: t.textFaint }}>{u.matric_number}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AttendanceDashboard({ sysRole }: { sysRole: 'student' | 'admin' | 'superadmin' }) {
  const router = useRouter()
  const { t } = useTheme()

  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [surveys, setSurveys] = useState<UserSurvey[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'ongoing' | 'expired'>('ongoing')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'start_date'>('start_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [isMobile, setIsMobile] = useState(false)
  const [selectedProg, setSelectedProg] = useState<Programme | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [qrModal, setQrModal] = useState<{ progId: string; name: string } | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const userId = session.user.id
      setCurrentUserId(userId)

      const todayStr = new Date().toLocaleDateString('sv-SE')

      const { data: attData } = await supabase.from('attendance').select('*')
      setAttendance(attData || [])

      const { data: progData } = await supabase
        .from('programmes').select('*').eq('status', 'Approved').lte('start_date', todayStr)

      const { data: surveyData } = await supabase.from('surveys').select('programme_id, type').eq('user_id', userId)
      const { data: roleData } = await supabase.from('programme_roles').select('programme_id, role, status').eq('user_id', userId)

      setSurveys(surveyData || [])
      setRoles(roleData || [])
      setProgrammes(progData || [])
      setLoading(false)
    }
    fetchData()
  }, [sysRole, router])

  const todayStr = new Date().toLocaleDateString('sv-SE')

  const filteredProgrammes = programmes
    .filter(p => {
      const isOngoing = p.end_date >= todayStr
      const matchTab = activeTab === 'ongoing' ? isOngoing : !isOngoing
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchTab && matchSearch
    })
    .sort((a, b) => {
      const valA = sortBy === 'name' ? a.name.toLowerCase() : a.start_date
      const valB = sortBy === 'name' ? b.name.toLowerCase() : b.start_date
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })

  const toggleSort = (key: 'name' | 'start_date') => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }

  const handleScan = async (result: string) => {
    try {
      const payload = JSON.parse(result)
      if (!payload.spms_qr || !payload.progId || payload.type !== 'post') return

      const { data: existing } = await supabase
        .from('surveys').select('id')
        .eq('user_id', currentUserId).eq('programme_id', payload.progId).eq('type', 'post')
        .maybeSingle()

      if (existing) {
        alert('You have already completed attendance for this programme.')
        setShowScanner(false)
        return
      }

      const { error: attError } = await supabase
        .from('attendance')
        .upsert({ user_id: currentUserId, programme_id: payload.progId, qr_end: true }, { onConflict: 'user_id,programme_id' })

      if (attError) { alert('Could not record attendance. Please try again.'); return }

      setShowScanner(false)
      router.push(`/student/post-survey?programme_id=${payload.progId}`)
    } catch {
      // Ignore non-SPMS QR codes
    }
  }

  const myRoleInProg = (progId: string) => roles.find(r => r.programme_id === progId)?.role || 'Participant'
  const isExpired = (prog: Programme) => prog.end_date < todayStr

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${t.accentBg}`, borderTopColor: t.accentText, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "'Inter', sans-serif", color: t.text, padding: isMobile ? '16px' : '32px 36px', paddingBottom: '80px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <button
            onClick={() => router.push(sysRole === 'superadmin' ? '/superadmin' : sysRole === 'admin' ? '/admin' : '/student')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: t.textFaint, fontSize: '13px', cursor: 'pointer', padding: '0 0 8px', marginBottom: '4px', fontFamily: 'inherit' }}
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <QrCode size={22} color={t.accentText} />
            Programme Attendance
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: t.textFaint }}>
            {sysRole === 'student' ? 'Track your participation and scan QR codes.' : 'Manage programme attendance and generate QR codes.'}
          </p>
        </div>

        {sysRole === 'student' && (
          <button
            onClick={() => setShowScanner(true)}
            style={{ width: isMobile ? '100%' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.4)' }}
          >
            <Maximize size={16} /> Scan Attendance QR
          </button>
        )}
      </div>

      {/* Tabs & Search */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', background: t.bgInput, padding: '4px', borderRadius: '10px' }}>
            {(['ongoing', 'expired'] as const).map(tab => (
              <button
                key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === tab ? t.bgCard : 'transparent', color: activeTab === tab ? t.text : t.textFaint, fontSize: '13px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s', boxShadow: activeTab === tab ? `0 1px 3px rgba(0,0,0,0.1)` : 'none' }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: isMobile ? 1 : '0 1 auto' }}>
            {(['name', 'start_date'] as const).map(key => {
              const active = sortBy === key
              const label = key === 'name' ? 'Name' : 'Start Date'
              const Icon = sortDir === 'asc' ? ArrowUp : ArrowDown
              return (
                <button key={key} onClick={() => toggleSort(key)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '8px 12px', borderRadius: '8px', border: `1px solid ${active ? t.accentBorder : t.border}`,
                  background: active ? t.accentBg : 'transparent',
                  color: active ? t.accentText : t.textFaint,
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}>
                  {label}{active && <Icon size={11} />}
                </button>
              )
            })}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint }} />
              <input
                type="text" placeholder="Search programmes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width: isMobile ? '100%' : '220px', padding: '10px 12px 10px 34px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Programme Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filteredProgrammes.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: t.textFaint }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px', color: t.textFaintest }} />
            <p style={{ margin: 0, fontSize: '14px' }}>No {activeTab} programmes found.</p>
          </div>
        ) : filteredProgrammes.map(prog => {
          const progAttendance = attendance.filter(a => String(a.programme_id) === String(prog.id))
          return (
            <div
              key={prog.id}
              style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', transition: 'border-color 0.2s, background 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accentBorder; e.currentTarget.style.background = t.bgCardAlt }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.bgCard }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: t.text, lineHeight: 1.4, flex: 1, paddingRight: '10px' }}>{prog.name}</h3>
                {sysRole === 'student' && (() => {
                  const hasPost = surveys.some(s => String(s.programme_id) === String(prog.id) && s.type === 'post')
                  const label = hasPost ? 'Attended' : 'Not Attended'
                  const color = hasPost ? t.success : t.danger
                  const bg    = hasPost ? t.successBg : t.dangerBg
                  const Icon  = hasPost ? CheckCircle : XCircle
                  return (
                    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: bg, color }}>
                      <Icon size={12} />{label}
                    </span>
                  )
                })()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: t.textFaint }}>
                  <Calendar size={12} /> {new Date(prog.start_date).toLocaleDateString('en-MY')} – {new Date(prog.end_date).toLocaleDateString('en-MY')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: t.textFaint }}>
                  <MapPin size={12} /> {prog.venue || 'N/A'}
                </div>
                <div style={{ marginTop: '6px', fontSize: '12px', color: t.textMuted }}>
                  Participants: {progAttendance.length}
                </div>
                <button
                  onClick={() => setSelectedProg(prog)}
                  style={{ marginTop: '10px', padding: '8px 12px', background: t.accentBg, color: t.accentText, border: `1px solid ${t.accentBorder}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', fontSize: '13px' }}
                >
                  View Details
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Programme Details Modal */}
      {selectedProg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '16px' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedProg(null) }}
        >
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: t.text }}>{selectedProg.name}</h2>
              <button onClick={() => setSelectedProg(null)} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {sysRole === 'student' && (
              <div style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, padding: '8px 12px', borderRadius: '8px', marginBottom: '16px', display: 'inline-block' }}>
                <p style={{ margin: 0, fontSize: '12px', color: t.accentText, fontWeight: 600 }}>Your Role: {myRoleInProg(selectedProg.id)}</p>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: t.textMuted, lineHeight: 1.6 }}>{selectedProg.description}</p>
            </div>

            <CompletedList programmeId={selectedProg.id} t={t} />

            {(sysRole === 'admin' || sysRole === 'superadmin' || currentUserId === selectedProg.programme_director_id || roles.some(r => r.programme_id === selectedProg.id && r.status === 'approved')) && (
              <div style={{ display: 'flex', gap: '10px' }}>
                {isExpired(selectedProg) ? (
                  <div style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.textFaint, fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                    Programme has ended — QR unavailable
                  </div>
                ) : (
                  <button
                    onClick={() => setQrModal({ progId: selectedProg.id, name: selectedProg.name })}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Generate End QR
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Display Modal — always white background so QR is scannable */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '340px', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setQrModal(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}>
              <X size={18} color="#475569" />
            </button>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '18px', fontWeight: 700 }}>End Attendance QR</h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '12px', lineHeight: 1.4 }}>{qrModal.name}</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <QRCodeCanvas
                value={JSON.stringify({ spms_qr: true, progId: qrModal.progId, type: 'post' })}
                size={220} level="H" includeMargin={true}
              />
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '11px' }}>Ask participants to scan this QR to record their attendance.</p>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', zIndex: 60 }}>
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <p style={{ margin: 0, color: 'white', fontWeight: 600 }}>Scan QR Code</p>
            <button onClick={() => setShowScanner(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '8px', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '500px' }}>
              <Scanner
                onScan={result => { if (result && result.length > 0) handleScan(result[0].rawValue) }}
                components={{ finder: true }}
                sound={false}
                styles={{ container: { width: '100%', height: '100vh' } }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}