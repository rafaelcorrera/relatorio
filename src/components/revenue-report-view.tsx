"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RevenueViewData } from "@/lib/report-views";
import {
  ChartFrame,
  MetricGrid,
  Panel,
  formatMetricValue,
  getTooltipStyle,
} from "@/components/report-ui";

export function RevenueReportView({
  view,
}: {
  view: RevenueViewData;
}) {
  return (
    <div className="grid gap-5">
      <MetricGrid metrics={view.metrics} />

      <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Panel eyebrow="Receita" title="Faturamento bruto x venda liquida final">
          <div className="h-[320px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={view.dailySeries}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#74695f"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${(Number(value) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatMetricValue(Number(value ?? 0), "currency")}
                    contentStyle={getTooltipStyle()}
                  />
                  <Line
                    type="monotone"
                    dataKey="gross"
                    stroke="#b6432c"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#b6432c" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="final"
                    stroke="#2e5a4c"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#2e5a4c" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>

        <Panel eyebrow="Componentes" title="Descontos, servico e entrega por dia">
          <div className="h-[320px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view.componentsSeries}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#74695f"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${(Number(value) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatMetricValue(Number(value ?? 0), "currency")}
                    contentStyle={getTooltipStyle()}
                  />
                  <Bar dataKey="discounts" fill="#b6432c" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="serviceFee" fill="#d29b42" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="deliveryFee" fill="#2e5a4c" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel eyebrow="Leitura diaria" title="Resumo por dia">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  <th className="px-3">Dia</th>
                  <th className="px-3">Bruto</th>
                  <th className="px-3">Liquido final</th>
                  <th className="px-3">Descontos</th>
                  <th className="px-3">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {view.tableRows.map((row) => (
                  <tr key={row.label} className="rounded-2xl bg-[var(--panel-soft)] text-sm text-[var(--ink)]">
                    <td className="rounded-l-2xl px-3 py-3 font-semibold">{row.label}</td>
                    <td className="px-3 py-3">{formatMetricValue(row.gross, "currency")}</td>
                    <td className="px-3 py-3">{formatMetricValue(row.final, "currency")}</td>
                    <td className="px-3 py-3">{formatMetricValue(row.discounts, "currency")}</td>
                    <td className="rounded-r-2xl px-3 py-3">{row.orders.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel eyebrow="Observacao" title="Cancelamentos">
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-soft)] px-5 py-5 text-sm leading-7 text-[var(--muted)]">
            {view.cancellationNote}
          </div>
        </Panel>
      </section>
    </div>
  );
}
