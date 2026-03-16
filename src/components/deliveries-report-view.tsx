"use client";

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

import type { DeliveriesViewData } from "@/lib/report-views";
import {
  CHART_COLORS,
  ChartFrame,
  MetricGrid,
  Panel,
  RankedList,
  formatMetricValue,
  getTooltipStyle,
} from "@/components/report-ui";

export function DeliveriesReportView({
  bundleKey,
  view,
}: {
  bundleKey: string;
  view: DeliveriesViewData;
}) {
  return (
    <div className="grid gap-5">
      <MetricGrid metrics={view.metrics} />

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel eyebrow="Canal" title="Canais de venda dos pedidos entregues">
          <div className="h-[320px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={view.channelSeries}
                    dataKey="deliveries"
                    nameKey="label"
                    innerRadius={72}
                    outerRadius={114}
                    paddingAngle={4}
                  >
                    {view.channelSeries.map((item, index) => (
                      <Cell
                        key={item.label}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${Number(value ?? 0).toLocaleString("pt-BR")} entregas`}
                    contentStyle={getTooltipStyle()}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>

        <Panel eyebrow="Operacao" title="Entregas por horario">
          <div className="h-[320px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view.hourlySeries}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis stroke="#74695f" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => `${Number(value ?? 0).toLocaleString("pt-BR")} entregas`}
                    contentStyle={getTooltipStyle()}
                  />
                  <Bar dataKey="deliveries" fill="#2e5a4c" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel eyebrow="Volume" title="Evolucao de entregas no recorte">
          <div className="h-[320px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={view.dailySeries}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis stroke="#74695f" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue"
                        ? formatMetricValue(Number(value ?? 0), "currency")
                        : `${Number(value ?? 0).toLocaleString("pt-BR")} entregas`
                    }
                    contentStyle={getTooltipStyle()}
                  />
                  <Line
                    type="monotone"
                    dataKey="deliveries"
                    stroke="#b6432c"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#b6432c" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#d29b42"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>

        <Panel eyebrow="Modos" title="Entrega por modo operacional">
          <div className="grid gap-3">
            {view.modeSeries.map((item, index) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-[var(--ink)]">
                    {item.label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[var(--accent)]">
                  {item.deliveries.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel eyebrow="Geografia" title="Bairros com mais entregas">
          <RankedList items={view.neighborhoods} valueLabel="entregas" />
        </Panel>

        <Panel eyebrow="Hora a hora" title="Volume de pedidos por hora">
          <form
            method="GET"
            className="mb-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] p-4 md:grid-cols-[1fr_auto]"
          >
            <input type="hidden" name="bundle" value={bundleKey} />
            <input type="hidden" name="start" value={view.filters.start} />
            <input type="hidden" name="end" value={view.filters.end} />
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Dia do detalhamento
              <select
                name="volumeDay"
                defaultValue={view.filters.selectedVolumeDay}
                className="h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)]"
              >
                <option value="">Todo o intervalo</option>
                {view.filters.volumeDayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="self-end rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Aplicar dia
            </button>
          </form>

          <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
            {view.hourlyContextLabel}
          </p>

          <RankedList
            items={view.hourlyRanking}
            valueLabel="pedidos"
            emptyLabel="Nao ha pedidos suficientes para montar o volume hora a hora neste filtro."
          />
        </Panel>
      </section>
    </div>
  );
}
