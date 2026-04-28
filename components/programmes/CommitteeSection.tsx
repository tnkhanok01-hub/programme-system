'use client'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock,
  Calendar, MapPin, DollarSign, BookOpen, RefreshCw,
  Upload, FileText, Download, Eye, X, Trash2,
  Users, UserPlus, UserX, Hash,
} from 'lucide-react'
import {
  getCommittee,
  joinCommittee,
  removeCommitteeMember,
} from '@/services/committeeService'
import { COMMITTEE_ROLES } from '@/lib/constants'

/* ─── CommitteeSection ──────────────────────────────────────────────────── */
export default function CommitteeSection({
  programmeId,
  canManage,
  token,
  currentUserId,
  programmeStatus,
}: {
  programmeId: string
  canManage: boolean
  token: string
  currentUserId: string
  programmeStatus: string
}) {
  const [members, setMembers] = useState<CommitteeMember[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joinRole, setJoinRole] = useState('Member')
  const [joinError, setJoinError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  const isApproved = programmeStatus === 'Approved'
  const isMember = members.some((m) => m.user_id === currentUserId)

  const approved = members.filter(m => m.status === 'approved')
  const pending = members.filter(m => m.status === 'pending')

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await getCommittee(programmeId, token)
        setMembers(data.members ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [programmeId, token])

  const handleJoin = async () => {
    setJoinError('')
    setJoining(true)

    try {
      const data = await joinCommittee(programmeId, token, joinRole)
      setMembers((prev) => [...prev, data.member])
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join.')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    const mine = members.find((m) => m.user_id === currentUserId)
    if (!mine || !confirm('Leave this committee?')) return

    setRemovingId(mine.id)

    try {
      await removeCommitteeMember(programmeId, token, mine.id)
      setMembers((prev) => prev.filter((m) => m.id !== mine.id))
    } catch (err) {
      alert('Failed to leave')
    } finally {
      setRemovingId(null)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this committee member?')) return

    setRemovingId(memberId)

    try {
      await removeCommitteeMember(programmeId, token, memberId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      alert('Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }

  const handleApprove = async (memberId: string) => {
    try {
      const res = await fetch(`/api/programmes/${programmeId}/committee`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          programme_id: programmeId,
          member_id: memberId,
          action: 'approve',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Approve failed')

      // refresh list
      const updated = await getCommittee(programmeId, token)
      setMembers(updated.members ?? [])
    } catch (err: any) {
      alert(err.message || 'Approve failed')
    }
  }

  const handleReject = async (memberId: string) => {
    try {
      const res = await fetch(`/api/programmes/${programmeId}/committee`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          programme_id: programmeId,
          member_id: memberId,
          action: 'reject',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reject failed')

      const updated = await getCommittee(programmeId, token)
      setMembers(updated.members ?? [])
    } catch (err: any) {
      alert(err.message || 'Reject failed')
    }
  }

  const getInitials = (name: string) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  const roleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'secretary':
        return { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' }
      case 'treasurer':
        return { bg: 'rgba(52,211,153,0.12)', color: '#34d399' }
      case 'logistics':
        return { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' }
      case 'publicity':
        return { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' }
      case 'welfare':
        return { bg: 'rgba(251,113,133,0.12)', color: '#fb7185' }
      default:
        return { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' }
    }
  }

  return (
    <div
      style={{
        background: '#0c1526',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        overflow: 'hidden',
        marginBottom: '24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'rgba(99,102,241,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={15} color="#818cf8" />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: '#f1f5f9',
              }}
            >
              Committee Members
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '11px',
                color: '#475569',
              }}
            >
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {isApproved && !canManage &&
          (isMember ? (
            <button
              onClick={handleLeave}
              disabled={!!removingId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '7px',
                padding: '6px 12px',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 500,
                cursor: removingId ? 'not-allowed' : 'pointer',
                opacity: removingId ? 0.6 : 1,
              }}
            >
              <UserX size={13} />
              Leave
            </button>
          ) : (
            <button
              onClick={() => {
                setJoinError('')
                document
                  .getElementById('join-panel-' + programmeId)
                  ?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                  })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '7px',
                padding: '6px 12px',
                color: '#818cf8',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <UserPlus size={13} />
              Join Programme
            </button>
          ))}
      </div>

      {/* Join panel — for non-members on approved programmes */}
      {isApproved && !canManage && !isMember && (
        <div id={'join-panel-' + programmeId} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.04)' }}>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#818cf8', fontWeight: 500 }}>Select your role and join this committee:</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Your Role</label>
              <select value={joinRole} onChange={e => setJoinRole(e.target.value)}
                style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: '#0a1628', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}>
                {COMMITTEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button onClick={handleJoin} disabled={joining}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '7px', border: 'none', background: joining ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: joining ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {joining ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />Joining...</> : <><UserPlus size={13} />Confirm Join</>}
            </button>
          </div>
          {joinError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px' }}>
              <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>{joinError}</p>
            </div>
          )}
        </div>
      )}

      {/* Not approved notice */}
      {!isApproved && !canManage && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(245,158,11,0.04)' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={13} />Committee sign-up opens once the programme is approved.
          </p>
        </div>
      )}

      {/* Members list */}
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? (
          <p style={{ margin: 0, fontSize: '13px', color: '#475569', textAlign: 'center', padding: '16px' }}>Loading...</p>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px', color: '#374151' }}>
            <Users size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '13px' }}>No committee members yet.</p>
          </div>
        ) : canManage ? (
          <>
            {/* ── Programme Director view ── */}
            {approved.length > 0 && (
              <>
                <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Approved</p>
                {approved.map((m) => {
                  const rc = roleColor(m.role)
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {getInitials(m.users?.full_name ?? '')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.users?.full_name ?? '—'}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#475569' }}>{m.users?.matric_number ?? '—'}</p>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 500, background: rc.bg, color: rc.color, padding: '3px 9px', borderRadius: '5px', flexShrink: 0 }}>{m.role}</span>
                      <button onClick={() => handleRemove(m.id)} disabled={removingId === m.id}
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px', padding: '5px 7px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: removingId === m.id ? 0.5 : 1 }}>
                        <UserX size={13} />
                      </button>
                    </div>
                  )
                })}
              </>
            )}

            {pending.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
                <p style={{ margin: '4px 0', fontSize: '11px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Approval</p>
                {pending.map((m) => {
                  const rc = roleColor(m.role)
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #92400e, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {getInitials(m.users?.full_name ?? '')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.users?.full_name ?? '—'}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#475569' }}>{m.users?.matric_number ?? '—'}</p>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 500, background: rc.bg, color: rc.color, padding: '3px 9px', borderRadius: '5px', flexShrink: 0 }}>{m.role}</span>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => handleApprove(m.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '7px', padding: '5px 10px', color: '#34d399', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <CheckCircle size={12} />Approve
                        </button>
                        <button onClick={() => handleReject(m.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', padding: '5px 10px', color: '#f87171', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <XCircle size={12} />Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        ) : (
          <>
            {/* ── Student view ── */}

            {/* Pending notice for the current user */}
            {(() => {
              const mine = members.find((m) => m.user_id === currentUserId)
              if (!mine || mine.status !== 'pending') return null
              return (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px', marginBottom: '4px' }}>
                  <Clock size={14} color="#fbbf24" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fbbf24' }}>Your request is pending approval</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#92400e' }}>
                      You applied as <strong style={{ color: '#fbbf24' }}>{mine.role}</strong>. The Programme Director will review your request.
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Only show approved members to students */}
            {approved.map((m) => {
              const rc = roleColor(m.role)
              const isMe = m.user_id === currentUserId
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: isMe ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isMe ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {getInitials(m.users?.full_name ?? '')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.users?.full_name ?? '—'}{isMe && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#818cf8', fontWeight: 400 }}>(you)</span>}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#475569' }}>{m.users?.matric_number ?? '—'}</p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 500, background: rc.bg, color: rc.color, padding: '3px 9px', borderRadius: '5px', flexShrink: 0 }}>{m.role}</span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}