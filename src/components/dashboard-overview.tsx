"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardSnapshot, RankedItem } from "@/lib/types";

const CHART_COLORS = ["#b6432c", "#2e5a4c", "#d29b42", "#5f6b8f", "#85644c"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMetric(
  value: number,
  format: "currency" | "number" | "percent",
) {
  if (format === "currency") {
    return formatCurrency(value);
  }

  if (format === "percent") {
    return `${(value * 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })}%`;
  }

  return value.toLocaleString("pt-BR");
}

function subscribeToClientReady() {
  return () => {};
}

function ChartFrame({
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

function Panel({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-[var(--line)] bg-white/84 p-6 shadow-[0_18px_60px_rgba(46,32,18,0.08)] backdrop-blur ${className}`}
    >
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

function RankedTable({
  items,
  quantityLabel,
}: {
  items: RankedItem[];
  quantityLabel: string;
}) {
  return (
    <div className="grid gap-3">
      {items.length ? (
        items.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">
                {item.label}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {[item.secondaryLabel, item.secondaryValue].filter(Boolean).join(" • ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--accent)]">
                {item.value.toLocaleString("pt-BR")}
              </p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {quantityLabel}
              </p>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--muted)]">
          Sem dados suficientes para montar este ranking ainda.
        </div>
      )}
    </div>
  );
}

export function DashboardOverview({
  snapshot,
}: {
  snapshot: DashboardSnapshot;
}) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[28px] border border-[var(--line)] bg-white/86 p-5 shadow-[0_18px_60px_rgba(46,32,18,0.08)]"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {metric.label}
            </span>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]">
              {formatMetric(metric.value, metric.format)}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">{metric.helper}</p>
          </div>
        ))}
      </section>

      <Panel
        eyebrow="Leituras rapidas"
        title="O que o periodo mostra de imediato"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.insights.map((insight) => (
            <div
              key={insight.label}
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {insight.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                {insight.value}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">{insight.helper}</p>
            </div>
          ))}
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <Panel eyebrow="Faturamento" title="Curva diaria de receita">
          <div className="h-[320px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshot.dailyRevenue}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#74695f"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      `R$ ${(Number(value) / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid rgba(86, 70, 55, 0.12)",
                      background: "rgba(255, 250, 243, 0.96)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#b6432c"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#b6432c" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="grossRevenue"
                    stroke="#d29b42"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>

        <Panel eyebrow="Canal" title="Distribuicao de pedidos por origem principal">
          <div className="h-[320px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={snapshot.channelMix}
                    dataKey="orders"
                    nameKey="label"
                    innerRadius={72}
                    outerRadius={112}
                    paddingAngle={4}
                  >
                    {snapshot.channelMix.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      `${Number(value ?? 0).toLocaleString("pt-BR")} pedidos`
                    }
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid rgba(86, 70, 55, 0.12)",
                      background: "rgba(255, 250, 243, 0.96)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
          <div className="mt-4 grid gap-2">
            {snapshot.channelMix.map((item, index) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {item.label}
                  </p>
                </div>
                <div className="text-right text-sm text-[var(--muted)]">
                  <p>{item.orders.toLocaleString("pt-BR")} pedidos</p>
                  <p>{formatCurrency(item.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Panel eyebrow="Horario" title="Picos de demanda ao longo do dia">
          <div className="h-[300px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.hourlyDemand}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis stroke="#74695f" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue"
                        ? formatCurrency(Number(value ?? 0))
                        : `${Number(value ?? 0).toLocaleString("pt-BR")} pedidos`
                    }
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid rgba(86, 70, 55, 0.12)",
                      background: "rgba(255, 250, 243, 0.96)",
                    }}
                  />
                  <Bar dataKey="orders" fill="#2e5a4c" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>

        <Panel eyebrow="Entrega" title="Bairros com maior concentracao de pedidos">
          <div className="h-[300px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={snapshot.neighborhoods}
                  layout="vertical"
                  margin={{ left: 0 }}
                >
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#74695f"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    stroke="#74695f"
                    width={112}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) =>
                      `${Number(value ?? 0).toLocaleString("pt-BR")} entregas`
                    }
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid rgba(86, 70, 55, 0.12)",
                      background: "rgba(255, 250, 243, 0.96)",
                    }}
                  />
                  <Bar dataKey="orders" fill="#d29b42" radius={[0, 12, 12, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel eyebrow="Cardapio" title="Itens mais vendidos">
          <RankedTable items={snapshot.topProducts} quantityLabel="unidades" />
        </Panel>

        <Panel eyebrow="Cardapio" title="Itens com menor saida">
          <RankedTable items={snapshot.lowProducts} quantityLabel="unidades" />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr_0.95fr]">
        <Panel eyebrow="Categorias" title="Ranking de categorias">
          <RankedTable items={snapshot.categories} quantityLabel="unidades" />
        </Panel>

        <Panel eyebrow="Origem detalhada" title="Origens de pedido mais fortes">
          <div className="grid gap-3">
            {snapshot.originMix.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {item.label}
                  </p>
                  <p className="text-sm text-[var(--accent)]">
                    {item.orders.toLocaleString("pt-BR")} pedidos
                  </p>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {formatCurrency(item.revenue)}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Operacao" title="Indicadores operacionais">
          <div className="grid gap-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Taxa de servico
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                {formatCurrency(snapshot.serviceFeeTotal)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Taxa de entrega
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                {formatCurrency(snapshot.deliveryFeeTotal)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Preparo medio
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                {snapshot.averagePrepMinutes.toLocaleString("pt-BR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })}
                min
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Entrega media
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                {snapshot.averageDeliveryMinutes.toLocaleString("pt-BR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })}
                min
              </p>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
