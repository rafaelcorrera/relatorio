import "server-only";

import { isSupabaseStoreEnabled } from "@/lib/supabase/config";
import {
  ensureSeededLocalStore,
  getLocalBundleByKey,
  getLocalBundles,
  readLocalStore,
  upsertLocalBundleFromFiles,
} from "@/lib/report-store-local";
import {
  ensureSeededSupabaseStore,
  getSupabaseBundleByKey,
  getSupabaseBundles,
  readSupabaseStore,
  upsertSupabaseBundleFromFiles,
} from "@/lib/report-store-supabase";

export async function readStore() {
  return isSupabaseStoreEnabled() ? readSupabaseStore() : readLocalStore();
}

export async function ensureSeededStore() {
  return isSupabaseStoreEnabled()
    ? ensureSeededSupabaseStore()
    : ensureSeededLocalStore();
}

export async function getBundles() {
  return isSupabaseStoreEnabled() ? getSupabaseBundles() : getLocalBundles();
}

export async function getBundleByKey(periodKey?: string | null) {
  return isSupabaseStoreEnabled()
    ? getSupabaseBundleByKey(periodKey)
    : getLocalBundleByKey(periodKey);
}

export async function upsertBundleFromFiles(files: File[]) {
  return isSupabaseStoreEnabled()
    ? upsertSupabaseBundleFromFiles(files)
    : upsertLocalBundleFromFiles(files);
}
