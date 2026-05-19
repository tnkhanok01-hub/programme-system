'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// ── Token maps ────────────────────────────────────────────────────────────────

export const THEMES = {
  dark: {
    bg:           '#070e1a',
    bgCard:       '#0c1526',
    bgCardAlt:    '#0a1220',
    bgInput:      'rgba(255,255,255,0.05)',
    border:       'rgba(255,255,255,0.06)',
    borderInput:  'rgba(255,255,255,0.09)',
    text:         '#e2e8f0',
    textMuted:    '#94a3b8',
    textFaint:    '#475569',
    textFaintest: '#374151',
    accent:       '#6366f1',
    accentBg:     'rgba(99,102,241,0.12)',
    accentBorder: 'rgba(99,102,241,0.25)',
    accentText:   '#818cf8',
    success:      '#10b981',
    successBg:    'rgba(16,185,129,0.1)',
    successBorder:'rgba(16,185,129,0.3)',
    danger:       '#ef4444',
    dangerBg:     'rgba(239,68,68,0.08)',
    dangerBorder: 'rgba(239,68,68,0.25)',
  },
  light: {
    bg:           '#f1f5f9',
    bgCard:       '#ffffff',
    bgCardAlt:    '#f8fafc',
    bgInput:      'rgba(0,0,0,0.03)',
    border:       'rgba(0,0,0,0.08)',
    borderInput:  'rgba(0,0,0,0.12)',
    text:         '#0f172a',
    textMuted:    '#475569',
    textFaint:    '#64748b',
    textFaintest: '#94a3b8',
    accent:       '#4f46e5',
    accentBg:     'rgba(99,102,241,0.08)',
    accentBorder: 'rgba(99,102,241,0.3)',
    accentText:   '#4f46e5',
    success:      '#059669',
    successBg:    'rgba(5,150,105,0.08)',
    successBorder:'rgba(5,150,105,0.25)',
    danger:       '#dc2626',
    dangerBg:     'rgba(220,38,38,0.06)',
    dangerBorder: 'rgba(220,38,38,0.2)',
  },
} as const

export type ThemeMode = 'dark' | 'light'
export type ThemeTokens = typeof THEMES.dark | typeof THEMES.light

// ── Helpers ───────────────────────────────────────────────────────────────────

function storageKey(userId: string) {
  return `theme:${userId}`
}

function readStorage(userId: string): ThemeMode | null {
  if (!userId) return null
  const v = localStorage.getItem(storageKey(userId))
  return v === 'dark' || v === 'light' ? v : null
}

function writeStorage(userId: string, mode: ThemeMode) {
  if (!userId) return
  localStorage.setItem(storageKey(userId), mode)
}

// ── Context ───────────────────────────────────────────────────────────────────

type ThemeContextValue = {
  mode: ThemeMode
  t: ThemeTokens
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  t: THEMES.dark,
  setMode: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark')
  const [userId, setUserId] = useState('')

  // On mount: get user ID, then read their stored theme
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id ?? ''
      setUserId(uid)

      // Read this user's stored theme
      const stored = readStorage(uid)
      if (stored) {
        setModeState(stored)
      } else if (uid) {
        // No local storage yet — fetch from API as fallback
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const apiTheme = data.settings?.theme as ThemeMode | undefined
          if (apiTheme === 'dark' || apiTheme === 'light') {
            setModeState(apiTheme)
            writeStorage(uid, apiTheme)
          }
        }
      }
    }
    init()

    // Re-run when auth state changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const uid = session?.user?.id ?? ''
      setUserId(uid)
      if (!uid) {
        // Logged out — reset to dark
        setModeState('dark')
        return
      }
      const stored = readStorage(uid)
      if (stored) {
        setModeState(stored)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Apply data-theme attribute whenever mode changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const setMode = (m: ThemeMode) => {
    setModeState(m)
    writeStorage(userId, m)
  }

  return (
    <ThemeContext.Provider value={{ mode, t: THEMES[mode], setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}