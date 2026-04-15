import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Initialize server client for consistency
  const supabase = await createClient();

  const body = await request.json();
  const { email, password, full_name, matric_number, phone } = body;

  // Validate required fields
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    );
  }

  // Enforce UTM email domain server-side
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

  // Sign up user
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