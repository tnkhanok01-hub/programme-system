'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import {
  ArrowLeft, CalendarPlus, CirclePlus, Loader2,
  BookOpen, MapPin, DollarSign, Calendar, AlignLeft, Tag,
} from 'lucide-react'

export default function CreateProgrammePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [budgetError, setBudgetError] = useState('')
  const [dateError, setDateError] = useState('')
  const [isMobile, setIsMobile] = useState(false)

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

  const handleBudgetChange = (value: string) => {
    if (!/^\d*\.?\d*$/.test(value)) return
    set('budget', value)
    if (!value) { setBudgetError(''); return }
    const num = Number(value)
    if (!/^\d+(\.\d{2})$/.test(value)) { setBudgetError('Must be exactly 2 decimal places (e.g. 2000.00)'); return }
    if (num >= 5000) { setBudgetError('Budget must be below RM 5,000.00'); return }
    if (num <= 0) { setBudgetError('Budget must be more than RM 0.00'); return }
    setBudgetError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (budgetError || dateError) return
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

    setSubmitting(false)
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
              <button
                onClick={() => router.back()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}
              >
                <ArrowLeft size={14} />Back
              </button>
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
                    inputMode="decimal"
                    style={{ ...inputStyle, borderColor: budgetError ? 'rgba(239,68,68,0.5)' : undefined }}
                    value={form.budget}
                    onChange={e => handleBudgetChange(e.target.value)}
                    onBlur={() => {
                      if (form.budget && !isNaN(Number(form.budget))) {
                        const fixed = Number(form.budget).toFixed(2)
                        set('budget', fixed)
                        handleBudgetChange(fixed)
                      }
                    }}
                    placeholder="e.g. 2000.00"
                    required
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

              <button
                type="submit"
                disabled={submitting || !!budgetError || !!dateError}
                style={{
                  flex: isMobile ? 2 : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: isMobile ? '13px' : '10px 22px',
                  borderRadius: '10px', border: 'none',
                  background: submitting || budgetError || dateError
                    ? 'rgba(99,102,241,0.35)'
                    : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: 'white',
                  fontSize: isMobile ? '14px' : '13px',
                  fontWeight: 600,
                  cursor: submitting || budgetError || dateError ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                }}
              >
                {submitting
                  ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Creating...</>
                  : <><CirclePlus size={15} />Create Programme</>}
              </button>
            </div>
          </form>

        </div>
      </div>
    </>
  )
}