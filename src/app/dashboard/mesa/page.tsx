import Link from "next/link";

import { DashboardEmptyState } from "@/components/dashboard-empty-state";
import { DashboardShell } from "@/components/dashboard-shell";
import { MesaReportView } from "@/components/mesa-report-view";
import { loadDashboardContext } from "@/lib/dashboard-loader";
import { buildMesaView } from "@/lib/report-views";

export default async function MesaPage({
  searchParams,
}: {
  searchParams: Promise<{
    bundle?: string;
    store?: string;
    day?: string;
  }>;
}) {
  const params = await searchParams;
  const { session, bundles, selectedBundle, selectedStore, bundleCountsByStore } =
    await loadDashboardContext({
      periodKey: params.bundle,
      storeSlug: params.store,
    });
  const view = selectedBundle ? buildMesaView(selectedBundle, params.day) : null;

  return (
    <DashboardShell
      currentSection="mesa"
      title="Pedidos de mesa, ticket médio e comportamento do salão"
      description="Esta página isola os pedidos COMANDA/MESA para mostrar faturamento de salão, taxa de serviço, ticket médio, pico de horário e operação por usuário."
      pathname="/dashboard/mesa"
      bundles={bundles}
      selectedBundle={selectedBundle}
      selectedStore={selectedStore}
      bundleCountsByStore={bundleCountsByStore}
      sessionEmail={session.email}
      filters={
        selectedBundle && view ? (
          <form method="GET" className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <input type="hidden" name="store" value={selectedStore.slug} />
            <input type="hidden" name="bundle" value={selectedBundle.periodKey} />
            <label className="premium-field text-sm font-medium text-[var(--ink)]">
              Dia de mesa
              <select
                name="day"
                defaultValue={view.filters.selectedDay}
                className="premium-select text-sm"
              >
                <option value="">Todo o período</option>
                {view.filters.dayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="premium-button self-end"
            >
              Aplicar filtro
            </button>
            <Link
              href={`/dashboard/mesa?store=${selectedStore.slug}&bundle=${selectedBundle.periodKey}`}
              className="premium-button-secondary self-end"
            >
              Limpar
            </Link>
          </form>
        ) : null
      }
    >
      {selectedBundle && view ? (
        <MesaReportView view={view} />
      ) : (
        <DashboardEmptyState
          storeSlug={selectedStore.slug}
          storeName={selectedStore.name}
        />
      )}
    </DashboardShell>
  );
}
