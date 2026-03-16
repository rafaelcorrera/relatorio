import type {
  CoverageStatus,
  DashboardSnapshot,
  ParsedBundle,
  RankedItem,
} from "@/lib/types";

const WEEKDAY_NAMES = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sab",
];

function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function averageOf(items: number[]) {
  const valid = items.filter((item) => item > 0);
  if (!valid.length) {
    return 0;
  }

  return valid.reduce((total, item) => total + item, 0) / valid.length;
}

function formatTopChannel(channels: Record<string, number>) {
  const entry = Object.entries(channels).sort((a, b) => b[1] - a[1])[0];
  return entry?.[0] || "Sem canal";
}

function rankByMap(map: Map<string, { value: number; revenue?: number }>) {
  return [...map.entries()]
    .map(([label, payload]) => ({
      label,
      value: payload.value,
      secondaryValue:
        payload.revenue && payload.revenue > 0
          ? `R$ ${payload.revenue.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : undefined,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildReportStatus(bundle: ParsedBundle): CoverageStatus[] {
  return [
    {
      key: "performance",
      label: "Performance da Loja",
      present: bundle.coverage.performance,
      entries: bundle.performance.length,
    },
    {
      key: "orders",
      label: "Pedidos do Periodo",
      present: bundle.coverage.orders,
      entries: bundle.orders.length,
    },
    {
      key: "deliveries",
      label: "Entregas do Periodo",
      present: bundle.coverage.deliveries,
      entries: bundle.deliveries.length,
    },
    {
      key: "products",
      label: "Venda de Produtos por Canal",
      present: bundle.coverage.products,
      entries: bundle.productSales.length,
    },
  ];
}

export function buildDashboardSnapshot(bundle: ParsedBundle): DashboardSnapshot {
  const totalGrossRevenue = sumBy(bundle.performance, (item) => item.grossSales);
  const totalFinalRevenue = sumBy(bundle.performance, (item) => item.finalNetSales);
  const totalOrders =
    sumBy(bundle.performance, (item) => item.orders) || bundle.orders.length;
  const totalCustomers =
    sumBy(bundle.performance, (item) => item.customers) ||
    sumBy(bundle.orders, (item) => item.customerCount);
  const serviceFeeTotal = sumBy(bundle.performance, (item) => item.serviceFee);
  const deliveryFeeTotal = sumBy(bundle.performance, (item) => item.deliveryFee);
  const averageFinalTicket = totalCustomers > 0 ? totalFinalRevenue / totalCustomers : 0;

  const mesaOrders = bundle.orders.filter((item) => item.primaryChannel === "Mesa");
  const deliveryOrders = bundle.orders.filter(
    (item) => item.primaryChannel === "Delivery",
  );
  const mesaTicket =
    mesaOrders.length > 0
      ? sumBy(mesaOrders, (item) => item.total) / mesaOrders.length
      : 0;
  const deliveryTicket =
    deliveryOrders.length > 0
      ? sumBy(deliveryOrders, (item) => item.total) / deliveryOrders.length
      : 0;

  const dailyRevenue = bundle.performance.map((day) => ({
    label: day.dateLabel,
    revenue: day.finalNetSales,
    grossRevenue: day.grossSales,
    orders: day.orders,
  }));

  const hourlyDemandMap = new Map<number, { orders: number; revenue: number }>();
  for (let hour = 0; hour < 24; hour += 1) {
    hourlyDemandMap.set(hour, { orders: 0, revenue: 0 });
  }

  for (const order of bundle.orders) {
    if (order.hour === null) {
      continue;
    }

    const bucket = hourlyDemandMap.get(order.hour);
    if (!bucket) {
      continue;
    }

    bucket.orders += 1;
    bucket.revenue += order.total;
  }

  const hourlyDemand = [...hourlyDemandMap.entries()].map(([hour, payload]) => ({
    label: `${String(hour).padStart(2, "0")}h`,
    orders: payload.orders,
    revenue: payload.revenue,
  }));

  const channelMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of bundle.orders) {
    const current = channelMap.get(order.primaryChannel) || { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += order.total;
    channelMap.set(order.primaryChannel, current);
  }

  const channelMix = [...channelMap.entries()]
    .map(([label, payload]) => ({
      label,
      orders: payload.orders,
      revenue: payload.revenue,
    }))
    .sort((a, b) => b.orders - a.orders);

  const originMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of bundle.orders) {
    const current = originMap.get(order.origin) || { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += order.total;
    originMap.set(order.origin, current);
  }

  const originMix = [...originMap.entries()]
    .map(([label, payload]) => ({
      label,
      orders: payload.orders,
      revenue: payload.revenue,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 8);

  const neighborhoodMap = new Map<string, { orders: number; revenue: number }>();
  for (const delivery of bundle.deliveries) {
    const key = delivery.neighborhood || "Nao informado";
    const current = neighborhoodMap.get(key) || { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += delivery.orderTotal;
    neighborhoodMap.set(key, current);
  }

  const neighborhoods = [...neighborhoodMap.entries()]
    .map(([label, payload]) => ({
      label,
      orders: payload.orders,
      revenue: payload.revenue,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 8);

  const paymentMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of bundle.orders) {
    const key = order.paymentMethod || order.payment || "Nao informado";
    const current = paymentMap.get(key) || { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += order.total;
    paymentMap.set(key, current);
  }

  const paymentMix = [...paymentMap.entries()]
    .map(([label, payload]) => ({
      label,
      orders: payload.orders,
      revenue: payload.revenue,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 8);

  const topProducts: RankedItem[] = bundle.productSales
    .slice(0, 10)
    .map((item) => ({
      label: item.product,
      value: item.totalQuantity,
      secondaryLabel: item.category,
      secondaryValue: formatTopChannel(item.channels),
    }));

  const lowProducts: RankedItem[] = [...bundle.productSales]
    .filter((item) => item.totalQuantity > 0)
    .sort((a, b) => a.totalQuantity - b.totalQuantity)
    .slice(0, 10)
    .map((item) => ({
      label: item.product,
      value: item.totalQuantity,
      secondaryLabel: item.category,
      secondaryValue: formatTopChannel(item.channels),
    }));

  const categoryMap = new Map<string, { value: number; revenue?: number }>();
  for (const product of bundle.productSales) {
    const current = categoryMap.get(product.category) || { value: 0 };
    current.value += product.totalQuantity;
    categoryMap.set(product.category, current);
  }

  const categories = rankByMap(categoryMap).slice(0, 8);

  const deliveryModeMap = new Map<string, { value: number }>();
  for (const delivery of bundle.deliveries) {
    const key = delivery.deliveryMode || "Nao informado";
    const current = deliveryModeMap.get(key) || { value: 0 };
    current.value += 1;
    deliveryModeMap.set(key, current);
  }

  const deliveryModeMix = [...deliveryModeMap.entries()]
    .map(([label, payload]) => ({
      label,
      orders: payload.value,
    }))
    .sort((a, b) => b.orders - a.orders);

  const bestProduct = topProducts[0];
  const bestHour = [...hourlyDemand].sort((a, b) => b.orders - a.orders)[0];
  const dominantChannel = channelMix[0];
  const bestDay = [...bundle.performance].sort(
    (a, b) => b.finalNetSales - a.finalNetSales,
  )[0];
  const topNeighborhood = neighborhoods[0];

  const weekdayTotals = new Map<string, number>();
  for (const day of bundle.performance) {
    const weekdayIndex = new Date(`${day.dateKey}T12:00:00`).getDay();
    const label = WEEKDAY_NAMES[weekdayIndex];
    weekdayTotals.set(label, (weekdayTotals.get(label) || 0) + day.finalNetSales);
  }
  const bestWeekday = [...weekdayTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    meta: {
      month: bundle.month,
      year: bundle.year,
      restaurantCode: bundle.restaurantCode,
      periodLabel: bundle.periodLabel,
      periodKey: bundle.periodKey,
      uploadedAt: bundle.uploadedAt,
      sourceFiles: bundle.sourceFiles,
      coverage: bundle.coverage,
    },
    metrics: [
      {
        label: "Faturamento Liquido Final",
        value: totalFinalRevenue,
        format: "currency",
        helper: `Bruto do periodo: R$ ${totalGrossRevenue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        accent: "terracotta",
      },
      {
        label: "Pedidos",
        value: totalOrders,
        format: "number",
        helper: `${bundle.orders.length.toLocaleString("pt-BR")} pedidos detalhados na planilha`,
        accent: "forest",
      },
      {
        label: "Clientes",
        value: totalCustomers,
        format: "number",
        helper: "Base para ticket medio final do periodo",
        accent: "gold",
      },
      {
        label: "Ticket Medio Final",
        value: averageFinalTicket,
        format: "currency",
        helper: "Venda liquida final dividida por clientes",
        accent: "terracotta",
      },
      {
        label: "Ticket Medio de Mesa",
        value: mesaTicket,
        format: "currency",
        helper: "Considera apenas pedidos COMANDA/MESA",
        accent: "forest",
      },
      {
        label: "Ticket Medio Delivery",
        value: deliveryTicket,
        format: "currency",
        helper: "Considera pedidos classificados como delivery",
        accent: "gold",
      },
    ],
    insights: [
      {
        label: "Canal dominante",
        value: dominantChannel
          ? `${dominantChannel.label} (${dominantChannel.orders})`
          : "Sem dados",
        helper: dominantChannel
          ? `${Math.round((dominantChannel.orders / Math.max(totalOrders, 1)) * 100)}% dos pedidos do periodo`
          : "Importe pedidos para ver a distribuicao por canal",
      },
      {
        label: "Pico de pedidos",
        value: bestHour ? bestHour.label : "Sem dados",
        helper: bestHour
          ? `${bestHour.orders} pedidos e R$ ${bestHour.revenue.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} faturados`
          : "Nao ha dados horarios no momento",
      },
      {
        label: "Produto lider",
        value: bestProduct ? bestProduct.label : "Sem dados",
        helper: bestProduct
          ? `${bestProduct.value.toLocaleString("pt-BR")} unidades em ${bestProduct.secondaryLabel}`
          : "Importe o relatorio de produtos por canal",
      },
      {
        label: "Melhor dia",
        value: bestDay ? bestDay.dateLabel : "Sem dados",
        helper: bestDay
          ? `R$ ${bestDay.finalNetSales.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} de venda liquida final`
          : "Importe performance da loja",
      },
      {
        label: "Bairro mais frequente",
        value: topNeighborhood ? topNeighborhood.label : "Sem dados",
        helper: topNeighborhood
          ? `${topNeighborhood.orders} entregas no periodo`
          : "Importe as entregas para ver a concentracao geografica",
      },
      {
        label: "Melhor dia da semana",
        value: bestWeekday ? bestWeekday[0] : "Sem dados",
        helper: bestWeekday
          ? `R$ ${bestWeekday[1].toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} somados nesse dia da semana`
          : "Sem consolidado diario suficiente",
      },
    ],
    dailyRevenue,
    hourlyDemand,
    channelMix,
    originMix,
    neighborhoods,
    paymentMix,
    topProducts,
    lowProducts,
    categories,
    reportStatus: buildReportStatus(bundle),
    serviceFeeTotal,
    deliveryFeeTotal,
    deliveryModeMix,
    averagePrepMinutes: averageOf(bundle.orders.map((item) => item.prepMinutes)),
    averageDeliveryMinutes: averageOf(
      bundle.orders.map((item) => item.deliveryMinutes),
    ),
  };
}
