import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Auth helper ───────────────────────────────────────────────────────────
async function getUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user ?? null
}

async function getRole(userId: string) {
  const { data } = await supabaseAdmin
    .from('users').select('roles(name)').eq('id', userId).single()
  return (data?.roles as any)?.name?.toLowerCase() ?? 'student'
}

/* ── GET /api/committee?programme_id=xxx ────────────────────────────────── */
export async function GET(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const programme_id = searchParams.get('programme_id')
  if (!programme_id) return NextResponse.json({ error: 'programme_id is required.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('committee_members')
    .select(`
      id,
      role,
      created_at,
      user_id,
      users ( id, full_name, matric_number, phone )
    `)
    .eq('programme_id', programme_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ members: data ?? [] })
}

/* ── POST /api/committee ────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { programme_id, matric_number, member_role, join_self } = await req.json()

  if (!programme_id) return NextResponse.json({ error: 'programme_id is required.' }, { status: 400 })

  const role = await getRole(user.id)
  const isAdmin = role === 'admin' || role === 'superadmin'

  // ── SELF-JOIN: student joining themselves ────────────────────────────
  if (join_self) {
    // Programme must be Approved
    const { data: prog } = await supabaseAdmin
      .from('programmes').select('status, programme_director_id').eq('id', programme_id).single()

    if (!prog) return NextResponse.json({ error: 'Programme not found.' }, { status: 404 })
    if (prog.status !== 'Approved') {
      return NextResponse.json({ error: 'You can only join an approved programme.' }, { status: 400 })
    }
    if (prog.programme_director_id === user.id) {
      return NextResponse.json({ error: 'You are the programme director.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('committee_members')
      .insert({ programme_id, user_id: user.id, role: member_role || 'Member' })
      .select(`id, role, created_at, user_id, users ( id, full_name, matric_number, phone )`)
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'You have already joined this committee.' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ member: data }, { status: 201 })
  }

  // ── ADMIN/DIRECTOR ADD by matric ─────────────────────────────────────
  if (!matric_number) return NextResponse.json({ error: 'Matric number is required.' }, { status: 400 })

  if (!isAdmin) {
    const { data: prog } = await supabaseAdmin
      .from('programmes').select('programme_director_id').eq('id', programme_id).single()
    if (prog?.programme_director_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: member } = await supabaseAdmin
    .from('users').select('id, full_name, matric_number').eq('matric_number', matric_number.trim()).single()

  if (!member) {
    return NextResponse.json({ error: `No student found with matric number "${matric_number}".` }, { status: 404 })
  }
  if (member.id === user.id) {
    return NextResponse.json({ error: 'You cannot add yourself as a committee member.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('committee_members')
    .insert({ programme_id, user_id: member.id, role: member_role || 'member' })
    .select(`id, role, created_at, user_id, users ( id, full_name, matric_number, phone )`)
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `${member.full_name} is already a committee member.` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ member: data }, { status: 201 })
}

/* ── DELETE /api/committee ──────────────────────────────────────────────── */
export async function DELETE(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { programme_id, member_id } = await req.json()

  if (!programme_id || !member_id) {
    return NextResponse.json({ error: 'programme_id and member_id are required.' }, { status: 400 })
  }

  const role = await getRole(user.id)
  const isAdmin = role === 'admin' || role === 'superadmin'

  if (!isAdmin) {
    const { data: prog } = await supabaseAdmin
      .from('programmes').select('programme_director_id').eq('id', programme_id).single()
    if (prog?.programme_director_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { error } = await supabaseAdmin
    .from('committee_members').delete().eq('id', member_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}