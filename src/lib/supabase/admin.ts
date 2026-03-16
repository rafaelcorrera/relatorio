import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseStoreEnabled,
} from "@/lib/supabase/config";

export function createSupabaseAdminClient() {
  if (!isSupabaseStoreEnabled()) {
    throw new Error(
      "Configure SUPABASE_SERVICE_ROLE_KEY para persistir dados do dashboard no Supabase.",
    );
  }

  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
