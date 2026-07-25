// Supabase client for use in the BROWSER (Client Components — files with "use client" at the top).
// This is what you'll import in things like the sign-in form, since that form needs
// to run in the browser to respond to typing/clicking.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
