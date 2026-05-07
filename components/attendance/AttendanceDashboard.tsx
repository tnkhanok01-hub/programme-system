'use client'
import { validateAttendance } from '@/lib/attendance'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { 
  QrCode, Calendar, MapPin, Search, AlertCircle, 
  CheckCircle, XCircle, ArrowLeft, Maximize, X 
} from 'lucide-react'

// --- Interfaces ---
interface Programme {
  id: string
  name: string
  description: string
  venue: string
  start_date: string
  end_date: string
  status: string
}

interface UserSurvey {
  programme_id: string
  type: string
}

interface UserRole {
  programme_id: string
  role: string
}

// --- Component ---
export default function AttendanceDashboard({ sysRole }: { sysRole: 'student' | 'admin' | 'superadmin' }) {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [surveys, setSurveys] = useState<UserSurvey[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [attendance, setAttendance] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState<'ongoing' | 'expired'>('ongoing')
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  // Modals state
  const [selectedProg, setSelectedProg] = useState<Programme | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [qrModal, setQrModal] = useState<{ progId: string, type: 'pre' | 'post', name: string } | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      
      const userId = session.user.id
      setCurrentUserId(userId)

      const todayStr = new Date().toISOString().split('T')[0]
      let attendanceRows: any[] = []
      if (sysRole === 'student') {
        const { data } = await supabase.from('attendance').select('*').eq('user_id', userId)
        attendanceRows = data || []
      } else {
        const { data } = await supabase.from('attendance').select('*')
        attendanceRows = data || []
      }
      setAttendance(attendanceRows)

      // Fetch ALL approved programmes that have started or start today
      const { data: progData } = await supabase
        .from('programmes')
        .select('*')
        .eq('status', 'Approved')
        .lte('start_date', todayStr)

      // Fetch user specific data
      const { data: surveyData } = await supabase.from('surveys').select('programme_id, type').eq('user_id', userId)
      const { data: roleData } = await supabase.from('programme_roles').select('programme_id, role').eq('user_id', userId)

      setSurveys(surveyData || [])
      setRoles(roleData || [])

      if (sysRole === 'student') {
        // Filter programmes: Only show if student has a role OR has submitted a survey (i.e. participated)
        const activeProgIds = new Set([
          ...(surveyData?.map(s => s.programme_id) || []),
          ...(roleData?.map(r => r.programme_id) || [])
        ])
        setProgrammes((progData || []).filter(p => activeProgIds.has(p.id)))
      } else {
        // Admin / Superadmin sees all approved ongoing/expired programmes
        setProgrammes(progData || [])
      }

      setLoading(false)
    }
    fetchData()
  }, [sysRole, router])

  // --- Logic Helpers ---
  const todayStr = new Date().toISOString().split('T')[0]
  
  const filteredProgrammes = programmes.filter(p => {
    const isOngoing = p.end_date >= todayStr
    const matchTab = activeTab === 'ongoing' ? isOngoing : !isOngoing
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchTab && matchSearch
  })

  const getAttendanceStatus = (progId: string) => {
    const record = attendance.find(
      a => String(a.programme_id) === String(progId) && a.user_id === currentUserId
    )
    if (!record) return false
    return validateAttendance({
      qr_start:    record.qr_start    ?? false,
      qr_end:      record.qr_end      ?? false,
      pre_survey:  record.pre_survey  ?? false,
      post_survey: record.post_survey ?? false,
    }) === 'valid'
  }

  const handleScan = async (result: string) => {
    try {
      const payload = JSON.parse(result)
      if (!payload.spms_qr || !payload.progId || !payload.type) return

      // Anti-cheat: check if survey already submitted
      const { data: existing } = await supabase
        .from('surveys')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('programme_id', payload.progId)
        .eq('type', payload.type)
        .maybeSingle()

      if (existing) {
        alert(`You have already completed the ${payload.type.toUpperCase()} survey for this programme.`)
        setShowScanner(false)
        return
      }

      // Record QR scan in attendance table
      const qrField = payload.type === 'pre' ? 'qr_start' : 'qr_end'
      const { error: attError } = await supabase
        .from('attendance')
        .upsert(
          { user_id: currentUserId, programme_id: payload.progId, [qrField]: true },
          { onConflict: 'user_id,programme_id' }
        )

      if (attError) {
        alert('Could not record attendance scan. Please try again.')
        return
      }

      setShowScanner(false)
      router.push(`/student/${payload.type}-survey?programme_id=${payload.progId}`)
    } catch {
      // Ignore non-SPMS QR codes silently
    }
  }

  const myRoleInProg = (progId: string) => roles.find(r => r.programme_id === progId)?.role || 'Participant'

  const canGenerateQR = (progId: string) => {
    if (sysRole === 'admin' || sysRole === 'superadmin') return true
    const role = myRoleInProg(progId)
    const allowed = ['Programme Director', 'Vice Director - Activity', 'Vice Director - Management', 'Secretary', 'Vice Secretary']
    return allowed.includes(role)
  }

  const isExpired = (prog: Programme) => prog.end_date < todayStr

  const canGeneratePreQR = (prog: Programme) =>
    prog.status === 'Approved' && !isExpired(prog) && prog.start_date === todayStr

  const canGeneratePostQR = (prog: Programme) =>
    prog.status === 'Approved' && prog.end_date === todayStr

  const preQRReason = (prog: Programme): string => {
    if (prog.status !== 'Approved') return 'Programme is not approved'
    if (isExpired(prog)) return 'Programme has already ended'
    if (prog.start_date < todayStr) return `Only available on start date (${new Date(prog.start_date + 'T00:00:00').toLocaleDateString('en-MY')})`
    return ''
  }

  const postQRReason = (prog: Programme): string => {
    if (prog.status !== 'Approved') return 'Programme is not approved'
    if (prog.end_date < todayStr) return 'Programme has already ended'
    if (prog.end_date > todayStr) return `Only available on end date (${new Date(prog.end_date + 'T00:00:00').toLocaleDateString('en-MY')})`
    return ''
  }

  // --- UI Renders ---
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070e1a', fontFamily: "'Inter', sans-serif", color: '#e2e8f0', padding: isMobile ? '16px' : '32px 36px', paddingBottom: '80px' }}>
      
      {/* Header & Global Scan Button */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <QrCode size={22} color="#818cf8" />
            Programme Attendance
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {sysRole === 'student' ? 'Track your participation and scan QR codes.' : 'Manage programme attendance and generate QR codes.'}
          </p>
        </div>

        {sysRole === 'student' && (
          <button 
            onClick={() => setShowScanner(true)}
            style={{ width: isMobile ? '100%' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)' }}
          >
            <Maximize size={16} /> Scan Attendance QR
          </button>
        )}
      </div>

      {/* Tabs & Search */}
      <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px' }}>
            {(['ongoing', 'expired'] as const).map(tab => (
              <button 
                key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === tab ? '#1e293b' : 'transparent', color: activeTab === tab ? '#f1f5f9' : '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', flex: isMobile ? 1 : '0 1 300px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" placeholder="Search programmes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 34px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>

        </div>
      </div>

      {/* Programme Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filteredProgrammes.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#475569' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px', color: '#334155' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>No {activeTab} programmes found.</p>
          </div>
        ) : (
          filteredProgrammes.map(prog => {
            const progAttendance = attendance.filter(
  a => String(a.programme_id) === String(prog.id)
)
            const isAttended = getAttendanceStatus(prog.id)
            return (
              <div 
  key={prog.id}

                style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', cursor: 'default', transition: 'border-color 0.2s, background 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = '#0c1526' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.4, flex: 1, paddingRight: '10px' }}>{prog.name}</h3>
                  
                  {/* Status Badge - Only for students */}
                  {sysRole === 'student' && (
                    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: isAttended ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isAttended ? '#10b981' : '#ef4444' }}>
                      {isAttended ? <><CheckCircle size={12} />Completed</> : <><XCircle size={12} />Pending</>}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                    <Calendar size={12} /> {new Date(prog.start_date).toLocaleDateString('en-MY')} - {new Date(prog.end_date).toLocaleDateString('en-MY')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                    <MapPin size={12} /> {prog.venue || 'N/A'}
                  </div>
                  <div style={{
  marginTop: '6px',
  fontSize: '12px',
  color: '#9ca3af'
}}>
  Participants: {progAttendance.length}
</div>
                  <button
  onClick={() => setSelectedProg(prog)}
  style={{
    marginTop: '10px',
    padding: '8px 12px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  }}
>
  View Details
</button>
                  </div>
                </div>
              
            )
          })
        )}
      </div>



      {/* Programme Details Modal */}
      {selectedProg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '16px' }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedProg(null) }}>
          <div style={{ background: '#0f1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>{selectedProg.name}</h2>
              <button onClick={() => setSelectedProg(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            {/* Role indicator for students */}
            {sysRole === 'student' && (
              <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '8px 12px', borderRadius: '8px', marginBottom: '16px', display: 'inline-block' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>Your Role: {myRoleInProg(selectedProg.id)}</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>{selectedProg.description}</p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {canGenerateQR(selectedProg.id) && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* Start QR */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      onClick={() => canGeneratePreQR(selectedProg) && setQrModal({ progId: selectedProg.id, type: 'pre', name: selectedProg.name })}
                      disabled={!canGeneratePreQR(selectedProg)}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '8px',
                        border: `1px solid ${canGeneratePreQR(selectedProg) ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
                        background: canGeneratePreQR(selectedProg) ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.05)',
                        color: canGeneratePreQR(selectedProg) ? '#10b981' : '#475569',
                        fontSize: '13px', fontWeight: 600,
                        cursor: canGeneratePreQR(selectedProg) ? 'pointer' : 'not-allowed',
                        opacity: canGeneratePreQR(selectedProg) ? 1 : 0.65,
                      }}
                    >
                      Generate Start QR
                    </button>
                    {preQRReason(selectedProg) && (
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748b', textAlign: 'center', lineHeight: 1.4 }}>
                        {preQRReason(selectedProg)}
                      </p>
                    )}
                  </div>

                  {/* End QR */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      onClick={() => canGeneratePostQR(selectedProg) && setQrModal({ progId: selectedProg.id, type: 'post', name: selectedProg.name })}
                      disabled={!canGeneratePostQR(selectedProg)}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '8px',
                        border: `1px solid ${canGeneratePostQR(selectedProg) ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.2)'}`,
                        background: canGeneratePostQR(selectedProg) ? 'rgba(245,158,11,0.1)' : 'rgba(100,116,139,0.05)',
                        color: canGeneratePostQR(selectedProg) ? '#f59e0b' : '#475569',
                        fontSize: '13px', fontWeight: 600,
                        cursor: canGeneratePostQR(selectedProg) ? 'pointer' : 'not-allowed',
                        opacity: canGeneratePostQR(selectedProg) ? 1 : 0.65,
                      }}
                    >
                      Generate End QR
                    </button>
                    {postQRReason(selectedProg) && (
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748b', textAlign: 'center', lineHeight: 1.4 }}>
                        {postQRReason(selectedProg)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate QR Display Modal */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '340px', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setQrModal(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}><X size={18} color="#475569" /></button>
            
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '18px', fontWeight: 700 }}>{qrModal.type === 'pre' ? 'Start Attendance' : 'End Attendance'}</h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '12px', lineHeight: 1.4 }}>{qrModal.name}</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <QRCodeCanvas 
                value={JSON.stringify({ spms_qr: true, progId: qrModal.progId, type: qrModal.type })} 
                size={220} 
                level="H"
                includeMargin={true}
              />
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '11px' }}>Ask participants to scan this QR to access the {qrModal.type === 'pre' ? 'Pre-Survey' : 'Post-Survey'}.</p>
          </div>
        </div>
      )}

      {/* QR Scanner Modal (Student Only) */}
      {showScanner && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', zIndex: 60 }}>
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <p style={{ margin: 0, color: 'white', fontWeight: 600 }}>Scan QR Code</p>
            <button onClick={() => setShowScanner(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '8px', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '500px' }}>
              <Scanner 
                onScan={(result) => {
  if (result && result.length > 0) {
    handleScan(result[0].rawValue)
  }
}}
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
