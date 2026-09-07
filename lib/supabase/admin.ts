// Supabase client using the SERVICE ROLE KEY — full admin privileges,
// bypasses Row Level Security entirely. This must NEVER be imported into
// any Client Component or anything that ships to the browser — only
// Route Handlers (app/api/.../route.ts) running on the server. The key
// itself comes from an env var WITHOUT the NEXT_PUBLIC_ prefix, so
// Next.js never bundles it into client-side JavaScript.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only, no NEXT_PUBLIC_ prefix) — find it in Supabase Dashboard > Project Settings > API > service_role key."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
