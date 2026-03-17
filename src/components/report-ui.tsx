"use client";

import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";

import type { DisplayMetric, RankedEntry } from "@/lib/report-views";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--plum)",
];

const TONE_STYLES: Record<
  DisplayMetric["tone"],
  {
    badge: CSSProperties;
    value: CSSProperties;
  }
> = {
  accent: {
    badge: {
      backgroundColor: "rgb(var(--accent-rgb) / 0.12)",
      color: "var(--accent)",
    },
    value: {
      color: "var(--accent)",
    },
  },
  forest: {
    badge: {
      backgroundColor: "color-mix(in srgb, var(--chart-2) 12%, white)",
      color: "var(--chart-2)",
    },
    value: {
      color: "var(--chart-2)",
    },
  },
  gold: {
    badge: {
      backgroundColor: "color-mix(in srgb, var(--chart-3) 14%, white)",
      color: "var(--chart-3)",
    },
    value: {
      color: "var(--chart-3)",
    },
  },
  slate: {
    badge: {
      backgroundColor: "color-mix(in srgb, var(--chart-4) 12%, white)",
      color: "var(--chart-4)",
    },
    value: {
      color: "var(--chart-4)",
    },
  },
};

const TOOLTIP_STYLE = {
  borderRadius: 22,
  border: "1px solid rgba(111, 70, 59, 0.16)",
  background: "rgba(255, 251, 246, 0.98)",
  boxShadow: "0 18px 42px rgba(49, 22, 18, 0.12)",
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
      <div className="flex h-full items-center justify-center rounded-[26px] border border-dashed border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(255,251,246,0.92),rgba(250,242,234,0.9))] text-sm text-[var(--muted)]">
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
    <section className="premium-surface rounded-[34px] p-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top right, rgb(var(--accent-rgb) / 0.08), transparent 24%), radial-gradient(circle at bottom left, color-mix(in srgb, var(--chart-3) 10%, transparent), transparent 26%)",
        }}
      />
      <div className="relative mb-6 flex flex-col gap-2">
        {eyebrow ? (
          <span className="premium-pill w-fit bg-[rgba(255,255,255,0.72)] text-[var(--muted)]">
            {eyebrow}
          </span>
        ) : null}
        <h3 className="text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--ink)]">
          {title}
        </h3>
      </div>
      <div className="relative">{children}</div>
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
        const tone = TONE_STYLES[metric.tone];
        return (
          <div
            key={metric.label}
            className="premium-surface rounded-[30px] p-5"
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at top right, rgba(255,255,255,0.72), transparent 24%), radial-gradient(circle at bottom left, rgb(var(--accent-rgb) / 0.06), transparent 20%)",
              }}
            />
            <div className="relative">
              <span
                className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={tone.badge}
              >
                {metric.label}
              </span>
              <p
                className="mt-4 text-[2.15rem] font-semibold tracking-[-0.05em]"
                style={tone.value}
              >
                {metric.displayValue ??
                  formatMetricValue(metric.value ?? 0, metric.format)}
              </p>
              <p className="mt-3 max-w-[26rem] text-sm leading-6 text-[var(--muted)]">
                {metric.helper}
              </p>
            </div>
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
      <div className="rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,255,255,0.4)] px-4 py-6 text-sm text-[var(--muted)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-[24px] border border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(255,251,246,0.88),rgba(249,241,232,0.84))] px-4 py-3.5 shadow-[0_12px_28px_rgba(50,21,18,0.05)] transition hover:-translate-y-0.5"
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
            <p className="text-base font-semibold text-[var(--accent)]">
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
