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
    day?: string;
  }>;
}) {
  const params = await searchParams;
  const { session, bundles, selectedBundle } = await loadDashboardContext(params.bundle);
  const view = selectedBundle ? buildMesaView(selectedBundle, params.day) : null;

  return (
    <DashboardShell
      currentSection="mesa"
      title="Pedidos de mesa, ticket medio e comportamento do salao"
      description="Esta pagina isola os pedidos COMANDA/MESA para mostrar faturamento de salao, taxa de servico, ticket medio, pico horario e operacao por usuario."
      pathname="/dashboard/mesa"
      bundles={bundles}
      selectedBundle={selectedBundle}
      sessionEmail={session.email}
      filters={
        selectedBundle && view ? (
          <form method="GET" className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <input type="hidden" name="bundle" value={selectedBundle.periodKey} />
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Dia de mesa
              <select
                name="day"
                defaultValue={view.filters.selectedDay}
                className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)]"
              >
                <option value="">Todo o periodo</option>
                {view.filters.dayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="self-end rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Aplicar filtro
            </button>
            <Link
              href={`/dashboard/mesa?bundle=${selectedBundle.periodKey}`}
              className="self-end rounded-2xl border border-[var(--line)] px-5 py-3 text-center text-sm font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Limpar
            </Link>
          </form>
        ) : null
      }
    >
      {selectedBundle && view ? <MesaReportView view={view} /> : <DashboardEmptyState />}
    </DashboardShell>
  );
}
