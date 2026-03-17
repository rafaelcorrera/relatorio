import Link from "next/link";

import { STORES, type StoreDefinition } from "@/lib/stores";

function buildCardStyle(store: StoreDefinition) {
  return {
    background: `linear-gradient(140deg, ${store.heroStart} 0%, ${store.heroMid} 54%, ${store.heroEnd} 100%)`,
    boxShadow: `0 18px 44px color-mix(in srgb, ${store.plum} 34%, transparent)`,
  };
}

export function StoreSelector({
  selectedStore,
  hrefBuilder,
  bundleCounts = {},
  compact = false,
}: {
  selectedStore?: StoreDefinition | null;
  hrefBuilder: (store: StoreDefinition) => string;
  bundleCounts?: Record<string, number>;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-3 ${
        compact ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      }`}
    >
      {STORES.map((store) => {
        const isActive = selectedStore ? store.slug === selectedStore.slug : false;
        const bundleCount = bundleCounts[store.slug] || 0;

        return (
          <article
            key={store.slug}
            className={`group relative flex min-h-[292px] flex-col overflow-hidden rounded-[28px] border px-5 py-5 transition duration-200 hover:-translate-y-1 ${
              isActive ? "border-white/30" : "border-white/16"
            }`}
            style={buildCardStyle(store)}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.12))]" />
            <div className="relative flex h-full flex-col text-[#2b201d]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#5d4e4b]">
                    {compact ? "Loja" : "Painel"}
                  </p>
                  <h3 className={`${compact ? "mt-2 text-base" : "mt-3 text-xl"} max-w-[12rem] font-semibold tracking-[-0.04em] text-[#231816]`}>
                    {store.name}
                  </h3>
                </div>
                {isActive ? (
                  <span className="rounded-full border border-white/40 bg-white/28 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3f2c29] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                    Atual
                  </span>
                ) : null}
              </div>

              <p className={`mt-4 max-w-[16rem] ${compact ? "text-xs leading-5" : "text-sm leading-6"} text-[#4e3f3c]`}>
                {store.description}
              </p>

              <div className="mt-auto pt-6">
                <div className="min-h-14">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c5a56]">
                    {bundleCount > 0
                      ? `${bundleCount} período${bundleCount > 1 ? "s" : ""}`
                      : "Sem base carregada"}
                  </span>
                </div>
                <Link
                  href={hrefBuilder(store)}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-[18px] border border-white/52 bg-white/44 px-4 py-3 text-sm font-semibold text-[#2a1d1b] shadow-[0_10px_24px_rgba(44,22,18,0.10),inset_0_1px_0_rgba(255,255,255,0.34)] transition hover:bg-white/56"
                >
                  Abrir painel
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
