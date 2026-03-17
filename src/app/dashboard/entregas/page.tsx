import Link from "next/link";

import { DashboardEmptyState } from "@/components/dashboard-empty-state";
import { DashboardShell } from "@/components/dashboard-shell";
import { DeliveriesReportView } from "@/components/deliveries-report-view";
import { getRestaurantBundles, mergeBundles } from "@/lib/bundle-range";
import { loadDashboardContext } from "@/lib/dashboard-loader";
import { buildDeliveriesView, findDateBounds } from "@/lib/report-views";

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    bundle?: string;
    start?: string;
    end?: string;
    volumeDay?: string;
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
    ? findDateBounds(selectedBundle.deliveries)
    : { min: "", max: "" };
  const dataBundle = selectedBundle
    ? params.start || params.end
      ? restaurantRangeBundle || selectedBundle
      : selectedBundle
    : null;
  const view = dataBundle && restaurantRangeBundle
      ? buildDeliveriesView(
        dataBundle,
        params.start || selectedBounds.min || undefined,
        params.end || selectedBounds.max || undefined,
        params.volumeDay,
        restaurantRangeBundle,
      )
    : null;

  return (
    <DashboardShell
      currentSection="entregas"
      title="Entregas por canal, horario e operacao"
      description="Aqui ficam as leituras de delivery: volume entregue, canais de pedido, bairros, modos operacionais e horarios de maior concentracao. O topo filtra por data inicial e final, enquanto o quadro de hora a hora permite aprofundar um dia especifico."
      pathname="/dashboard/entregas"
      bundles={bundles}
      selectedBundle={selectedBundle}
      sessionEmail={session.email}
      filters={
        selectedBundle && view ? (
          <form method="GET" className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]">
            <input type="hidden" name="bundle" value={selectedBundle.periodKey} />
            <input
              type="hidden"
              name="volumeDay"
              value={view.filters.selectedVolumeDay}
            />
            <label className="premium-field text-sm font-medium text-[var(--ink)]">
              Data inicial
              <input
                type="date"
                name="start"
                min={view.filters.min}
                max={view.filters.max}
                defaultValue={view.filters.start}
                className="premium-input text-sm"
              />
            </label>
            <label className="premium-field text-sm font-medium text-[var(--ink)]">
              Data final
              <input
                type="date"
                name="end"
                min={view.filters.min}
                max={view.filters.max}
                defaultValue={view.filters.end}
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
              href={`/dashboard/entregas?bundle=${selectedBundle.periodKey}`}
              className="premium-button-secondary self-end"
            >
              Limpar
            </Link>
            <p className="md:col-span-4 text-xs leading-6 text-[var(--muted)]">
              O intervalo pode cruzar meses ja importados. Ao sair do mes atual, a tela consolida os bundles
              disponiveis e preserva o filtro por dia no quadro hora a hora.
            </p>
          </form>
        ) : null
      }
    >
      {selectedBundle && view ? (
        <DeliveriesReportView bundleKey={selectedBundle.periodKey} view={view} />
      ) : (
        <DashboardEmptyState />
      )}
    </DashboardShell>
  );
}
