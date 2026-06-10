import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { displayMeritTotal } from '@/lib/meritTotals.js'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RoleJoin = { name?: string | null } | { name?: string | null }[] | null

function getRoleName(roles: RoleJoin) {
  return (Array.isArray(roles) ? roles[0]?.name : roles?.name)?.toLowerCase()
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await svc.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params
  const { data: caller } = await svc
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()

  const callerRole = getRoleName(caller?.roles as RoleJoin)
  if (user.id !== userId && callerRole !== 'admin' && callerRole !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: merit, error } = await svc
    .from('merit')
    .select('id, user_id, programme_id, points, status, reason, updated_at, programmes(name)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const earnedTotal = (merit ?? []).reduce((sum, row) => sum + Number(row.points || 0), 0)

  return NextResponse.json({
    merit: merit ?? [],
    earnedTotal,
    displayTotal: displayMeritTotal(earnedTotal),
  })
}
