import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { awardMerit } from '@/lib/meritEngine'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RoleJoin = { name?: string | null } | { name?: string | null }[] | null

function getRoleName(roles: RoleJoin) {
  return (Array.isArray(roles) ? roles[0]?.name : roles?.name)?.toLowerCase()
}

export async function POST(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await svc.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerData } = await svc.from('users').select('roles(name)').eq('id', user.id).single()
  const callerRole = getRoleName(callerData?.roles as RoleJoin)
  if (callerRole !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, points, reason } = await req.json()
  if (!user_id || !points || points <= 0)
    return NextResponse.json({ error: 'user_id and a positive points value are required.' }, { status: 400 })
  if (!reason?.trim())
    return NextResponse.json({ error: 'A reason is required.' }, { status: 400 })

  await awardMerit({
    supabase: svc,
    userId: user_id,
    programmeId: null,
    points: -Math.abs(points),
    transactionType: 'demerit',
    sourceType: 'demerit',
    sourceRef: `manual:${Date.now()}`,
    reason: reason.trim(),
    actorId: user.id,
    metadata: { awarded_from: 'manual_superadmin_demerit' },
  })

  return NextResponse.json({ success: true })
}
