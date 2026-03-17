"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import type { ParsedBundle } from "@/lib/types";

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function sortBundlesByRecency(bundles: ParsedBundle[]) {
  return [...bundles].sort((left, right) => {
    if (left.year !== right.year) {
      return right.year - left.year;
    }

    if (left.month !== right.month) {
      return right.month - left.month;
    }

    return right.uploadedAt.localeCompare(left.uploadedAt);
  });
}

export function PeriodSwitcher({
  currentValue,
  bundles,
  pathname,
  storeSlug,
}: {
  currentValue: string;
  bundles: ParsedBundle[];
  pathname: string;
  storeSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingLabel, setPendingLabel] = useState("");
  const sortedBundles = useMemo(() => sortBundlesByRecency(bundles), [bundles]);
  const currentBundle = useMemo(
    () => sortedBundles.find((bundle) => bundle.periodKey === currentValue) || sortedBundles[0],
    [currentValue, sortedBundles],
  );
  const availableYears = useMemo(
    () => [...new Set(sortedBundles.map((bundle) => bundle.year))].sort((a, b) => b - a),
    [sortedBundles],
  );
  const [activeYear, setActiveYear] = useState(currentBundle?.year || availableYears[0] || new Date().getFullYear());

  const monthButtons = useMemo(() => {
    const bundleByMonth = new Map<number, ParsedBundle>();

    for (const bundle of sortedBundles) {
      if (bundle.year !== activeYear || bundleByMonth.has(bundle.month)) {
        continue;
      }

      bundleByMonth.set(bundle.month, bundle);
    }

    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const bundle = bundleByMonth.get(month) || null;
      return {
        month,
        label: MONTH_LABELS[index],
        bundle,
        hasData: Boolean(bundle),
        isActive: bundle?.periodKey === currentValue,
      };
    });
  }, [activeYear, currentValue, sortedBundles]);

  function switchToBundle(bundle: ParsedBundle) {
    setPendingLabel(bundle.periodLabel);
    startTransition(() => {
      const searchParams = new URLSearchParams();
      searchParams.set("store", storeSlug);
      searchParams.set("bundle", bundle.periodKey);
      router.push(`${pathname}?${searchParams.toString()}`);
    });
  }

  return (
    <>
      <div className="premium-field">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Periodo
            </label>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {currentBundle
                ? `${currentBundle.periodLabel} • ${currentBundle.restaurantCode}`
                : "Nenhum periodo carregado nesta loja."}
            </p>
          </div>
          <div className="inline-flex rounded-full border border-[var(--line-strong)] bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">
            Ano {activeYear}
          </div>
        </div>

        {availableYears.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setActiveYear(year)}
                className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  year === activeYear
                    ? "border-[var(--accent)] bg-[rgba(255,255,255,0.9)] text-[var(--accent)]"
                    : "border-[var(--line-strong)] bg-white/58 text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {monthButtons.map((item) => (
            <button
              key={`${activeYear}-${item.month}`}
              type="button"
              disabled={!item.hasData || isPending}
              onClick={() => {
                if (item.bundle) {
                  switchToBundle(item.bundle);
                }
              }}
              className={`rounded-[24px] border px-4 py-4 text-left transition ${
                item.hasData
                  ? item.isActive
                    ? "border-emerald-500 bg-[linear-gradient(180deg,rgba(225,250,238,0.98),rgba(208,243,225,0.98))] shadow-[0_18px_38px_rgba(16,92,50,0.18)]"
                    : "border-emerald-200 bg-[linear-gradient(180deg,rgba(242,252,246,0.98),rgba(231,248,238,0.98))] hover:-translate-y-0.5 hover:border-emerald-400"
                  : "cursor-not-allowed border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,234,0.98),rgba(255,245,204,0.98))] text-amber-900/80"
              } ${isPending ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold tracking-[-0.03em] text-[var(--ink)]">
                    {item.label}
                  </p>
                  <p
                    className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      item.hasData ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {item.hasData ? "Dados carregados" : "Sem dados"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    item.hasData
                      ? item.isActive
                        ? "bg-emerald-700 text-white"
                        : "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {String(item.month).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-4 text-xs leading-6 text-[var(--muted)]">
                {item.bundle
                  ? `${item.bundle.periodLabel} pronto para consulta.`
                  : `Ainda nao ha arquivos validados para ${item.label.toLowerCase()} de ${activeYear}.`}
              </p>
            </button>
          ))}
        </div>

        {isPending ? (
          <p className="mt-4 text-xs font-medium text-[var(--muted)]">
            Carregando dados do periodo selecionado...
          </p>
        ) : null}
      </div>

      {isPending ? (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-[rgba(18,7,11,0.46)] px-6 backdrop-blur-md">
          <div className="brand-assistant-panel relative w-full max-w-xl overflow-hidden rounded-[34px] p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-white/10">
                <LoaderCircle className="h-6 w-6 animate-spin text-[#ffd4a4]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f6d9c6]">
                  Carregando dados
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                  Atualizando o painel
                </h3>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/74">
              {pendingLabel
                ? `Estamos buscando os dados de ${pendingLabel}. Isso evita confusao durante a troca de periodo.`
                : "Estamos buscando os dados do periodo selecionado. Isso evita confusao durante a troca de periodo."}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
