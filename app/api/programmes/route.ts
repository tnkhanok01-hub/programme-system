import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Initialize Supabase server client (automatically reads Next.js cookies)
  const supabase = await createClient();

  // Verify session and get user directly from the cookie
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid session.' },
      { status: 401 }
    );
  }

  const userId = user.id;

  // Parse request body
  const body = await request.json();
  const { name, description, category, venue, start_date, end_date, budget } = body;

  // Validate required fields
  if (!name || !start_date || !end_date) {
    return NextResponse.json(
      { error: 'Name, start date, and end date are required.' },
      { status: 400 }
    );
  }

  if (budget !== undefined && budget !== null && parseFloat(budget) > 4999.00) {
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

  // Insert programme using the authenticated client
  const { data: programme, error: programmeError } = await supabase
    .from('programmes')
    .insert({
      name,
      description,
      category,
      venue,
      start_date,
      end_date,
      budget: budget ? parseFloat(budget) : null,
      status: 'Pending',
      programme_director_id: userId
    })
    .select()
    .single();

  if (programmeError) {
    return NextResponse.json(
      { error: programmeError.message },
      { status: 500 }
    );
  }

  // Auto-assign Programme Director role
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

  return NextResponse.json(
    {
      message: 'Programme created successfully.',
      programme
    },
    { status: 201 }
  );
}