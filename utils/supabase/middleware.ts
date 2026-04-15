// utils/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Creates an initial response object that forwards the incoming request.
  // This allows us to modify the response cookies later.
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Uses createServerClient to initialize Supabase with cookie handling configuration.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Gets all cookies from the incoming request.
        getAll() {
          return request.cookies.getAll();
        },
        // Sets new cookies to both the request (for immediate use) and the response (to update the browser).
        setAll(cookiesToSet) {
          // Updates the incoming request cookies so subsequent Server Components can see the fresh token.
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          
          // Re-creates the response object to ensure it carries the updated request.
          supabaseResponse = NextResponse.next({
            request,
          });
          
          // Writes the updated cookies into the response to be saved in the user's browser.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Calls getUser() to verify the current session.
  // This step implicitly triggers the token refresh process if the token is close to expiring.
  // IMPORTANT: Do not add any logic between createServerClient and getUser().
  await supabase.auth.getUser();

  // Returns the response object containing the potentially updated cookies.
  return supabaseResponse;
}