import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { awardMerit } from '@/lib/meritEngine'

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
        .select('name, attendee_merit_points, category')
        .eq('id', programme_id)
        .single()

      const { data: meritMeta } = await supabaseAdmin
        .from('programme_merit_metadata')
        .select('activity_pillar, programme_level, participant_merit_points')
        .eq('programme_id', programme_id)
        .maybeSingle()

      const meritPoints =
        Number(meritMeta?.participant_merit_points) ||
        Number(progRow?.attendee_merit_points) ||
        1

      await awardMerit({
        supabase: supabaseAdmin,
        userId: user.id,
        programmeId: programme_id,
        points: meritPoints,
        transactionType: 'award',
        sourceType: 'participation',
        sourceRef: 'attendance_post_survey',
        role: 'Participant',
        actorId: user.id,
        programmeName: progRow?.name ?? 'Programme',
        activityPillar: meritMeta?.activity_pillar ?? progRow?.category ?? 'general',
        programmeLevel: meritMeta?.programme_level ?? 'college',
        metadata: { awarded_from: 'qr_end_and_post_survey' },
      })

      return NextResponse.json({ merit_awarded: true })
    }

    return NextResponse.json({ merit_awarded: false, reason: 'attendance incomplete' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to award merit'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
