import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Use service role for server-side operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the token and get user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

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

  if (budget !== undefined && budget !== null && budget > 4999.99) {
    return NextResponse.json(
      { error: 'Budget cannot exceed RM4,999.99.' },
      { status: 400 }
    );
  }

  if (new Date(end_date) <= new Date(start_date)) {
    return NextResponse.json(
      { error: 'End date must be after start date.' },
      { status: 400 }
    );
  }

  // Insert programme
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

  // Return success
  return NextResponse.json(
    {
      message: 'Programme created successfully.',
      programme
    },
    { status: 201 }
  );
}