"use client";

import Link from "next/link";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ProductsViewData } from "@/lib/report-views";
import {
  CHART_COLORS,
  ChartFrame,
  MetricGrid,
  Panel,
  RankedList,
  formatMetricValue,
  getTooltipStyle,
} from "@/components/report-ui";

export function ProductsReportView({
  view,
  pathname,
  storeSlug,
  bundleKey,
}: {
  view: ProductsViewData;
  pathname: string;
  storeSlug: string;
  bundleKey: string;
}) {
  function buildClassHref(nextClass: string) {
    const searchParams = new URLSearchParams();
    searchParams.set("store", storeSlug);
    searchParams.set("bundle", bundleKey);

    if (view.filters.selectedCategory) {
      searchParams.set("category", view.filters.selectedCategory);
    }

    if (view.filters.selectedChannel) {
      searchParams.set("channel", view.filters.selectedChannel);
    }

    if (nextClass) {
      searchParams.set("abcClass", nextClass);
    }

    return `${pathname}?${searchParams.toString()}`;
  }

  return (
    <div className="grid gap-5">
      <MetricGrid metrics={view.metrics} />

      <section className="premium-note rounded-[30px] p-5 text-sm leading-7 text-[var(--muted)]">
        {view.curveNote}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel eyebrow="Categorias" title="Volume vendido por categoria">
          <div className="h-[340px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view.categorySeries} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" horizontal={false} />
                  <XAxis type="number" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={148}
                    stroke="#74695f"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => `${Number(value ?? 0).toLocaleString("pt-BR")} unidades`}
                    contentStyle={getTooltipStyle()}
                  />
                  <Bar dataKey="quantity" fill="var(--chart-1)" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>

        <Panel eyebrow="Canais" title="Participacao por canal no recorte">
          <div className="h-[340px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={view.channelSeries}
                    dataKey="quantity"
                    nameKey="label"
                    innerRadius={70}
                    outerRadius={112}
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
                    formatter={(value) => `${Number(value ?? 0).toLocaleString("pt-BR")} unidades`}
                    contentStyle={getTooltipStyle()}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel eyebrow="Faturamento" title="Faturamento por categoria">
          <div className="h-[340px]">
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view.revenueCategorySeries} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid stroke="rgba(86, 70, 55, 0.08)" horizontal={false} />
                  <XAxis type="number" stroke="#74695f" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={148}
                    stroke="#74695f"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatMetricValue(Number(value ?? 0), "currency")}
                    contentStyle={getTooltipStyle()}
                  />
                  <Bar dataKey="revenue" fill="var(--chart-2)" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Panel>

        <Panel eyebrow="Curva ABC" title="Composicao da Curva ABC">
          <div className="grid gap-3">
            {view.abcSeries.length ? (
              view.abcSeries.map((item, index) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    view.filters.selectedAbcClass === item.label
                      ? "border-[var(--accent)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,240,234,0.96))] shadow-[0_18px_38px_rgba(50,21,18,0.08)]"
                      : "border-[var(--line)] bg-[var(--panel-soft)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">
                          {item.label}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {item.products.toLocaleString("pt-BR")} produtos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--forest)]">
                        {formatMetricValue(item.revenue, "currency")}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatMetricValue(item.share, "percent")} do faturamento
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    <span>{item.quantity.toLocaleString("pt-BR")} unidades</span>
                    <span>{item.products.toLocaleString("pt-BR")} itens</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={buildClassHref(
                        view.filters.selectedAbcClass === item.label ? "" : item.label,
                      )}
                      className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        view.filters.selectedAbcClass === item.label
                          ? "border-[var(--accent)] bg-[rgba(255,255,255,0.9)] text-[var(--accent)]"
                          : "border-[var(--line-strong)] bg-white/70 text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      }`}
                    >
                      {view.filters.selectedAbcClass === item.label
                        ? "Ocultar itens"
                        : "Ver itens da classe"}
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--muted)]">
                Nao ha dados suficientes de Curva ABC para o filtro atual.
              </div>
            )}
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.54)] p-4">
            {view.filters.selectedAbcClass ? (
              view.abcItems.length ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        Itens internos da {view.filters.selectedAbcClass}
                      </p>
                      <p className="text-xs leading-6 text-[var(--muted)]">
                        Analise detalhada dos produtos classificados nesta faixa.
                      </p>
                    </div>
                    <Link
                      href={buildClassHref("")}
                      className="inline-flex rounded-full border border-[var(--line-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Limpar classe
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-3">
                      <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                          <th className="px-3">Item</th>
                          <th className="px-3">Categoria</th>
                          <th className="px-3">Unidades</th>
                          <th className="px-3">Preco medio</th>
                          <th className="px-3">Faturamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.abcItems.map((item) => (
                          <tr
                            key={`${view.filters.selectedAbcClass}-${item.category}-${item.label}`}
                            className="rounded-2xl bg-[var(--panel-soft)] text-sm text-[var(--ink)]"
                          >
                            <td className="rounded-l-2xl px-3 py-3 font-semibold">
                              {item.label}
                            </td>
                            <td className="px-3 py-3">{item.category}</td>
                            <td className="px-3 py-3">
                              {item.quantity.toLocaleString("pt-BR")}
                            </td>
                            <td className="px-3 py-3">
                              {formatMetricValue(item.averagePrice, "currency")}
                            </td>
                            <td className="rounded-r-2xl px-3 py-3">
                              {formatMetricValue(item.revenue, "currency")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-sm leading-7 text-[var(--muted)]">
                  A classe selecionada nao possui itens no filtro atual.
                </div>
              )
            ) : (
              <div className="text-sm leading-7 text-[var(--muted)]">
                Clique em uma classe acima para abrir os itens internos e aprofundar a analise.
              </div>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel eyebrow="Top 20" title="Itens mais vendidos">
          <RankedList items={view.topProducts} valueLabel="unidades" />
        </Panel>

        <Panel eyebrow="Bottom 20" title="Itens menos vendidos">
          <RankedList
            items={view.lowProducts}
            valueLabel="unidades"
            emptyLabel="Nao ha itens suficientes para montar o ranking de menor saida."
          />
        </Panel>
      </section>
    </div>
  );
}
