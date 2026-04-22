'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut, Bell,
  CirclePlus, Pencil, Trash, Save, CircleX, TrendingUp, Clock,
  CheckCircle, XCircle, AlertCircle, Search, Shield, Calendar,
  MapPin, DollarSign, Activity, Eye
} from 'lucide-react'

/* ─── TYPES ──────────────────────────────────────────────────────────────── */
interface Programme {
  id: string; name: string; category: string; venue: string
  budget: number; start_date: string; end_date: string; status: string; created_at: string
}
interface Profile { id: string; full_name: string; email: string; roles: { name: string } | null }
type NavItem = 'dashboard' | 'programmes' | 'users' | 'settings'

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function getStatusConfig(status: string) {
  switch (status) {
    case 'Approved': return { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: CheckCircle }
    case 'Rejected':  return { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', icon: XCircle }
    case 'Pending':   return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: AlertCircle }
    default:          return { bg: 'rgba(148,163,184,0.12)',color: '#94a3b8', icon: Clock }
  }
}
const getInitials = (name: string) =>
  name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'AD'

/* ─── STAT CARDS ─────────────────────────────────────────────────────────── */
function StatCards({ stats, userCount, isMobile }: {
  stats: { total: number; pending: number; approved: number; rejected: number; totalBudget: number }
  userCount: number; isMobile: boolean
}) {
  const cards = [
    { label: 'Total Programmes', value: stats.total,    icon: BookOpen,    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.15)' },
    { label: 'Pending Review',   value: stats.pending,  icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.15)' },
    { label: 'Approved',         value: stats.approved, icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.15)' },
    { label: 'Rejected',         value: stats.rejected, icon: XCircle,     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.15)' },
    { label: 'Total Users',      value: userCount,      icon: Users,       color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.15)' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div key={i} style={{ background: '#0c1526', border: `1px solid ${card.border}`, borderRadius: '10px', padding: isMobile ? '12px' : '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={card.color} />
              </div>
              <TrendingUp size={11} color="#374151" />
            </div>
            <p style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em' }}>{card.value}</p>
            <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#4b5563' }}>{card.label}</p>
          </div>
        )
      })}
    </div>
  )
}

/* ─── BUDGET BANNER ──────────────────────────────────────────────────────── */
function BudgetBanner({ stats, isMobile }: {
  stats: { total: number; approved: number; totalBudget: number }; isMobile: boolean
}) {
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.15), rgba(124,58,237,0.08))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', padding: isMobile ? '14px' : '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <DollarSign size={16} color="#a78bfa" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '10px', color: '#6b7280' }}>Total Budget (Approved & Pending Only)</p>
        <p style={{ margin: '2px 0 0', fontSize: isMobile ? '18px' : '22px', fontWeight: 700, color: '#a78bfa', letterSpacing: '-0.03em' }}>
          RM {stats.totalBudget.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div style={{ display: 'flex', gap: isMobile ? '16px' : '24px', flexShrink: 0 }}>
        {[
          { label: 'Avg per programme', value: stats.total > 0 ? `RM ${Math.round(stats.totalBudget / stats.total).toLocaleString()}` : 'RM 0' },
          { label: 'Approval rate',     value: stats.total > 0 ? `${Math.round((stats.approved / stats.total) * 100)}%` : '0%' },
        ].map((kpi, i) => (
          <div key={i} style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#c4b5fd' }}>{kpi.value}</p>
            <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#4b5563' }}>{kpi.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── EDIT MODAL ─────────────────────────────────────────────────────────── */
function EditModal({ show, isMobile, editForm, actionLoading, onClose, onChange, onUpdate }: {
  show: boolean; isMobile: boolean; editForm: Partial<Programme>; actionLoading: boolean
  onClose: () => void; onChange: (f: Partial<Programme>) => void; onUpdate: () => void
}) {
  if (!show) return null
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ background: '#0f1e30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pencil size={15} color="#a78bfa" />Edit Programme
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><CircleX size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Programme Name', name: 'name',       type: 'text',   span: isMobile ? 1 : 2 },
            { label: 'Venue',          name: 'venue',      type: 'text',   span: isMobile ? 1 : 2 },
            { label: 'Budget (RM)',    name: 'budget',     type: 'number', span: 1 },
            { label: 'Start Date',     name: 'start_date', type: 'date',   span: 1 },
            { label: 'End Date',       name: 'end_date',   type: 'date',   span: 1 },
          ].map(field => (
            <div key={field.name} style={{ gridColumn: `span ${field.span}` }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>{field.label}</label>
              <input type={field.type} value={(editForm as any)[field.name] || ''}
                onChange={e => onChange({ ...editForm, [field.name]: e.target.value })}
                style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '5px', fontWeight: 500 }}>Category</label>
            <select value={editForm.category || ''} onChange={e => onChange({ ...editForm, category: e.target.value })}
              style={{ width: '100%', padding: '9px 11px', borderRadius: '7px', background: '#0c1526', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}>
              {['Academic', 'Sports', 'Community Service', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <CircleX size={14} />Cancel
          </button>
          <button onClick={onUpdate} disabled={actionLoading}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: actionLoading ? 0.7 : 1 }}>
            <Save size={14} />{actionLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── REVIEW MODAL ───────────────────────────────────────────────────────── */
function ReviewModal({ prog, isMobile, rejectComment, actionLoading, rejectLoading, onClose, onCommentChange, onApprove, onReject }: {
  prog: Programme | null; isMobile: boolean; rejectComment: string; actionLoading: boolean; rejectLoading: boolean
  onClose: () => void; onCommentChange: (v: string) => void; onApprove: () => void; onReject: () => void
}) {
  if (!prog) return null
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: '#0f1e30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={15} color="#818cf8" />Review Programme
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><CircleX size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
          {[
            { label: 'Programme Name', value: prog.name, span: isMobile ? 1 : 2 },
            { label: 'Category',  value: prog.category || '—', span: 1 },
            { label: 'Venue',     value: prog.venue || '—', span: 1 },
            { label: 'Start Date', value: prog.start_date ? new Date(prog.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '—', span: 1 },
            { label: 'End Date',   value: prog.end_date   ? new Date(prog.end_date).toLocaleDateString('en-MY',   { day: 'numeric', month: 'long', year: 'numeric' }) : '—', span: 1 },
            { label: 'Budget',     value: prog.budget ? `RM ${Number(prog.budget).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—', span: 1 },
            { label: 'Submitted',  value: prog.created_at ? new Date(prog.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—', span: 1 },
          ].map(f => (
            <div key={f.label} style={{ gridColumn: `span ${f.span}`, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 13px' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>{f.value}</p>
            </div>
          ))}
        </div>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '18px' }} />
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rejection Comment <span style={{ color: '#ef4444' }}>*</span>
            <span style={{ color: '#374151', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '6px' }}>(required only when rejecting)</span>
          </label>
          <textarea value={rejectComment} onChange={e => onCommentChange(e.target.value)}
            placeholder="Explain why this programme is being rejected so the director can revise and resubmit..." rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${rejectComment.trim() ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`, color: '#e2e8f0', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <CircleX size={14} />Cancel
          </button>
          <button onClick={onReject} disabled={rejectLoading || !rejectComment.trim()}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: rejectComment.trim() ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.25)', color: 'white', fontSize: '13px', fontWeight: 500, cursor: rejectComment.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: rejectLoading ? 0.7 : 1 }}>
            <XCircle size={14} />{rejectLoading ? 'Rejecting...' : 'Reject'}
          </button>
          <button onClick={onApprove} disabled={actionLoading}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: actionLoading ? 0.7 : 1 }}>
            <CheckCircle size={14} />{actionLoading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── LOADING OVERLAY ────────────────────────────────────────────────────── */
function LoadingOverlay({ actionLoading, rejectLoading, deleteLoading, rejectComment }: {
  actionLoading: boolean; rejectLoading: boolean; deleteLoading: boolean; rejectComment: string
}) {
  if (!actionLoading && !rejectLoading && !deleteLoading) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(6px)', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', animation: 'spin 0.75s linear infinite' }} />
      <p style={{ color: '#a78bfa', fontSize: '14px', fontWeight: 500, margin: 0 }}>
        {deleteLoading ? 'Deleting programme...' : rejectLoading ? 'Rejecting programme...' : actionLoading && !rejectComment ? 'Approving programme...' : 'Saving changes...'}
      </p>
    </div>
  )
}

/* ─── MOBILE PROGRAMME CARDS ─────────────────────────────────────────────── */
function MobileProgrammeCards({ filtered, onEdit, onDelete, onReview, onView }: {
  filtered: Programme[]
  onEdit: (p: Programme) => void
  onDelete: (id: string) => void
  onReview: (p: Programme) => void
  onView: (id: string) => void
}) {
  if (filtered.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 16px', color: '#374151', fontSize: '13px' }}>No programmes found</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {filtered.map(prog => {
        const sc = getStatusConfig(prog.status)
        const StatusIcon = sc.icon
        const sd = prog.start_date ? new Date(prog.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '—'
        const ed = prog.end_date   ? new Date(prog.end_date).toLocaleDateString('en-MY',   { day: 'numeric', month: 'short', year: '2-digit' }) : ''
        return (
          <div key={prog.id} style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ margin: 0, fontWeight: 500, color: '#f1f5f9', fontSize: '13px', lineHeight: 1.3, flex: 1, marginRight: '8px' }}>{prog.name}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 500, background: sc.bg, color: sc.color, padding: '3px 7px', borderRadius: '4px', flexShrink: 0 }}>
                <StatusIcon size={10} />{prog.status || 'Pending'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#6b7280' }}>
                <Calendar size={9} />{sd}{ed ? ` → ${ed}` : ''}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#6b7280' }}>
                <MapPin size={9} />{prog.venue || '—'}
              </span>
              {prog.category && (
                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontWeight: 500 }}>{prog.category}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>
                {prog.budget ? `RM ${Number(prog.budget).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—'}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {prog.status === 'Pending' && (
                  <button onClick={() => onReview(prog)} style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 500 }}>
                    <Shield size={11} />Review
                  </button>
                )}
                {prog.status !== 'Approved' && (
                  <>
                    <button onClick={() => onEdit(prog)} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '5px', padding: '5px 7px', cursor: 'pointer', color: '#a78bfa' }}><Pencil size={12} /></button>
                    <button onClick={() => onDelete(prog.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '5px', padding: '5px 7px', cursor: 'pointer', color: '#ef4444' }}><Trash size={12} /></button>
                  </>
                )}
                <button onClick={() => onView(prog.id)} style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '5px', padding: '5px 7px', cursor: 'pointer', color: '#38bdf8' }}><Eye size={12} /></button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── DESKTOP TABLE ──────────────────────────────────────────────────────── */
function DesktopTable({ filtered, onEdit, onDelete, onReview, onView }: {
  filtered: Programme[]
  onEdit: (p: Programme) => void
  onDelete: (id: string) => void
  onReview: (p: Programme) => void
  onView: (id: string) => void
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {['Programme', 'Category', 'Dates', 'Venue', 'Budget', 'Status', 'Actions'].map(h => (
              <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#374151', fontWeight: 500, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#374151' }}><p style={{ margin: 0, fontSize: '13px' }}>No programmes found</p></td></tr>
          ) : filtered.map((prog, i) => {
            const sc = getStatusConfig(prog.status)
            const StatusIcon = sc.icon
            return (
              <tr key={prog.id}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}>
                <td style={{ padding: '12px 14px', maxWidth: '200px' }}><p style={{ margin: 0, fontWeight: 500, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prog.name}</p></td>
                <td style={{ padding: '12px 14px' }}><span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontWeight: 500 }}>{prog.category || '—'}</span></td>
                <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                    <Calendar size={11} />
                    {prog.start_date ? new Date(prog.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '—'}
                    {prog.end_date && <> → {new Date(prog.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</>}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', color: '#6b7280', maxWidth: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><MapPin size={11} />{prog.venue || '—'}</div>
                </td>
                <td style={{ padding: '12px 14px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>{prog.budget ? `RM ${Number(prog.budget).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—'}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, background: sc.bg, color: sc.color, padding: '4px 9px', borderRadius: '5px' }}>
                    <StatusIcon size={11} />{prog.status || 'Pending'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {prog.status === 'Pending' && (
                      <button onClick={() => onReview(prog)} style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500 }}>
                        <Shield size={12} />Review
                      </button>
                    )}
                    {prog.status !== 'Approved' && (
                      <>
                        <button onClick={() => onEdit(prog)} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: '#a78bfa' }}><Pencil size={13} /></button>
                        <button onClick={() => onDelete(prog.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: '#ef4444' }}><Trash size={13} /></button>
                      </>
                    )}
                    <button onClick={() => onView(prog.id)} style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: '#38bdf8' }}><Eye size={13} /></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminHomepage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Programme>>({})
  const [actionLoading, setActionLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [reviewProg, setReviewProg] = useState<Programme | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) { router.replace('/login'); return }

      const { data: profileData, error: profileError } = await supabase
        .from('users').select('id, full_name, roles(name)').eq('id', session.user.id).single()

      if (profileError || !profileData) { setLoading(false); return }

      const role = (profileData.roles as any)?.name?.toLowerCase?.() ?? ''
      if (role !== 'admin' && role !== 'superadmin') {
        router.replace(role === 'student' ? '/student' : '/login'); return
      }

      setProfile(profileData as any)

      const [{ data: programmeData }, { count }] = await Promise.all([
        supabase.from('programmes').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
      ])

      if (programmeData) setProgrammes(programmeData)
      setUserCount(count ?? 0)
      setLoading(false)
    }
    init()
  }, [])

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleEdit = (prog: Programme) => {
    setEditForm({ ...prog, start_date: prog.start_date?.slice(0, 10), end_date: prog.end_date?.slice(0, 10) })
    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    setActionLoading(true)
    const token = await getToken()
    if (!token) { router.replace('/login'); return }
    const res = await fetch(`/api/programmes/${editForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editForm.name, category: editForm.category, venue: editForm.venue, budget: editForm.budget, start_date: editForm.start_date, end_date: editForm.end_date }),
    })
    const data = await res.json()
    if (res.ok) { setProgrammes(prev => prev.map(p => p.id === editForm.id ? data.programme : p)); setShowEditModal(false) }
    setActionLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this programme? This cannot be undone.')) return
    const token = await getToken()
    if (!token) return
    setDeleteLoading(true)
    const res = await fetch(`/api/programmes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setProgrammes(prev => prev.filter(p => p.id !== id))
    setDeleteLoading(false)
  }

  const handleApprove = async () => {
    if (!reviewProg) return
    const token = await getToken()
    if (!token) return
    setActionLoading(true)
    const res = await fetch(`/api/programmes/${reviewProg.id}/approve`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setProgrammes(prev => prev.map(p => p.id === reviewProg.id ? { ...p, status: 'Approved' } : p))
      setReviewProg(null)
    } else {
      const data = await res.json()
      alert(data.error ?? 'Failed to approve programme.')
    }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!reviewProg) return
    if (!rejectComment.trim()) { alert('Please provide a rejection comment before rejecting.'); return }
    const token = await getToken()
    if (!token) return
    setRejectLoading(true)
    const res = await fetch(`/api/programmes/${reviewProg.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: rejectComment.trim() }),
    })
    if (res.ok) {
      setProgrammes(prev => prev.map(p => p.id === reviewProg.id ? { ...p, status: 'Rejected' } : p))
      setReviewProg(null)
      setRejectComment('')
    } else {
      const data = await res.json()
      alert(data.error ?? 'Failed to reject programme.')
    }
    setRejectLoading(false)
  }

  const stats = {
    total: programmes.length,
    pending:  programmes.filter(p => p.status === 'Pending').length,
    approved: programmes.filter(p => p.status === 'Approved').length,
    rejected: programmes.filter(p => p.status === 'Rejected').length,
    totalBudget: programmes.filter(p => p.status !== 'Rejected').reduce((sum, p) => sum + (Number(p.budget) || 0), 0),
  }

  const filtered = programmes.filter(p => {
    const q = searchQuery.toLowerCase()
    const matchSearch = p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.venue?.toLowerCase().includes(q)
    return matchSearch && (filterStatus === 'All' || p.status === filterStatus)
  })

  const navItems: { id: NavItem; icon: React.ElementType; label: string }[] = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'programmes', icon: BookOpen,         label: 'Programmes' },
    { id: 'users',      icon: Users,            label: 'Users' },
    { id: 'settings',   icon: Settings,         label: 'Settings' },
  ]

  const handleNavClick = (id: NavItem) => {
    setActiveNav(id)
    if (id === 'dashboard')  router.push('/admin')
    if (id === 'programmes') router.push('/create-programme')
    if (id === 'users')      router.push('/admin/users')
    if (id === 'settings')   router.push('/profile')
  }

  /* Shared modal/overlay props */
  const sharedModalProps = {
    isMobile,
    actionLoading,
    rejectLoading,
    rejectComment,
  }

  const tableProps = {
    filtered,
    onEdit:   handleEdit,
    onDelete: handleDelete,
    onReview: (p: Programme) => { setReviewProg(p); setRejectComment('') },
    onView:   (id: string) => router.push(`/programmes/${id}`),
  }

  /* ── Loading screen ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid #1e3a5f', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#475569', fontSize: '13px' }}>Initializing admin panel...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  /* ══════════════════════════════════════════════════════
     MOBILE LAYOUT
  ══════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#080f1a', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: '70px' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* Sticky top bar */}
        <div style={{ background: '#0c1526', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={13} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: '#f1f5f9', letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '9px', color: '#4b5563', margin: 0, fontWeight: 500, letterSpacing: '0.06em' }}>ADMIN PANEL</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={{ position: 'relative', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
              <Bell size={14} />
              {stats.pending > 0 && <span style={{ position: 'absolute', top: '7px', right: '7px', width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', border: '1.5px solid #080f1a' }} />}
            </button>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#5b21b6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white' }}>
              {getInitials(profile?.full_name || '')}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>Admin Dashboard</h1>
            <p style={{ fontSize: '11px', color: '#4b5563', margin: '2px 0 0' }}>
              {currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <StatCards stats={stats} userCount={userCount} isMobile={true} />
          <BudgetBanner stats={stats} isMobile={true} />

          {/* Programme section */}
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={13} color="#7c3aed" />Programme Management
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4b5563' }}>{filtered.length} of {programmes.length} programmes</p>
                </div>
                <button onClick={() => router.push('/create-programme-form')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(135deg,#6d28d9,#7c3aed)', border: 'none', borderRadius: '7px', padding: '7px 12px', color: 'white', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                  <CirclePlus size={12} />New
                </button>
              </div>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                <input type="text" placeholder="Search programmes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px 8px 28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, background: filterStatus === s ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', color: filterStatus === s ? '#a78bfa' : '#6b7280' }}>
                    {s}{s !== 'All' && ` (${s === 'Pending' ? stats.pending : s === 'Approved' ? stats.approved : stats.rejected})`}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px' }}>
              <MobileProgrammeCards {...tableProps} />
            </div>
          </div>
        </div>

        {/* Fixed bottom tab bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0c1526', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', zIndex: 20 }}>
          {navItems.map(item => {
            const Icon = item.icon; const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', cursor: 'pointer', gap: '3px', border: 'none', background: 'transparent' }}>
                <Icon size={16} color={isActive ? '#a78bfa' : '#4b5563'} />
                <span style={{ fontSize: '9px', fontWeight: 500, color: isActive ? '#a78bfa' : '#4b5563' }}>{item.label}</span>
              </button>
            )
          })}
        </div>

        <EditModal
          show={showEditModal} isMobile={true} editForm={editForm} actionLoading={actionLoading}
          onClose={() => setShowEditModal(false)} onChange={setEditForm} onUpdate={handleUpdate}
        />
        <ReviewModal
          prog={reviewProg} isMobile={true} rejectComment={rejectComment}
          actionLoading={actionLoading} rejectLoading={rejectLoading}
          onClose={() => { setReviewProg(null); setRejectComment('') }}
          onCommentChange={setRejectComment} onApprove={handleApprove} onReject={handleReject}
        />
        <LoadingOverlay actionLoading={actionLoading} rejectLoading={rejectLoading} deleteLoading={deleteLoading} rejectComment={rejectComment} />
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     DESKTOP LAYOUT
  ══════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif", color: '#e2e8f0' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* SIDEBAR */}
      <aside style={{ width: '220px', background: '#0c1526', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: '#f1f5f9', letterSpacing: '-0.02em' }}>UTM-SPMS</p>
              <p style={{ fontSize: '10px', color: '#4b5563', margin: 0, fontWeight: 500, letterSpacing: '0.04em' }}>ADMIN PANEL</p>
            </div>
          </div>
        </div>
        <nav style={{ padding: '14px 10px', flex: 1 }}>
          <p style={{ fontSize: '9px', fontWeight: 600, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>Navigation</p>
          {navItems.map(item => {
            const Icon = item.icon; const isActive = activeNav === item.id
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent', color: isActive ? '#a78bfa' : '#6b7280', fontSize: '13px', fontWeight: isActive ? 500 : 400, marginBottom: '2px', textAlign: 'left', transition: 'all 0.12s' }}>
                <Icon size={15} />{item.label}
                {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: '#7c3aed' }} />}
              </button>
            )
          })}
          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '9px', fontWeight: 600, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>Quick Actions</p>
            <button onClick={() => router.push('/create-programme-form')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'rgba(124,58,237,0.08)', color: '#a78bfa', fontSize: '13px', fontWeight: 500, textAlign: 'left' }}>
              <CirclePlus size={15} />New Programme
            </button>
          </div>
        </nav>
        <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px', borderRadius: '9px', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #5b21b6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
              {getInitials(profile?.full_name || '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Admin'}</p>
              <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', textTransform: 'capitalize' }}>{(profile?.roles as any)?.name || 'Administrator'}</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '3px' }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: '220px', padding: '28px 32px', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>Admin Dashboard</h1>
            <p style={{ fontSize: '13px', color: '#4b5563', margin: '3px 0 0' }}>{currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button style={{ position: 'relative', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
              <Bell size={15} />
              {stats.pending > 0 && <span style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', border: '1.5px solid #080f1a' }} />}
            </button>
            <button onClick={() => router.push('/create-programme-form')} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', border: 'none', borderRadius: '9px', padding: '9px 16px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <CirclePlus size={14} />New Programme
            </button>
          </div>
        </div>

        <StatCards stats={stats} userCount={userCount} isMobile={false} />
        <BudgetBanner stats={stats} isMobile={false} />

        <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={15} color="#7c3aed" />Programme Management</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4b5563' }}>{filtered.length} of {programmes.length} programmes</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px', padding: '7px 10px 7px 30px', color: '#e2e8f0', fontSize: '12px', outline: 'none', width: '180px' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, background: filterStatus === s ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', color: filterStatus === s ? '#a78bfa' : '#6b7280' }}>
                    {s}{s !== 'All' && <span style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.7 }}>({s === 'Pending' ? stats.pending : s === 'Approved' ? stats.approved : stats.rejected})</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DesktopTable {...tableProps} />
        </div>
      </main>

      <EditModal
        show={showEditModal} isMobile={false} editForm={editForm} actionLoading={actionLoading}
        onClose={() => setShowEditModal(false)} onChange={setEditForm} onUpdate={handleUpdate}
      />
      <ReviewModal
        prog={reviewProg} isMobile={false} rejectComment={rejectComment}
        actionLoading={actionLoading} rejectLoading={rejectLoading}
        onClose={() => { setReviewProg(null); setRejectComment('') }}
        onCommentChange={setRejectComment} onApprove={handleApprove} onReject={handleReject}
      />
      <LoadingOverlay actionLoading={actionLoading} rejectLoading={rejectLoading} deleteLoading={deleteLoading} rejectComment={rejectComment} />
    </div>
  )
}
