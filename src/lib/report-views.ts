import "server-only";

import {
  aggregateProductCurve,
  buildProductLookup,
  resolveProductLookup,
} from "@/lib/product-curve";
import type {
  ParsedBundle,
  PerformanceDay,
} from "@/lib/types";

export interface DisplayMetric {
  label: string;
  value: number | null;
  displayValue?: string;
  format: "currency" | "number" | "percent";
  helper: string;
  tone: "accent" | "forest" | "gold" | "slate";
}

export interface RankedEntry {
  label: string;
  value: number;
  helper?: string;
  secondary?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface RevenueViewData {
  hasData: boolean;
  filters: {
    min: string;
    max: string;
    start: string;
    end: string;
  };
  metrics: DisplayMetric[];
  dailySeries: Array<{
    label: string;
    gross: number;
    final: number;
    orders: number;
  }>;
  componentsSeries: Array<{
    label: string;
    discounts: number;
    serviceFee: number;
    deliveryFee: number;
  }>;
  tableRows: Array<{
    label: string;
    gross: number;
    final: number;
    discounts: number;
    orders: number;
  }>;
  cancellationNote: string;
}

export interface DeliveriesViewData {
  hasData: boolean;
  filters: {
    min: string;
    max: string;
    start: string;
    end: string;
    selectedVolumeDay: string;
    volumeDayOptions: SelectOption[];
  };
  metrics: DisplayMetric[];
  dailySeries: Array<{
    label: string;
    deliveries: number;
    revenue: number;
  }>;
  hourlySeries: Array<{
    label: string;
    deliveries: number;
    revenue: number;
  }>;
  channelSeries: Array<{
    label: string;
    deliveries: number;
    revenue: number;
  }>;
  modeSeries: Array<{
    label: string;
    deliveries: number;
  }>;
  neighborhoods: RankedEntry[];
  hourlyRanking: RankedEntry[];
  hourlyContextLabel: string;
}

export interface MesaViewData {
  hasData: boolean;
  filters: {
    selectedDay: string;
    dayOptions: SelectOption[];
  };
  metrics: DisplayMetric[];
  dailySeries: Array<{
    label: string;
    revenue: number;
    orders: number;
    averageTicket: number;
  }>;
  hourlySeries: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
  paymentSeries: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
  catalogs: RankedEntry[];
  operators: RankedEntry[];
}

export interface ProductsViewData {
  hasData: boolean;
  filters: {
    selectedCategory: string;
    categoryOptions: SelectOption[];
    selectedChannel: string;
    channelOptions: SelectOption[];
  };
  metrics: DisplayMetric[];
  categorySeries: Array<{
    label: string;
    quantity: number;
  }>;
  revenueCategorySeries: Array<{
    label: string;
    revenue: number;
  }>;
  channelSeries: Array<{
    label: string;
    quantity: number;
  }>;
  abcSeries: Array<{
    label: string;
    revenue: number;
    quantity: number;
    products: number;
    share: number;
  }>;
  topProducts: RankedEntry[];
  lowProducts: RankedEntry[];
  curveNote: string;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function sortDateKeys(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function inRange(dateKey: string, start: string, end: string) {
  return dateKey >= start && dateKey <= end;
}

function uniqueDateOptions<
  T extends {
    dateKey: string;
    dateLabel: string;
  },
>(items: T[]) {
  const map = new Map<string, string>();

  for (const item of items) {
    if (!map.has(item.dateKey)) {
      map.set(item.dateKey, item.dateLabel);
    }
  }

  return sortDateKeys([...map.keys()]).map((dateKey) => ({
    value: dateKey,
    label: map.get(dateKey) || dateKey,
  }));
}

function findDateBounds<
  T extends {
    dateKey: string;
  },
>(items: T[]) {
  const dateKeys = sortDateKeys(
    items.map((item) => item.dateKey).filter((value) => Boolean(value)),
  );
  const min = dateKeys[0] || "";
  const max = dateKeys[dateKeys.length - 1] || "";

  return {
    min,
    max,
  };
}

function normalizeDateRange(
  start: string | undefined,
  end: string | undefined,
  min: string,
  max: string,
) {
  if (!min || !max) {
    return {
      start: "",
      end: "",
    };
  }

  let nextStart = start && start >= min && start <= max ? start : min;
  let nextEnd = end && end >= min && end <= max ? end : max;

  if (nextStart > nextEnd) {
    nextStart = min;
    nextEnd = max;
  }

  return {
    start: nextStart,
    end: nextEnd,
  };
}

function normalizeDay(day: string | undefined, options: SelectOption[]) {
  if (!day) {
    return "";
  }

  return options.some((option) => option.value === day) ? day : "";
}

function formatCurrencyText(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateKeyLabel(dateKey: string) {
  if (!dateKey) {
    return "";
  }

  const [, month, day] = dateKey.split("-");

  if (!day || !month) {
    return dateKey;
  }

  return `${day}/${month}`;
}

function formatDateRangeLabel(start: string, end: string) {
  if (!start || !end) {
    return "todo o periodo";
  }

  if (start === end) {
    return formatDateKeyLabel(start);
  }

  return `${formatDateKeyLabel(start)} a ${formatDateKeyLabel(end)}`;
}

function groupCountAndRevenue<T>(
  items: T[],
  keySelector: (item: T) => string,
  revenueSelector: (item: T) => number,
) {
  const map = new Map<string, { count: number; revenue: number }>();

  for (const item of items) {
    const key = keySelector(item) || "Nao informado";
    const current = map.get(key) || { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += revenueSelector(item);
    map.set(key, current);
  }

  return [...map.entries()]
    .map(([label, payload]) => ({
      label,
      count: payload.count,
      revenue: payload.revenue,
    }))
    .sort((a, b) => b.count - a.count);
}

function groupSum<T>(
  items: T[],
  keySelector: (item: T) => string,
  valueSelector: (item: T) => number,
) {
  const map = new Map<string, number>();

  for (const item of items) {
    const key = keySelector(item) || "Nao informado";
    map.set(key, (map.get(key) || 0) + valueSelector(item));
  }

  return [...map.entries()]
    .map(([label, value]) => ({
      label,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function createHourlyBuckets() {
  return Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}h`,
    hour,
    deliveries: 0,
    orders: 0,
    revenue: 0,
  }));
}

function prettifyChannelLabel(value: string) {
  return value.replace(/_/g, " ").trim() || "Nao informado";
}

function normalizePaymentGroup(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "Nao informado";
  }
  if (normalized.includes("pix")) {
    return "PIX";
  }
  if (normalized.includes("credito")) {
    return "Credito";
  }
  if (normalized.includes("debito")) {
    return "Debito";
  }
  if (normalized.includes("dinheiro")) {
    return "Dinheiro";
  }
  if (normalized.includes("vale")) {
    return "Vale";
  }
  if (normalized.includes("ifood")) {
    return "iFood";
  }
  if (normalized.includes("online")) {
    return "Online";
  }

  return value.split("(")[0].trim() || "Nao informado";
}

function categoryEquals(value: string, target: string) {
  return normalizeText(value) === normalizeText(target);
}

function rankEntries(
  items: Array<{
    label: string;
    value: number;
    helper?: string;
    secondary?: string;
  }>,
  limit: number,
) {
  return items
    .filter((item) => item.value > 0)
    .slice(0, limit)
    .map((item) => ({
      label: item.label,
      value: item.value,
      helper: item.helper,
      secondary: item.secondary,
    }));
}

function buildDateSeries(rows: PerformanceDay[]) {
  return rows.map((row) => ({
    label: row.dateLabel,
    gross: row.grossSales,
    final: row.finalNetSales,
    orders: row.orders,
  }));
}

function buildDailyCountRevenueSeries<
  T extends {
    dateKey: string;
    dateLabel: string;
  },
>(
  items: T[],
  revenueSelector: (item: T) => number,
) {
  const map = new Map<
    string,
    {
      label: string;
      deliveries: number;
      revenue: number;
    }
  >();

  for (const item of items) {
    const current = map.get(item.dateKey) || {
      label: item.dateLabel,
      deliveries: 0,
      revenue: 0,
    };
    current.deliveries += 1;
    current.revenue += revenueSelector(item);
    map.set(item.dateKey, current);
  }

  return sortDateKeys([...map.keys()]).map((dateKey) => {
    const current = map.get(dateKey)!;

    return {
      label: current.label,
      deliveries: current.deliveries,
      revenue: current.revenue,
    };
  });
}

function normalizeAbcClass(value: string) {
  const normalized = normalizeText(value);

  if (normalized.startsWith("a")) {
    return "Classe A";
  }

  if (normalized.startsWith("b")) {
    return "Classe B";
  }

  if (normalized.startsWith("c")) {
    return "Classe C";
  }

  return "Sem classe";
}

function getAbcClassOrder(value: string) {
  const normalized = normalizeAbcClass(value);

  if (normalized === "Classe A") {
    return 0;
  }

  if (normalized === "Classe B") {
    return 1;
  }

  if (normalized === "Classe C") {
    return 2;
  }

  return 3;
}

export function buildRevenueView(
  bundle: ParsedBundle,
  startParam?: string,
  endParam?: string,
): RevenueViewData {
  const bounds = findDateBounds(bundle.performance);
  const filters = normalizeDateRange(startParam, endParam, bounds.min, bounds.max);
  const performance = bundle.performance.filter((item) =>
    inRange(item.dateKey, filters.start, filters.end),
  );

  const grossSales = sumBy(performance, (item) => item.grossSales);
  const finalNetSales = sumBy(performance, (item) => item.finalNetSales);
  const discounts = sumBy(performance, (item) => item.discounts);
  const serviceFee = sumBy(performance, (item) => item.serviceFee);
  const deliveryFee = sumBy(performance, (item) => item.deliveryFee);
  const courtesies = sumBy(performance, (item) => item.courtesies);
  const orders = sumBy(performance, (item) => item.orders);
  const customers = sumBy(performance, (item) => item.customers);
  const avgFinalTicket = customers > 0 ? finalNetSales / customers : 0;

  return {
    hasData: performance.length > 0,
    filters: {
      ...filters,
      min: bounds.min,
      max: bounds.max,
    },
    metrics: [
      {
        label: "Faturamento bruto",
        value: grossSales,
        format: "currency",
        helper: "Soma da venda bruta no periodo filtrado.",
        tone: "accent",
      },
      {
        label: "Venda liquida final",
        value: finalNetSales,
        format: "currency",
        helper: "Liquido final consolidado pela performance da loja.",
        tone: "forest",
      },
      {
        label: "Taxa de entrega",
        value: deliveryFee,
        format: "currency",
        helper: "Total de taxas de entrega cobradas no recorte.",
        tone: "gold",
      },
      {
        label: "Taxa de servico",
        value: serviceFee,
        format: "currency",
        helper: "Total de servico de mesa no recorte.",
        tone: "slate",
      },
      {
        label: "Descontos",
        value: discounts,
        format: "currency",
        helper: "Descontos aplicados aos pedidos do periodo.",
        tone: "accent",
      },
      {
        label: "Cortesias",
        value: courtesies,
        format: "currency",
        helper: "Pedidos ou itens lancados como cortesia.",
        tone: "gold",
      },
      {
        label: "Pedidos",
        value: orders,
        format: "number",
        helper: "Quantidade consolidada de pedidos na performance.",
        tone: "forest",
      },
      {
        label: "Ticket medio final",
        value: avgFinalTicket,
        format: "currency",
        helper: "Venda liquida final dividida por clientes.",
        tone: "slate",
      },
      {
        label: "Cancelamentos",
        value: null,
        displayValue: "N/D",
        format: "number",
        helper: "Os arquivos atuais nao trazem um campo explicito de cancelamento.",
        tone: "accent",
      },
    ],
    dailySeries: buildDateSeries(performance),
    componentsSeries: performance.map((item) => ({
      label: item.dateLabel,
      discounts: item.discounts,
      serviceFee: item.serviceFee,
      deliveryFee: item.deliveryFee,
    })),
    tableRows: performance.map((item) => ({
      label: item.dateLabel,
      gross: item.grossSales,
      final: item.finalNetSales,
      discounts: item.discounts,
      orders: item.orders,
    })),
    cancellationNote:
      "Os relatorios do periodo nao possuem um status de pedido que permita contar cancelamentos com seguranca.",
  };
}

export function buildDeliveriesView(
  bundle: ParsedBundle,
  startParam?: string,
  endParam?: string,
  volumeDayParam?: string,
): DeliveriesViewData {
  const bounds = findDateBounds(bundle.deliveries);
  const filters = normalizeDateRange(startParam, endParam, bounds.min, bounds.max);
  const deliveries =
    filters.start && filters.end
      ? bundle.deliveries.filter((item) =>
          inRange(item.dateKey, filters.start, filters.end),
        )
      : [];
  const deliveryOrdersBase = bundle.orders.filter(
    (item) => item.primaryChannel === "Delivery",
  );
  const deliveryOrders =
    filters.start && filters.end
      ? deliveryOrdersBase.filter((item) =>
          inRange(item.dateKey, filters.start, filters.end),
        )
      : [];
  const volumeDayOptions = uniqueDateOptions(deliveries);
  const selectedVolumeDay = normalizeDay(volumeDayParam, volumeDayOptions);
  const hourlyFocusDeliveries = selectedVolumeDay
    ? deliveries.filter((item) => item.dateKey === selectedVolumeDay)
    : deliveries;

  const revenue = sumBy(deliveries, (item) => item.orderTotal);
  const deliveryFee = sumBy(deliveries, (item) => item.deliveryFee);
  const courierPayout = sumBy(deliveries, (item) => item.courierPayout);
  const averageTicket = deliveries.length ? revenue / deliveries.length : 0;
  const neighborhoodsCount = new Set(
    deliveries.map((item) => item.neighborhood).filter(Boolean),
  ).size;
  const rangeLabel = formatDateRangeLabel(filters.start, filters.end);
  const selectedVolumeDayLabel =
    volumeDayOptions.find((option) => option.value === selectedVolumeDay)?.label ||
    formatDateKeyLabel(selectedVolumeDay);
  const deliveryCountHelper = !filters.start || !filters.end
    ? "Entregas registradas no recorte atual."
    : filters.start === filters.end
      ? `Entregas registradas em ${rangeLabel}.`
      : `Entregas registradas entre ${rangeLabel}.`;

  const hourlyBuckets = createHourlyBuckets();
  for (const delivery of deliveries) {
    if (delivery.hour === null) {
      continue;
    }

    const bucket = hourlyBuckets[delivery.hour];
    bucket.deliveries += 1;
    bucket.revenue += delivery.orderTotal;
  }

  const channelSeries = groupCountAndRevenue(
    deliveryOrders,
    (item) => item.origin || "Nao informado",
    (item) => item.total,
  ).map((item) => ({
    label: item.label,
    deliveries: item.count,
    revenue: item.revenue,
  }));

  const modeSeries = groupSum(
    deliveries,
    (item) => item.deliveryMode || "Nao informado",
    () => 1,
  ).map((item) => ({
    label: item.label,
    deliveries: item.value,
  }));

  const neighborhoods = rankEntries(
    groupCountAndRevenue(
      deliveries,
      (item) => item.neighborhood || "Nao informado",
      (item) => item.orderTotal,
    ).map((item) => ({
      label: item.label,
      value: item.count,
      helper: `${item.count.toLocaleString("pt-BR")} entregas`,
      secondary: `R$ ${item.revenue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    })),
    12,
  );

  const hourlyFocusBuckets = createHourlyBuckets();
  for (const delivery of hourlyFocusDeliveries) {
    if (delivery.hour === null) {
      continue;
    }

    const bucket = hourlyFocusBuckets[delivery.hour];
    bucket.deliveries += 1;
    bucket.revenue += delivery.orderTotal;
  }

  const hourlyRanking = rankEntries(
    [...hourlyFocusBuckets]
      .filter((item) => item.deliveries > 0)
      .sort((a, b) => {
        if (b.deliveries !== a.deliveries) {
          return b.deliveries - a.deliveries;
        }

        return a.hour - b.hour;
      })
      .map((item) => ({
        label: item.label,
        value: item.deliveries,
        helper: formatCurrencyText(item.revenue),
      })),
    24,
  );

  return {
    hasData: deliveries.length > 0,
    filters: {
      ...filters,
      min: bounds.min,
      max: bounds.max,
      selectedVolumeDay,
      volumeDayOptions,
    },
    metrics: [
      {
        label: "Entregas",
        value: deliveries.length,
        format: "number",
        helper: deliveryCountHelper,
        tone: "accent",
      },
      {
        label: "Receita entregue",
        value: revenue,
        format: "currency",
        helper: "Soma do total dos pedidos entregues.",
        tone: "forest",
      },
      {
        label: "Taxa de entrega",
        value: deliveryFee,
        format: "currency",
        helper: `Total de taxa de entrega cobrada em ${rangeLabel}.`,
        tone: "gold",
      },
      {
        label: "Custo entregador",
        value: courierPayout,
        format: "currency",
        helper: `Valor pago ou atribuido aos entregadores em ${rangeLabel}.`,
        tone: "slate",
      },
      {
        label: "Ticket medio delivery",
        value: averageTicket,
        format: "currency",
        helper: "Receita entregue dividida pelo numero de entregas.",
        tone: "forest",
      },
      {
        label: "Bairros atendidos",
        value: neighborhoodsCount,
        format: "number",
        helper: "Quantidade de bairros com entregas no filtro atual.",
        tone: "accent",
      },
    ],
    dailySeries: buildDailyCountRevenueSeries(deliveries, (item) => item.orderTotal),
    hourlySeries: hourlyBuckets.map((item) => ({
      label: item.label,
      deliveries: item.deliveries,
      revenue: item.revenue,
    })),
    channelSeries,
    modeSeries,
    neighborhoods,
    hourlyRanking,
    hourlyContextLabel: selectedVolumeDay
      ? `Volume hora a hora de ${selectedVolumeDayLabel}.`
      : `Volume agregado do periodo ${rangeLabel}. Use o filtro para aprofundar um dia especifico.`,
  };
}

export function buildMesaView(
  bundle: ParsedBundle,
  dayParam?: string,
): MesaViewData {
  const mesaOrdersBase = bundle.orders.filter((item) => item.primaryChannel === "Mesa");
  const dayOptions = uniqueDateOptions(mesaOrdersBase);
  const selectedDay = normalizeDay(dayParam, dayOptions);
  const mesaOrders = selectedDay
    ? mesaOrdersBase.filter((item) => item.dateKey === selectedDay)
    : mesaOrdersBase;

  const revenue = sumBy(mesaOrders, (item) => item.total);
  const serviceFee = sumBy(mesaOrders, (item) => item.serviceFee);
  const customers = sumBy(mesaOrders, (item) => item.customerCount);
  const ticketAverage = mesaOrders.length ? revenue / mesaOrders.length : 0;
  const averageCustomers = mesaOrders.length ? customers / mesaOrders.length : 0;
  const averageItems = mesaOrders.length
    ? sumBy(mesaOrders, (item) => item.itemCount) / mesaOrders.length
    : 0;

  const dailyMap = new Map<
    string,
    {
      label: string;
      orders: number;
      revenue: number;
    }
  >();

  for (const order of mesaOrders) {
    const current = dailyMap.get(order.dateKey) || {
      label: order.dateLabel,
      orders: 0,
      revenue: 0,
    };
    current.orders += 1;
    current.revenue += order.total;
    dailyMap.set(order.dateKey, current);
  }

  const dailySeries = sortDateKeys([...dailyMap.keys()]).map((dateKey) => {
    const current = dailyMap.get(dateKey)!;
    return {
      label: current.label,
      revenue: current.revenue,
      orders: current.orders,
      averageTicket: current.orders ? current.revenue / current.orders : 0,
    };
  });

  const hourlyBuckets = createHourlyBuckets();
  for (const order of mesaOrders) {
    if (order.hour === null) {
      continue;
    }

    const bucket = hourlyBuckets[order.hour];
    bucket.orders += 1;
    bucket.revenue += order.total;
  }

  const paymentSeries = groupCountAndRevenue(
    mesaOrders,
    (item) => normalizePaymentGroup(item.paymentMethod || item.payment),
    (item) => item.total,
  )
    .map((item) => ({
      label: item.label,
      orders: item.count,
      revenue: item.revenue,
    }))
    .slice(0, 8);

  const catalogs = rankEntries(
    groupCountAndRevenue(
      mesaOrders,
      (item) => item.catalog || "Nao informado",
      (item) => item.total,
    ).map((item) => ({
      label: item.label,
      value: item.count,
      helper: `${item.count.toLocaleString("pt-BR")} pedidos`,
      secondary: `R$ ${item.revenue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    })),
    10,
  );

  const operators = rankEntries(
    groupCountAndRevenue(
      mesaOrders,
      (item) => item.user || "Nao informado",
      (item) => item.total,
    ).map((item) => ({
      label: item.label,
      value: item.count,
      helper: `${item.count.toLocaleString("pt-BR")} mesas`,
      secondary: `R$ ${item.revenue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    })),
    10,
  );

  return {
    hasData: mesaOrders.length > 0,
    filters: {
      selectedDay,
      dayOptions,
    },
    metrics: [
      {
        label: "Pedidos de mesa",
        value: mesaOrders.length,
        format: "number",
        helper: selectedDay ? "Comandas do dia filtrado." : "Comandas do periodo inteiro.",
        tone: "accent",
      },
      {
        label: "Faturamento mesa",
        value: revenue,
        format: "currency",
        helper: "Soma do total dos pedidos COMANDA/MESA.",
        tone: "forest",
      },
      {
        label: "Ticket medio",
        value: ticketAverage,
        format: "currency",
        helper: "Faturamento de mesa dividido por quantidade de pedidos.",
        tone: "gold",
      },
      {
        label: "Taxa de servico",
        value: serviceFee,
        format: "currency",
        helper: "Servico cobrado nas comandas de mesa.",
        tone: "slate",
      },
      {
        label: "Clientes por pedido",
        value: averageCustomers,
        format: "number",
        helper: "Media de clientes registrados em cada pedido de mesa.",
        tone: "forest",
      },
      {
        label: "Itens por pedido",
        value: averageItems,
        format: "number",
        helper: "Quantidade media de itens por comanda.",
        tone: "accent",
      },
    ],
    dailySeries,
    hourlySeries: hourlyBuckets.map((item) => ({
      label: item.label,
      orders: item.orders,
      revenue: item.revenue,
    })),
    paymentSeries,
    catalogs,
    operators,
  };
}

export function buildProductsView(
  bundle: ParsedBundle,
  categoryParam?: string,
  channelParam?: string,
): ProductsViewData {
  const hasCurveData = bundle.productCurve.length > 0;
  const aggregatedCurve = aggregateProductCurve(bundle.productCurve);
  const curveLookup = buildProductLookup(aggregatedCurve);
  const categoryOptions = groupSum(
    bundle.productSales,
    (item) => item.category || "Sem categoria",
    (item) => item.totalQuantity,
  ).map((item) => ({
    value: item.label,
    label: `${item.label} (${item.value.toLocaleString("pt-BR")})`,
  }));

  const channelTotalsBase = new Map<string, number>();
  for (const product of bundle.productSales) {
    for (const [channel, quantity] of Object.entries(product.channels)) {
      channelTotalsBase.set(channel, (channelTotalsBase.get(channel) || 0) + quantity);
    }
  }

  const channelOptions = [...channelTotalsBase.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([channel, quantity]) => ({
      value: channel,
      label: `${prettifyChannelLabel(channel)} (${quantity.toLocaleString("pt-BR")})`,
    }));

  const selectedCategory = categoryOptions.some(
    (item) => item.value === categoryParam,
  )
    ? categoryParam || ""
    : "";

  const selectedChannel = channelOptions.some(
    (item) => item.value === channelParam,
  )
    ? channelParam || ""
    : "";

  const mergedProducts = bundle.productSales.map((item) => {
    const curve = resolveProductLookup(curveLookup, item.category, item.product).item;
    const averagePrice = curve?.averagePrice ||
      (curve?.totalQuantity ? curve.totalRevenue / curve.totalQuantity : 0);
    const totalRevenue = curve?.totalRevenue || averagePrice * item.totalQuantity;

    return {
      ...item,
      averagePrice,
      totalRevenue,
      mix: curve?.mix || 0,
      accumulated: curve?.accumulated || 0,
      abcClass: normalizeAbcClass(curve?.abcClass || ""),
    };
  });

  const categoryFilteredProducts = selectedCategory
    ? mergedProducts.filter((item) => item.category === selectedCategory)
    : mergedProducts;

  const scopedProducts = categoryFilteredProducts.map((item) => ({
    ...item,
    scopedQuantity: selectedChannel
      ? item.channels[selectedChannel] || 0
      : item.totalQuantity,
    scopedRevenue: selectedChannel
      ? (item.channels[selectedChannel] || 0) * item.averagePrice
      : item.totalRevenue,
  }));
  const filteredProducts = scopedProducts.filter((item) => item.scopedQuantity > 0);

  const totalQuantity = sumBy(filteredProducts, (item) => item.scopedQuantity);
  const totalRevenue = sumBy(filteredProducts, (item) => item.scopedRevenue);
  const channelTotals = new Map<string, number>();

  if (selectedChannel) {
    if (totalQuantity > 0) {
      channelTotals.set(prettifyChannelLabel(selectedChannel), totalQuantity);
    }
  } else {
    for (const product of categoryFilteredProducts) {
      for (const [channel, quantity] of Object.entries(product.channels)) {
        const label = prettifyChannelLabel(channel);
        channelTotals.set(label, (channelTotals.get(label) || 0) + quantity);
      }
    }
  }

  const abcBuckets = new Map<
    string,
    {
      revenue: number;
      quantity: number;
      products: number;
    }
  >();

  for (const product of filteredProducts) {
    const label = product.abcClass || "Sem classe";
    const current = abcBuckets.get(label) || {
      revenue: 0,
      quantity: 0,
      products: 0,
    };
    current.revenue += product.scopedRevenue;
    current.quantity += product.scopedQuantity;
    current.products += 1;
    abcBuckets.set(label, current);
  }

  const abcSeries = [...abcBuckets.entries()]
    .map(([label, payload]) => ({
      label,
      revenue: payload.revenue,
      quantity: payload.quantity,
      products: payload.products,
      share: totalRevenue > 0 ? payload.revenue / totalRevenue : 0,
    }))
    .filter((item) => item.quantity > 0 || item.revenue > 0)
    .sort((a, b) => {
      const orderDiff = getAbcClassOrder(a.label) - getAbcClassOrder(b.label);

      if (orderDiff !== 0) {
        return orderDiff;
      }

      return b.revenue - a.revenue;
    });

  const dominantAbcClass = [...abcSeries].sort((a, b) => b.revenue - a.revenue)[0];
  const classAShare =
    abcSeries.find((item) => item.label === "Classe A")?.share || 0;
  const categorySeries = groupSum(
    selectedCategory ? categoryFilteredProducts : mergedProducts,
    (item) => item.category || "Sem categoria",
    (item) => (selectedChannel ? item.channels[selectedChannel] || 0 : item.totalQuantity),
  )
    .filter((item) => item.value > 0)
    .slice(0, 12)
    .map((item) => ({
      label: item.label,
      quantity: item.value,
    }));

  const revenueCategorySeries = groupSum(
    selectedCategory ? categoryFilteredProducts : mergedProducts,
    (item) => item.category || "Sem categoria",
    (item) =>
      selectedChannel
        ? (item.channels[selectedChannel] || 0) * item.averagePrice
        : item.totalRevenue,
  )
    .filter((item) => item.value > 0)
    .slice(0, 12)
    .map((item) => ({
      label: item.label,
      revenue: item.value,
    }));

  const topProducts = rankEntries(
    [...filteredProducts]
      .sort((a, b) => b.scopedQuantity - a.scopedQuantity)
      .slice(0, 20)
      .map((item) => ({
        label: item.product,
        value: item.scopedQuantity,
        helper: item.category,
        secondary: [
          item.abcClass !== "Sem classe" ? item.abcClass : null,
          item.scopedRevenue > 0 ? formatCurrencyText(item.scopedRevenue) : null,
        ]
          .filter(Boolean)
          .join(" • "),
      })),
    20,
  );

  const lowPool = selectedCategory
    ? filteredProducts
    : filteredProducts.filter((item) => !categoryEquals(item.category, "Extras"));

  const lowProducts = rankEntries(
    [...lowPool]
      .sort((a, b) => a.scopedQuantity - b.scopedQuantity)
      .slice(0, 20)
      .map((item) => ({
        label: item.product,
        value: item.scopedQuantity,
        helper: item.category,
        secondary: [
          item.abcClass !== "Sem classe" ? item.abcClass : null,
          item.scopedRevenue > 0 ? formatCurrencyText(item.scopedRevenue) : null,
        ]
          .filter(Boolean)
          .join(" • "),
      })),
    20,
  );

  const quantityHelper = selectedCategory && selectedChannel
    ? `Quantidade vendida da categoria ${selectedCategory} no canal ${prettifyChannelLabel(selectedChannel)}.`
    : selectedCategory
      ? `Quantidade total da categoria ${selectedCategory}.`
      : selectedChannel
        ? `Quantidade total de itens vendidos no canal ${prettifyChannelLabel(selectedChannel)}.`
        : "Quantidade total de itens vendidos no relatorio de produtos.";

  const revenueHelper = !hasCurveData
    ? "Carregue o relatorio de Curva ABC para habilitar o faturamento cruzado por produto."
    : selectedChannel
      ? `Faturamento estimado cruzando o canal ${prettifyChannelLabel(selectedChannel)} com o preco medio da Curva ABC.`
      : "Faturamento total consolidado na Curva ABC para o recorte atual.";
  const productCountHelper = selectedChannel
    ? "Numero de SKUs com venda no canal filtrado."
    : "Numero de SKUs presentes no recorte atual.";
  const averagePriceHelper = !hasCurveData
    ? "Preco medio indisponivel sem o relatorio de Curva ABC."
    : selectedChannel
      ? "Preco medio estimado no canal filtrado a partir da Curva ABC."
      : "Preco medio de venda calculado com base na Curva ABC.";
  const dominantClassHelper = !hasCurveData
    ? "A classe dominante depende do relatorio de Curva ABC."
    : selectedChannel
      ? "Classe com maior peso de faturamento estimado no canal filtrado."
      : "Classe com maior peso de faturamento no recorte atual.";
  const classAShareHelper = !hasCurveData
    ? "A participacao da Classe A depende do relatorio de Curva ABC."
    : selectedChannel
      ? `Participacao da Classe A no faturamento estimado do canal ${prettifyChannelLabel(selectedChannel)}.`
      : "Participacao da Classe A no faturamento consolidado do recorte.";
  const curveNote = !hasCurveData
    ? "O relatorio de Curva ABC ainda nao foi carregado neste periodo. Os rankings continuam usando quantidade vendida, mas faturamento, preco medio e classes ficam limitados."
    : selectedChannel
      ? `A Curva ABC foi cruzada com as quantidades do canal ${prettifyChannelLabel(selectedChannel)}. Valores monetarios usam o preco medio de venda do relatorio ABC.`
      : "A Curva ABC foi cruzada com o volume vendido por canal para trazer faturamento, preco medio e concentracao por classe no mesmo painel.";

  return {
    hasData: filteredProducts.length > 0,
    filters: {
      selectedCategory,
      categoryOptions,
      selectedChannel,
      channelOptions,
    },
    metrics: [
      {
        label: "Itens vendidos",
        value: totalQuantity,
        format: "number",
        helper: quantityHelper,
        tone: "accent",
      },
      {
        label: "Faturamento dos itens",
        value: totalRevenue,
        format: "currency",
        helper: revenueHelper,
        tone: "forest",
      },
      {
        label: "Produtos analisados",
        value: filteredProducts.length,
        format: "number",
        helper: productCountHelper,
        tone: "gold",
      },
      {
        label: "Preco medio",
        value: totalQuantity > 0 ? totalRevenue / totalQuantity : 0,
        format: "currency",
        helper: averagePriceHelper,
        tone: "slate",
      },
      {
        label: "Classe dominante",
        value: null,
        displayValue: dominantAbcClass?.label || (hasCurveData ? "Sem dados" : "Curva ABC ausente"),
        format: "number",
        helper: dominantClassHelper,
        tone: "accent",
      },
      {
        label: "Mix classe A",
        value: classAShare,
        format: "percent",
        helper: classAShareHelper,
        tone: "slate",
      },
    ],
    categorySeries,
    revenueCategorySeries,
    channelSeries: [...channelTotals.entries()]
      .map(([label, quantity]) => ({
        label,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity),
    abcSeries,
    topProducts,
    lowProducts,
    curveNote,
  };
}
