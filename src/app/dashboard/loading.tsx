import { LoaderCircle } from "lucide-react";

export default function DashboardLoading() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1680px] items-center justify-center px-4 py-24 md:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(255,229,188,0.24),transparent_24%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.46),transparent_24%),linear-gradient(180deg,rgba(255,247,238,0.8),rgba(247,240,232,0.96))]" />

      <section className="premium-surface w-full max-w-2xl rounded-[36px] border border-[rgba(255,235,214,0.75)] px-8 py-10 shadow-[0_30px_90px_rgba(39,11,18,0.12)]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(255,235,214,0.7)] bg-[linear-gradient(135deg,rgba(211,161,80,0.15),rgba(255,255,255,0.42))]">
            <LoaderCircle className="h-7 w-7 animate-spin text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Carregando dados
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink-strong)]">
              Atualizando o dashboard
            </h1>
          </div>
        </div>

        <p className="mt-6 text-sm leading-7 text-[var(--muted)]">
          Estamos consolidando o periodo selecionado e os filtros ativos para que o painel abra
          somente quando os dados estiverem prontos.
        </p>
      </section>
    </main>
  );
}
