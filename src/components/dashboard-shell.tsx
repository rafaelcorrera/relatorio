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
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-32 md:px-6 lg:px-8">
      <div className="pointer-events-none fixed left-1/2 top-4 z-[999] w-[calc(100%-2rem)] max-w-[1780px] -translate-x-1/2 px-0">
        <div className="pointer-events-auto w-full">
          <nav className="flex flex-wrap items-center justify-between gap-4 rounded-[34px] border border-[#7a3652] bg-[linear-gradient(135deg,rgba(88,16,38,0.97),rgba(63,10,29,0.98))] px-5 py-4 text-white shadow-[0_30px_90px_rgba(68,8,28,0.36)] backdrop-blur-xl md:px-7">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[radial-gradient(circle_at_top_left,rgba(255,240,194,0.55),transparent_28%),linear-gradient(135deg,#c45a7c_0%,#8f2748_45%,#61203a_100%)] shadow-[0_16px_40px_rgba(127,25,57,0.4)]">
                <ChartColumn className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[1.95rem] font-semibold leading-none tracking-[-0.04em] text-white">
                  Relatorios GAFS
                </p>
                <p className="mt-2 truncate text-xs font-semibold uppercase tracking-[0.42em] text-[#f0c8d5]">
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
                        ? "bg-[rgba(255,245,247,0.14)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                        : "text-white/88 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-[#ffd2a8]" : "text-white/70"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <Link
              href={actionHref}
              className="inline-flex items-center gap-3 rounded-full border border-[#b76a84] bg-[linear-gradient(135deg,rgba(132,34,66,0.98),rgba(92,20,46,0.98))] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_20px_46px_rgba(68,8,28,0.4)] transition hover:-translate-y-0.5 hover:brightness-110 lg:px-7"
            >
              Atualizar Dados
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </div>

      <section className="relative rounded-[34px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,250,243,0.96),rgba(244,236,225,0.96))] shadow-[0_28px_80px_rgba(64,36,16,0.12)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.66),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(182,67,44,0.07),transparent_28%)]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.12fr_0.88fr] lg:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                <ChartColumn className="h-4 w-4 text-[var(--accent)]" />
                Relatorios GAFS
              </span>
              {selectedBundle ? (
                <span className="inline-flex rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--ink)]">
                  {selectedBundle.restaurantCode} • {selectedBundle.periodLabel}
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-tight text-[var(--ink)] md:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
              {description}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[26px] border border-[var(--line)] bg-white/72 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Sessao
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                  {sessionEmail}
                </p>
              </div>
              <div className="rounded-[26px] border border-[var(--line)] bg-white/72 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Fontes do periodo
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                  {selectedBundle ? `${selectedBundle.sourceFiles.length} arquivos` : "Sem arquivos"}
                </p>
              </div>
              <div className="rounded-[26px] border border-[var(--line)] bg-white/72 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Cobertura
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                  {selectedBundle
                    ? `${Object.values(selectedBundle.coverage).filter(Boolean).length}/4 relatorios`
                    : "Aguardando importacao"}
                </p>
              </div>
              <div className="rounded-[26px] border border-[var(--line)] bg-white/72 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Ultima carga
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">
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

            <div className="rounded-[28px] border border-[var(--line)] bg-white/84 p-5 shadow-[0_18px_60px_rgba(46,32,18,0.08)]">
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
                <div className="rounded-2xl bg-[var(--panel-soft)] px-4 py-4 text-sm text-[var(--muted)]">
                  Importe um periodo para liberar a troca de relatorios.
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-white/84 p-5 shadow-[0_18px_60px_rgba(46,32,18,0.08)]">
              <UploadReportsForm />
            </div>
          </div>
        </div>
      </section>

      {filters ? (
        <section className="mt-4 rounded-[28px] border border-[var(--line)] bg-white/84 p-5 shadow-[0_18px_60px_rgba(46,32,18,0.08)]">
          {filters}
        </section>
      ) : null}

      {selectedBundle ? (
        <DashboardAssistant
          bundleKey={selectedBundle.periodKey}
          periodLabel={selectedBundle.periodLabel}
          restaurantCode={selectedBundle.restaurantCode}
          currentSection={currentSection}
          enabled={Boolean(process.env.OPENAI_API_KEY?.trim())}
        />
      ) : null}

      {children}
    </main>
  );
}
