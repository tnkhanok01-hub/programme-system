'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import {
  ArrowLeft, CalendarPlus, CirclePlus, Loader2,
  BookOpen, MapPin, DollarSign, Calendar, AlignLeft, Tag,
  CheckCircle, XCircle, Upload, X, FileText,
} from 'lucide-react'
import { PRE_CHECKLIST } from '../../lib/constants'

export default function CreateProgrammePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [budgetError, setBudgetError] = useState('')
  const [budgetCents, setBudgetCents] = useState(0)
  const [dateError, setDateError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [preFiles, setPreFiles] = useState<Record<string, File | null>>({ paperwork: null, oshe: null, poster: null })
  const [uploadStep, setUploadStep] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    start_date: '',
    end_date: '',
    budget: '',
    venue: '',
  })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setLoading(false)
    }
    checkSession()
  }, [])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) router.replace('/login')
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const validateDates = (start: string, end: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (start) {
      const startD = new Date(start)
      if (startD < today) { setDateError('Start date cannot be in the past.'); return }
    }
    if (start && end) {
      const startD = new Date(start)
      const endD = new Date(end)
      if (endD < startD) { setDateError('End date cannot be before the start date.'); return }
    }
    setDateError('')
  }

  const centsToDisplay = (cents: number) => {
    const ringgit = Math.floor(cents / 100)
    const sen = cents % 100
    return `${ringgit.toLocaleString('en-MY')}.${sen.toString().padStart(2, '0')}`
  }

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const next = budgetCents * 10 + Number(e.key)
      setBudgetCents(next)
      set('budget', (next / 100).toFixed(2))
      if (next > 499999) { setBudgetError('Budget must be below RM 5,000.00'); return }
      setBudgetError('')
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const next = Math.floor(budgetCents / 10)
      setBudgetCents(next)
      set('budget', (next / 100).toFixed(2))
      setBudgetError('')
    } else if (e.key === 'Delete') {
      e.preventDefault()
      setBudgetCents(0)
      set('budget', '0.00')
      setBudgetError('')
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
    }
  }

  const handleBudgetBlur = () => {
    if (budgetCents <= 0) { setBudgetError('Budget must be more than RM 0.00'); return }
    if (budgetCents > 499999) { setBudgetError('Budget must be below RM 5,000.00'); return }
    setBudgetError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (budgetError || dateError) return
    if (budgetCents <= 0) { setBudgetError('Budget must be more than RM 0.00'); return }
    if (budgetCents > 499999) { setBudgetError('Budget must be below RM 5,000.00'); return }
    if (PRE_CHECKLIST.some(item => !preFiles[item.key])) return

    setSubmitting(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const res = await fetch('/api/programmes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ...form, budget: parseFloat(form.budget) }),
    })

    const result = await res.json()
    if (!res.ok) {
      alert(result.error ?? 'Failed to create programme.')
      setSubmitting(false)
      return
    }

    const programmeId = result.programme.id

    for (const item of PRE_CHECKLIST) {
      const file = preFiles[item.key]
      if (!file) continue
      setUploadStep(`Uploading ${item.label}...`)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('programme_id', programmeId)
      fd.append('phase', 'pre')
      fd.append('doc_type', item.key)
      try {
        await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: fd,
        })
      } catch (_) {}
    }

    setSubmitting(false)
    setUploadStep('')
    router.push('/student')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 13px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
    transition: 'border-color 0.15s',
    WebkitAppearance: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '7px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus, select:focus, textarea:focus { border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        input::placeholder, textarea::placeholder { color: #374151; }
        select option { background: #0c1526; color: #e2e8f0; }
        /* iOS zoom prevention */
        @media (max-width: 640px) {
          input, select, textarea { font-size: 16px !important; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#070e1a',
        fontFamily: "'Inter', sans-serif",
        color: '#e2e8f0',
        // On mobile: no side padding, full bleed; form card fills width
        padding: isMobile ? '0' : '32px 20px',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* ── TOP BAR (mobile gets a native-feeling header) ── */}
          {isMobile ? (
            <div style={{
              background: '#0a1628',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              position: 'sticky',
              top: 0,
              zIndex: 20,
            }}>
              <button
                onClick={() => router.back()}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <ArrowLeft size={20} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarPlus size={14} color="white" />
                </div>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                  Create Programme
                </h1>
              </div>
            </div>
          ) : (
            /* Desktop header */
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarPlus size={18} color="white" />
                </div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                  Create Programme
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', paddingLeft: '46px' }}>
                Fill in the details below to submit a new programme for review.
              </p>
            </div>
          )}

          {/* ── FORM ── */}
          <form onSubmit={handleSubmit}>
            <div style={{
              background: isMobile ? 'transparent' : '#0c1526',
              border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: isMobile ? 0 : '16px',
              padding: isMobile ? '16px' : '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '18px' : '20px',
            }}>

              {/* Programme Name */}
              <div>
                <label style={labelStyle}><BookOpen size={11} />Programme Name</label>
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Badminton Competition 2025"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}><AlignLeft size={11} />Description</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, minHeight: isMobile ? '80px' : '90px' }}
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Brief description about the programme"
                  rows={3}
                />
              </div>

              {/* Category */}
              <div>
                <label style={labelStyle}><Tag size={11} />Category</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  required
                >
                  <option value="" disabled>Select a category</option>
                  {['Academic', 'Sports', 'Community Service', 'Others'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Dates — stacked on mobile, side-by-side on desktop */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '14px' : '14px' }}>
                <div>
                  <label style={labelStyle}><Calendar size={11} />Start Date</label>
                  <input
                    type="date"
                    style={{ ...inputStyle, colorScheme: 'dark', borderColor: dateError ? 'rgba(239,68,68,0.5)' : undefined }}
                    value={form.start_date}
                    onChange={e => { set('start_date', e.target.value); validateDates(e.target.value, form.end_date) }}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}><Calendar size={11} />End Date</label>
                  <input
                    type="date"
                    style={{ ...inputStyle, colorScheme: 'dark', borderColor: dateError ? 'rgba(239,68,68,0.5)' : undefined }}
                    value={form.end_date}
                    onChange={e => { set('end_date', e.target.value); validateDates(form.start_date, e.target.value) }}
                    required
                  />
                </div>
              </div>

              {/* Date error */}
              {dateError && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '11px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p style={{ margin: 0, fontSize: '13px', color: '#ef4444', lineHeight: 1.4 }}>{dateError}</p>
                </div>
              )}

              {/* Budget + Venue — stacked on mobile */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '14px' : '14px' }}>
                <div>
                  <label style={labelStyle}><DollarSign size={11} />Budget (RM)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    style={{ ...inputStyle, borderColor: budgetError ? 'rgba(239,68,68,0.5)' : undefined, textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}
                    value={centsToDisplay(budgetCents)}
                    onChange={() => {}}
                    onKeyDown={handleBudgetKeyDown}
                    onBlur={handleBudgetBlur}
                  />
                  {budgetError && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444', lineHeight: 1.4 }}>{budgetError}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}><MapPin size={11} />Venue</label>
                  <input
                    style={inputStyle}
                    value={form.venue}
                    onChange={e => set('venue', e.target.value)}
                    placeholder="e.g. Foyer Block A, KSJ"
                    required
                  />
                </div>
              </div>

            </div>

            {/* ── PRE-PROGRAMME CHECKLIST ── */}
            {isMobile && <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0' }} />}
            <div style={{
              background: isMobile ? 'transparent' : '#0c1526',
              border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: isMobile ? 0 : '16px',
              padding: isMobile ? '16px' : '28px',
              marginTop: isMobile ? '0' : '16px',
            }}>
              {(() => {
                const preDoneCount = PRE_CHECKLIST.filter(item => !!preFiles[item.key]).length
                const preAllDone = preDoneCount === PRE_CHECKLIST.length
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '14px' : '18px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={13} color="#60a5fa" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>Pre-Programme Checklist</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4b5563' }}>Upload all required documents before submitting your proposal</p>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: preAllDone ? '#10b981' : '#60a5fa', background: preAllDone ? 'rgba(16,185,129,0.1)' : 'rgba(96,165,250,0.1)', padding: '3px 9px', borderRadius: '5px', flexShrink: 0 }}>
                        {preDoneCount}/{PRE_CHECKLIST.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {PRE_CHECKLIST.map(item => {
                        const file = preFiles[item.key]
                        const done = !!file
                        return (
                          <div key={item.key} style={{ border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', padding: '12px 14px', background: done ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ flexShrink: 0 }}>
                                {done ? (
                                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle size={14} color="#10b981" />
                                  </div>
                                ) : (
                                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <XCircle size={13} color="#ef4444" />
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: done ? '#f1f5f9' : '#94a3b8' }}>{item.label}</p>
                                {done ? (
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                                ) : (
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#475569' }}>{item.hint}</p>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                {done && (
                                  <button type="button" onClick={() => setPreFiles(prev => ({ ...prev, [item.key]: null }))}
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                    <X size={12} />
                                  </button>
                                )}
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '7px', cursor: 'pointer', border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : 'rgba(96,165,250,0.35)'}`, background: done ? 'rgba(16,185,129,0.1)' : 'rgba(96,165,250,0.1)', color: done ? '#10b981' : '#60a5fa', fontSize: '12px', fontWeight: 500 }}>
                                  <Upload size={12} />
                                  {done ? 'Replace' : 'Upload'}
                                  <input type="file" style={{ display: 'none' }} onChange={e => {
                                    const f = e.target.files?.[0]
                                    if (f) setPreFiles(prev => ({ ...prev, [item.key]: f }))
                                    e.target.value = ''
                                  }} />
                                </label>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </div>

            {/* ── ACTION BUTTONS ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginTop: isMobile ? '0' : '20px',
              padding: isMobile ? '14px 16px' : '0',
              // Mobile: sticky footer bar
              ...(isMobile ? {
                position: 'sticky',
                bottom: 0,
                background: '#070e1a',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              } : {}),
            }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  flex: isMobile ? 1 : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: isMobile ? '13px' : '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#6b7280',
                  fontSize: isMobile ? '14px' : '13px',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                }}
              >
                <ArrowLeft size={14} />Cancel
              </button>

              {(() => {
                const preAllDone = PRE_CHECKLIST.every(item => !!preFiles[item.key])
                const isDisabled = submitting || !!budgetError || !!dateError || !preAllDone
                return (
                  <button
                    type="submit"
                    disabled={isDisabled}
                    style={{
                      flex: isMobile ? 2 : undefined,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      padding: isMobile ? '13px' : '10px 22px',
                      borderRadius: '10px', border: 'none',
                      background: isDisabled ? 'rgba(99,102,241,0.35)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      color: 'white',
                      fontSize: isMobile ? '14px' : '13px',
                      fontWeight: 600,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', transition: 'opacity 0.15s',
                    }}
                  >
                    {submitting
                      ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />{uploadStep || 'Creating...'}</>
                      : <><CirclePlus size={15} />Submit Proposal</>}
                  </button>
                )
              })()}
            </div>
          </form>

        </div>
      </div>
    </>
  )
}