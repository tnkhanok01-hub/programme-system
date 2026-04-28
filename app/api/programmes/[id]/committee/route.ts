import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { SINGLE_ROLE_LIMIT } from '@/lib/constants'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user ?? null
}

async function getRole(userId: string) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('roles(name)')
    .eq('id', userId)
    .single()

  return (data?.roles as any)?.name?.toLowerCase() ?? 'student'
}

/* ── GET ───────────────────────────────────────────── */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: programme_id } = await context.params

  const { data: roles, error } = await supabaseAdmin
    .from('programme_roles')
    .select('programme_id, user_id, role, assigned_at, status')
    .eq('programme_id', programme_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const userIds = roles?.map(r => r.user_id) || []

  const { data: usersData } = await supabaseAdmin
    .from('users')
    .select('id, full_name, matric_number, phone')
    .in('id', userIds)

  const usersMap = Object.fromEntries((usersData || []).map(u => [u.id, u]))

  const members = roles.map((r: any) => ({
    id: `${r.programme_id}__${r.user_id}`,
    role: r.role,
    status: r.status,
    created_at: r.assigned_at,
    user_id: r.user_id,
    users: usersMap[r.user_id] ?? null,
  }))

  return NextResponse.json({ members })
}

/* ── POST (JOIN / ADD) ───────────────────────────── */
export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { programme_id, member_role, join_self } = await req.json()

  const roleToAssign = member_role || 'Member'

  if (SINGLE_ROLE_LIMIT.includes(roleToAssign)) {
    const { data: existing } = await supabaseAdmin
      .from('programme_roles')
      .select('user_id')
      .eq('programme_id', programme_id)
      .eq('role', roleToAssign)
      .eq('status', 'approved')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'This role is already taken.' },
        { status: 400 }
      )
    }
  }

  // 🔹 Self join → always pending
  if (join_self) {
    const { data, error } = await supabaseAdmin
      .from('programme_roles')
      .insert({
        programme_id,
        user_id: user.id,
        role: roleToAssign,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You already joined.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ member: data }, { status: 201 })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}

/* ── PATCH (APPROVE / REJECT) ───────────────────── */
export async function PATCH(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { programme_id, member_id, action } = await req.json()
  const user_id = member_id.split('__')[1]

  // 🔒 Only Programme Director
  const { data: prog } = await supabaseAdmin
    .from('programmes')
    .select('programme_director_id')
    .eq('id', programme_id)
    .single()

  if (prog?.programme_director_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 🔹 Get member role
  const { data: member } = await supabaseAdmin
    .from('programme_roles')
    .select('role')
    .eq('programme_id', programme_id)
    .eq('user_id', user_id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // 🔒 Enforce role limit on approve
  if (action === 'approve') {
    if (SINGLE_ROLE_LIMIT.includes(member.role)) {
      const { data: existing } = await supabaseAdmin
        .from('programme_roles')
        .select('id')
        .eq('programme_id', programme_id)
        .eq('role', member.role)
        .eq('status', 'approved')
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'Role already assigned.' },
          { status: 400 }
        )
      }
    }

    await supabaseAdmin
      .from('programme_roles')
      .update({ status: 'approved' })
      .eq('programme_id', programme_id)
      .eq('user_id', user_id)

    return NextResponse.json({ success: true })
  }

  if (action === 'reject') {
    await supabaseAdmin
      .from('programme_roles')
      .delete()
      .eq('programme_id', programme_id)
      .eq('user_id', user_id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

/* ── DELETE (LEAVE / REMOVE) ───────────────────── */
export async function DELETE(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { programme_id, member_id } = await req.json()
  const user_id = member_id.split('__')[1]

  const { data: prog } = await supabaseAdmin
    .from('programmes')
    .select('programme_director_id')
    .eq('id', programme_id)
    .single()

  // 🚫 Prevent director from leaving
  if (prog?.programme_director_id === user_id) {
    return NextResponse.json(
      { error: 'Programme Director cannot leave the programme.' },
      { status: 400 }
    )
  }

  const isSelf = user_id === user.id

  if (!isSelf && prog?.programme_director_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabaseAdmin
    .from('programme_roles')
    .delete()
    .eq('programme_id', programme_id)
    .eq('user_id', user_id)

  return NextResponse.json({ success: true })
}