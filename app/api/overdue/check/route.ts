import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/sendEmail'

const POST_CHECKLIST_KEYS = ['program_report', 'financial_report', 'survey_report']
const REQUIRED_DURING_DOCS = 5

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function daysSinceDate(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(dateStr)
  end.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: Request) {
  const svc = makeServiceClient()

  // Auth check
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = auth.replace('Bearer ', '')

  const { data: { user }, error: authError } = await svc.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await svc
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()

  if (profileError) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  const role = (profile?.roles as any)?.name?.toLowerCase()
  if (role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all Approved programmes
  const { data: programmes, error: progError } = await svc
    .from('programmes')
    .select('id, name, organiser, end_date, programme_director_id, advisor_id')
    .eq('status', 'Approved')

  if (progError || !programmes) {
    return NextResponse.json({ error: 'Failed to fetch programmes' }, { status: 500 })
  }

  if (programmes.length === 0) {
    return NextResponse.json({ during: [], post: [] })
  }

  const programmeIds = programmes.map((p: any) => p.id)

  // Fetch documents for these programmes
  const { data: allDocs } = await svc
    .from('programme_documents')
    .select('programme_id, phase, doc_type')
    .in('programme_id', programmeIds)

  const docs: { programme_id: string; phase: string; doc_type: string | null }[] = allDocs ?? []

  // Pre-group docs by programme_id for O(1) lookup
  const docsByProg = new Map<string, { programme_id: string; phase: string; doc_type: string | null }[]>()
  docs.forEach(d => {
    const arr = docsByProg.get(d.programme_id) ?? []
    arr.push(d)
    docsByProg.set(d.programme_id, arr)
  })

  // Fetch notification_sent_log to avoid duplicate warnings
  const { data: sentLog } = await svc
    .from('notification_sent_log')
    .select('programme_id')
    .in('programme_id', programmeIds)
    .eq('notification_type', 'post_warning')

  const alreadySent = new Set((sentLog ?? []).map((s: any) => s.programme_id))

  // Collect unique user IDs for email/notification lookup
  const userIds = new Set<string>()
  programmes.forEach((p: any) => {
    if (p.programme_director_id) userIds.add(p.programme_director_id)
    if (p.advisor_id) userIds.add(p.advisor_id)
  })

  const { data: userRows } = await svc
    .from('users')
    .select('id, email, full_name')
    .in('id', Array.from(userIds))

  const userMap = new Map<string, { id: string; email: string; full_name: string }>(
    (userRows ?? []).map((u: any) => [u.id, u])
  )

  const duringOverdue: { id: string; name: string; organiser: string; end_date: string; days_overdue: number }[] = []
  const postOverdue:   { id: string; name: string; organiser: string; end_date: string; days_overdue: number }[] = []

  for (const prog of programmes as any[]) {
    const days = daysSinceDate(prog.end_date)
    const progDocs = docsByProg.get(prog.id) ?? []

    // Post completeness check
    const postComplete = POST_CHECKLIST_KEYS.every(key =>
      progDocs.some(d => d.phase === 'post' && d.doc_type === key)
    )

    // Post overdue takes priority: > 7 days after end_date AND incomplete
    if (days > 7 && !postComplete) {
      postOverdue.push({
        id: prog.id,
        name: prog.name,
        organiser: prog.organiser,
        end_date: prog.end_date,
        days_overdue: days - 7,
      })
    } else {
      // During overdue only if not already in post-overdue: past end_date AND fewer than REQUIRED_DURING_DOCS during docs
      const duringCount = progDocs.filter(d => d.phase === 'during').length
      if (days > 0 && duringCount < REQUIRED_DURING_DOCS) {
        duringOverdue.push({
          id: prog.id,
          name: prog.name,
          organiser: prog.organiser,
          end_date: prog.end_date,
          days_overdue: days,
        })
      }
    }

    // Post warning trigger: >= 4 days AND incomplete AND not already sent
    if (days >= 4 && !postComplete && !alreadySent.has(prog.id)) {
      const director = prog.programme_director_id ? userMap.get(prog.programme_director_id) : null
      const advisor  = prog.advisor_id            ? userMap.get(prog.advisor_id)            : null
      const recipients = [director, advisor]
        .filter(Boolean) as { id: string; email: string; full_name: string }[]
      const unique = recipients.filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i)

      const deadline = new Date(prog.end_date)
      deadline.setDate(deadline.getDate() + 7)
      const deadlineStr = deadline.toLocaleDateString('en-MY', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

      if (unique.length > 0) {
        await Promise.all(unique.map(async recipient => {
          await svc.from('notifications').insert({
            user_id: recipient.id,
            title: 'Post-Phase Checklist Due Soon',
            message: `Programme "${prog.name}" post-phase checklist must be completed in 3 days. Please upload the Program Report, Financial Report, and Survey Report.`,
          })

          await sendEmail(
            recipient.email,
            `Action Required: Post-Phase Checklist Due in 3 Days — ${prog.name}`,
            `Dear ${recipient.full_name},\n\nThis is a reminder that the post-phase checklist for "${prog.name}" is due by ${deadlineStr}.\n\nThe following documents are still required:\n- Program Report\n- Financial Report\n- Survey Report\n\nPlease log in to the system and upload the missing documents before the deadline.\n\nUTM SPMS`
          ).catch((err) => { console.error('Failed to send overdue warning email:', err) })
        }))

        // Record that the warning was sent for this programme (tolerate unique-constraint on concurrent runs)
        try {
          await svc.from('notification_sent_log').insert({
            programme_id: prog.id,
            notification_type: 'post_warning',
          })
        } catch (_) { /* ignore duplicate-key errors on concurrent runs */ }
      }
    }
  }

  return NextResponse.json({ during: duringOverdue, post: postOverdue })
}
