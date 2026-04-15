// middleware.ts
import { type NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

// Executes the session update logic for every matched incoming request.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Configures the paths where this middleware should run.
export const config = {
  matcher: [
    /*
     * Matches all request paths except for the ones starting with:
     * - _next/static (static files like CSS/JS)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any file with an extension like .svg, .png, .jpg, .jpeg, .gif, .webp
     * * Skips these static assets to improve performance, as they don't need authentication checks.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};