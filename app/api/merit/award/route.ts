import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = makeServiceClient()
    const token = auth.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { programme_id } = await request.json()
    if (!programme_id) return NextResponse.json({ error: 'Missing programme_id' }, { status: 400 })

    // Mark post_survey in attendance
    await supabaseAdmin.from('attendance').upsert(
      { user_id: user.id, programme_id, post_survey: true },
      { onConflict: 'user_id,programme_id' }
    )

    // Fetch attendance row to check if fully valid
    const { data: attRow } = await supabaseAdmin
      .from('attendance')
      .select('qr_end, post_survey')
      .eq('user_id', user.id)
      .eq('programme_id', programme_id)
      .maybeSingle()

    if (attRow?.qr_end && attRow?.post_survey) {
      const { data: progRow } = await supabaseAdmin
        .from('programmes')
        .select('attendee_merit_points')
        .eq('id', programme_id)
        .single()
      const meritPoints = Number(progRow?.attendee_merit_points) || 1

      const { error: meritError } = await supabaseAdmin.from('merit').upsert(
        {
          user_id:      user.id,
          programme_id,
          points:       meritPoints,
          status:       'awarded',
          updated_at:   new Date().toISOString(),
        },
        { onConflict: 'user_id,programme_id' }
      )
      if (meritError) {
        return NextResponse.json({ error: meritError.message }, { status: 500 })
      }
      return NextResponse.json({ merit_awarded: true })
    }

    return NextResponse.json({ merit_awarded: false, reason: 'attendance incomplete' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
