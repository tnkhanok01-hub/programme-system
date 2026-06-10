import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type MeritTransaction = {
  id: string
  points: number | string | null
  transaction_type: string | null
  source_type: string | null
  role: string | null
  activity_pillar: string | null
  programme_level: string | null
  reason: string | null
  created_at: string
  programmes?: { name: string | null } | null
}

type RawMeritTransaction = Omit<MeritTransaction, 'programmes'> & {
  programmes?: { name: string | null } | { name: string | null }[] | null
}

export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await svc.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: transactions, error } = await svc
    .from('merit_transactions')
    .select('id, points, transaction_type, source_type, role, activity_pillar, programme_level, reason, created_at, programmes(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = ((transactions ?? []) as RawMeritTransaction[]).map((tx) => ({
    ...tx,
    programmes: Array.isArray(tx.programmes) ? tx.programmes[0] ?? null : tx.programmes ?? null,
  }))
  const total = rows.reduce((sum, tx) => sum + Number(tx.points || 0), 0)
  const byPillar = rows.reduce((acc: Record<string, number>, tx) => {
    const key = tx.activity_pillar ?? 'general'
    acc[key] = (acc[key] ?? 0) + Number(tx.points || 0)
    return acc
  }, {})

  return NextResponse.json({
    total,
    byPillar,
    transactions: rows,
  })
}
