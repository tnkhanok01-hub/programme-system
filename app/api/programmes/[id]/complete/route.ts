import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { POST_CHECKLIST } from '@/lib/constants'
import { buildCommitteeMeritAwards, type CommitteeMeritMember } from '@/lib/committeeMeritAwards.js'
import { awardMerit } from '@/lib/meritEngine'
import { sendEmail } from '@/lib/sendEmail'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type RoleJoin = { name?: string | null } | { name?: string | null }[] | null

function getRoleName(roles: RoleJoin) {
  return (Array.isArray(roles) ? roles[0]?.name : roles?.name)?.toLowerCase()
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = auth.replace('Bearer ', '')
  const svc = makeServiceClient()
  const { data: { user }, error: authError } = await svc.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: programmeId } = await params

  const { data: caller } = await svc
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()

  const callerRole = getRoleName(caller?.roles as RoleJoin)
  if (callerRole !== 'admin' && callerRole !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: programme, error: programmeError } = await svc
    .from('programmes')
    .select('id, name, status, category, advisor_id, programme_director_id')
    .eq('id', programmeId)
    .single()

  if (programmeError || !programme) {
    return NextResponse.json({ error: 'Programme not found.' }, { status: 404 })
  }

  if (callerRole === 'admin' && programme.advisor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden: you are not the assigned advisor.' }, { status: 403 })
  }

  if (programme.status !== 'Approved' && programme.status !== 'Completed') {
    return NextResponse.json(
      { error: `Cannot complete: programme status is "${programme.status}", expected "Approved".` },
      { status: 409 }
    )
  }

  const { data: postDocs, error: docsError } = await svc
    .from('programme_documents')
    .select('doc_type')
    .eq('programme_id', programmeId)
    .eq('phase', 'post')

  if (docsError) return NextResponse.json({ error: docsError.message }, { status: 500 })

  const uploadedTypes = new Set((postDocs ?? []).map((doc) => doc.doc_type))
  const missingDocs = POST_CHECKLIST
    .filter((item) => !uploadedTypes.has(item.key))
    .map((item) => item.label)

  if (missingDocs.length > 0) {
    return NextResponse.json(
      { error: 'Post-programme documents are incomplete.', missingDocs },
      { status: 400 }
    )
  }

  const { data: meritMeta } = await svc
    .from('programme_merit_metadata')
    .select('activity_pillar, programme_level')
    .eq('programme_id', programmeId)
    .maybeSingle()

  const { data: committeeMembers, error: committeeError } = await svc
    .from('programme_roles')
    .select('user_id, role, status')
    .eq('programme_id', programmeId)
    .eq('status', 'approved')

  if (committeeError) return NextResponse.json({ error: committeeError.message }, { status: 500 })

  const awards = buildCommitteeMeritAwards({
    directorId: programme.programme_director_id,
    committeeMembers: (committeeMembers ?? []) as CommitteeMeritMember[],
  })

  for (const award of awards) {
    await awardMerit({
      supabase: svc,
      userId: award.userId,
      programmeId,
      points: award.points,
      transactionType: 'award',
      sourceType: 'committee_role',
      sourceRef: award.role,
      role: award.role,
      actorId: user.id,
      programmeName: programme.name,
      activityPillar: meritMeta?.activity_pillar ?? programme.category ?? 'general',
      programmeLevel: meritMeta?.programme_level ?? 'college',
      metadata: { awarded_from: 'programme_completion' },
    })
  }

  const { data: updated, error: updateError } = await svc
    .from('programmes')
    .update({ status: 'Completed' })
    .eq('id', programmeId)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  if (programme.programme_director_id) {
    const { data: director } = await svc
      .from('users')
      .select('email, full_name')
      .eq('id', programme.programme_director_id)
      .single()

    await svc.from('notifications').insert({
      user_id: programme.programme_director_id,
      title: 'Programme Completed & Merit Awarded',
      message: `Your programme "${programme.name}" has been marked as completed and merit points have been awarded to you and your committee. Congratulations!`,
    })

    if (director?.email) {
      await sendEmail(
        director.email,
        'Programme Completed & Merit Awarded',
        `Dear ${director.full_name ?? 'Programme Director'},\n\nCongratulations! Your programme "${programme.name}" has been successfully completed.\n\nMerit points have been awarded to you and all committee members in recognition of your contributions.\n\nRegards,\nUTM-SPMS`
      ).catch(() => {})
    }
  }

  return NextResponse.json({
    message: 'Programme completed and committee merit awarded.',
    programme: updated,
    awards,
  })
}
