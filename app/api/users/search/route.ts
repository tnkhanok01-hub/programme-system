import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return NextResponse.json({ users: [] })

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, full_name, matric_number, roles(name)')
    .or(`full_name.ilike.%${q}%,matric_number.ilike.%${q}%`)
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const students = (data ?? []).filter(u => {
    const roleName = (u.roles as any)?.name?.toLowerCase() ?? 'student'
    return roleName === 'student'
  })

  return NextResponse.json({
    users: students.map(u => ({ id: u.id, full_name: u.full_name, matric_number: u.matric_number }))
  })
}
