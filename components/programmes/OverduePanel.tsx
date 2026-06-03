'use client'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { useTheme } from '@/app/provider/ThemeContext'
import { OverdueItem } from '@/lib/types'

const DURING_COLOR = '#34d399'
const POST_COLOR = '#a78bfa'

function dayLabel(n: number) {
  if (n === 0) return 'Due today'
  return `${n} day${n !== 1 ? 's' : ''} overdue`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Unknown date'
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OverduePanel({ duringOverdue, postOverdue, isMobile }: {
  duringOverdue: OverdueItem[]
  postOverdue: OverdueItem[]
  isMobile: boolean
}) {
  const router = useRouter()
  const { t } = useTheme()
  const total = duringOverdue.length + postOverdue.length
  if (total === 0) return null

  const rows = [
    ...duringOverdue.map(item => ({ ...item, phase: 'during' as const })),
    ...postOverdue.map(item => ({ ...item, phase: 'post' as const })),
  ]

  return (
    <div style={{
      background: t.bgCard,
      border: `1px solid ${t.danger}33`,
      borderRadius: isMobile ? '12px' : '14px',
      overflow: 'hidden',
      marginBottom: isMobile ? '16px' : '20px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '12px 14px' : '14px 20px',
        borderBottom: `1px solid ${t.danger}1f`,
        background: `${t.danger}0a`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={14} color={t.danger} />
          <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 600, color: t.text }}>
            Overdue Checklists
          </span>
        </div>
        <span style={{
          background: `${t.danger}1f`,
          color: t.danger,
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '20px',
        }}>
          {total}
        </span>
      </div>

      {/* Rows */}
      {rows.map((item, i) => {
        const phaseColor = item.phase === 'during' ? DURING_COLOR : POST_COLOR
        const phaseLabel = item.phase === 'during' ? 'During' : 'Post'
        const isLast = i === rows.length - 1
        return (
          <div
            key={`${item.phase}-${item.id}`}
            onClick={() => router.push(`/programmes/${item.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: isMobile ? '10px 14px' : '12px 20px',
              borderBottom: isLast ? 'none' : `1px solid ${t.border}`,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${t.danger}08` }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            {/* Phase badge */}
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: phaseColor,
              background: `${phaseColor}18`,
              border: `1px solid ${phaseColor}40`,
              padding: '2px 7px',
              borderRadius: '4px',
              flexShrink: 0,
            }}>
              {phaseLabel}
            </span>

            {/* Programme info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontSize: isMobile ? '12px' : '13px',
                fontWeight: 600,
                color: t.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textMuted }}>
                {item.organiser} · ended {formatDate(item.end_date)}
              </p>
            </div>

            {/* Days overdue */}
            <span style={{ fontSize: '11px', fontWeight: 600, color: t.danger, flexShrink: 0 }}>
              {dayLabel(item.days_overdue)}
            </span>

            {/* Arrow */}
            <span style={{ color: t.textFaint, fontSize: '14px', flexShrink: 0 }}>→</span>
          </div>
        )
      })}
    </div>
  )
}
