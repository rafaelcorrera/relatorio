import "server-only";

import { requireSession } from "@/lib/auth";
import { getBundleByKey, getBundles } from "@/lib/report-store";
import { resolveStore } from "@/lib/stores";

function buildBundleCountsByStore(
  bundles: Awaited<ReturnType<typeof getBundles>>,
) {
  return bundles.reduce<Record<string, number>>((accumulator, bundle) => {
    const store = resolveStore(null, bundle.restaurantCode);
    accumulator[store.slug] = (accumulator[store.slug] || 0) + 1;
    return accumulator;
  }, {});
}

export async function loadDashboardContext({
  periodKey,
  storeSlug,
}: {
  periodKey?: string | null;
  storeSlug?: string | null;
} = {}) {
  const session = await requireSession();
  const allBundles = await getBundles();
  const bundleByKey = await getBundleByKey(periodKey);
  const selectedStore = storeSlug
    ? resolveStore(storeSlug)
    : resolveStore(null, bundleByKey?.restaurantCode);
  const bundles = allBundles.filter(
    (bundle) => resolveStore(null, bundle.restaurantCode).slug === selectedStore.slug,
  );
  const selectedBundle =
    bundleByKey &&
    resolveStore(null, bundleByKey.restaurantCode).slug === selectedStore.slug
      ? bundleByKey
      : bundles[0] || null;

  return {
    session,
    bundles,
    selectedBundle,
    selectedStore,
    bundleCountsByStore: buildBundleCountsByStore(allBundles),
  };
}
