/**
 * Authenticated users may set only their own username (SEC-001).
 * Issue #5: require an ACTIVE customer row even when using service_role.
 * Supports Supabase SSR cookies or a verified Supabase bearer token.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieChanges: Array<(response: NextResponse) => void> = [];

  function respond(payload: Record<string, unknown>, status = 200) {
    const response = NextResponse.json(payload, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
    for (const apply of cookieChanges) apply(response);
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publicKey) {
    console.error("set-username: Supabase public configuration is missing");
    return respond({ error: "Server configuration error" }, 500);
  }

  try {
    const authorization = request.headers.get("authorization");
    let authenticatedUserId: string | undefined;

    if (authorization !== null) {
      const bearer = /^Bearer\s+(\S+)$/i.exec(authorization);
      if (!bearer) return respond({ error: "Unauthorized" }, 401);

      const publicClient = createClient(supabaseUrl, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await publicClient.auth.getUser(bearer[1]);
      if (error || !data.user) return respond({ error: "Unauthorized" }, 401);
      authenticatedUserId = data.user.id;
    } else {
      const cookieClient = createServerClient(supabaseUrl, publicKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookieChanges.push((response) => {
              for (const { name, value, options } of cookiesToSet) {
                response.cookies.set(name, value, options);
              }
            });
          },
        },
      });
      const { data, error } = await cookieClient.auth.getUser();
      if (error || !data.user) return respond({ error: "Unauthorized" }, 401);
      authenticatedUserId = data.user.id;

      // Browser cookie auth must be same-origin to prevent CSRF.
      const origin = request.headers.get("origin");
      if (!origin || origin !== new URL(request.url).origin) {
        return respond({ error: "Forbidden origin" }, 403);
      }
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2048) return respond({ error: "Request body too large" }, 413);

    const text = await request.text();
    if (text.length > 2048) return respond({ error: "Request body too large" }, 413);

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return respond({ error: "Invalid JSON" }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respond({ error: "Invalid request body" }, 400);
    }
    const input = body as Record<string, unknown>;
    if (input.userId !== undefined && input.userId !== authenticatedUserId) {
      return respond({ error: "Cannot edit another user's username" }, 403);
    }

    if (typeof input.username !== "string") {
      return respond({ error: "A username is required" }, 400);
    }

    const username = input.username.trim();
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
      return respond(
        { error: "Username must be 3–30 characters and contain only letters, numbers, underscores, periods or hyphens" },
        400
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("set-username: SUPABASE_SERVICE_ROLE_KEY is missing");
      return respond({ error: "Server configuration error" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Unlike a regular browser query, service_role bypasses RLS. Check the
    // authenticated customer's status explicitly BEFORE privileged mutation.
    const { data: customer, error: accountError } = await admin
      .from("customers")
      .select("id, status")
      .eq("id", authenticatedUserId)
      .maybeSingle();

    if (accountError || !customer) {
      return respond({ error: "Customer account could not be verified" }, 403);
    }
    if (customer.status !== "active") {
      return respond({ error: "Customer account is not active" }, 403);
    }

    const { data: updated, error: updateError } = await admin
      .from("customers")
      .update({ username })
      .eq("id", authenticatedUserId)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (updateError) {
      if (updateError.code === "23505") {
        return respond({ error: "Username is already taken" }, 409);
      }
      console.error("set-username: database update failed", updateError.code);
      return respond({ error: "Unable to update username" }, 500);
    }

    if (!updated) return respond({ error: "Customer account is no longer active" }, 403);
    return respond({ success: true, userId: authenticatedUserId, username });
  } catch (error) {
    console.error("set-username: unexpected error", error);
    return respond({ error: "Unable to update username" }, 500);
  }
}
