import Link from "next/link";
import {
  ArrowRight,
  ChartColumn,
  CircleDollarSign,
  ConciergeBell,
  Hamburger,
  ReceiptText,
  Truck,
} from "lucide-react";

import { DashboardAssistant } from "@/components/dashboard-assistant";
import { ExecutiveAiInsight } from "@/components/executive-ai-insight";
import { LogoutButton } from "@/components/logout-button";
import { PeriodSwitcher } from "@/components/period-switcher";
import { StoreSelector } from "@/components/store-selector";
import {
  generateExecutiveInsight,
  isAssistantConfigured,
} from "@/lib/report-assistant";
import type { AssistantSection } from "@/lib/report-assistant";
import { getStoreThemeStyle, type StoreDefinition } from "@/lib/stores";
import type { ParsedBundle } from "@/lib/types";

type SectionKey =
  | "faturamento"
  | "entregas"
  | "mesa"
  | "produtos"
  | "dre"
  | "arquivos";

const SECTION_ITEMS: Array<{
  key: SectionKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: "faturamento",
    label: "Faturamento",
    href: "/dashboard/faturamento",
    icon: CircleDollarSign,
  },
  {
    key: "entregas",
    label: "Entregas",
    href: "/dashboard/entregas",
    icon: Truck,
  },
  {
    key: "mesa",
    label: "Mesa",
    href: "/dashboard/mesa",
    icon: ConciergeBell,
  },
  {
    key: "produtos",
    label: "Produtos",
    href: "/dashboard/produtos",
    icon: Hamburger,
  },
  {
    key: "dre",
    label: "DRE",
    href: "/dashboard/dre",
    icon: ReceiptText,
  },
];

const ASSISTANT_SECTIONS: AssistantSection[] = [
  "faturamento",
  "entregas",
  "mesa",
  "produtos",
];

function buildDashboardHref(
  pathname: string,
  {
    storeSlug,
    bundleKey,
  }: {
    storeSlug: string;
    bundleKey?: string | null;
  },
) {
  const searchParams = new URLSearchParams();
  searchParams.set("store", storeSlug);

  if (bundleKey) {
    searchParams.set("bundle", bundleKey);
  }

  return `${pathname}?${searchParams.toString()}`;
}

export async function DashboardShell({
  currentSection,
  title,
  description,
  pathname,
  bundles,
  selectedBundle,
  selectedStore,
  bundleCountsByStore,
  sessionEmail,
  filters,
  children,
}: {
  currentSection: SectionKey;
  title: string;
  description: string;
  pathname: string;
  bundles: ParsedBundle[];
  selectedBundle: ParsedBundle | null;
  selectedStore: StoreDefinition;
  bundleCountsByStore: Record<string, number>;
  sessionEmail: string;
  filters?: React.ReactNode;
  children: React.ReactNode;
}) {
  const bundleKey = selectedBundle?.periodKey;
  const importHref = buildDashboardHref("/dashboard/arquivos", {
    storeSlug: selectedStore.slug,
    bundleKey,
  });
  const assistantSection = ASSISTANT_SECTIONS.includes(currentSection as AssistantSection)
    ? (currentSection as AssistantSection)
    : null;
  const executiveInsight =
    selectedBundle && currentSection !== "arquivos"
      ? await generateExecutiveInsight({
          bundle: selectedBundle,
          historicalBundles: bundles,
          storeName: selectedStore.name,
        })
      : null;

  return (
    <main
      className="relative mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-8 px-4 py-32 md:px-6 lg:px-8"
      style={getStoreThemeStyle(selectedStore)}
    >
      <div className="pointer-events-none absolute inset-x-0 top-10 -z-10 h-[28rem] brand-glow blur-2xl" />

      <div className="pointer-events-none fixed left-1/2 top-4 z-[999] w-[calc(100%-2rem)] max-w-[1780px] -translate-x-1/2 px-0">
        <div className="pointer-events-auto w-full">
          <nav className="brand-nav-shell flex flex-wrap items-center justify-between gap-4 rounded-[36px] px-5 py-4 text-white backdrop-blur-xl md:px-7">
            <div className="flex min-w-0 items-center gap-4">
              <div className="brand-icon-shell flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/12">
                <ChartColumn className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[1.95rem] font-semibold leading-none tracking-[-0.04em] text-white">
                  {selectedStore.name}
                </p>
                <p className="mt-2 truncate text-xs font-semibold uppercase tracking-[0.42em] text-[#f4d7c3]">
                  Relatorios GAFS
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-center gap-2 lg:gap-3">
              {SECTION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === currentSection;
                const href = buildDashboardHref(item.href, {
                  storeSlug: selectedStore.slug,
                  bundleKey,
                });

                return (
                  <Link
                    key={item.key}
                    href={href}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition lg:px-5 ${
                      isActive
                        ? "border border-[rgba(255,228,184,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,230,186,0.12))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                        : "text-white/78 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-[#ffd4a4]" : "text-white/58"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <Link
              href={importHref}
              className="inline-flex items-center gap-3 rounded-full border border-[rgba(255,219,181,0.2)] bg-[linear-gradient(135deg,var(--brand-icon-start),var(--brand-icon-mid))] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_20px_46px_rgb(var(--hero-shadow-rgb)/0.34)] transition hover:-translate-y-0.5 hover:brightness-110 lg:px-7"
            >
              Carregar arquivos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </div>

      <section className="brand-dark-surface relative overflow-hidden rounded-[40px]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(255,234,194,0.18), transparent 20%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.08), transparent 18%), radial-gradient(circle at bottom right, rgb(var(--accent-rgb) / 0.16), transparent 20%)",
          }}
        />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.12fr_0.88fr] lg:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#f7dbca] backdrop-blur">
                <ChartColumn className="h-4 w-4 text-[#ffd4a4]" />
                {selectedStore.shortName}
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-white/86 backdrop-blur">
                {selectedBundle
                  ? `${selectedBundle.restaurantCode} • ${selectedBundle.periodLabel}`
                  : "Sem período carregado"}
              </span>
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-[3.65rem] md:leading-[1.02]">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              {description}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">
              {selectedStore.description}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-white/10 bg-white/12 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                  Sessão
                </p>
                <p className="mt-3 text-sm font-medium text-white/86">
                  {sessionEmail}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/12 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                  Períodos da loja
                </p>
                <p className="mt-3 text-sm font-medium text-white/86">
                  {bundleCountsByStore[selectedStore.slug] || 0} carregado(s)
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/12 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                  Cobertura
                </p>
                <p className="mt-3 text-sm font-medium text-white/86">
                  {selectedBundle
                    ? `${Object.values(selectedBundle.coverage).filter(Boolean).length}/4 relatórios`
                    : "Aguardando importação"}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/12 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                  Última carga
                </p>
                <p className="mt-3 text-sm font-medium text-white/86">
                  {selectedBundle
                    ? new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(selectedBundle.uploadedAt))
                    : "Sem histórico"}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <StoreSelector
                compact
                selectedStore={selectedStore}
                bundleCounts={bundleCountsByStore}
                hrefBuilder={(store) =>
                  buildDashboardHref(pathname, {
                    storeSlug: store.slug,
                    bundleKey:
                      store.slug === selectedStore.slug ? bundleKey : undefined,
                  })
                }
              />
            </div>
          </div>

          <div id="acoes-dashboard" className="grid gap-4 scroll-mt-32">
            <div className="flex justify-end">
              <LogoutButton storeSlug={selectedStore.slug} />
            </div>

            <div className="premium-surface rounded-[32px] p-5">
              {bundles.length && selectedBundle ? (
                <PeriodSwitcher
                  key={selectedBundle.periodKey}
                  currentValue={selectedBundle.periodKey}
                  bundles={bundles}
                  pathname={pathname}
                  storeSlug={selectedStore.slug}
                />
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,255,255,0.46)] px-4 py-4 text-sm text-[var(--muted)]">
                  Importe um período para liberar a troca de relatórios desta loja.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {executiveInsight ? (
        <ExecutiveAiInsight
          insight={executiveInsight}
          bundleKey={selectedBundle!.periodKey}
          currentSection={assistantSection || undefined}
          enabled={isAssistantConfigured()}
          periodLabel={selectedBundle!.periodLabel}
          restaurantCode={selectedBundle!.restaurantCode}
        />
      ) : null}

      {filters ? (
        <section className="premium-surface mt-1 rounded-[32px] p-5">
          {filters}
        </section>
      ) : null}

      {selectedBundle && assistantSection ? (
        <DashboardAssistant
          bundleKey={selectedBundle.periodKey}
          periodLabel={selectedBundle.periodLabel}
          restaurantCode={selectedBundle.restaurantCode}
          currentSection={assistantSection}
          enabled={isAssistantConfigured()}
          storeName={selectedStore.name}
        />
      ) : null}

      {children}
    </main>
  );
}
