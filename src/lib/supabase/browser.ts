"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseAuthEnabled,
} from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  if (!isSupabaseAuthEnabled()) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para usar o login Google.",
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
    );
  }

  return browserClient;
}
