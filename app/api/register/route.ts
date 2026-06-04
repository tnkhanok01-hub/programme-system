import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendEmail } from '@/lib/sendEmail';

const CONFIRMATION_TTL_HOURS = 24;

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getEncryptionKey() {
  const secret = process.env.REGISTRATION_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Missing registration encryption secret');
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptPassword(password: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { email, password, full_name, matric_number, phone } = body;

    const emailNormalized = email?.trim().toLowerCase();

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

    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const confirmationToken = crypto.randomBytes(32).toString('base64url');
    const origin = new URL(request.url).origin;
    const confirmationUrl = `${origin}/api/auth/confirm?token=${confirmationToken}`;

    // 3. Store a pending registration only. Do not create auth.users until confirmation.
    const { error: pendingError } = await supabase
      .from('pending_registrations')
      .upsert({
        email: emailNormalized,
        encrypted_password: encryptPassword(password),
        token_hash: sha256(confirmationToken),
        full_name: full_name || '',
        matric_number: matric_number || null,
        phone: phone || null,
        expires_at: expiresAt,
      }, {
        onConflict: 'email',
      });

    if (pendingError) {
      console.error('Pending registration error:', pendingError);
      return NextResponse.json(
        { error: 'Unable to start registration. Please try again.' },
        { status: 400 }
      );
    }

    try {
      await sendEmail(
        emailNormalized,
        'Confirm your UTM SPMS account',
        [
          'Please confirm your UTM SPMS account by opening this link:',
          confirmationUrl,
          '',
          `This link expires in ${CONFIRMATION_TTL_HOURS} hours.`,
          'If you did not create this account, you can ignore this email.',
        ].join('\n')
      );
    } catch (emailError) {
      await supabase
        .from('pending_registrations')
        .delete()
        .eq('email', emailNormalized);

      console.error('Confirmation email error:', emailError);
      return NextResponse.json(
        { error: 'Unable to send confirmation email. Please try again.' },
        { status: 500 }
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
