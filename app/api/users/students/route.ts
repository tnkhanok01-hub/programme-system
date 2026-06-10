import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { displayMeritTotal } from '@/lib/meritTotals.js'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RoleJoin = { name?: string | null } | { name?: string | null }[] | null
type StudentRow = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  matric_number: string | null
  roles?: RoleJoin
}

function getRoleName(roles: RoleJoin) {
  return (Array.isArray(roles) ? roles[0]?.name : roles?.name) ?? 'student'
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

  const callerRole = getRoleName(caller?.roles as RoleJoin).toLowerCase()
  if (callerRole !== 'admin' && callerRole !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const page = Math.max(Number(url.searchParams.get('page') ?? '1'), 1)
  const pageSize = Math.min(Math.max(Number(url.searchParams.get('pageSize') ?? '25'), 1), 100)
  const search = url.searchParams.get('q')?.trim() ?? ''
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = svc
    .from('users')
    .select('id, email, full_name, phone, matric_number, roles!inner(name)', { count: 'exact' })
    .eq('roles.name', 'student')
    .order('full_name', { ascending: true })
    .range(from, to)

  if (search) {
    const escaped = search.replaceAll('%', '\\%').replaceAll('_', '\\_')
    query = query.or(`full_name.ilike.%${escaped}%,matric_number.ilike.%${escaped}%,email.ilike.%${escaped}%`)
  }

  const { data: students, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (students ?? []) as StudentRow[]
  const ids = rows.map((student) => student.id)
  const earnedTotals: Record<string, number> = {}

  if (ids.length > 0) {
    const { data: meritRows, error: meritError } = await svc
      .from('merit')
      .select('user_id, points')
      .in('user_id', ids)

    if (meritError) return NextResponse.json({ error: meritError.message }, { status: 500 })

    for (const row of meritRows ?? []) {
      earnedTotals[row.user_id] = (earnedTotals[row.user_id] ?? 0) + Number(row.points || 0)
    }
  }

  return NextResponse.json({
    users: rows.map((student) => ({
      id: student.id,
      email: student.email ?? 'N/A',
      full_name: student.full_name ?? 'Unnamed Student',
      phone: student.phone ?? '',
      matric_number: student.matric_number ?? 'N/A',
      role: getRoleName(student.roles),
      earned_merit_points: earnedTotals[student.id] ?? 0,
      merit_points: displayMeritTotal(earnedTotals[student.id] ?? 0),
    })),
    page,
    pageSize,
    total: count ?? 0,
  })
}
