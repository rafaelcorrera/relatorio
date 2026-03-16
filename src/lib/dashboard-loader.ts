import "server-only";

import { requireSession } from "@/lib/auth";
import { getBundleByKey, getBundles } from "@/lib/report-store";

export async function loadDashboardContext(periodKey?: string | null) {
  const session = await requireSession();
  const bundles = await getBundles();
  const selectedBundle = await getBundleByKey(periodKey);

  return {
    session,
    bundles,
    selectedBundle,
  };
}
