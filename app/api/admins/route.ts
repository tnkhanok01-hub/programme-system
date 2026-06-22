import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = auth.replace('Bearer ', '')

  const svc = makeServiceClient()
  const { data: { user }, error: authError } = await svc.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await svc
    .from('users')
    .select('id, full_name, roles!inner(name)')
    .eq('roles.name', 'admin')
    .order('full_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ admins: (data ?? []).map(u => ({ id: u.id, full_name: u.full_name })) })
}

export async function DELETE(request: Request) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = auth.replace('Bearer ', '')

  const svc = makeServiceClient()
  const { data: { user }, error: authError } = await svc.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify caller is admin or superadmin
  const { data: callerProfile } = await svc
    .from('users')
    .select('*, roles(name)')
    .eq('id', user.id)
    .single()
  const callerRole = ((callerProfile?.roles as unknown as { name?: string } | null)?.name ?? '').toLowerCase()
  if (callerRole !== 'admin' && callerRole !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const targetId = searchParams.get('id')
  if (!targetId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  }

  // Cascade-delete all data tied to this user before removing the account
  await svc.from('notifications').delete().eq('user_id', targetId)
  await svc.from('student_activity_records').delete().eq('user_id', targetId)
  await svc.from('merit_transactions').delete().eq('user_id', targetId)
  await svc.from('merit').delete().eq('user_id', targetId)
  await svc.from('attendance').delete().eq('user_id', targetId)
  await svc.from('finance_transactions').delete().eq('created_by', targetId)
  await svc.from('finance_budget_items').delete().eq('created_by', targetId)
  await svc.from('programme_roles').delete().eq('user_id', targetId)
  await svc.from('users').delete().eq('id', targetId)

  const { error: deleteError } = await svc.auth.admin.deleteUser(targetId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'User deleted successfully.' })
}
