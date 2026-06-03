import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await svc.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerData } = await svc.from('users').select('roles(name)').eq('id', user.id).single()
  const callerRole = (callerData?.roles as any)?.name?.toLowerCase()
  if (callerRole !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, points, reason } = await req.json()
  if (!user_id || !points || points <= 0)
    return NextResponse.json({ error: 'user_id and a positive points value are required.' }, { status: 400 })
  if (!reason?.trim())
    return NextResponse.json({ error: 'A reason is required.' }, { status: 400 })

  const { error } = await svc.from('merit').insert({
    user_id,
    programme_id: null,
    points:       -Math.abs(points),
    status:       'demerit',
    reason:       reason.trim(),
    updated_at:   new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
