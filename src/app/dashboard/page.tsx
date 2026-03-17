import { Building2, CalendarRange, ChevronRight, Database } from "lucide-react";
import { redirect } from "next/navigation";

import { StoreSelector } from "@/components/store-selector";
import { requireSession } from "@/lib/auth";
import { getBundles } from "@/lib/report-store";
import { getGroupThemeStyle, resolveStore } from "@/lib/stores";

export default async function DashboardIndexPage({
  searchParams,
}: {
  searchParams: Promise<{
    bundle?: string;
    store?: string;
  }>;
}) {
  const params = await searchParams;

  if (params.store) {
    const search = new URLSearchParams();
    search.set("store", params.store);

    if (params.bundle) {
      search.set("bundle", params.bundle);
    }

    redirect(`/dashboard/faturamento?${search.toString()}`);
  }

  const session = await requireSession();
  const bundles = await getBundles();
  const bundleCounts = bundles.reduce<Record<string, number>>((accumulator, bundle) => {
    const store = resolveStore(null, bundle.restaurantCode);
    accumulator[store.slug] = (accumulator[store.slug] || 0) + 1;
    return accumulator;
  }, {});

  return (
    <main
      className="relative mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-8 px-4 py-16 md:px-6 lg:px-8"
      style={getGroupThemeStyle()}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] brand-glow blur-2xl" />

      <section className="brand-hero-panel relative overflow-hidden rounded-[40px] p-8 text-white shadow-[0_34px_120px_rgba(39,11,18,0.18)] lg:p-10">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="premium-pill w-fit border-white/12 bg-white/8 text-[#f6dac8]">
              Grupo Alpha Food Service
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] md:text-[3.9rem] md:leading-[1.02]">
              Escolha a unidade para abrir o dashboard.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/78 md:text-lg">
              O login já foi concluído. Agora você escolhe a loja e o sistema abre
              o cockpit com os períodos e indicadores daquela unidade.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[28px] border border-white/16 bg-white/16 px-5 py-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                Sessão
              </p>
              <p className="mt-3 text-sm font-medium text-white/88">{session.email}</p>
            </div>
            <div className="rounded-[28px] border border-white/16 bg-white/16 px-5 py-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                Períodos importados
              </p>
              <p className="mt-3 text-sm font-medium text-white/88">
                {bundles.length.toLocaleString("pt-BR")} base(s) no ambiente local
              </p>
            </div>
            <div className="rounded-[28px] border border-white/16 bg-white/16 px-5 py-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                Próximo passo
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-white/88">
                Abrir unidade
                <ChevronRight className="h-4 w-4" />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-surface rounded-[36px] p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Menu de lojas
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
              Abrir painel por unidade
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2">
              <Building2 className="h-4 w-4 text-[var(--accent)]" />
              5 unidades mapeadas
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2">
              <Database className="h-4 w-4 text-[var(--accent)]" />
              Dados locais preservados
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2">
              <CalendarRange className="h-4 w-4 text-[var(--accent)]" />
              Troca por período e por loja
            </span>
          </div>
        </div>

        <StoreSelector
          bundleCounts={bundleCounts}
          hrefBuilder={(store) => `/dashboard/faturamento?store=${store.slug}`}
        />
      </section>
    </main>
  );
}
