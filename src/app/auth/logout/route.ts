import { NextRequest, NextResponse } from "next/server";

import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get("reason");

  await destroySession();

  const loginUrl = new URL("/login", request.url);

  if (reason === "session_expired") {
    loginUrl.searchParams.set("error", "session_expired");
  }

  return NextResponse.redirect(loginUrl);
}
