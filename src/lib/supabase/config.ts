function normalizeEnv(value: string | undefined) {
  return value?.trim() || "";
}

export function getSupabaseUrl() {
  return normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabasePublishableKey() {
  return normalizeEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseServiceRoleKey() {
  return normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isSupabaseAuthEnabled() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function isSupabaseStoreEnabled() {
  return Boolean(
    getSupabaseUrl() &&
      getSupabasePublishableKey() &&
      getSupabaseServiceRoleKey(),
  );
}

export function getAllowedLoginEmailsFromEnv() {
  return [...new Set(
    normalizeEnv(process.env.ALLOWED_LOGIN_EMAILS)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  )];
}
