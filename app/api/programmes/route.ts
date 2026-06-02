import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendEmail } from "@/lib/sendEmail";

export async function POST(request: Request) {

  // 1. Get auth token from request header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  // 2. Create a user-scoped client using their token
  //    This makes all queries run AS the user, so RLS recognises them
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );

  // 3. Verify the token and get user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid session.' },
      { status: 401 }
    );
  }

  const userId = user.id;

  // 4. Parse request body
  const body = await request.json();
  const { name, description, category, organiser, venue, start_date, end_date, budget, advisor_id } = body;

  // 5. Validate required fields
  if (!name || !start_date || !end_date) {
    return NextResponse.json(
      { error: 'Name, start date, and end date are required.' },
      { status: 400 }
    );
  }

  if (!advisor_id) {
    return NextResponse.json(
      { error: 'An advisor must be selected.' },
      { status: 400 }
    );
  }

  if (budget !== undefined && budget !== null && parseFloat(budget) > 4999.99) {
    return NextResponse.json(
      { error: 'Budget cannot exceed RM4,999.99.' },
      { status: 400 }
    );
  }

  if (new Date(end_date) < new Date(start_date)) {
    return NextResponse.json(
      { error: 'End date must be after start date.' },
      { status: 400 }
    );
  }

  // 6. Insert programme — RLS now recognises auth.uid() correctly
  const { data: programme, error: programmeError } = await supabase
    .from('programmes')
    .insert({
      name,
      description,
      category,
      organiser,
      venue,
      start_date,
      end_date,
      budget: budget ? parseFloat(budget) : null,
      status: 'Pending',
      programme_director_id: userId,
      advisor_id
    })
    .select()
    .single();

  if (programmeError) {
    return NextResponse.json(
      { error: programmeError.message },
      { status: 500 }
    );
  }

  // 7. Auto-assign Programme Director role
  const { error: roleError } = await supabase
    .from('programme_roles')
    .insert({
      programme_id: programme.id,
      user_id: userId,
      role: 'Programme Director',
      status: 'approved'
    });

  if (roleError) {
    return NextResponse.json(
      { error: 'Programme created but role assignment failed: ' + roleError.message },
      { status: 500 }
    );
  }

  // 8. Notify the assigned advisor only
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (advisor_id) {
    await adminClient.from('notifications').insert({
      user_id: advisor_id,
      title: 'New Programme Needs Review',
      message: `"${name}" has been submitted and is waiting for your review.`,
    });

    const { data: advisorUser } = await adminClient
      .from('users')
      .select('email, full_name')
      .eq('id', advisor_id)
      .single();

    if (advisorUser?.email) {
      await sendEmail(
        advisorUser.email,
        'New Programme Needs Review',
        `Dear ${advisorUser.full_name ?? 'Advisor'},\n\nA new programme "${name}" has been submitted and is awaiting your review.\n\nPlease log in to UTM-SPMS to review it.\n\nRegards,\nUTM-SPMS`
      ).catch(() => {})
    }
  }

  // 9. Return success
  return NextResponse.json(
    {
      message: 'Programme created successfully.',
      programme
    },
    { status: 201 }
  );
}