import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const body = await request.json();
  const { email, password, full_name, matric_number, phone } = body;

  // Validate required fields
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    );
  }

  // Enforce UTM email domain server-side (cannot be bypassed unlike frontend check)
  if (!email.endsWith('@utm.my') && !email.endsWith('@graduate.utm.my')) {
    return NextResponse.json(
      { error: 'Only UTM email addresses are allowed (@utm.my or @graduate.utm.my).' },
      { status: 400 }
    );
  }

  // Password strength check
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    );
  }

  // Sign up — role is auto-set to 'student' by DB trigger, never accepted from request body
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: full_name || '' }
    }
  });

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: 400 }
    );
  }

  // Update profile with extra details if provided
  // Profile row already created by DB trigger at this point
  if (authData.user && (full_name || matric_number || phone)) {
    await supabase
      .from('profiles')
      .update({ full_name, matric_number, phone })
      .eq('id', authData.user.id);
  }

  return NextResponse.json(
    { message: 'Registration successful! Please check your email to confirm your account.' },
    { status: 201 }
  );
}