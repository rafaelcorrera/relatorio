"use client";

import { useSyncExternalStore } from "react";

import type { DisplayMetric, RankedEntry } from "@/lib/report-views";

export const CHART_COLORS = [
  "#b6432c",
  "#2e5a4c",
  "#d29b42",
  "#5f6b8f",
  "#85644c",
  "#4f7a70",
];

const TONE_CLASSNAMES: Record<
  DisplayMetric["tone"],
  {
    badge: string;
    value: string;
  }
> = {
  accent: {
    badge: "bg-[color:rgba(182,67,44,0.12)] text-[var(--accent)]",
    value: "text-[var(--accent)]",
  },
  forest: {
    badge: "bg-[color:rgba(46,90,76,0.12)] text-[var(--forest)]",
    value: "text-[var(--forest)]",
  },
  gold: {
    badge: "bg-[color:rgba(210,155,66,0.14)] text-[var(--gold)]",
    value: "text-[var(--gold)]",
  },
  slate: {
    badge: "bg-[color:rgba(95,107,143,0.12)] text-[#5f6b8f]",
    value: "text-[#5f6b8f]",
  },
};

const TOOLTIP_STYLE = {
  borderRadius: 18,
  border: "1px solid rgba(86, 70, 55, 0.12)",
  background: "rgba(255, 250, 243, 0.96)",
};

function subscribeToClientReady() {
  return () => {};
}

export function formatMetricValue(
  value: number,
  format: "currency" | "number" | "percent",
) {
  if (format === "currency") {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (format === "percent") {
    return `${(value * 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })}%`;
  }

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

export function getTooltipStyle() {
  return TOOLTIP_STYLE;
}

export function ChartFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(
    subscribeToClientReady,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-soft)] text-sm text-[var(--muted)]">
        Carregando grafico...
      </div>
    );
  }

  return <>{children}</>;
}

export function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-white/84 p-6 shadow-[0_18px_60px_rgba(46,32,18,0.08)] backdrop-blur">
      <div className="mb-5 flex flex-col gap-1">
        {eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {eyebrow}
          </span>
        ) : null}
        <h3 className="text-lg font-semibold text-[var(--ink)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function MetricGrid({
  metrics,
}: {
  metrics: DisplayMetric[];
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => {
        const tone = TONE_CLASSNAMES[metric.tone];
        return (
          <div
            key={metric.label}
            className="rounded-[28px] border border-[var(--line)] bg-white/86 p-5 shadow-[0_18px_60px_rgba(46,32,18,0.08)]"
          >
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}
            >
              {metric.label}
            </span>
            <p className={`mt-4 text-3xl font-semibold tracking-tight ${tone.value}`}>
              {metric.displayValue ??
                formatMetricValue(metric.value ?? 0, metric.format)}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {metric.helper}
            </p>
          </div>
        );
      })}
    </section>
  );
}

export function RankedList({
  items,
  valueLabel,
  emptyLabel = "Sem dados suficientes para montar este ranking.",
}: {
  items: RankedEntry[];
  valueLabel: string;
  emptyLabel?: string;
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--muted)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">
              {item.label}
            </p>
            {item.helper || item.secondary ? (
              <p className="truncate text-xs text-[var(--muted)]">
                {[item.helper, item.secondary].filter(Boolean).join(" • ")}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-[var(--accent)]">
              {item.value.toLocaleString("pt-BR")}
            </p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {valueLabel}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
