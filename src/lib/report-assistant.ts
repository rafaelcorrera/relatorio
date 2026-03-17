import "server-only";

import OpenAI from "openai";
import type {
  EasyInputMessage,
  ResponseFunctionToolCall,
  ResponseInputItem,
  Tool,
} from "openai/resources/responses/responses";

import {
  aggregateProductCurve,
  buildProductKey,
  buildProductLookup,
  resolveProductLookup,
} from "@/lib/product-curve";
import {
  buildDeliveriesView,
  buildMesaView,
  buildProductsView,
  buildRevenueView,
  type RankedEntry,
} from "@/lib/report-views";
import type { OrderRecord, ParsedBundle } from "@/lib/types";

export type AssistantSection =
  | "faturamento"
  | "entregas"
  | "mesa"
  | "produtos";

export interface AssistantHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantAnswer {
  answer: string;
  toolsUsed: string[];
  model: string;
}

export interface ExecutiveInsightCard {
  title: string;
  body: string;
  tone: "accent" | "forest" | "gold";
}

export interface ExecutiveInsightResult {
  status: "ai" | "fallback" | "unavailable";
  headline: string;
  summary: string;
  cards: ExecutiveInsightCard[];
  providerLabel: string;
  model: string | null;
  generatedAt: string;
}

type AssistantToolName =
  | "get_period_context"
  | "get_sales_overview"
  | "get_delivery_insights"
  | "get_table_insights"
  | "get_product_insights"
  | "get_order_timeline";

let openAIClient: OpenAI | null = null;
let openAIClientCacheKey = "";

type AssistantProvider = "openai" | "groq";

const EXECUTIVE_INSIGHT_CACHE_TTL = 1000 * 60 * 30;
const executiveInsightCache = new Map<
  string,
  {
    expiresAt: number;
    result: ExecutiveInsightResult;
  }
>();

function sortDateKeys(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return sumBy(values, (value) => value) / values.length;
}

function getLiquidSalesValue<
  T extends {
    grossSales: number;
    discounts: number;
    serviceFee: number;
    deliveryFee: number;
  },
>(item: T) {
  return item.grossSales - item.discounts - item.serviceFee - item.deliveryFee;
}

function uniqueDateKeys(bundle: ParsedBundle) {
  return sortDateKeys(
    [...bundle.performance, ...bundle.orders, ...bundle.deliveries]
      .map((item) => item.dateKey)
      .filter(Boolean),
  );
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalDay(value: unknown, options: string[]) {
  const day = normalizeOptionalString(value);
  return options.includes(day) ? day : "";
}

function normalizeLimit(value: unknown, fallback = 10) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(20, Math.trunc(value)));
}

function prettifyToolName(value: string) {
  return value.replace(/_/g, " ").trim();
}

function prettifyChannelLabel(value: string) {
  return value.replace(/_/g, " ").trim() || "Nao informado";
}

function formatCurrencyText(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentDelta(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "sem base comparativa";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function normalizeProvider(value: string | undefined): AssistantProvider | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "openai" || normalized === "groq") {
    return normalized;
  }

  return null;
}

export function getAssistantProvider(): AssistantProvider {
  const explicitProvider = normalizeProvider(process.env.AI_PROVIDER);

  if (explicitProvider) {
    return explicitProvider;
  }

  if (process.env.GROQ_API_KEY?.trim()) {
    return "groq";
  }

  return "openai";
}

export function getAssistantProviderLabel() {
  return getAssistantProvider() === "groq" ? "Groq" : "OpenAI";
}

function getAssistantApiKey() {
  return getAssistantProvider() === "groq"
    ? process.env.GROQ_API_KEY?.trim() || ""
    : process.env.OPENAI_API_KEY?.trim() || "";
}

function getAssistantBaseUrl() {
  return getAssistantProvider() === "groq"
    ? "https://api.groq.com/openai/v1"
    : undefined;
}

function getDefaultModel() {
  return getAssistantProvider() === "groq" ? "openai/gpt-oss-20b" : "gpt-5-mini";
}

export function getAssistantModel() {
  return (
    (getAssistantProvider() === "groq"
      ? process.env.GROQ_MODEL?.trim()
      : process.env.OPENAI_MODEL?.trim()) || getDefaultModel()
  );
}

export function isAssistantConfigured() {
  return Boolean(getAssistantApiKey());
}

export function getAssistantConfigurationHint() {
  return getAssistantProvider() === "groq"
    ? "Defina `GROQ_API_KEY` e, se quiser, ajuste `GROQ_MODEL`."
    : "Defina `OPENAI_API_KEY` e, se quiser, ajuste `OPENAI_MODEL`.";
}

function requireOpenAIClient() {
  const apiKey = getAssistantApiKey();

  if (!apiKey) {
    throw new Error(
      `${getAssistantConfigurationHint().replace(/^Defina /, "Configure ")}`.replace(/\.$/, " para habilitar o assistente de IA."),
    );
  }

  const cacheKey = `${getAssistantProvider()}:${getAssistantModel()}:${apiKey.slice(0, 16)}`;

  if (!openAIClient || openAIClientCacheKey !== cacheKey) {
    openAIClient = new OpenAI({
      apiKey,
      baseURL: getAssistantBaseUrl(),
    });
    openAIClientCacheKey = cacheKey;
  }

  return openAIClient;
}

function getMonthSortKey(bundle: ParsedBundle) {
  return `${bundle.year}-${String(bundle.month).padStart(2, "0")}`;
}

function sortBundlesByPeriod(bundles: ParsedBundle[]) {
  return [...bundles].sort((left, right) => {
    if (left.year !== right.year) {
      return left.year - right.year;
    }

    if (left.month !== right.month) {
      return left.month - right.month;
    }

    return left.uploadedAt.localeCompare(right.uploadedAt);
  });
}

function calculateBundleTotals(bundle: ParsedBundle) {
  const grossSales = sumBy(bundle.performance, (item) => item.grossSales);
  const netSales = sumBy(bundle.performance, (item) => getLiquidSalesValue(item));
  const orders = sumBy(bundle.performance, (item) => item.orders) || bundle.orders.length;
  const customers =
    sumBy(bundle.performance, (item) => item.customers) ||
    sumBy(bundle.orders, (item) => item.customerCount);
  const averageTicket = customers > 0 ? netSales / customers : 0;

  return {
    grossSales,
    netSales,
    orders,
    customers,
    averageTicket,
  };
}

function calculateDelta(current: number, reference: number) {
  if (!reference) {
    return null;
  }

  return (current - reference) / reference;
}

function buildLowSellerCandidates(
  bundle: ParsedBundle,
  historicalBundles: ParsedBundle[],
) {
  const curveLookup = buildProductLookup(aggregateProductCurve(bundle.productCurve));
  const historyMap = new Map<
    string,
    {
      totalQuantity: number;
      monthsWithSales: number;
      totalRevenue: number;
    }
  >();

  for (const historicalBundle of historicalBundles) {
    const historicalCurveLookup = buildProductLookup(
      aggregateProductCurve(historicalBundle.productCurve),
    );

    for (const item of historicalBundle.productSales) {
      const key = buildProductKey(item.category, item.product);
      const curve = resolveProductLookup(
        historicalCurveLookup,
        item.category,
        item.product,
      ).item;
      const historicalRevenue =
        curve?.totalRevenue ?? (curve?.averagePrice ?? 0) * item.totalQuantity;
      const current = historyMap.get(key) || {
        totalQuantity: 0,
        monthsWithSales: 0,
        totalRevenue: 0,
      };
      current.totalQuantity += item.totalQuantity;
      current.monthsWithSales += 1;
      current.totalRevenue += historicalRevenue;
      historyMap.set(key, current);
    }
  }

  return bundle.productSales
    .filter((item) => item.totalQuantity > 0)
    .filter((item) => item.category.trim().toUpperCase() !== "EXTRAS")
    .map((item) => {
      const key = buildProductKey(item.category, item.product);
      const curve = resolveProductLookup(curveLookup, item.category, item.product).item;
      const history = historyMap.get(key);
      const revenue =
        curve?.totalRevenue ?? (curve?.averagePrice ?? 0) * item.totalQuantity;

      return {
        product: item.product,
        category: item.category,
        currentQuantity: item.totalQuantity,
        currentRevenue: revenue,
        abcClass: curve?.abcClass || "Sem classe",
        totalQuantityHistory: history?.totalQuantity || item.totalQuantity,
        monthsWithSales: history?.monthsWithSales || 1,
        totalRevenueHistory: history?.totalRevenue || revenue,
      };
    })
    .sort((left, right) => {
      if (left.currentQuantity !== right.currentQuantity) {
        return left.currentQuantity - right.currentQuantity;
      }

      if (left.totalQuantityHistory !== right.totalQuantityHistory) {
        return left.totalQuantityHistory - right.totalQuantityHistory;
      }

      return left.currentRevenue - right.currentRevenue;
    })
    .slice(0, 8);
}

function buildExecutiveInsightSummary(
  bundle: ParsedBundle,
  historicalBundles: ParsedBundle[],
  storeName: string,
) {
  const sortedBundles = sortBundlesByPeriod(
    historicalBundles.filter(
      (item) => item.restaurantCode === bundle.restaurantCode,
    ),
  );
  const currentTotals = calculateBundleTotals(bundle);
  const previousBundles = sortedBundles.filter(
    (item) => item.periodKey !== bundle.periodKey && getMonthSortKey(item) < getMonthSortKey(bundle),
  );
  const comparisonBundles = sortedBundles.filter((item) => item.periodKey !== bundle.periodKey);
  const previousBundle = previousBundles[previousBundles.length - 1] || null;
  const previousTotals = previousBundle ? calculateBundleTotals(previousBundle) : null;
  const comparisonTotals = comparisonBundles.map((item) => ({
    periodLabel: item.periodLabel,
    ...calculateBundleTotals(item),
  }));
  const averageNetSales = average(comparisonTotals.map((item) => item.netSales));
  const averageOrders = average(comparisonTotals.map((item) => item.orders));
  const rankedByNetSales = [...sortedBundles]
    .map((item) => ({
      periodLabel: item.periodLabel,
      ...calculateBundleTotals(item),
    }))
    .sort((left, right) => right.netSales - left.netSales);
  const rankPosition = rankedByNetSales.findIndex(
    (item) => item.periodLabel === bundle.periodLabel,
  );
  const productsView = buildProductsView(bundle);

  return {
    storeName,
    period: {
      restaurantCode: bundle.restaurantCode,
      periodLabel: bundle.periodLabel,
      periodKey: bundle.periodKey,
      loadedPeriods: sortedBundles.map((item) => item.periodLabel),
      loadedHistoryCount: sortedBundles.length,
      rankByNetSales:
        rankPosition >= 0 ? `${rankPosition + 1} de ${rankedByNetSales.length}` : null,
    },
    currentMonth: currentTotals,
    comparisons: {
      previousMonth: previousBundle
        ? {
            periodLabel: previousBundle.periodLabel,
            netSales: previousTotals?.netSales || 0,
            orders: previousTotals?.orders || 0,
            deltaNetSales: previousTotals
              ? calculateDelta(currentTotals.netSales, previousTotals.netSales)
              : null,
            deltaOrders: previousTotals
              ? calculateDelta(currentTotals.orders, previousTotals.orders)
              : null,
          }
        : null,
      historyAverage: comparisonTotals.length
        ? {
            netSales: averageNetSales,
            orders: averageOrders,
            deltaNetSales: calculateDelta(currentTotals.netSales, averageNetSales),
            deltaOrders: calculateDelta(currentTotals.orders, averageOrders),
          }
        : null,
      bestMonth: rankedByNetSales[0]
        ? {
            periodLabel: rankedByNetSales[0].periodLabel,
            netSales: rankedByNetSales[0].netSales,
          }
        : null,
      worstMonth: rankedByNetSales[rankedByNetSales.length - 1]
        ? {
            periodLabel: rankedByNetSales[rankedByNetSales.length - 1].periodLabel,
            netSales: rankedByNetSales[rankedByNetSales.length - 1].netSales,
          }
        : null,
    },
    currentTopProducts: productsView.topProducts.slice(0, 5).map((item) => ({
      product: item.label,
      quantity: item.value,
      category: item.helper || null,
    })),
    lowSellerCandidates: buildLowSellerCandidates(bundle, sortedBundles),
  };
}

function createFallbackExecutiveInsight(
  bundle: ParsedBundle,
  historicalBundles: ParsedBundle[],
): ExecutiveInsightResult {
  const summary = buildExecutiveInsightSummary(bundle, historicalBundles, bundle.restaurantCode);
  const averageComparison = summary.comparisons.historyAverage;
  const previousComparison = summary.comparisons.previousMonth;
  const lowProducts = summary.lowSellerCandidates.slice(0, 3);
  const revenueSentence = averageComparison
    ? `${summary.period.periodLabel} fechou com ${formatCurrencyText(summary.currentMonth.netSales)} de venda liquida, ${formatPercentDelta(averageComparison.deltaNetSales)} em relacao a media dos periodos carregados.`
    : `${summary.period.periodLabel} fechou com ${formatCurrencyText(summary.currentMonth.netSales)} de venda liquida. Ainda nao ha historico suficiente para comparar o desempenho.`;
  const previousSentence = previousComparison
    ? `${summary.period.periodLabel} ficou ${formatPercentDelta(previousComparison.deltaNetSales)} versus ${previousComparison.periodLabel}.`
    : "Nao ha um mes anterior carregado para comparar a variacao imediata.";
  const productSentence = lowProducts.length
    ? `${lowProducts.map((item) => item.product).join(", ")} aparecem entre os itens de menor saida do periodo e merecem revisao de cardapio, precificacao ou substituicao por novidades.`
    : "Nao ha produtos com baixa saida suficientes para sugerir revisao de menu neste momento.";

  return {
    status: "fallback",
    headline: "Leitura executiva do período",
    summary: `${revenueSentence} ${previousSentence}`,
    cards: [
      {
        title: "Receita do mês",
        body: revenueSentence,
        tone: "forest",
      },
      {
        title: "Produtos com baixa saída",
        body: productSentence,
        tone: "accent",
      },
      {
        title: "Próximo movimento",
        body:
          "Cruze os itens de baixa saida com margem, apresentacao e aderencia ao menu para testar substituicoes pontuais no proximo ciclo, sem mexer nos campeoes de venda.",
        tone: "gold",
      },
    ],
    providerLabel: getAssistantProviderLabel(),
    model: null,
    generatedAt: new Date().toISOString(),
  };
}

function parseExecutiveInsightPayload(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(value.slice(start, end + 1)) as {
      headline?: unknown;
      summary?: unknown;
      cards?: unknown;
    };
    const headline =
      typeof parsed.headline === "string" ? parsed.headline.trim() : "";
    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const cards = Array.isArray(parsed.cards)
      ? parsed.cards
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }

            const title =
              typeof item.title === "string" ? item.title.trim() : "";
            const body = typeof item.body === "string" ? item.body.trim() : "";
            const tone =
              item.tone === "accent" || item.tone === "forest" || item.tone === "gold"
                ? item.tone
                : "accent";

            if (!title || !body) {
              return null;
            }

            return {
              title: title.slice(0, 80),
              body: body.slice(0, 420),
              tone,
            } satisfies ExecutiveInsightCard;
          })
          .filter(Boolean) as ExecutiveInsightCard[]
      : [];

    if (!headline || !summary || !cards.length) {
      return null;
    }

    return {
      headline: headline.slice(0, 120),
      summary: summary.slice(0, 420),
      cards: cards.slice(0, 3),
    };
  } catch {
    return null;
  }
}

function serializeMetrics(
  metrics: Array<{
    label: string;
    value: number | null;
    displayValue?: string;
    helper: string;
    format: string;
  }>,
) {
  return metrics.map((metric) => ({
    label: metric.label,
    value: metric.value,
    displayValue: metric.displayValue ?? null,
    helper: metric.helper,
    format: metric.format,
  }));
}

function serializeRankedItems(items: RankedEntry[], limit = 10) {
  return items.slice(0, limit).map((item) => ({
    label: item.label,
    value: item.value,
    helper: item.helper ?? null,
    secondary: item.secondary ?? null,
  }));
}

function groupOrders(
  orders: OrderRecord[],
  keySelector: (item: OrderRecord) => string,
) {
  const map = new Map<string, { orders: number; revenue: number }>();

  for (const order of orders) {
    const key = keySelector(order) || "Nao informado";
    const current = map.get(key) || { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += order.total;
    map.set(key, current);
  }

  return [...map.entries()]
    .map(([label, payload]) => ({
      label,
      orders: payload.orders,
      revenue: payload.revenue,
    }))
    .sort((a, b) => b.orders - a.orders);
}

function buildOrderHourlySeries(orders: OrderRecord[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}h`,
    hour,
    orders: 0,
    revenue: 0,
  }));

  for (const order of orders) {
    if (order.hour === null) {
      continue;
    }

    const bucket = buckets[order.hour];
    bucket.orders += 1;
    bucket.revenue += order.total;
  }

  return buckets;
}

function buildOrderDailySeries(orders: OrderRecord[]) {
  const map = new Map<string, { label: string; orders: number; revenue: number }>();

  for (const order of orders) {
    const current = map.get(order.dateKey) || {
      label: order.dateLabel,
      orders: 0,
      revenue: 0,
    };
    current.orders += 1;
    current.revenue += order.total;
    map.set(order.dateKey, current);
  }

  return sortDateKeys([...map.keys()]).map((dateKey) => {
    const current = map.get(dateKey)!;
    return {
      dateKey,
      dateLabel: current.label,
      orders: current.orders,
      revenue: current.revenue,
    };
  });
}

function getPeakHour<T>(items: T[], selector: (item: T) => number) {
  const sorted = [...items].sort((a, b) => selector(b) - selector(a));
  const peak = sorted[0];

  if (!peak || selector(peak) <= 0) {
    return null;
  }

  return peak;
}

function filterOrdersByScope(
  bundle: ParsedBundle,
  scope: string,
  day: string,
) {
  const normalizedScope = scope || "Todos";

  return bundle.orders.filter((order) => {
    const matchesDay = day ? order.dateKey === day : true;

    if (!matchesDay) {
      return false;
    }

    if (normalizedScope === "Todos") {
      return true;
    }

    return order.primaryChannel === normalizedScope;
  });
}

function buildPeriodContext(bundle: ParsedBundle) {
  const revenueView = buildRevenueView(bundle);
  const deliveriesView = buildDeliveriesView(bundle);
  const mesaView = buildMesaView(bundle);
  const productsView = buildProductsView(bundle);
  const allDates = uniqueDateKeys(bundle);
  const hourlyOrders = buildOrderHourlySeries(bundle.orders);
  const peakHour = getPeakHour(hourlyOrders, (item) => item.orders);

  return {
    period: {
      restaurantCode: bundle.restaurantCode,
      periodLabel: bundle.periodLabel,
      periodKey: bundle.periodKey,
      uploadedAt: bundle.uploadedAt,
    },
    coverage: bundle.coverage,
    availableDates: {
      min: allDates[0] || null,
      max: allDates[allDates.length - 1] || null,
      values: allDates,
    },
    productFilters: {
      categories: productsView.filters.categoryOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
      channels: productsView.filters.channelOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    },
    headlineMetrics: {
      grossSales:
        revenueView.metrics.find((item) => item.label === "Faturamento bruto")?.value ?? 0,
      totalOrders:
        revenueView.metrics.find((item) => item.label === "Pedidos")?.value ?? 0,
      deliveries:
        deliveriesView.metrics.find((item) => item.label === "Entregas")?.value ?? 0,
      tableOrders:
        mesaView.metrics.find((item) => item.label === "Pedidos de mesa")?.value ?? 0,
      soldItems:
        productsView.metrics.find((item) => item.label === "Itens vendidos")?.value ?? 0,
    },
    primaryChannelMix: groupOrders(bundle.orders, (item) => item.primaryChannel).slice(0, 6),
    originMix: groupOrders(bundle.orders, (item) => item.origin || "Nao informado").slice(0, 8),
    peakHour: peakHour
      ? {
          label: peakHour.label,
          orders: peakHour.orders,
          revenue: peakHour.revenue,
        }
      : null,
  };
}

function buildSalesOverview(
  bundle: ParsedBundle,
  args: Record<string, unknown>,
) {
  const requestedStartDate = normalizeOptionalString(args.startDate);
  const requestedEndDate = normalizeOptionalString(args.endDate);
  const view = buildRevenueView(
    bundle,
    requestedStartDate || undefined,
    requestedEndDate || undefined,
  );

  const orders = bundle.orders.filter((order) => {
    if (!view.filters.start || !view.filters.end) {
      return true;
    }

    return order.dateKey >= view.filters.start && order.dateKey <= view.filters.end;
  });

  return {
    requestedFilters: {
      startDate: requestedStartDate || null,
      endDate: requestedEndDate || null,
    },
    appliedFilters: {
      startDate: view.filters.start || null,
      endDate: view.filters.end || null,
      minDate: view.filters.min || null,
      maxDate: view.filters.max || null,
    },
    hasData: view.hasData,
    metrics: serializeMetrics(view.metrics),
    dailySeries: view.dailySeries,
    componentsSeries: view.componentsSeries,
    topDaysByGrossSales: [...view.tableRows]
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 5),
    primaryChannelMix: groupOrders(orders, (item) => item.primaryChannel).slice(0, 6),
    originMix: groupOrders(orders, (item) => item.origin || "Nao informado").slice(0, 8),
    note: view.cancellationNote,
  };
}

function buildDeliveryInsights(
  bundle: ParsedBundle,
  args: Record<string, unknown>,
) {
  const requestedStartDate = normalizeOptionalString(args.startDate);
  const requestedEndDate = normalizeOptionalString(args.endDate);
  const requestedDay = normalizeOptionalString(args.day);
  const view = buildDeliveriesView(
    bundle,
    requestedStartDate || undefined,
    requestedEndDate || undefined,
    requestedDay || undefined,
  );
  const peakHour = getPeakHour(view.hourlySeries, (item) => item.deliveries);

  return {
    requestedFilters: {
      startDate: requestedStartDate || null,
      endDate: requestedEndDate || null,
      day: requestedDay || null,
    },
    appliedFilters: {
      startDate: view.filters.start || null,
      endDate: view.filters.end || null,
      minDate: view.filters.min || null,
      maxDate: view.filters.max || null,
      day: view.filters.selectedVolumeDay || null,
      availableDays: view.filters.volumeDayOptions.map((option) => option.value),
    },
    hasData: view.hasData,
    metrics: serializeMetrics(view.metrics),
    dailySeries: view.dailySeries,
    hourlySeries: view.hourlySeries,
    hourlyRanking: serializeRankedItems(view.hourlyRanking, 12),
    hourlyContext: view.hourlyContextLabel,
    channelSeries: view.channelSeries,
    modeSeries: view.modeSeries,
    topNeighborhoods: serializeRankedItems(view.neighborhoods, 10),
    peakHour: peakHour
      ? {
          label: peakHour.label,
          deliveries: peakHour.deliveries,
          revenue: peakHour.revenue,
        }
      : null,
  };
}

function buildTableInsights(
  bundle: ParsedBundle,
  args: Record<string, unknown>,
) {
  const requestedDay = normalizeOptionalString(args.day);
  const view = buildMesaView(bundle, requestedDay || undefined);
  const peakHour = getPeakHour(view.hourlySeries, (item) => item.orders);

  return {
    requestedFilters: {
      day: requestedDay || null,
    },
    appliedFilters: {
      day: view.filters.selectedDay || null,
      availableDays: view.filters.dayOptions.map((option) => option.value),
    },
    hasData: view.hasData,
    metrics: serializeMetrics(view.metrics),
    dailySeries: view.dailySeries,
    hourlySeries: view.hourlySeries,
    paymentSeries: view.paymentSeries,
    catalogs: serializeRankedItems(view.catalogs, 10),
    operators: serializeRankedItems(view.operators, 10),
    peakHour: peakHour
      ? {
          label: peakHour.label,
          orders: peakHour.orders,
          revenue: peakHour.revenue,
        }
      : null,
  };
}

function buildProductInsights(
  bundle: ParsedBundle,
  args: Record<string, unknown>,
) {
  const requestedCategory = normalizeOptionalString(args.category);
  const requestedChannel = normalizeOptionalString(args.channel);
  const ranking = normalizeOptionalString(args.ranking).toLowerCase();
  const limit = normalizeLimit(args.limit, 10);
  const view = buildProductsView(
    bundle,
    requestedCategory || undefined,
    requestedChannel || undefined,
  );

  return {
    requestedFilters: {
      category: requestedCategory || null,
      channel: requestedChannel || null,
      ranking: ranking || "both",
      limit,
    },
    appliedFilters: {
      category: view.filters.selectedCategory || null,
      channel: view.filters.selectedChannel
        ? prettifyChannelLabel(view.filters.selectedChannel)
        : null,
      availableCategories: view.filters.categoryOptions.map((option) => option.value),
      availableChannels: view.filters.channelOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    },
    hasData: view.hasData,
    metrics: serializeMetrics(view.metrics),
    categorySeries: view.categorySeries,
    revenueCategorySeries: view.revenueCategorySeries,
    channelSeries: view.channelSeries,
    abcSeries: view.abcSeries,
    topProducts:
      ranking === "bottom" ? [] : serializeRankedItems(view.topProducts, limit),
    lowProducts:
      ranking === "top" ? [] : serializeRankedItems(view.lowProducts, limit),
    note: view.curveNote,
  };
}

function buildOrderTimeline(
  bundle: ParsedBundle,
  args: Record<string, unknown>,
) {
  const scopeInput = normalizeOptionalString(args.scope);
  const validScopes = ["Todos", "Mesa", "Delivery", "Retirada", "Outros"];
  const appliedScope = validScopes.includes(scopeInput) ? scopeInput : "Todos";
  const availableDays = uniqueDateKeys(bundle);
  const appliedDay = normalizeOptionalDay(args.day, availableDays);
  const orders = filterOrdersByScope(bundle, appliedScope, appliedDay);
  const hourlySeries = buildOrderHourlySeries(orders);
  const dailySeries = buildOrderDailySeries(orders);
  const peakHour = getPeakHour(hourlySeries, (item) => item.orders);

  return {
    requestedFilters: {
      scope: scopeInput || null,
      day: normalizeOptionalString(args.day) || null,
    },
    appliedFilters: {
      scope: appliedScope,
      day: appliedDay || null,
      availableDays,
    },
    totals: {
      orders: orders.length,
      revenue: sumBy(orders, (item) => item.total),
    },
    hourlySeries,
    dailySeries,
    primaryChannelMix: groupOrders(orders, (item) => item.primaryChannel).slice(0, 6),
    originMix: groupOrders(orders, (item) => item.origin || "Nao informado").slice(0, 8),
    peakHour: peakHour
      ? {
          label: peakHour.label,
          orders: peakHour.orders,
          revenue: peakHour.revenue,
        }
      : null,
  };
}

function buildToolOutput(
  bundle: ParsedBundle,
  toolName: AssistantToolName,
  args: Record<string, unknown>,
) {
  switch (toolName) {
    case "get_period_context":
      return buildPeriodContext(bundle);
    case "get_sales_overview":
      return buildSalesOverview(bundle, args);
    case "get_delivery_insights":
      return buildDeliveryInsights(bundle, args);
    case "get_table_insights":
      return buildTableInsights(bundle, args);
    case "get_product_insights":
      return buildProductInsights(bundle, args);
    case "get_order_timeline":
      return buildOrderTimeline(bundle, args);
    default:
      return {
        error: `Ferramenta nao reconhecida: ${toolName}`,
      };
  }
}

function parseToolArguments(rawArguments: string) {
  try {
    const parsed = JSON.parse(rawArguments) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function trimHistory(history: AssistantHistoryMessage[]) {
  return history
    .slice(-6)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 3000),
      phase: message.role === "assistant" ? "final_answer" : null,
    }))
    .filter((message) => Boolean(message.content)) as EasyInputMessage[];
}

function buildAssistantInstructions(
  bundle: ParsedBundle,
  currentSection?: AssistantSection,
) {
  const sectionLabel = currentSection ? `Secao atual do usuario: ${currentSection}.` : "";

  return [
    "Voce e um analista de dados de restaurante dentro de um dashboard privado.",
    "Responda sempre em portugues do Brasil.",
    "Para perguntas sobre dados, use as ferramentas antes de responder e baseie a resposta somente nos resultados retornados.",
    "Nunca invente numeros, datas, categorias, canais ou comparacoes.",
    "Se o dado nao existir ou o filtro pedido nao estiver disponivel, explique isso claramente e sugira o filtro valido mais proximo.",
    "Ao responder, mencione o periodo analisado e os filtros aplicados quando isso influenciar o resultado.",
    "Se a pergunta estiver ambigua, faca uma resposta curta com a melhor interpretacao suportada pelos dados e explicite a interpretacao usada.",
    "Prefira respostas objetivas, com bullets apenas quando melhorarem a leitura.",
    `Periodo selecionado: ${bundle.restaurantCode} ${bundle.periodLabel}.`,
    sectionLabel,
  ]
    .filter(Boolean)
    .join(" ");
}

const ASSISTANT_TOOLS = [
  {
    type: "function",
    name: "get_period_context",
    description:
      "Lista o contexto do periodo selecionado, datas disponiveis, cobertura dos relatorios, categorias, canais e metricas gerais.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_sales_overview",
    description:
      "Retorna faturamento, descontos, taxas, pedidos e visoes diarias para um intervalo de datas do periodo atual.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Data inicial no formato YYYY-MM-DD." },
        endDate: { type: "string", description: "Data final no formato YYYY-MM-DD." },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_delivery_insights",
    description:
      "Retorna metricas e detalhamentos de entregas, canais, bairros e horarios. Pode receber intervalo de datas e um dia especifico para o detalhamento hora a hora.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Data inicial no formato YYYY-MM-DD." },
        endDate: { type: "string", description: "Data final no formato YYYY-MM-DD." },
        day: { type: "string", description: "Dia no formato YYYY-MM-DD." },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_table_insights",
    description:
      "Retorna metricas de pedidos de mesa, ticket medio, meios de pagamento, horarios e desempenho por dia.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        day: { type: "string", description: "Dia no formato YYYY-MM-DD." },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_product_insights",
    description:
      "Retorna metricas e rankings de produtos, com filtros opcionais por categoria e canal. Pode limitar top ou bottom.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Categoria exata do produto." },
        channel: { type: "string", description: "Canal exato do produto." },
        ranking: {
          type: "string",
          enum: ["top", "bottom", "both"],
          description: "Qual ranking trazer.",
        },
        limit: {
          type: "number",
          description: "Quantidade de itens no ranking, de 1 a 20.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_order_timeline",
    description:
      "Retorna pedidos e receita por horario e por dia, com filtro opcional por escopo e por data.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["Todos", "Mesa", "Delivery", "Retirada", "Outros"],
          description: "Escopo dos pedidos a analisar.",
        },
        day: { type: "string", description: "Dia no formato YYYY-MM-DD." },
      },
      additionalProperties: false,
    },
  },
] satisfies Tool[];

function extractFunctionCalls(response: { output: ResponseInputItem[] }) {
  return response.output.filter(
    (item): item is ResponseFunctionToolCall => item.type === "function_call",
  );
}

export async function generateExecutiveInsight({
  bundle,
  historicalBundles,
  storeName,
}: {
  bundle: ParsedBundle;
  historicalBundles: ParsedBundle[];
  storeName: string;
}): Promise<ExecutiveInsightResult> {
  const providerLabel = getAssistantProviderLabel();
  const cacheKey = [
    getAssistantProvider(),
    getAssistantModel(),
    bundle.periodKey,
    bundle.uploadedAt,
    historicalBundles
      .map((item) => `${item.periodKey}:${item.uploadedAt}`)
      .sort()
      .join("|"),
  ].join("::");
  const cached = executiveInsightCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  if (!isAssistantConfigured()) {
    return {
      ...createFallbackExecutiveInsight(bundle, historicalBundles),
      status: "unavailable",
      summary:
        "A IA nao esta configurada neste ambiente. Exibindo uma leitura automatica do periodo enquanto a chave do provedor nao e ativada.",
    };
  }

  const fallback = createFallbackExecutiveInsight(bundle, historicalBundles);
  const summaryPayload = buildExecutiveInsightSummary(
    bundle,
    historicalBundles,
    storeName,
  );

  try {
    const client = requireOpenAIClient();
    const model = getAssistantModel();
    const response = await client.responses.create({
      model,
      temperature: 0.2,
      max_output_tokens: 700,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Voce e um estrategista de performance para restaurantes. Responda sempre em portugues do Brasil, use somente os dados fornecidos e nunca invente numeros. Gere uma leitura executiva para aparecer no topo de um dashboard. Avalie o faturamento do mes versus o historico carregado, destaque produtos de baixa saida que podem ser revisados, substituidos ou reformulados e proponha um proximo movimento objetivo. Nao afirme que um item deve ser removido sem ressalva; use linguagem de recomendacao. Retorne JSON puro no formato {\"headline\":\"...\",\"summary\":\"...\",\"cards\":[{\"title\":\"...\",\"body\":\"...\",\"tone\":\"accent|forest|gold\"},{...},{...}]}. Crie exatamente 3 cards e mantenha cada body com no maximo 320 caracteres.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(summaryPayload),
            },
          ],
        },
      ],
    });

    const parsed = parseExecutiveInsightPayload(response.output_text);

    if (!parsed) {
      return fallback;
    }

    const result: ExecutiveInsightResult = {
      status: "ai",
      headline: parsed.headline,
      summary: parsed.summary,
      cards: parsed.cards,
      providerLabel,
      model,
      generatedAt: new Date().toISOString(),
    };

    executiveInsightCache.set(cacheKey, {
      expiresAt: Date.now() + EXECUTIVE_INSIGHT_CACHE_TTL,
      result,
    });

    return result;
  } catch {
    return fallback;
  }
}

export async function generateAssistantAnswer({
  bundle,
  question,
  history,
  currentSection,
}: {
  bundle: ParsedBundle;
  question: string;
  history: AssistantHistoryMessage[];
  currentSection?: AssistantSection;
}): Promise<AssistantAnswer> {
  const client = requireOpenAIClient();
  const model = getAssistantModel();
  const toolNames = new Set<string>();
  const conversation: ResponseInputItem[] = [
    ...trimHistory(history),
    {
      role: "user",
      content: question.slice(0, 4000),
    },
  ];

  let input = conversation;
  let response = await client.responses.create({
    model,
    instructions: buildAssistantInstructions(bundle, currentSection),
    input,
    max_output_tokens: 900,
    parallel_tool_calls: true,
    temperature: 0.2,
    tools: ASSISTANT_TOOLS,
  });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const functionCalls = extractFunctionCalls(response);

    if (!functionCalls.length) {
      break;
    }

    const toolOutputs: ResponseInputItem[] = functionCalls.map((call) => {
      toolNames.add(call.name);

      const output = buildToolOutput(
        bundle,
        call.name as AssistantToolName,
        parseToolArguments(call.arguments),
      );

      return {
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(output),
      };
    });

    input = [...input, ...response.output, ...toolOutputs];

    response = await client.responses.create({
      model,
      instructions: buildAssistantInstructions(bundle, currentSection),
      input,
      max_output_tokens: 900,
      parallel_tool_calls: true,
      temperature: 0.2,
      tools: ASSISTANT_TOOLS,
    });
  }

  const answer = response.output_text.trim();

  if (!answer) {
    throw new Error(
      "O assistente nao conseguiu gerar uma resposta valida para esta pergunta.",
    );
  }

  return {
    answer,
    toolsUsed: [...toolNames].map(prettifyToolName),
    model,
  };
}
