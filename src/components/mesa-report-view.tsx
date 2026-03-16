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

import type { MesaViewData } from "@/lib/report-views";
import {
  ChartFrame,
  MetricGrid,
  Panel,
  RankedList,
  formatMetricValue,
  getTooltipStyle,
} from "@/components/report-ui";

export function MesaReportView({
  view,
}: {
  view: MesaViewData;
}) {
  return (
    <div className="grid gap-5">
      <MetricGrid metrics={view.metrics} />

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel eyebrow="Mesa" title="Receita de mesa ao longo do periodo">
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
                    formatter={(value, name) =>
                      name === "averageTicket"
                        ? formatMetricValue(Number(value ?? 0), "currency")
                        : name === "orders"
                          ? `${Number(value ?? 0).toLocaleString("pt-BR")} pedidos`
                          : formatMetricValue(Number(value ?? 0), "currency")
                    }
                    contentStyle={getTooltipStyle()}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#b6432c"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#b6432c" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageTicket"
                    stroke="#2e5a4c"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>

        <Panel eyebrow="Horario" title="Pico de pedidos de mesa">
          <div className="h-[320px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view.hourlySeries}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis stroke="#74695f" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue"
                        ? formatMetricValue(Number(value ?? 0), "currency")
                        : `${Number(value ?? 0).toLocaleString("pt-BR")} pedidos`
                    }
                    contentStyle={getTooltipStyle()}
                  />
                  <Bar dataKey="orders" fill="#d29b42" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel eyebrow="Pagamento" title="Formas de pagamento de mesa">
          <div className="h-[320px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view.paymentSeries} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" horizontal={false} />
                  <XAxis type="number" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={118}
                    stroke="#74695f"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue"
                        ? formatMetricValue(Number(value ?? 0), "currency")
                        : `${Number(value ?? 0).toLocaleString("pt-BR")} pedidos`
                    }
                    contentStyle={getTooltipStyle()}
                  />
                  <Bar dataKey="orders" fill="#2e5a4c" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>

        <Panel eyebrow="Catalogos" title="Catalogos com maior giro em mesa">
          <RankedList items={view.catalogs} valueLabel="pedidos" />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel eyebrow="Operacao" title="Usuarios com maior volume de mesa">
          <RankedList items={view.operators} valueLabel="mesas" />
        </Panel>

        <Panel eyebrow="Leitura" title="Como ler esta pagina">
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-soft)] px-5 py-5 text-sm leading-7 text-[var(--muted)]">
            O ticket medio considera apenas pedidos classificados como
            COMANDA/MESA. A taxa de servico e calculada a partir do relatorio de
            pedidos, e o filtro por dia permite analisar um unico recorte de
            atendimento.
          </div>
        </Panel>
      </section>
    </div>
  );
}
