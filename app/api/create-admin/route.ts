import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Service role client (for admin operations)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Verify Authorization Header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Check role (must be superadmin)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden. Only Super Admins can create admin accounts.' },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    let { email, password, full_name, phone } = body;

    // Normalize input
    email = email?.toLowerCase().trim();
    full_name = full_name ?? '';
    phone = phone ?? null;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (
      !email.endsWith('@utm.my') &&
      !email.endsWith('@graduate.utm.my')
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

    // Create user (Auth)
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      });

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    if (!newUser?.user) {
      return NextResponse.json(
        { error: 'User creation failed unexpectedly.' },
        { status: 500 }
      );
    }

    const userId = newUser.user.id;

    // 6. Upsert profile (handles trigger timing safely)
    const { error: profileUpsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        role: 'admin',
        full_name,
        phone
      });

    if (profileUpsertError) {
      // rollback user
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: 'Profile update failed: ' + profileUpsertError.message },
        { status: 500 }
      );
    }

    // Remove student record (if exists)
    const { error: studentDeleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', userId);

    // (non-critical, so no rollback)
    if (studentDeleteError) {
      console.warn('Student deletion warning:', studentDeleteError.message);
    }

    // Insert into admins table
    const { error: adminInsertError } = await supabase
      .from('admins')
      .insert({
        id: userId,
        full_name,
        phone
      });

    if (adminInsertError) {
      // FULL rollback
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: 'Admin creation failed. User rolled back.' },
        { status: 500 }
      );
    }

    // Success
    return NextResponse.json(
      { message: `Admin account created successfully for ${email}.` },
      { status: 201 }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal Server Error: ' + err.message },
      { status: 500 }
    );
  }
}