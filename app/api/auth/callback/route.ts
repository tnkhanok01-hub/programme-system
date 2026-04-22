import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  if (type === 'recovery' || code) {
    return NextResponse.redirect(`${origin}/update-password`);
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}