import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RoleJoin = { name?: string | null } | { name?: string | null }[] | null

function getRoleName(roles: RoleJoin) {
  return (Array.isArray(roles) ? roles[0]?.name : roles?.name)?.toLowerCase()
}

export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await svc.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await svc
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()

  const role = getRoleName(caller?.roles as RoleJoin)
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const page = Math.max(Number(url.searchParams.get('page') ?? '1'), 1)
  const pageSize = Math.min(Math.max(Number(url.searchParams.get('pageSize') ?? '50'), 1), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await svc
    .from('merit_transactions')
    .select('id, user_id, programme_id, points, transaction_type, source_type, role, activity_pillar, programme_level, reason, created_at, users(full_name, matric_number), programmes(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    rows: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
  })
}
