import "server-only";

import { getAllowedLoginEmailsFromEnv, isSupabaseStoreEnabled } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function isEmailAllowed(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  const envAllowlist = getAllowedLoginEmailsFromEnv();
  if (envAllowlist.length > 0) {
    return envAllowlist.includes(normalizedEmail);
  }

  if (!isSupabaseStoreEnabled()) {
    return false;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("allowed_login_emails")
    .select("email")
    .eq("email", normalizedEmail)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Falha ao consultar a allowlist de emails:", error);
    return false;
  }

  return Boolean(data?.email);
}

export function describeAllowlistSource() {
  const envAllowlist = getAllowedLoginEmailsFromEnv();

  if (envAllowlist.length > 0) {
    return `Acesso restrito aos emails definidos em ALLOWED_LOGIN_EMAILS (${envAllowlist.length} liberado(s)).`;
  }

  return "Acesso restrito aos emails cadastrados na tabela allowed_login_emails do Supabase.";
}
