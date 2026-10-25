// Permanent staff deletion is intentionally disabled.
// Accounts must be archived so their identity and audit history are preserved.
import { NextResponse } from "next/server";

export async function DELETE() {
  return NextResponse.json(
    { error: "Permanent staff deletion is disabled. Archive the account in User Management instead." },
    { status: 405, headers: { Allow: "", "Cache-Control": "no-store" } },
  );
}
