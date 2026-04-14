import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const body = await request.json();
  const { email, password, full_name, matric_number, phone } = body;

  // Validation
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    );
  }

  if (!email.endsWith('@utm.my') && !email.endsWith('@graduate.utm.my')) {
    return NextResponse.json(
      { error: 'Only UTM email addresses are allowed.' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    );
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || 'Signup failed' },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  // 2. Insert into students table (IMPORTANT FIX)
  const { error: studentError } = await supabase
    .from('students')
    .insert([
      {
        id: userId,
        full_name: full_name || '',
        matric_number: matric_number || '',
        phone: phone || null,
      },
    ]);

  if (studentError) {
    return NextResponse.json(
      { error: studentError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: 'Registration successful! Please check your email.' },
    { status: 201 }
  );
}