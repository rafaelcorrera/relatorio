import Link from "next/link";

import { DashboardEmptyState } from "@/components/dashboard-empty-state";
import { DashboardShell } from "@/components/dashboard-shell";
import { DeliveriesReportView } from "@/components/deliveries-report-view";
import { loadDashboardContext } from "@/lib/dashboard-loader";
import { buildDeliveriesView } from "@/lib/report-views";

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
  const view = selectedBundle
    ? buildDeliveriesView(
        selectedBundle,
        params.start,
        params.end,
        params.volumeDay,
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
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Data inicial
              <input
                type="date"
                name="start"
                min={view.filters.min}
                max={view.filters.max}
                defaultValue={view.filters.start}
                className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Data final
              <input
                type="date"
                name="end"
                min={view.filters.min}
                max={view.filters.max}
                defaultValue={view.filters.end}
                className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)]"
              />
            </label>
            <button
              type="submit"
              className="self-end rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Aplicar filtro
            </button>
            <Link
              href={`/dashboard/entregas?bundle=${selectedBundle.periodKey}`}
              className="self-end rounded-2xl border border-[var(--line)] px-5 py-3 text-center text-sm font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Limpar
            </Link>
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
