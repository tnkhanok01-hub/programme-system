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
