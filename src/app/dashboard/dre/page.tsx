import { ReceiptText, Sparkles } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { loadDashboardContext } from "@/lib/dashboard-loader";

export default async function DrePage({
  searchParams,
}: {
  searchParams: Promise<{
    bundle?: string;
    store?: string;
  }>;
}) {
  const params = await searchParams;
  const { session, bundles, selectedBundle, selectedStore, bundleCountsByStore } =
    await loadDashboardContext({
      periodKey: params.bundle,
      storeSlug: params.store,
    });

  return (
    <DashboardShell
      currentSection="dre"
      title="DRE da unidade"
      description="Esta área será dedicada à leitura gerencial do DRE com base nas planilhas específicas dessa frente financeira."
      pathname="/dashboard/dre"
      bundles={bundles}
      selectedBundle={selectedBundle}
      selectedStore={selectedStore}
      bundleCountsByStore={bundleCountsByStore}
      sessionEmail={session.email}
    >
      <section className="premium-surface rounded-[36px] p-8">
        <div className="flex items-start gap-4">
          <div
            className="rounded-[24px] p-3 text-[var(--accent)]"
            style={{
              backgroundColor: "rgb(var(--accent-rgb) / 0.12)",
              boxShadow: "0 16px 34px rgb(var(--accent-rgb) / 0.16)",
            }}
          >
            <ReceiptText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              DRE
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]">
              Análise de demonstrativo de resultados
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
              Esta página foi reservada para a futura leitura de DRE com as planilhas
              específicas dessa análise, conectando receita, custos, despesas e margens.
            </p>
          </div>
        </div>

        <div className="premium-note mt-8 rounded-[30px] px-6 py-6">
          <div className="flex items-center gap-3 text-[var(--ink)]">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
            <span className="text-lg font-semibold">Em desenvolvimento</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            Quando você me passar as planilhas e a estrutura final do DRE, eu monto
            aqui a visão gerencial com indicadores, comparativos e diagnósticos.
          </p>
        </div>
      </section>
    </DashboardShell>
  );
}
