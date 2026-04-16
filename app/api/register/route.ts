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

    // ✅ Validation
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

    // 🔥 1. Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: emailNormalized,
        password,
      });

    console.log("AUTH ERROR:", authError);

    // ❌ Handle auth error properly
    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Email already registered. Please login." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user?.id;

    // ⚠️ Handle email confirmation mode
    if (!userId) {
      return NextResponse.json(
        { message: "Check your email to confirm your account." },
        { status: 200 }
      );
    }

    // 🔥 2. INSERT USER (skip role query to avoid failure)
    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          full_name: full_name || '',
          phone: phone || null,
          matric_number: matric_number || null,
          staff_number: null,
          role_id: 'b2b294d9-15e6-4608-b922-7d8f8eaf90d2',
        },
      ]);

    console.log("USER INSERT ERROR:", userError);

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    // ✅ SUCCESS RESPONSE (IMPORTANT)
    return NextResponse.json(
      { message: 'Registration successful! Please check your email.' },
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