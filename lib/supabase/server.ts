// Supabase client for use on the SERVER (Server Components, Server Actions, Route Handlers).
// This is what you'll import in things like a page.tsx that loads a customer's pets
// directly on the server before sending HTML to the browser.
//
// It's async because reading cookies in Next.js 15+/16 requires an await.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll was called from a Server Component, which can't set cookies.
            // This is safe to ignore IF you have middleware refreshing sessions
            // (which we're about to set up below).
          }
        },
      },
    }
  );
}
