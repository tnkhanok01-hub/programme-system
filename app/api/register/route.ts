import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { email, password, full_name, matric_number, phone } = body;

    const emailNormalized = email?.toLowerCase();

    // 1. Validate
    if (!emailNormalized || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (
      !emailNormalized.endsWith('@utm.my') &&
      !emailNormalized.endsWith('@graduate.utm.my')
    ) {
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

    // 2. Check for duplicate BEFORE calling signUp
    //    signUp with service role doesn't send a confirmation email for duplicates —
    //    it just silently succeeds or returns a vague error, so we check first.
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const alreadyExists = existingUsers?.users?.some(
      u => u.email?.toLowerCase() === emailNormalized
    )

    if (alreadyExists) {
      return NextResponse.json(
        { error: 'Email already registered. Please login.' },
        { status: 409 }  // 409 Conflict — front-end checks for this status
      );
    }

    // 3. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailNormalized,
      password,
      options: {
        data: {
          full_name: full_name || '',
          matric_number: matric_number || null,
          phone: phone || null,
        }
      }
    });

    if (authError) {
      // Fallback case-insensitive duplicate check on the error message
      const msg = authError.message.toLowerCase()
      if (
        msg.includes('already registered') ||
        msg.includes('already exists') ||
        msg.includes('user already') ||
        msg.includes('email already')
      ) {
        return NextResponse.json(
          { error: 'Email already registered. Please login.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Registration successful! Please check your email to confirm your account.' },
      { status: 201 }
    );

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}