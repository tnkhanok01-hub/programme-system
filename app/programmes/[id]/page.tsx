'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock,
  Calendar, MapPin, DollarSign, BookOpen, Save, RefreshCw,
} from 'lucide-react'

interface Programme {
  id: string; name: string; description: string; category: string
  venue: string; budget: number; start_date: string; end_date: string
  status: string; created_at: string; rejection_reason: string | null
  programme_director_id: string
}

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  Pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: AlertCircle },
  Approved: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', icon: CheckCircle },
  Rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: XCircle },
}

export default function ProgrammeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [programme, setProgramme] = useState<Programme | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pre' | 'during' | 'post'>('pre');
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isOwner, setIsOwner] = useState(false)

  // Editable fields for resubmission
  const [form, setForm] = useState({ name: '', category: '', venue: '', budget: '', start_date: '', end_date: '', description: '' })

  useEffect(() => {
    if (!id) return  // wait until params are resolved
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const token = session.access_token
      const res = await fetch(`/api/programmes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        setError('Programme not found or you do not have access.')
        setLoading(false)
        return
      }

      const data = await res.json()
      const prog: Programme = data.programme
      setProgramme(prog)
      setIsOwner(!!data.isDirector)
      setForm({
        name: prog.name ?? '',
        category: prog.category ?? '',
        venue: prog.venue ?? '',
        budget: prog.budget != null ? String(prog.budget) : '',
        start_date: prog.start_date ? prog.start_date.slice(0, 10) : '',
        end_date: prog.end_date ? prog.end_date.slice(0, 10) : '',
        description: prog.description ?? '',
      })
      setLoading(false)
    }
    init()
  }, [id])

  const handleResubmit = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      alert('Name, start date, and end date are required.')
      return
    }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const res = await fetch(`/api/programmes/${id}/resubmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...form, budget: form.budget ? parseFloat(form.budget) : null }),
    })

    if (res.ok) {
      const data = await res.json()
      setProgramme(data.programme)
      alert('Programme resubmitted successfully. Status reset to Pending.')
    } else {
      const data = await res.json()
      alert(data.error ?? 'Failed to resubmit.')
    }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#475569', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>Loading programme...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error || !programme) return (
    <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#f87171', fontSize: '14px', fontFamily: "'DM Sans', sans-serif" }}>{error || 'Programme not found.'}</p>
      <button onClick={() => router.back()} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ArrowLeft size={14} />Go back
      </button>
    </div>
  )

  const sc = statusConfig[programme.status] ?? statusConfig['Pending']
  const StatusIcon = sc.icon
  const isRejected = programme.status === 'Rejected'
  const canResubmit = isRejected && isOwner

  return (
    <div style={{ minHeight: '100vh', background: '#070e1a', fontFamily: "'DM Sans', sans-serif", color: '#e2e8f0', padding: '32px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Back */}
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', marginBottom: '24px', padding: 0 }}>
          <ArrowLeft size={14} />Back to Programmes
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{programme.name}</h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#4b5563' }}>
              Submitted {new Date(programme.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}>
            <StatusIcon size={13} />{programme.status}
          </span>
        </div>

        {/* Rejection banner */}
        {isRejected && programme.rejection_reason && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={13} />Rejection Comment
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#fca5a5', lineHeight: 1.7 }}>{programme.rejection_reason}</p>
          </div>
        )}

        {/* Details card */}
        <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Programme Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { label: 'Category', value: programme.category || '—', icon: BookOpen },
              { label: 'Venue', value: programme.venue || '—', icon: MapPin },
              { label: 'Start Date', value: programme.start_date ? new Date(programme.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '—', icon: Calendar },
              { label: 'End Date', value: programme.end_date ? new Date(programme.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '—', icon: Calendar },
              { label: 'Budget', value: programme.budget != null ? `RM ${Number(programme.budget).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—', icon: DollarSign },
            ].map(f => {
              const Icon = f.icon
              return (
                <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} color="#818cf8" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '10px', color: '#4b5563', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#e2e8f0' }}>{f.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
          {programme.description && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#4b5563', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.7 }}>{programme.description}</p>
            </div>
          )}
        </div>

        {/* Programme Lifecycle Section */}
        <div style={{ marginBottom: '20px' }}>

          {/* Tab Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            {['pre', 'during', 'post'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: activeTab === tab ? '#6366f1' : 'transparent',
                  color: activeTab === tab ? 'white' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* ================= PRE PHASE ================= */}
          {/* This section is shown when 'Pre' tab is selected */}
          {activeTab === 'pre' && (
            <div>
              <h3>Pre Phase</h3>
              <div style={{
                border: '1px dashed rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <p style={{ marginBottom: '10px', fontSize: '13px', color: '#94a3b8' }}>
                  📄 Upload paperwork & poster
                </p>

                <label style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: '0.2s'
                }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#4f46e5')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#6366f1')}
                >
                  Upload File
                  <input type="file" style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {/* ================= DURING PHASE ================= */}
          {/* This section is shown when 'During' tab is selected */}
          {activeTab === 'during' && (
            <div>
              <h3>During Phase</h3>
              <div style={{
                border: '1px dashed rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <p style={{ marginBottom: '10px', fontSize: '13px', color: '#94a3b8' }}>
                  📄 Upload paperwork & poster
                </p>

                <label style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: '0.2s'
                }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#4f46e5')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#6366f1')}
                >
                  Upload File
                  <input type="file" style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {/* ================= POST PHASE ================= */}
          {/* This section is shown when 'Post' tab is selected */}
          {activeTab === 'post' && (
            <div>
              <h3>Post Phase</h3>
              <div style={{
                border: '1px dashed rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <p style={{ marginBottom: '10px', fontSize: '13px', color: '#94a3b8' }}>
                  📄 Upload paperwork & poster
                </p>

                <label style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: '0.2s'
                }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#4f46e5')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#6366f1')}
                >
                  Upload File
                  <input type="file" style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

        </div>
        {/* Resubmit form — only shown if Rejected and is owner */}
        {canResubmit && (
          <div style={{ background: '#0c1526', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={15} color="#818cf8" />Revise & Resubmit
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#4b5563' }}>
              Address the rejection comment above, update the fields below, then resubmit for review.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { label: 'Programme Name', key: 'name', type: 'text', span: 2 },
                { label: 'Venue', key: 'venue', type: 'text', span: 2 },
                { label: 'Start Date', key: 'start_date', type: 'date', span: 1 },
                { label: 'End Date', key: 'end_date', type: 'date', span: 1 },
                { label: 'Budget (RM)', key: 'budget', type: 'number', span: 1 },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: `span ${f.span}` }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: '#0a1628', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}
                >
                  {['Academic', 'Sports', 'Community Service', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleResubmit}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: '8px', padding: '10px 20px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                <RefreshCw size={14} />{saving ? 'Resubmitting...' : 'Resubmit for Review'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}