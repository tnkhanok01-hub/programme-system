'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/app/provider/ThemeContext'
import {
  ArrowLeft, Lock, Bell, Eye, EyeOff, Globe,
  Check, Loader2, Shield, AlertTriangle, Save, Moon, Sun,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Settings = {
  language:            'en' | 'bm'
  theme:               'dark' | 'light'
  notif_status_change: boolean
  notif_upcoming:      boolean
  notif_committee:     boolean
  show_phone:          boolean
  show_matric:         boolean
}

const DEFAULT_SETTINGS: Settings = {
  language:            'en',
  theme:               'dark',
  notif_status_change: true,
  notif_upcoming:      true,
  notif_committee:     true,
  show_phone:          true,
  show_matric:         true,
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon, children, t }: { title: string; icon: React.ReactNode; children: React.ReactNode; t: any }) {
  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: t.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: t.text, letterSpacing: '-0.01em' }}>{title}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

// ── Reusable rows ─────────────────────────────────────────────────────────────

function ToggleRow({ label, sub, value, onChange, t }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; t: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 20px', borderBottom: `1px solid ${t.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', color: t.text, fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textFaint, lineHeight: 1.4 }}>{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', flexShrink: 0,
          background: value ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : t.border,
          position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%',
          background: 'white', transition: 'left 0.2s',
          left: value ? '21px' : '3px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  )
}

function FieldRow({ label, children, last = false, t }: { label: string; children: React.ReactNode; last?: boolean; t: any }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
      <p style={{ margin: '0 0 6px', fontSize: '11px', color: t.textFaint, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {children}
    </div>
  )
}

function getInputStyle(t: any): React.CSSProperties {
  return {
    width: '100%', padding: '9px 11px', borderRadius: '8px',
    background: t.bgInput, border: `1px solid ${t.borderInput}`,
    color: t.text, fontSize: '13px', outline: 'none',
    boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.15s',
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const { mode, t, setMode } = useTheme()
  const [isMobile, setIsMobile] = useState(false)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)

  // Settings state
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const LANGS = [
    { id: 'en', label: 'English' },
    { id: 'bm', label: 'Bahasa Malaysia' },
  ]

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setToken(session.access_token)

      // GET /api/settings
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
      }

      setLoading(false)
    }
    init()
  }, [router])

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const set = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    if (key === 'theme') setMode(value as 'dark' | 'light')
  }

  // ── Save preferences (PATCH) ───────────────────────────────────────────────
  const saveSettings = async () => {
    setSettingsSaving(true)
    setSettingsError('')
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(settings),
    })
    setSettingsSaving(false)
    if (res.ok) {
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } else {
      const data = await res.json()
      setSettingsError(data.error ?? 'Failed to save preferences.')
    }
  }

  // ── Change password (POST) ─────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwError('')
    if (!pwForm.current) { setPwError('Please enter your current password.'); return }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return }

    setPwSaving(true)
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        action: 'change_password',
        current_password: pwForm.current,
        new_password: pwForm.next,
      }),
    })
    const data = await res.json()
    setPwSaving(false)

    if (res.ok) {
      setPwSuccess(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 4000)
    } else {
      setPwError(data.error ?? 'Failed to update password.')
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus { border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        input::placeholder { color: #374151; }
      `}</style>

      <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "'DM Sans', sans-serif", color: t.text }}>

        {/* ── Mobile top bar ── */}
        {isMobile && (
          <div style={{ background: t.bgCardAlt, borderBottom: `1px solid ${t.border}`, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 20 }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', padding: '2px', display: 'flex' }}>
              <ArrowLeft size={20} />
            </button>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: t.text }}>Settings</h1>
          </div>
        )}

        <div style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '16px' : '36px 20px' }}>

          {/* Desktop header */}
          {!isMobile && (
            <div style={{ marginBottom: '28px' }}>
              <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '20px' }}>
                <ArrowLeft size={14} />Back
              </button>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>Settings</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: t.textFaint }}>Manage your account preferences and privacy.</p>
            </div>
          )}

          {/* ── CHANGE PASSWORD ── */}
          <Section title="Change Password" icon={<Lock size={14} color="#818cf8" />} t={t}>
            {pwSuccess && (
              <div style={{ margin: '12px 20px 0', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 13px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px' }}>
                <Check size={14} color="#10b981" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '12px', color: '#10b981', fontWeight: 500 }}>Password updated successfully!</p>
              </div>
            )}
            {pwError && (
              <div style={{ margin: '12px 20px 0', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px' }}>
                <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>{pwError}</p>
              </div>
            )}
            {(['current', 'next', 'confirm'] as const).map((field, i) => {
              const labels    = { current: 'Current Password', next: 'New Password', confirm: 'Confirm New Password' }
              const placeholders = { current: 'Enter current password', next: 'Min. 8 characters', confirm: 'Re-enter new password' }
              return (
                <FieldRow key={field} t={t} label={labels[field]} last={i === 2}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={pwShow[field] ? 'text' : 'password'}
                      style={{ ...getInputStyle(t), paddingRight: '40px' }}
                      value={pwForm[field]}
                      onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={placeholders[field]}
                    />
                    <button
                      type="button"
                      onClick={() => setPwShow(p => ({ ...p, [field]: !p[field] }))}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textFaint, display: 'flex', padding: '2px' }}
                    >
                      {pwShow[field] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </FieldRow>
              )
            })}
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleChangePassword}
                disabled={pwSaving}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: pwSaving ? 'rgba(99,102,241,0.35)' : 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', fontSize: '12px', fontWeight: 600, cursor: pwSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                {pwSaving ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Shield size={12} />}
                {pwSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </Section>

          {/* ── NOTIFICATIONS ── */}
          <Section title="Notifications" icon={<Bell size={14} color="#818cf8" />} t={t}>
            <ToggleRow t={t}
              label="Programme Status Updates"
              sub="Get notified when your programme is approved or rejected"
              value={settings.notif_status_change}
              onChange={v => set('notif_status_change', v)}
            />
            <ToggleRow t={t}
              label="Upcoming Programme Reminders"
              sub="Reminders before programmes you're enrolled in"
              value={settings.notif_upcoming}
              onChange={v => set('notif_upcoming', v)}
            />
            <ToggleRow t={t}
              label="Committee Invitations"
              sub="Notify when you're added to a programme committee"
              value={settings.notif_committee}
              onChange={v => set('notif_committee', v)}
            />
          </Section>

          {/* ── PRIVACY ── */}
          <Section title="Privacy" icon={<Eye size={14} color="#818cf8" />} t={t}>
            <ToggleRow t={t}
              label="Show Phone Number"
              sub="Visible to other committee members in the same programme"
              value={settings.show_phone}
              onChange={v => set('show_phone', v)}
            />
            <ToggleRow t={t}
              label="Show Matric Number"
              sub="Visible to programme directors and admins"
              value={settings.show_matric}
              onChange={v => set('show_matric', v)}
            />
          </Section>

          {/* ── APPEARANCE ── */}
          <Section title="Appearance" icon={<Moon size={14} color="#818cf8" />} t={t}>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {([
                { id: 'dark',  label: 'Dark Mode',  sub: 'Dark background, easier on the eyes at night', icon: Moon },
                { id: 'light', label: 'Light Mode', sub: 'Light background, better in bright environments', icon: Sun },
              ] as const).map(opt => {
                const Icon = opt.icon
                const active = mode === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => set('theme', opt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: '9px', textAlign: 'left',
                      border: `1px solid ${active ? t.accentBorder : t.border}`,
                      background: active ? t.accentBg : t.bgInput,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: '100%',
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: active ? t.accentBg : t.bgInput }}>
                      <Icon size={15} color={active ? t.accentText : t.textFaint} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', color: active ? t.accentText : t.textMuted, fontWeight: active ? 600 : 400 }}>{opt.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textFaint, lineHeight: 1.3 }}>{opt.sub}</p>
                    </div>
                    {active && (
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={10} color="#818cf8" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* ── LANGUAGE ── */}
          <Section title="Language" icon={<Globe size={14} color="#818cf8" />} t={t}>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {LANGS.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => set('language', lang.id as 'en' | 'bm')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '9px',
                    border: `1px solid ${settings.language === lang.id ? t.accentBorder : t.border}`,
                    background: settings.language === lang.id ? t.accentBg : t.bgInput,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '13px', color: settings.language === lang.id ? t.accentText : t.textMuted, fontWeight: settings.language === lang.id ? 600 : 400 }}>
                    {lang.label}
                  </span>
                  {settings.language === lang.id && (
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={10} color="#818cf8" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Section>

          {/* ── Save preferences ── */}
          {settingsError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', marginBottom: '12px' }}>
              <AlertTriangle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>{settingsError}</p>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '32px' }}>
            {settingsSaved && (
              <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} />Preferences saved
              </span>
            )}
            
          </div>

        </div>
      </div>
    </>
  )
}