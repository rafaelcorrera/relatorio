import Link from "next/link";

import { DashboardEmptyState } from "@/components/dashboard-empty-state";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProductsReportView } from "@/components/products-report-view";
import { loadDashboardContext } from "@/lib/dashboard-loader";
import { buildProductsView } from "@/lib/report-views";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    bundle?: string;
    category?: string;
    channel?: string;
  }>;
}) {
  const params = await searchParams;
  const { session, bundles, selectedBundle } = await loadDashboardContext(params.bundle);
  const view = selectedBundle
    ? buildProductsView(selectedBundle, params.category, params.channel)
    : null;

  return (
    <DashboardShell
      currentSection="produtos"
      title="Itens mais vendidos, menos vendidos e desempenho por categoria"
      description="Os rankings consideram todos os itens vendidos por padrao e podem ser refinados por categoria e por canal. A tela agora cruza o volume por canal com a Curva ABC para mostrar faturamento, preco medio e concentracao por classe; quando um canal e filtrado, os valores monetarios usam o preco medio da Curva ABC como referencia."
      pathname="/dashboard/produtos"
      bundles={bundles}
      selectedBundle={selectedBundle}
      sessionEmail={session.email}
      filters={
        selectedBundle && view ? (
          <form
            method="GET"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
          >
            <input type="hidden" name="bundle" value={selectedBundle.periodKey} />
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Categoria
              <select
                name="category"
                defaultValue={view.filters.selectedCategory}
                className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)]"
              >
                <option value="">Todas as categorias</option>
                {view.filters.categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Canal
              <select
                name="channel"
                defaultValue={view.filters.selectedChannel}
                className="h-12 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)]"
              >
                <option value="">Todos os canais</option>
                {view.filters.channelOptions.map((option) => (
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
              href={`/dashboard/produtos?bundle=${selectedBundle.periodKey}`}
              className="self-end rounded-2xl border border-[var(--line)] px-5 py-3 text-center text-sm font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Limpar
            </Link>
          </form>
        ) : null
      }
    >
      {selectedBundle && view ? (
        <ProductsReportView view={view} />
      ) : (
        <DashboardEmptyState />
      )}
    </DashboardShell>
  );
}
