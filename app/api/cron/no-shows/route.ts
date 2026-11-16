import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Daily fallback for automatic no-show cancellation. The app also runs the
// check when staff/customer pages open, and pg_cron can run it hourly.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc("happytails_process_overdue_no_shows");
  if (error) {
    console.error("Overdue no-show processing failed", error);
    return NextResponse.json({ error: "Unable to process overdue no-shows" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, cancelled: data ?? 0 });
}
