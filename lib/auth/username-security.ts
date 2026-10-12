// SERVER-ONLY utility for Issue #6. Import only from app/api/ route handlers.
// Never export service_role access or username->email information to clients.
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import type { createAdminClient } from "@/lib/supabase/admin";

export type AuthScope = "login" | "availability";

type Admin = ReturnType<typeof createAdminClient>;

export function isSameOriginJsonPost(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const contentType = request.headers.get("content-type") ?? "";
  return origin === new URL(request.url).origin &&
    /^application\/json(?:\s*;|$)/i.test(contentType);
}

export async function readSmallJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  const rawLength = request.headers.get("content-length");
  if (rawLength && Number(rawLength) > 2048) return null;
  const raw = await request.text();
  if (raw.length > 2048) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return data && typeof data === "object" && !Array.isArray(data)
      ? data as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

// A durable, atomic, per-IP database rate limit. Hash IPs with the
// server-only Supabase key so the database never holds raw addresses.
// x-vercel-forwarded-for is supplied by Vercel; x-forwarded-for is the
// fallback for local development and other trusted reverse proxies.
export async function consumeAuthQuota(
  admin: Admin,
  request: NextRequest,
  scope: AuthScope,
): Promise<{ allowed: boolean; unavailable: boolean }> {
  const ip = (
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  ).split(",")[0].trim().slice(0, 128);
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return { allowed: false, unavailable: true };
  const ipHash = createHash("sha256")
    .update(`${secret}:issue06:${scope}:${ip}`)
    .digest("hex");
  const { data, error } = await admin.rpc("sec006_take_auth_slot", {
    p_scope: scope,
    p_ip_hash: ipHash,
  });
  if (error || typeof data !== "boolean") {
    console.error("Issue #6 auth rate limiter unavailable", error?.code ?? "invalid result");
    return { allowed: false, unavailable: true };
  }
  return { allowed: data, unavailable: false };
}
