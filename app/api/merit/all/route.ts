import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { DIRECTOR_MERIT } from '@/lib/constants'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await svc.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await svc
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()

  const role = (userData?.roles as any)?.name?.toLowerCase()
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Backfill merit for all programme directors of approved programmes
  const { data: approvedProgs } = await svc
    .from('programmes')
    .select('id, programme_director_id')
    .eq('status', 'Approved')
    .not('programme_director_id', 'is', null)

  if (approvedProgs && approvedProgs.length > 0) {
    await svc.from('merit').upsert(
      approvedProgs.map(p => ({
        user_id:      p.programme_director_id,
        programme_id: p.id,
        points:       DIRECTOR_MERIT,
        status:       'awarded',
        updated_at:   new Date().toISOString(),
      })),
      { onConflict: 'user_id,programme_id', ignoreDuplicates: true }
    )
  }

  // Return all merit records
  const { data: meritData, error } = await svc
    .from('merit')
    .select('id, user_id, programme_id, points, status, updated_at, programmes(name)')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ merit: meritData ?? [] })
}
