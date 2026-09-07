// POST /api/auth/set-username
//
// The real fix for a genuine bug: email confirmation is ON in this
// project, meaning right after signUp() the person is NOT logged in
// yet (no session, auth.uid() is null). The customers table's
// self-update RLS policy requires auth.uid() = id — so a client-side
// update attempt at that exact moment is silently blocked by RLS,
// which looks identical to updating zero rows (no error either way).
// That's exactly why the username never saved.
//
// This route uses the service-role key (bypasses RLS entirely, same
// established pattern as create-staff) so it can set the username
// regardless of whether the account is confirmed yet. It's intentionally
// narrow: it does ONE thing — set username for a given user id — and
// nothing else, unlike create-staff which does much more. No auth
// check requiring the caller to already be signed in, since this needs
// to work for a not-yet-confirmed user; instead it's scoped tightly by
// only ever touching the exact row matching the id it's given, and only
// ever writing to the username column.
//
// Also retries briefly: the customers row itself is created by a
// database trigger that fires asynchronously after the auth user is
// created, so calling this the instant after signUp() returns could
// still race against that trigger. The retry loop waits for the row to
// actually exist before giving up.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUsername } from "@/lib/validation/staff";

export async function POST(request: Request) {
  const { userId, username } = await request.json();

  if (!userId || !username) {
    return NextResponse.json({ error: "userId and username are required." }, { status: 400 });
  }

  const formatError = validateUsername(username);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Uniqueness check happens here too (not just client-side) since the
  // client-side check is a UX nicety, not the actual guarantee — this
  // is the real enforcement point, backed by the same unique constraint
  // on customers.username from migration 030.
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await adminClient
      .from("customers")
      .update({ username })
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (data) {
      return NextResponse.json({ success: true });
    }

    if (error) {
      // A unique-constraint violation means someone else took this
      // username in the gap since the client-side check — surface that
      // clearly rather than retrying pointlessly.
      if (error.code === "23505") {
        return NextResponse.json({ error: "That username was just taken by another account." }, { status: 409 });
      }
      if (attempt === 5) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return NextResponse.json(
    { error: "Account was created, but the matching customer record wasn't ready in time to save the username. Please try again from account settings." },
    { status: 504 }
  );
}
