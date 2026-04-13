import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  // 1. Check session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  // 2. Parse request body
  const body = await request.json();
  const { name, description, category, venue, start_date, end_date, budget } = body;

  // 3. Validate required fields
  if (!name || !start_date || !end_date) {
    return NextResponse.json(
      { error: 'Name, start date, and end date are required.' },
      { status: 400 }
    );
  }

  if (budget && budget > 4999) {
    return NextResponse.json(
      { error: 'Budget cannot exceed RM4,999.00.' },
      { status: 400 }
    );
  }

  if (new Date(end_date) <= new Date(start_date)) {
    return NextResponse.json(
      { error: 'End date must be after start date.' },
      { status: 400 }
    );
  }

  // 4. Insert programme (auto-assign creator as director)
  const { data: programme, error: programmeError } = await supabase
    .from('programmes')
    .insert({
      name,
      description,
      category,
      venue,
      start_date,
      end_date,
      budget,
      status: 'Pending',
      programme_director_id: userId  // auto-assigned, never from user input
    })
    .select()
    .single();

  if (programmeError) {
    return NextResponse.json(
      { error: programmeError.message },
      { status: 500 }
    );
  }

  // 5. Auto-assign Programme Director role in programme_roles
  const { error: roleError } = await supabase
    .from('programme_roles')
    .insert({
      programme_id: programme.id,
      user_id: userId,
      role: 'Programme Director'
    });

  if (roleError) {
    return NextResponse.json(
      { error: 'Programme created but role assignment failed: ' + roleError.message },
      { status: 500 }
    );
  }

  // 6. Return success
  return NextResponse.json(
    { 
      message: 'Programme created successfully.',
      programme 
    },
    { status: 201 }
  );
}