'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Users, BarChart2, MessageSquare, ChevronDown, ChevronUp, Download } from 'lucide-react'
import jsPDF from 'jspdf'

interface SurveyRow {
  id: string
  type: 'pre' | 'post'
  answers: Record<string, string>
  created_at: string
  user_id: string
  users?: { full_name: string; matric_number: string }[]
}

interface Props {
  programmeId: string
  programmeName?: string
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
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(99,102,241,0.15)', fontSize: '11px', fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>{index + 1}</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{name}</p>
            {matric && <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>{matric}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {a.familiarity && <span style={{ fontSize: '11px', color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '5px' }}>{a.familiarity.charAt(0)}/5</span>}
          {open ? <ChevronUp size={14} color="#475569" /> : <ChevronDown size={14} color="#475569" />}
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {Object.entries(a).map(([key, val]) => val ? (
            <div key={key}>
              <p style={{ margin: '0 0 3px', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{key.replace(/_/g, ' ')}</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>{val}</p>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  )
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
}

export default function SurveyReportTab({ programmeId, programmeName }: Props) {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pre' | 'post'>('pre')
  const [preSurveys, setPreSurveys] = useState<SurveyRow[]>([])
  const [postSurveys, setPostSurveys] = useState<SurveyRow[]>([])
  const [generatingPdf, setGeneratingPdf] = useState(false)

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

  const avgFamiliarity = (surveys: SurveyRow[]) => {
    const vals = surveys.map(r => parseInt(r.answers?.familiarity ?? '')).filter(n => !isNaN(n))
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  const countBy = (surveys: SurveyRow[], key: string) => {
    const map: Record<string, number> = {}
    surveys.forEach(r => { const v = r.answers?.[key]; if (v) map[v] = (map[v] || 0) + 1 })
    return map
  }

  const sourceCounts   = countBy(preSurveys, 'source')
  const expCounts      = countBy(postSurveys, 'experience')
  const participCounts = countBy(postSurveys, 'participation')
  const expColors: Record<string, string> = { Excellent: '#10b981', Good: '#60a5fa', Average: '#f59e0b', Poor: '#ef4444' }
  const sourceColors = ['#818cf8','#34d399','#f59e0b','#f87171','#a78bfa']

  const generatePDF = () => {
    setGeneratingPdf(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()
      const margin = 20
      const cW = W - margin * 2
      let y = 0

      const newPage = () => { doc.addPage(); doc.setFillColor(7,14,26); doc.rect(0,0,W,H,'F'); y = 20 }
      const checkPage = (need = 10) => { if (y + need > H - 16) newPage() }

      const fillRect = (x: number, ry: number, w: number, h: number, r: number, rgb: [number,number,number]) => {
        doc.setFillColor(...rgb); doc.roundedRect(x, ry, w, h, r, r, 'F')
      }

      const generated = new Date().toLocaleDateString('en-MY', { day:'numeric', month:'long', year:'numeric' })

      // ── Cover ──
      doc.setFillColor(7,14,26); doc.rect(0,0,W,H,'F')
      doc.setFillColor(12,21,38); doc.rect(0,0,W,56,'F')
      doc.setFillColor(99,102,241); doc.rect(0,56,W,2,'F')

      doc.setTextColor(248,250,252); doc.setFontSize(22); doc.setFont('helvetica','bold')
      doc.text('Survey Report', margin, 22)
      doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(148,163,184)
      doc.text(programmeName || 'Programme Survey Analysis', margin, 33)
      doc.setFontSize(8.5); doc.setTextColor(71,85,105)
      doc.text(`Generated on ${generated}`, margin, 43)

      fillRect(W-margin-48, 36, 48, 10, 2, [30,41,59])
      doc.setTextColor(96,165,250); doc.setFontSize(8); doc.setFont('helvetica','bold')
      doc.text(`PRE: ${preSurveys.length}`, W-margin-38, 42.5)
      fillRect(W-margin-48, 48, 48, 10, 2, [30,41,59])
      doc.setTextColor(167,139,250)
      doc.text(`POST: ${postSurveys.length}`, W-margin-38, 54.5)

      y = 72

      // ── Helpers ──
      const secTitle = (t: string) => {
        checkPage(16)
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(100,116,139)
        doc.text(t.toUpperCase(), margin, y)
        doc.setDrawColor(30,41,59); doc.setLineWidth(0.3); doc.line(margin, y+2, W-margin, y+2)
        y += 10
      }

      const statRow = (label: string, val: string, accent: [number,number,number]=[99,102,241]) => {
        checkPage(10)
        fillRect(margin, y-4, cW, 9, 1, [15,26,45])
        doc.setFillColor(...accent); doc.rect(margin, y-4, 2, 9, 'F')
        doc.setTextColor(203,213,225); doc.setFont('helvetica','normal'); doc.setFontSize(9)
        doc.text(label, margin+6, y+1.5)
        doc.setFont('helvetica','bold'); doc.setTextColor(248,250,252)
        doc.text(val, W-margin-2, y+1.5, { align:'right' })
        y += 12
      }

      const bar = (label: string, count: number, total: number, color: string) => {
        checkPage(14)
        const pct = total === 0 ? 0 : Math.round((count/total)*100)
        const rgb = hexToRgb(color)
        doc.setTextColor(148,163,184); doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
        doc.text(label, margin, y)
        doc.setTextColor(203,213,225); doc.setFont('helvetica','bold')
        doc.text(`${count} (${pct}%)`, W-margin, y, { align:'right' })
        fillRect(margin, y+2, cW, 4, 1, [30,41,59])
        if (pct > 0) { doc.setFillColor(...rgb); doc.roundedRect(margin, y+2, cW*pct/100, 4, 1,1,'F') }
        y += 12
      }

      const textBlock = (label: string, val: string) => {
        const lines = doc.splitTextToSize(val || '—', cW-6)
        const bh = lines.length * 4.5 + 7
        checkPage(bh + 10)
        doc.setTextColor(71,85,105); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
        doc.text(label.toUpperCase().replace(/_/g,' '), margin+3, y)
        y += 5
        fillRect(margin, y-2, cW, bh, 2, [15,26,45])
        doc.setTextColor(203,213,225); doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
        doc.text(lines, margin+3, y+3.5)
        y += bh + 5
      }

      const participantHeader = (row: SurveyRow, i: number, accentRgb: [number,number,number]) => {
        checkPage(18)
        const name = (row.users as any)?.full_name || 'Unknown'
        const matric = (row.users as any)?.matric_number || ''
        fillRect(margin, y-2, cW, 11, 2, [15,26,45])
        doc.setFillColor(...accentRgb); doc.roundedRect(margin, y-2, 8, 11, 1,1,'F')
        doc.setTextColor(7,14,26); doc.setFont('helvetica','bold'); doc.setFontSize(8)
        doc.text(`${i+1}`, margin+4, y+5, { align:'center' })
        doc.setTextColor(241,245,249); doc.setFontSize(9)
        doc.text(name, margin+12, y+3.5)
        if (matric) { doc.setTextColor(71,85,105); doc.setFontSize(7.5); doc.text(matric, margin+12, y+8) }
        y += 15
      }

      // ── PRE-SURVEY ──
      if (preSurveys.length > 0) {
        secTitle(`Pre-Survey (${preSurveys.length} responses)`)
        const ap = avgFamiliarity(preSurveys)
        if (ap !== null) statRow('Average Familiarity (Before)', `${ap.toFixed(1)} / 5`, [99,102,241])
        y += 2

        if (Object.keys(sourceCounts).length > 0) {
          checkPage(16); doc.setTextColor(148,163,184); doc.setFont('helvetica','bold'); doc.setFontSize(9)
          doc.text('How they heard about it', margin, y); y += 7
          Object.entries(sourceCounts).forEach(([src, cnt], i) => bar(src, cnt, preSurveys.length, sourceColors[i%5]))
        }
        y += 4
        secTitle('Pre-Survey — Individual Responses')
        preSurveys.forEach((row, i) => {
          participantHeader(row, i, [99,102,241])
          Object.entries(row.answers).forEach(([k,v]) => { if (v) textBlock(k,v) })
          y += 4
        })
      }

      // ── POST-SURVEY ──
      if (postSurveys.length > 0) {
        newPage()
        secTitle(`Post-Survey (${postSurveys.length} responses)`)
        const aPost = avgFamiliarity(postSurveys)
        const aPre  = avgFamiliarity(preSurveys)
        if (aPost !== null) statRow('Average Familiarity (After)',  `${aPost.toFixed(1)} / 5`, [52,211,153])
        if (aPre  !== null) statRow('Average Familiarity (Before)', `${aPre.toFixed(1)} / 5`,  [99,102,241])
        if (aPost !== null && aPre !== null) {
          const diff = aPost - aPre
          statRow('Knowledge Gain', `${diff>=0?'+':''}${diff.toFixed(1)}`, diff>=0?[16,185,129]:[239,68,68])
        }
        y += 4

        if (Object.keys(expCounts).length > 0) {
          doc.setTextColor(148,163,184); doc.setFont('helvetica','bold'); doc.setFontSize(9)
          doc.text('Overall Experience', margin, y); y += 7
          ;['Excellent','Good','Average','Poor'].forEach(exp => { if (expCounts[exp]) bar(exp, expCounts[exp], postSurveys.length, expColors[exp]) })
          y += 4
        }
        if (Object.keys(participCounts).length > 0) {
          doc.setTextColor(148,163,184); doc.setFont('helvetica','bold'); doc.setFontSize(9)
          doc.text('Active Participation', margin, y); y += 7
          Object.entries(participCounts).forEach(([v,c]) => bar(v, c, postSurveys.length, v==='Yes'?'#10b981':'#ef4444'))
          y += 4
        }

        secTitle('Post-Survey — Individual Responses')
        postSurveys.forEach((row, i) => {
          participantHeader(row, i, [52,211,153])
          Object.entries(row.answers).forEach(([k,v]) => { if (v) textBlock(k,v) })
          y += 4
        })
      }

      // ── Page numbers ──
      const pages = doc.getNumberOfPages()
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p)
        doc.setFillColor(7,14,26); doc.rect(0, H-12, W, 12, 'F')
        doc.setTextColor(71,85,105); doc.setFontSize(7.5); doc.setFont('helvetica','normal')
        doc.text(`Page ${p} of ${pages}`, W/2, H-4, { align:'center' })
        doc.text('SPMS — Survey Report', margin, H-4)
        doc.text(generated, W-margin, H-4, { align:'right' })
      }

      const safeName = (programmeName||'programme').replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'-').toLowerCase()
      doc.save(`survey-report-${safeName}.pdf`)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const rows = tab === 'pre' ? preSurveys : postSurveys
  const total = rows.length
  const hasData = preSurveys.length > 0 || postSurveys.length > 0

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}>
      <div style={{ width:'28px', height:'28px', borderRadius:'50%', border:'3px solid rgba(99,102,241,0.2)', borderTopColor:'#6366f1', animation:'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

      {/* Header: tabs + download */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px' }}>
        <div style={{ display:'flex', gap:'8px', background:'rgba(255,255,255,0.03)', padding:'4px', borderRadius:'10px' }}>
          {(['pre','post'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'7px 18px', borderRadius:'7px', border:'none', fontFamily:'inherit',
              background: tab===t ? (t==='pre'?'rgba(96,165,250,0.15)':'rgba(167,139,250,0.15)') : 'transparent',
              color: tab===t ? (t==='pre'?'#60a5fa':'#a78bfa') : '#6b7280',
              fontSize:'13px', fontWeight: tab===t ? 600 : 400, cursor:'pointer',
            }}>
              {t==='pre' ? 'Pre-Survey' : 'Post-Survey'}
              <span style={{ marginLeft:'6px', fontSize:'11px', opacity:0.7 }}>({t==='pre'?preSurveys.length:postSurveys.length})</span>
            </button>
          ))}
        </div>

        {hasData && (
          <button onClick={generatePDF} disabled={generatingPdf} style={{
            display:'inline-flex', alignItems:'center', gap:'6px',
            padding:'8px 16px', borderRadius:'8px', border:'1px solid rgba(99,102,241,0.3)',
            background: generatingPdf ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.12)',
            color: generatingPdf ? '#475569' : '#818cf8',
            fontSize:'12px', fontWeight:600, cursor: generatingPdf ? 'not-allowed' : 'pointer', fontFamily:'inherit',
          }}>
            <Download size={13} />{generatingPdf ? 'Generating…' : 'Download Report'}
          </button>
        )}
      </div>

      {total === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'#475569' }}>
          <MessageSquare size={28} style={{ margin:'0 auto 10px', color:'#334155' }} />
          <p style={{ margin:0, fontSize:'14px' }}>No {tab}-survey responses yet.</p>
        </div>
      ) : (
        <>
          <div>
            <p style={{ margin:'0 0 10px', fontSize:'11px', color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:'6px' }}>
              <BarChart2 size={12} />Summary — {total} response{total!==1?'s':''}
            </p>
            <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
              {tab==='pre' && <AvgBadge label="Avg Familiarity (Before)" value={avgFamiliarity(preSurveys)} />}
              {tab==='post' && <>
                <AvgBadge label="Avg Familiarity (After)"  value={avgFamiliarity(postSurveys)} />
                {preSurveys.length>0 && <AvgBadge label="Avg Familiarity (Before)" value={avgFamiliarity(preSurveys)} />}
              </>}
            </div>
            {tab==='pre' && Object.keys(sourceCounts).length>0 && (
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px', marginBottom:'12px' }}>
                <p style={{ margin:'0 0 10px', fontSize:'12px', fontWeight:600, color:'#94a3b8' }}>How they heard about it</p>
                {Object.entries(sourceCounts).map(([src, cnt], i) => <StatBar key={src} label={src} value={cnt} total={total} color={sourceColors[i%sourceColors.length]} />)}
              </div>
            )}
            {tab==='post' && Object.keys(expCounts).length>0 && (
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px', marginBottom:'12px' }}>
                <p style={{ margin:'0 0 10px', fontSize:'12px', fontWeight:600, color:'#94a3b8' }}>Overall Experience</p>
                {['Excellent','Good','Average','Poor'].map(exp => expCounts[exp]!=null && <StatBar key={exp} label={exp} value={expCounts[exp]} total={total} color={expColors[exp]} />)}
              </div>
            )}
            {tab==='post' && Object.keys(participCounts).length>0 && (
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px', marginBottom:'12px' }}>
                <p style={{ margin:'0 0 10px', fontSize:'12px', fontWeight:600, color:'#94a3b8' }}>Active Participation</p>
                {Object.entries(participCounts).map(([val, cnt]) => <StatBar key={val} label={val} value={cnt} total={total} color={val==='Yes'?'#10b981':'#ef4444'} />)}
              </div>
            )}
          </div>
          <div>
            <p style={{ margin:'0 0 10px', fontSize:'11px', color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:'6px' }}>
              <Users size={12} />Individual Responses
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {rows.map((row, i) => <ResponseCard key={row.id} row={row} index={i} />)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}