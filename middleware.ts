import { NextResponse, type NextRequest } from "next/server";

// This runs before every matching request. Right now it does nothing —
// once Supabase auth is set up, this will redirect unauthenticated users
// away from /account/* routes to /sign-in.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
