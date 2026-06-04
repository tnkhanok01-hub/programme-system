import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getEncryptionKey() {
  const secret = process.env.REGISTRATION_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Missing registration encryption secret');
  return crypto.createHash('sha256').update(secret).digest();
}

function decryptPassword(encryptedPassword: string) {
  const [ivText, tagText, encryptedText] = encryptedPassword.split('.');
  if (!ivText || !tagText || !encryptedText) {
    throw new Error('Invalid encrypted password');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivText, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Verify the pending registration token before creating auth.users.
  const { data: pending, error: pendingError } = await supabase
    .from('pending_registrations')
    .select('*')
    .eq('token_hash', sha256(token))
    .single();

  if (pendingError || !pending) {
    console.error('Pending registration lookup error:', pendingError);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  if (new Date(pending.expires_at).getTime() <= Date.now()) {
    await supabase
      .from('pending_registrations')
      .delete()
      .eq('id', pending.id);

    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  // 2. Prevent duplicate creation if the link is reused after a successful confirm.
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingAuthUser = existingUsers?.users?.find(
    user => user.email?.toLowerCase() === pending.email.toLowerCase()
  );

  if (existingAuthUser) {
    await supabase
      .from('pending_registrations')
      .delete()
      .eq('id', pending.id);

    return NextResponse.redirect(`${origin}/login?confirmed=true`);
  }

  let password: string;
  try {
    password = decryptPassword(pending.encrypted_password);
  } catch (decryptError) {
    console.error('Pending password decrypt error:', decryptError);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email: pending.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: pending.full_name || '',
      matric_number: pending.matric_number || null,
      phone: pending.phone || null,
    },
  });

  if (createError || !authData.user) {
    console.error('Auth user create error:', createError);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  const user = authData.user;

  // 3. Check if already inserted (prevent duplicate on double-click)
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (existing) {
    await supabase
      .from('pending_registrations')
      .delete()
      .eq('id', pending.id);

    // Already confirmed before, just redirect to login
    return NextResponse.redirect(`${origin}/login?confirmed=true`);
  }

  // 4. Get student role_id from roles table
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'student')
    .single();

  if (roleError || !roleData) {
    console.error('Role fetch error:', roleError);
    await supabase.auth.admin.deleteUser(user.id);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  // 5. Now insert into users table - email is confirmed
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email,
      full_name: pending.full_name || '',
      phone: pending.phone || null,
      matric_number: pending.matric_number || null,
      staff_number: null,
      role_id: roleData.id,
    });

  if (insertError) {
    console.error('Users insert error:', insertError);
    await supabase.auth.admin.deleteUser(user.id);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  await supabase
    .from('pending_registrations')
    .delete()
    .eq('id', pending.id);

  // 6. Success - redirect to login
  return NextResponse.redirect(`${origin}/login?confirmed=true`);
}
