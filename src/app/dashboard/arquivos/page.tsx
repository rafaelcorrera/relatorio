import { FileSpreadsheet, FolderUp, Sparkles } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { UploadReportsForm } from "@/components/upload-reports-form";
import { loadDashboardContext } from "@/lib/dashboard-loader";

export default async function FilesPage({
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
      currentSection="arquivos"
      title="Carga de arquivos da unidade"
      description="Esta área concentra a importação de planilhas do período. Use aqui para adicionar ou atualizar bases sem misturar a carga com as páginas de análise."
      pathname="/dashboard/arquivos"
      bundles={bundles}
      selectedBundle={selectedBundle}
      selectedStore={selectedStore}
      bundleCountsByStore={bundleCountsByStore}
      sessionEmail={session.email}
    >
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-surface rounded-[34px] p-6">
          <div className="flex items-start gap-4">
            <div
              className="rounded-[24px] p-3 text-[var(--accent)]"
              style={{ backgroundColor: "rgb(var(--accent-rgb) / 0.12)" }}
            >
              <FolderUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Importação
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
                Carregar novos arquivos
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Envie os arquivos de um mesmo período para atualizar o banco local da unidade.
                O processamento reconhece automaticamente pedidos, entregas, performance,
                venda de produtos por canal e demais planilhas suportadas.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <UploadReportsForm storeSlug={selectedStore.slug} />
          </div>
        </div>

        <div className="grid gap-5">
          <section className="premium-surface rounded-[34px] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Checklist
            </p>
            <div className="mt-5 grid gap-3">
              {[
                "Use arquivos de um único mês por envio.",
                "Evite misturar relatórios de lojas diferentes.",
                "A validação automática bloqueia lotes com erro crítico.",
                "Se o período já existir, a base local é atualizada.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-[var(--line-strong)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm leading-6 text-[var(--muted)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="premium-surface rounded-[34px] p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Base atual
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {selectedBundle
                    ? `${selectedStore.name} está atualmente com ${bundleCountsByStore[selectedStore.slug] || 0} período(s) carregado(s). O período ativo no momento é ${selectedBundle.periodLabel}.`
                    : `${selectedStore.name} ainda não possui período selecionado. Você pode usar esta página para iniciar a base da unidade.`}
                </p>
              </div>
            </div>
          </section>

          <section className="premium-surface rounded-[34px] p-6">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Arquivos esperados
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Pedidos, Entregas, Performance da Loja, Venda de Produtos por Canal,
                  Curva ABC e demais planilhas compatíveis com o parser atual.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </DashboardShell>
  );
}
