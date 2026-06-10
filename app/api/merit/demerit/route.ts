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

  try {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to apply demerit'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  await svc.from('notifications').insert({
    user_id,
    title: 'Demerit Points Applied',
    message: `${Math.abs(points)} merit point${Math.abs(points) === 1 ? '' : 's'} have been deducted from your account. Reason: ${reason.trim()}`,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await svc.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerData } = await svc.from('users').select('roles(name)').eq('id', user.id).single()
  const callerRole = getRoleName(callerData?.roles as RoleJoin)
  if (callerRole !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { merit_id } = await req.json()
  if (!merit_id) return NextResponse.json({ error: 'merit_id is required.' }, { status: 400 })

  const { data: meritRow, error: fetchError } = await svc
    .from('merit')
    .select('id, user_id, points, status, reason')
    .eq('id', merit_id)
    .single()

  if (fetchError || !meritRow) return NextResponse.json({ error: 'Demerit record not found.' }, { status: 404 })
  if (meritRow.status !== 'demerit') return NextResponse.json({ error: 'Only demerit records can be cancelled.' }, { status: 400 })

  const { error: deleteError } = await svc.from('merit').delete().eq('id', merit_id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  await svc.from('notifications').insert({
    user_id: meritRow.user_id,
    title: 'Demerit Cancelled',
    message: `A demerit of ${Math.abs(Number(meritRow.points))} point${Math.abs(Number(meritRow.points)) === 1 ? '' : 's'} has been cancelled and your points have been restored.${meritRow.reason ? ` (Original reason: ${meritRow.reason})` : ''}`,
  })

  return NextResponse.json({ success: true })
}
