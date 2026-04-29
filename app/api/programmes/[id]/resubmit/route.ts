import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.replace('Bearer ', '');
}

function makeUserClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── POST /api/programmes/[id]/resubmit ──────────────────────────────────────
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userClient = makeUserClient(token);
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: programmeId } = await params;

  // Verify the programme exists and caller is the Programme Director
  const { data: programme, error: fetchError } = await makeServiceClient()
    .from('programmes')
    .select('id, status, programme_director_id')
    .eq('id', programmeId)
    .single();

  if (fetchError || !programme) {
    return NextResponse.json({ error: 'Programme not found.' }, { status: 404 });
  }

  if (programme.programme_director_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the Programme Director can resubmit this programme.' },
      { status: 403 }
    );
  }

  if (programme.status !== 'Rejected') {
    return NextResponse.json(
      { error: 'Only rejected programmes can be resubmitted.' },
      { status: 409 }
    );
  }

  // Parse updated fields from body
  const body = await request.json();
  const { name, category, venue, budget, start_date, end_date, description } = body;

  if (!name || !start_date || !end_date) {
    return NextResponse.json(
      { error: 'Name, start date, and end date are required.' },
      { status: 400 }
    );
  }

  if (new Date(end_date) < new Date(start_date)) {
    return NextResponse.json(
      { error: 'End date must be after start date.' },
      { status: 400 }
    );
  }

  // Update the programme: apply edits + reset status + clear rejection_reason
  const { data: updated, error: updateError } = await makeServiceClient()
    .from('programmes')
    .update({
      name,
      category,
      venue,
      budget: budget ?? null,
      start_date,
      end_date,
      description,
      status: 'Pending',
      rejection_reason: null,
    })
    .eq('id', programmeId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Programme resubmitted successfully.',
    programme: updated,
  });
}