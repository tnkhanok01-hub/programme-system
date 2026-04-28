import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // ── Check role from 'users' table joined with 'roles' ──
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('*, roles(name)')
      .eq('id', user.id)
      .single();

    const roleName = userRecord?.roles?.name?.toLowerCase();

    if (userRecordError || roleName !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden. Only Super Admins can create admin accounts.' },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    let { email, password, full_name, phone, matric_number } = body;

    email         = email?.toLowerCase().trim();
    full_name     = full_name ?? '';
    phone         = phone ?? null;
    matric_number = matric_number ?? null;

    // Validate
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    if (!email.endsWith('@utm.my') && !email.endsWith('@graduate.utm.my')) {
      return NextResponse.json({ error: 'Only UTM email addresses are allowed.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    // Get admin role_id from roles table
    const { data: roleRecord, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .ilike('name', 'admin')
      .single();

    if (roleError || !roleRecord) {
      return NextResponse.json(
        { error: "Role 'admin' not found in roles table." },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!newUser?.user) {
      return NextResponse.json({ error: 'User creation failed unexpectedly.' }, { status: 500 });
    }

    const userId = newUser.user.id;

    // Upsert into users table with admin role_id
    const { error: usersUpsertError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        role_id: roleRecord.id,
        full_name,
        phone,
        matric_number,
        email,
      });

    if (usersUpsertError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to save user: ' + usersUpsertError.message },
        { status: 500 }
      );
    }

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