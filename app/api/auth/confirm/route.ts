import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!token_hash || type !== 'email') {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Verify the email token
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type: 'email',
  });

  if (verifyError || !data.user) {
    console.error('Verify error:', verifyError);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  const user = data.user;

  // 2. Check if already inserted (prevent duplicate on double-click)
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (existing) {
    // Already confirmed before, just redirect to login
    return NextResponse.redirect(`${origin}/login?confirmed=true`);
  }

  // 3. Get the extra data stored in auth metadata during registration
  const meta = user.user_metadata || {};

  // 4. Get student role_id from roles table
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'student')
    .single();

  if (roleError || !roleData) {
    console.error('Role fetch error:', roleError);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  // 5. Now insert into users table — email is confirmed
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: user.id,
      full_name: meta.full_name || '',
      phone: meta.phone || null,
      matric_number: meta.matric_number || null,
      staff_number: null,
      role_id: roleData.id,
    });

  if (insertError) {
    console.error('Users insert error:', insertError);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  // 6. Success — redirect to login
  return NextResponse.redirect(`${origin}/login?confirmed=true`);
}