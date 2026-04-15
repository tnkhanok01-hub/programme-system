// Import both SSR client for cookies and standard client for Service Role
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Initialize user-scoped client to read cookies
    const authSupabase = await createServerClient();
    
    // Check who is making this request via cookies
    const { data: { user }, error: userError } = await authSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 2. Initialize Service Role client for administrative tasks (bypasses RLS)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check role (must be superadmin)
    const { data: profile, error: profileError } = await adminSupabase
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
    const { password } = body; 
    let { email, full_name, phone } = body;

    // Normalize input
    email = email?.toLowerCase().trim();
    full_name = full_name ?? '';
    phone = phone ?? null;

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    if (!email.endsWith('@utm.my') && !email.endsWith('@graduate.utm.my')) {
      return NextResponse.json({ error: 'Only UTM email addresses are allowed.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    // Create new admin user in Auth
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
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

    // Upsert profile (handles trigger timing safely)
    const { error: profileUpsertError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: userId,
        role: 'admin',
        full_name,
        phone
      });

    if (profileUpsertError) {
      // Rollback user creation
      await adminSupabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Profile update failed: ' + profileUpsertError.message }, { status: 500 });
    }

    // Remove student record (if exists)
    const { error: studentDeleteError } = await adminSupabase
      .from('students')
      .delete()
      .eq('id', userId);

    if (studentDeleteError) {
      console.warn('Student deletion warning:', studentDeleteError.message);
    }

    // Insert into admins table
    const { error: adminInsertError } = await adminSupabase
      .from('admins')
      .insert({ id: userId, full_name, phone });

    if (adminInsertError) {
      // FULL rollback
      await adminSupabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Admin creation failed. User rolled back.' }, { status: 500 });
    }

    return NextResponse.json(
      { message: `Admin account created successfully for ${email}.` },
      { status: 201 }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Internal Server Error: ' + errorMessage },
      { status: 500 }
    );
  }
}