import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ── Shared: authenticate and return a scoped client + user ────────────────────

async function authenticate(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized. Invalid session.' }, { status: 401 }) }
  }

  return { supabase, user, token }
}

// ── GET /api/settings ─────────────────────────────────────────────────────────
// Returns the user's current saved settings object.

export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('users')
    .select('settings')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return settings with defaults merged in for any missing keys
  const defaults = {
    language:            'en',
    theme:               'dark',
    notif_status_change: true,
    notif_upcoming:      true,
    notif_committee:     true,
    show_phone:          true,
    show_matric:         true,
  }

  return NextResponse.json({
    settings: { ...defaults, ...(data?.settings ?? {}) }
  })
}

// ── PATCH /api/settings ───────────────────────────────────────────────────────
// Updates notification, privacy, and language preferences.
// Body: { language?, notif_status_change?, notif_upcoming?, notif_committee?, show_phone?, show_matric? }

export async function PATCH(request: Request) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const ALLOWED_KEYS = [
    'language',
    'theme',
    'notif_status_change',
    'notif_upcoming',
    'notif_committee',
    'show_phone',
    'show_matric',
  ]

  // Only pick recognised keys
  const incoming: Record<string, unknown> = {}
  for (const key of ALLOWED_KEYS) {
    if (key in body) incoming[key] = body[key]
  }

  if (Object.keys(incoming).length === 0) {
    return NextResponse.json({ error: 'No valid settings keys provided.' }, { status: 400 })
  }

  // Validate language value if provided
  if ('language' in incoming && !['en', 'bm'].includes(incoming.language as string)) {
    return NextResponse.json({ error: 'Invalid language value. Must be "en" or "bm".' }, { status: 400 })
  }

  // Validate theme value if provided
  if ('theme' in incoming && !['dark', 'light'].includes(incoming.theme as string)) {
    return NextResponse.json({ error: 'Invalid theme value. Must be "dark" or "light".' }, { status: 400 })
  }

  // Validate boolean toggles if provided
  const BOOL_KEYS = ['notif_status_change', 'notif_upcoming', 'notif_committee', 'show_phone', 'show_matric']
  for (const key of BOOL_KEYS) {
    if (key in incoming && typeof incoming[key] !== 'boolean') {
      return NextResponse.json({ error: `"${key}" must be a boolean.` }, { status: 400 })
    }
  }

  // Fetch existing settings to merge (JSONB patch)
  const { data: existing } = await supabase
    .from('users')
    .select('settings')
    .eq('id', user.id)
    .single()

  const merged = { ...(existing?.settings ?? {}), ...incoming }

  const { error } = await supabase
    .from('users')
    .update({ settings: merged })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Settings updated successfully.', settings: merged })
}

// ── POST /api/settings ────────────────────────────────────────────────────────
// Handles password change.
// Body: { action: 'change_password', current_password: string, new_password: string }

export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error
  const { supabase, user, token } = auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { action, current_password, new_password } = body as {
    action: string
    current_password: string
    new_password: string
  }

  if (action !== 'change_password') {
    return NextResponse.json({ error: `Unknown action "${action}".` }, { status: 400 })
  }

  // Validate inputs
  if (!current_password || typeof current_password !== 'string') {
    return NextResponse.json({ error: 'current_password is required.' }, { status: 400 })
  }
  if (!new_password || typeof new_password !== 'string') {
    return NextResponse.json({ error: 'new_password is required.' }, { status: 400 })
  }
  if (new_password.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
  }
  if (current_password === new_password) {
    return NextResponse.json({ error: 'New password must be different from the current password.' }, { status: 400 })
  }

  // Re-authenticate with current password to verify it
  const email = user.email
  if (!email) {
    return NextResponse.json({ error: 'Could not retrieve account email.' }, { status: 500 })
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: current_password,
  })

  if (signInError) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
  }

  // Update password via admin client (service role) to avoid session issues
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    password: new_password,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Password updated successfully.' })
}