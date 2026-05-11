'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Users, BarChart2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

interface SurveyRow {
  id: string
  type: 'pre' | 'post'
  answers: Record<string, string>
  created_at: string
  user_id: string
  users?: { full_name: string; matric_number: string }
}

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>{value} <span style={{ color: '#475569', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function AvgBadge({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '10px', padding: '12px 16px', textAlign: 'center', flex: 1 }}>
      <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#818cf8' }}>
        {value !== null ? value.toFixed(1) : '—'}
        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 400 }}> / 5</span>
      </p>
    </div>
  )
}

function ResponseCard({ row, index }: { row: SurveyRow; index: number }) {
  const [open, setOpen] = useState(false)
  const a = row.answers
  const name = (row.users as any)?.full_name || 'Unknown'
  const matric = (row.users as any)?.matric_number || ''

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', fontFamily: 'inherit' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(99,102,241,0.15)', fontSize: '11px', fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>{index + 1}</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{name}</p>
            {matric && <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>{matric}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {a.familiarity && (
            <span style={{ fontSize: '11px', color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '5px' }}>
              ★ {a.familiarity.charAt(0)}
            </span>
          )}
          {open ? <ChevronUp size={14} color="#475569" /> : <ChevronDown size={14} color="#475569" />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {Object.entries(a).map(([key, val]) => val ? (
            <div key={key}>
              <p style={{ margin: '0 0 3px', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {key.replace(/_/g, ' ')}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>{val}</p>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  )
}

export default function SurveyReportTab({ programmeId }: { programmeId: string }) {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pre' | 'post'>('pre')
  const [preSurveys, setPreSurveys] = useState<SurveyRow[]>([])
  const [postSurveys, setPostSurveys] = useState<SurveyRow[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('surveys')
        .select('id, type, answers, created_at, user_id, users(full_name, matric_number)')
        .eq('programme_id', programmeId)
        .eq('completed', true)
        .order('created_at', { ascending: true })

      const rows = (data ?? []) as SurveyRow[]
      setPreSurveys(rows.filter(r => r.type === 'pre'))
      setPostSurveys(rows.filter(r => r.type === 'post'))
      setLoading(false)
    }
    load()
  }, [programmeId])

  const rows = tab === 'pre' ? preSurveys : postSurveys
  const total = rows.length

  // --- Stats ---
  const avgFamiliarity = (surveys: SurveyRow[]) => {
    const vals = surveys.map(r => parseInt(r.answers?.familiarity ?? '')).filter(n => !isNaN(n))
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  const countBy = (surveys: SurveyRow[], key: string) => {
    const map: Record<string, number> = {}
    surveys.forEach(r => {
      const v = r.answers?.[key]
      if (v) map[v] = (map[v] || 0) + 1
    })
    return map
  }

  const sourceCounts   = countBy(preSurveys, 'source')
  const expCounts      = countBy(postSurveys, 'experience')
  const participCounts = countBy(postSurveys, 'participation')

  const expColors: Record<string, string> = {
    Excellent: '#10b981', Good: '#60a5fa', Average: '#f59e0b', Poor: '#ef4444'
  }
  const sourceColors = ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa']

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {(['pre', 'post'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 18px', borderRadius: '7px', border: 'none', fontFamily: 'inherit',
            background: tab === t ? (t === 'pre' ? 'rgba(96,165,250,0.15)' : 'rgba(167,139,250,0.15)') : 'transparent',
            color: tab === t ? (t === 'pre' ? '#60a5fa' : '#a78bfa') : '#6b7280',
            fontSize: '13px', fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
          }}>
            {t === 'pre' ? 'Pre-Survey' : 'Post-Survey'}
            <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.7 }}>
              ({t === 'pre' ? preSurveys.length : postSurveys.length})
            </span>
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
          <MessageSquare size={28} style={{ margin: '0 auto 10px', color: '#334155' }} />
          <p style={{ margin: 0, fontSize: '14px' }}>No {tab}-survey responses yet.</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 size={12} />Summary — {total} response{total !== 1 ? 's' : ''}
            </p>

            {/* Familiarity averages */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {tab === 'pre' && <AvgBadge label="Avg Familiarity (Before)" value={avgFamiliarity(preSurveys)} />}
              {tab === 'post' && (
                <>
                  <AvgBadge label="Avg Familiarity (After)" value={avgFamiliarity(postSurveys)} />
                  {preSurveys.length > 0 && <AvgBadge label="Avg Familiarity (Before)" value={avgFamiliarity(preSurveys)} />}
                </>
              )}
            </div>

            {/* Source breakdown (pre only) */}
            {tab === 'pre' && Object.keys(sourceCounts).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>How they heard about it</p>
                {Object.entries(sourceCounts).map(([src, count], i) => (
                  <StatBar key={src} label={src} value={count} total={total} color={sourceColors[i % sourceColors.length]} />
                ))}
              </div>
            )}

            {/* Experience breakdown (post only) */}
            {tab === 'post' && Object.keys(expCounts).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Overall Experience</p>
                {['Excellent', 'Good', 'Average', 'Poor'].map(exp => (expCounts[exp] != null &&
                  <StatBar key={exp} label={exp} value={expCounts[exp]} total={total} color={expColors[exp]} />
                ))}
              </div>
            )}

            {/* Participation breakdown (post only) */}
            {tab === 'post' && Object.keys(participCounts).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Active Participation</p>
                {Object.entries(participCounts).map(([val, count]) => (
                  <StatBar key={val} label={val} value={count} total={total} color={val === 'Yes' ? '#10b981' : '#ef4444'} />
                ))}
              </div>
            )}
          </div>

          {/* Individual responses */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={12} />Individual Responses
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rows.map((row, i) => <ResponseCard key={row.id} row={row} index={i} />)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}