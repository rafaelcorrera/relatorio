import Link from "next/link";

import { DashboardEmptyState } from "@/components/dashboard-empty-state";
import { DashboardShell } from "@/components/dashboard-shell";
import { RevenueReportView } from "@/components/revenue-report-view";
import { getRestaurantBundles, mergeBundles } from "@/lib/bundle-range";
import { loadDashboardContext } from "@/lib/dashboard-loader";
import { buildRevenueView, findDateBounds } from "@/lib/report-views";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    bundle?: string;
    start?: string;
    end?: string;
  }>;
}) {
  const params = await searchParams;
  const { session, bundles, selectedBundle } = await loadDashboardContext(params.bundle);
  const restaurantBundles = selectedBundle
    ? getRestaurantBundles(bundles, selectedBundle.restaurantCode)
    : [];
  const restaurantRangeBundle = restaurantBundles.length
    ? mergeBundles(restaurantBundles)
    : null;
  const selectedBounds = selectedBundle
    ? findDateBounds(selectedBundle.performance)
    : { min: "", max: "" };
  const dataBundle = selectedBundle
    ? params.start || params.end
      ? restaurantRangeBundle || selectedBundle
      : selectedBundle
    : null;
  const view = dataBundle && restaurantRangeBundle
    ? buildRevenueView(
        dataBundle,
        params.start || selectedBounds.min || undefined,
        params.end || selectedBounds.max || undefined,
        restaurantRangeBundle,
      )
    : null;

  return (
    <DashboardShell
      currentSection="faturamento"
      title="Faturamento, taxas e leitura financeira do periodo"
      description="Esta pagina concentra os numeros consolidados de receita, descontos, servico e entrega. O filtro por data trabalha sobre o relatorio diario de performance da loja."
      pathname="/dashboard/faturamento"
      bundles={bundles}
      selectedBundle={selectedBundle}
      sessionEmail={session.email}
      filters={
        selectedBundle && view ? (
          <form method="GET" className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]">
            <input type="hidden" name="bundle" value={selectedBundle.periodKey} />
            <label className="premium-field text-sm font-medium text-[var(--ink)]">
              Data inicial
              <input
                type="date"
                name="start"
                defaultValue={view.filters.start}
                min={view.filters.min}
                max={view.filters.max}
                className="premium-input text-sm"
              />
            </label>
            <label className="premium-field text-sm font-medium text-[var(--ink)]">
              Data final
              <input
                type="date"
                name="end"
                defaultValue={view.filters.end}
                min={view.filters.min}
                max={view.filters.max}
                className="premium-input text-sm"
              />
            </label>
            <button
              type="submit"
              className="premium-button self-end"
            >
              Aplicar filtro
            </button>
            <Link
              href={`/dashboard/faturamento?bundle=${selectedBundle.periodKey}`}
              className="premium-button-secondary self-end"
            >
              Limpar
            </Link>
            <p className="md:col-span-4 text-xs leading-6 text-[var(--muted)]">
              O filtro pode atravessar meses ja carregados. Se voce escolher um intervalo como
              {" "}15/01 ate 03/02, o painel combina automaticamente os bundles disponiveis do restaurante.
            </p>
          </form>
        ) : null
      }
    >
      {selectedBundle && view ? <RevenueReportView view={view} /> : <DashboardEmptyState />}
    </DashboardShell>
  );
}
