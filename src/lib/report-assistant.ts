import "server-only";

import OpenAI from "openai";
import type {
  EasyInputMessage,
  ResponseFunctionToolCall,
  ResponseInputItem,
  Tool,
} from "openai/resources/responses/responses";

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

type AssistantToolName =
  | "get_period_context"
  | "get_sales_overview"
  | "get_delivery_insights"
  | "get_table_insights"
  | "get_product_insights"
  | "get_order_timeline";

let openAIClient: OpenAI | null = null;

function sortDateKeys(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
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

function getAssistantModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
}

export function isAssistantConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function requireOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Configure OPENAI_API_KEY para habilitar o assistente de IA.");
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey });
  }

  return openAIClient;
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
