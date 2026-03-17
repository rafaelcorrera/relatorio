import { NextRequest, NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth-allowlist";
import { createManagedSession } from "@/lib/auth";
import { isSupabaseAuthEnabled } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);

  if (!isSupabaseAuthEnabled()) {
    loginUrl.searchParams.set("error", "oauth_callback_failed");
    return NextResponse.redirect(loginUrl);
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    loginUrl.searchParams.set("error", "oauth_callback_failed");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set("error", "oauth_callback_failed");
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.trim().toLowerCase() || "";

  if (!email || !(await isEmailAllowed(email))) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "unauthorized_email");
    return NextResponse.redirect(loginUrl);
  }

  await createManagedSession(email);

  const dashboardUrl = new URL("/dashboard", request.url);
  return NextResponse.redirect(dashboardUrl);
}
