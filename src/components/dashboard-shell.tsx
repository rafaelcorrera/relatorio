import Link from "next/link";
import {
  ArrowRight,
  ChartColumn,
  CircleDollarSign,
  ConciergeBell,
  Hamburger,
  Truck,
} from "lucide-react";

import { DashboardAssistant } from "@/components/dashboard-assistant";
import { LogoutButton } from "@/components/logout-button";
import { PeriodSwitcher } from "@/components/period-switcher";
import { UploadReportsForm } from "@/components/upload-reports-form";
import { isAssistantConfigured } from "@/lib/report-assistant";
import type { ParsedBundle } from "@/lib/types";

type SectionKey = "faturamento" | "entregas" | "mesa" | "produtos";

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
];

export async function DashboardShell({
  currentSection,
  title,
  description,
  pathname,
  bundles,
  selectedBundle,
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
  sessionEmail: string;
  filters?: React.ReactNode;
  children: React.ReactNode;
}) {
  const bundleKey = selectedBundle?.periodKey;
  const actionHref = bundleKey
    ? `${pathname}?bundle=${bundleKey}#acoes-dashboard`
    : `${pathname}#acoes-dashboard`;

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-8 px-4 py-32 md:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-10 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(255,228,184,0.24),transparent_24%),radial-gradient(circle_at_top_right,rgba(159,35,68,0.18),transparent_26%)] blur-2xl" />

      <div className="pointer-events-none fixed left-1/2 top-4 z-[999] w-[calc(100%-2rem)] max-w-[1780px] -translate-x-1/2 px-0">
        <div className="pointer-events-auto w-full">
          <nav className="flex flex-wrap items-center justify-between gap-4 rounded-[36px] border border-[rgba(252,234,215,0.12)] bg-[linear-gradient(135deg,rgba(20,8,12,0.94),rgba(74,24,39,0.95)_52%,rgba(30,11,17,0.94))] px-5 py-4 text-white shadow-[0_30px_90px_rgba(39,10,19,0.4)] backdrop-blur-xl md:px-7">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/12 bg-[radial-gradient(circle_at_top_left,rgba(255,237,196,0.82),transparent_30%),linear-gradient(135deg,#cf9f4c_0%,#a12c4b_48%,#552233_100%)] shadow-[0_18px_46px_rgba(135,55,35,0.38)]">
                <ChartColumn className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[1.95rem] font-semibold leading-none tracking-[-0.04em] text-white">
                  Relatorios GAFS
                </p>
                <p className="mt-2 truncate text-xs font-semibold uppercase tracking-[0.42em] text-[#f4d7c3]">
                  Visao Operacional
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-center gap-2 lg:gap-3">
              {SECTION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === currentSection;
                const href = bundleKey ? `${item.href}?bundle=${bundleKey}` : item.href;

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
              href={actionHref}
              className="inline-flex items-center gap-3 rounded-full border border-[rgba(255,219,181,0.2)] bg-[linear-gradient(135deg,rgba(211,161,80,0.95),rgba(151,41,69,0.95))] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_20px_46px_rgba(68,8,28,0.34)] transition hover:-translate-y-0.5 hover:brightness-110 lg:px-7"
            >
              Atualizar Dados
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[40px] border border-[rgba(252,234,215,0.12)] bg-[linear-gradient(140deg,#1d0c13_0%,#58192a_44%,#241016_100%)] shadow-[0_40px_120px_rgba(39,11,18,0.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,234,194,0.18),transparent_20%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(203,154,72,0.18),transparent_20%)]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.12fr_0.88fr] lg:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#f7dbca] backdrop-blur">
                <ChartColumn className="h-4 w-4 text-[#ffd4a4]" />
                Relatorios GAFS
              </span>
              {selectedBundle ? (
                <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-white/86 backdrop-blur">
                  {selectedBundle.restaurantCode} • {selectedBundle.periodLabel}
                </span>
              ) : null}
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-[3.65rem] md:leading-[1.02]">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              {description}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-white/10 bg-white/7 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                  Sessao
                </p>
                <p className="mt-3 text-sm font-medium text-white/86">
                  {sessionEmail}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/7 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                  Fontes do periodo
                </p>
                <p className="mt-3 text-sm font-medium text-white/86">
                  {selectedBundle ? `${selectedBundle.sourceFiles.length} arquivos` : "Sem arquivos"}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/7 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                  Cobertura
                </p>
                <p className="mt-3 text-sm font-medium text-white/86">
                  {selectedBundle
                    ? `${Object.values(selectedBundle.coverage).filter(Boolean).length}/4 relatorios`
                    : "Aguardando importacao"}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/7 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
                  Ultima carga
                </p>
                <p className="mt-3 text-sm font-medium text-white/86">
                  {selectedBundle
                    ? new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(selectedBundle.uploadedAt))
                    : "Sem historico"}
                </p>
              </div>
            </div>
          </div>

          <div id="acoes-dashboard" className="grid gap-4 scroll-mt-32">
            <div className="flex justify-end">
              <LogoutButton />
            </div>

            <div className="premium-surface rounded-[32px] p-5">
              {bundles.length && selectedBundle ? (
                <PeriodSwitcher
                  currentValue={selectedBundle.periodKey}
                  options={bundles.map((bundle) => ({
                    value: bundle.periodKey,
                    label: `${bundle.periodLabel} • ${bundle.restaurantCode}`,
                  }))}
                  pathname={pathname}
                />
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,255,255,0.46)] px-4 py-4 text-sm text-[var(--muted)]">
                  Importe um periodo para liberar a troca de relatorios.
                </div>
              )}
            </div>

            <div className="premium-surface rounded-[32px] p-5">
              <UploadReportsForm />
            </div>
          </div>
        </div>
      </section>

      {filters ? (
        <section className="premium-surface mt-1 rounded-[32px] p-5">
          {filters}
        </section>
      ) : null}

      {selectedBundle ? (
        <DashboardAssistant
          bundleKey={selectedBundle.periodKey}
          periodLabel={selectedBundle.periodLabel}
          restaurantCode={selectedBundle.restaurantCode}
          currentSection={currentSection}
          enabled={isAssistantConfigured()}
        />
      ) : null}

      {children}
    </main>
  );
}
