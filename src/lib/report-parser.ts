import "server-only";

import * as XLSX from "xlsx";

import type {
  BundleInputFile,
  DeliveryRecord,
  OrderRecord,
  ParsedBundle,
  PerformanceDay,
  ProductCurveRecord,
  ProductSalesRecord,
  ReportCoverage,
  ReportKind,
} from "@/lib/types";

const MONTH_NAMES = [
  "",
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_MAP: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const EMPTY_COVERAGE: ReportCoverage = {
  orders: false,
  deliveries: false,
  performance: false,
  products: false,
};

type ParsedSheetKind = ReportKind | "productCurve";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === null || value === undefined) {
    return 0;
  }

  const text = String(value).trim();
  if (!text) {
    return 0;
  }

  const cleaned = text.replace(/[^\d,.-]/g, "");
  if (!cleaned) {
    return 0;
  }

  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number.parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }

  if (cleaned.includes(",")) {
    return Number.parseFloat(cleaned.replace(",", ".")) || 0;
  }

  return Number.parseFloat(cleaned) || 0;
}

function parseIntegerString(value: unknown) {
  const numeric = parseNumber(value);
  return numeric ? String(Math.trunc(numeric)) : "";
}

function parsePercent(value: unknown) {
  const numeric = parseNumber(value);
  const text = String(value ?? "").trim();

  if (!text) {
    return 0;
  }

  return text.includes("%") ? numeric / 100 : numeric;
}

function parseDurationMinutes(value: unknown) {
  if (typeof value === "number") {
    return Math.round(value);
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return 0;
  }

  const parts = text.split(":").map((item) => Number.parseInt(item, 10));
  if (parts.some(Number.isNaN)) {
    return Math.round(parseNumber(value));
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return Math.round(hours * 60 + minutes + seconds / 60);
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return Math.round(minutes + seconds / 60);
  }

  return Math.round(parseNumber(value));
}

function parseDateParts(
  value: unknown,
  fallbackMonth: number,
  fallbackYear: number,
) {
  const raw = String(value ?? "").trim();
  const match = raw.match(
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s+(\d{1,2}):(\d{2}))?$/,
  );

  if (!match) {
    return {
      isValid: false,
      dateKey: "",
      dateLabel: "",
      timeLabel: "",
      hour: null as number | null,
    };
  }

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) || fallbackMonth;
  const yearToken = match[3];
  const year = yearToken
    ? yearToken.length === 2
      ? 2000 + Number.parseInt(yearToken, 10)
      : Number.parseInt(yearToken, 10)
    : fallbackYear;
  const hour = match[4] ? Number.parseInt(match[4], 10) : null;
  const minute = match[5] ? Number.parseInt(match[5], 10) : null;

  return {
    isValid: true,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    dateLabel: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
    timeLabel:
      hour === null || minute === null
        ? ""
        : `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    hour,
  };
}

function classifyChannel(originValue: unknown): OrderRecord["primaryChannel"] {
  const origin = normalizeText(String(originValue ?? ""));

  if (origin.includes("mesa") || origin.includes("comanda")) {
    return "Mesa";
  }

  if (origin.includes("delivery")) {
    return "Delivery";
  }

  if (origin.includes("retirada")) {
    return "Retirada";
  }

  return "Outros";
}

function buildCoverage(bundle: ParsedBundle): ReportCoverage {
  return {
    orders: bundle.orders.length > 0,
    deliveries: bundle.deliveries.length > 0,
    performance: bundle.performance.length > 0,
    products: bundle.productSales.length > 0 || bundle.productCurve.length > 0,
  };
}

function inferBundleContext(fileNames: string[]) {
  const normalizedNames = fileNames.map((name) => normalizeText(name));
  const month =
    normalizedNames
      .flatMap((name) =>
        Object.entries(MONTH_MAP)
          .filter(([token]) => name.includes(token))
          .map(([, value]) => value),
      )
      .at(0) || 1;

  const yearMatch =
    normalizedNames
      .map((name) => name.match(/(?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[_-]?(\d{2,4})/))
      .find(Boolean) || null;

  const year = yearMatch
    ? yearMatch[1].length === 2
      ? 2000 + Number.parseInt(yearMatch[1], 10)
      : Number.parseInt(yearMatch[1], 10)
    : new Date().getFullYear();

  const restaurantCode =
    fileNames
      .map((name) => name.match(/_([A-Za-z]{2,8})(?:\.[^.]+)?$/)?.[1]?.toUpperCase())
      .find(Boolean) || "LOJA";

  return {
    month,
    year,
    restaurantCode,
    periodLabel: `${MONTH_NAMES[month]}/${year}`,
    periodKey: `${restaurantCode}-${year}-${String(month).padStart(2, "0")}`,
  };
}

function inferReportKind(
  fileName: string,
  sheetName: string,
  headers: string[],
): ParsedSheetKind | null {
  const probe = normalizeText(`${fileName} ${sheetName} ${headers.join(" ")}`);

  if (
    probe.includes("performance da loja") ||
    probe.includes("venda bruta")
  ) {
    return "performance";
  }

  if (
    probe.includes("curva abc") ||
    (probe.includes("abc") &&
      probe.includes("total vendido") &&
      probe.includes("preco medio de venda"))
  ) {
    return "productCurve";
  }

  if (
    probe.includes("venda de produtos") ||
    probe.includes("quantidade vendida")
  ) {
    return "products";
  }

  if (probe.includes("entregas") || probe.includes("valor do entregador")) {
    return "deliveries";
  }

  if (probe.includes("pedidos") || probe.includes("id na origem / mesa")) {
    return "orders";
  }

  return null;
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T>();

  for (const item of items) {
    map.set(getKey(item), item);
  }

  return [...map.values()];
}

function parseOrders(
  rows: Array<Record<string, unknown>>,
  month: number,
  year: number,
) {
  const items: OrderRecord[] = [];

  for (const row of rows) {
    const orderNumber = parseIntegerString(row["Pedido #"]);
    const rawDate = row["Data"];

    if (!orderNumber || !rawDate) {
      continue;
    }

    const parsedDate = parseDateParts(rawDate, month, year);
    if (!parsedDate.isValid) {
      continue;
    }

    items.push({
      dateKey: parsedDate.dateKey,
      dateLabel: parsedDate.dateLabel,
      timeLabel: parsedDate.timeLabel,
      hour: parsedDate.hour,
      origin: String(row["Origem"] ?? "").trim(),
      primaryChannel: classifyChannel(row["Origem"]),
      catalog: String(row["Catálogo"] ?? "").trim(),
      orderNumber,
      sourceId: parseIntegerString(row["Id na Origem / Mesa"]),
      productsTotal: parseNumber(row["Produtos"]),
      addOnsTotal: parseNumber(row["Acréscimos"]),
      serviceFee: parseNumber(row["Taxa de Serviço"]),
      deliveryFee: parseNumber(row["Taxa de Entrega"]),
      total: parseNumber(row["Total"]),
      discount: parseNumber(row["Desconto"]),
      courtesy: parseNumber(row["Cortesia"]),
      bonus: parseNumber(row["Bônus"]),
      accountCredit: parseNumber(row["Crédito em Conta"]),
      payment: String(row["Pagamento"] ?? "").trim(),
      paymentMethod: String(row["Forma de Pagamento"] ?? "").trim(),
      deliveryBy: String(row["Entrega por"] ?? "").trim(),
      courier: String(row["Entregador"] ?? "").trim(),
      user: String(row["Usuário"] ?? "").trim(),
      invoice: String(row["Nota Fiscal"] ?? "").trim(),
      invoiceStatus: String(row["Status NF"] ?? "").trim(),
      customerCount: parseNumber(row["Nro Clientes"]),
      itemCount: parseNumber(row["Nro de Itens"]),
      prepMinutes: parseDurationMinutes(row["Tempo de Preparo"]),
      deliveryMinutes: parseDurationMinutes(row["Tempo de Entrega"]),
    });
  }

  return uniqueBy(items, (item) => `${item.dateKey}-${item.orderNumber}-${item.origin}`);
}

function parseDeliveries(
  rows: Array<Record<string, unknown>>,
  month: number,
  year: number,
) {
  const items: DeliveryRecord[] = [];

  for (const row of rows) {
    const orderNumber = String(row["Pedido #"] ?? "").replace("#", "").trim();
    const rawDate = row["Data"];

    if (!orderNumber || !rawDate) {
      continue;
    }

    const parsedDate = parseDateParts(rawDate, month, year);
    if (!parsedDate.isValid) {
      continue;
    }

    items.push({
      dateKey: parsedDate.dateKey,
      dateLabel: parsedDate.dateLabel,
      timeLabel: parsedDate.timeLabel,
      hour: parsedDate.hour,
      courier: String(row["Entregador"] ?? "").trim(),
      neighborhood: String(row["Bairro"] ?? "").trim(),
      address: String(row["Endereço"] ?? "").trim(),
      customer: String(row["Cliente"] ?? "").trim(),
      deliveryFee: parseNumber(row["Taxa de Entrega"]),
      courierPayout: parseNumber(row["Valor do Entregador"]),
      orderNumber,
      origin: String(row["Origem"] ?? "").trim(),
      orderTotal: parseNumber(row["Total do pedido"]),
      deliveryMode: String(row["Entrega por"] ?? "").trim(),
    });
  }

  return uniqueBy(items, (item) => `${item.dateKey}-${item.orderNumber}`);
}

function parsePerformance(
  rows: Array<Record<string, unknown>>,
  month: number,
  year: number,
) {
  const items: PerformanceDay[] = [];

  for (const row of rows) {
    const rawDate = row["Data"];
    if (!rawDate) {
      continue;
    }

    const parsedDate = parseDateParts(rawDate, month, year);
    if (!parsedDate.isValid) {
      continue;
    }

    items.push({
      dateKey: parsedDate.dateKey,
      dateLabel: parsedDate.dateLabel,
      grossSales: parseNumber(row["Venda Bruta"]),
      discounts: parseNumber(row["Descontos"]),
      courtesies: parseNumber(row["Cortesias"]),
      netSales: parseNumber(row["Venda Líquida"]),
      serviceFee: parseNumber(row["Taxa de Serviço"]),
      deliveryFee: parseNumber(row["Taxa de Entrega"]),
      finalNetSales: parseNumber(row["Venda Líquida Final"]),
      orders: parseNumber(row["Pedidos"]),
      customers: parseNumber(row["Clientes"]),
      averageOrderTicket: parseNumber(
        row["Ticket Médio do Pedido (com serviço)"],
      ),
      averageCustomerTicket: parseNumber(
        row["Ticket Médio por Cliente (sem serviço)"],
      ),
      averageFinalTicket: parseNumber(
        row["Ticket Médio Final (VLF / Clientes)"],
      ),
    });
  }

  return uniqueBy(items, (item) => item.dateKey).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );
}

function parseProducts(rows: Array<Record<string, unknown>>) {
  const items: ProductSalesRecord[] = [];

  for (const row of rows) {
    const product = String(row["Produto"] ?? "").trim();
    if (!product) {
      continue;
    }

    const channels = Object.entries(row)
      .filter(([key]) => !["Categoria", "Produto", "Quantidade vendida"].includes(key))
      .reduce<Record<string, number>>((accumulator, [key, value]) => {
        const amount = parseNumber(value);
        if (amount > 0) {
          accumulator[key] = amount;
        }
        return accumulator;
      }, {});

    items.push({
      category: String(row["Categoria"] ?? "").trim(),
      product,
      totalQuantity: parseNumber(row["Quantidade vendida"]),
      channels,
    });
  }

  return uniqueBy(items, (item) => `${item.category}-${item.product}`);
}

function parseProductCurve(rows: Array<Record<string, unknown>>) {
  const items: ProductCurveRecord[] = [];

  for (const row of rows) {
    const product = String(row["Produto"] ?? "").trim();

    if (!product) {
      continue;
    }

    items.push({
      category: String(row["Categoria"] ?? "").trim(),
      sku: String(row["SKU"] ?? "").trim(),
      product,
      totalQuantity: parseNumber(row["Quantidade vendida"]),
      averagePrice: parseNumber(row["Preço médio de venda"]),
      totalRevenue: parseNumber(row["Total Vendido"]),
      mix: parsePercent(row["Mix"]),
      accumulated: parsePercent(row["Acumulado"]),
      abcClass: String(row["ABC"] ?? "").trim().toUpperCase(),
    });
  }

  return uniqueBy(items, (item) => `${item.category}-${item.product}`);
}

export function parseReportBundle(files: BundleInputFile[]): ParsedBundle {
  if (!files.length) {
    throw new Error("Nenhum arquivo Excel foi enviado.");
  }

  const context = inferBundleContext(files.map((file) => file.name));

  const bundle: ParsedBundle = {
    ...context,
    uploadedAt: new Date().toISOString(),
    sourceFiles: files.map((file) => file.name).sort(),
    coverage: { ...EMPTY_COVERAGE },
    performance: [],
    orders: [],
    deliveries: [],
    productSales: [],
    productCurve: [],
  };

  for (const file of files) {
    const workbook = XLSX.read(file.buffer, { type: "buffer" });

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
      });
      const headerRows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
        header: 1,
        range: 0,
        blankrows: false,
      });
      const headers = (headerRows[0] || []).map((value) => String(value ?? ""));
      const kind = inferReportKind(file.name, sheetName, headers);

      if (!kind) {
        continue;
      }

      if (kind === "orders") {
        bundle.orders = [...bundle.orders, ...parseOrders(rows, context.month, context.year)];
      }

      if (kind === "deliveries") {
        bundle.deliveries = [
          ...bundle.deliveries,
          ...parseDeliveries(rows, context.month, context.year),
        ];
      }

      if (kind === "performance") {
        bundle.performance = [
          ...bundle.performance,
          ...parsePerformance(rows, context.month, context.year),
        ];
      }

      if (kind === "products") {
        bundle.productSales = [...bundle.productSales, ...parseProducts(rows)];
      }

      if (kind === "productCurve") {
        bundle.productCurve = [...bundle.productCurve, ...parseProductCurve(rows)];
      }
    }
  }

  bundle.orders = uniqueBy(
    bundle.orders,
    (item) => `${item.dateKey}-${item.orderNumber}-${item.origin}`,
  ).sort((a, b) =>
    `${a.dateKey} ${a.timeLabel}`.localeCompare(`${b.dateKey} ${b.timeLabel}`),
  );
  bundle.deliveries = uniqueBy(
    bundle.deliveries,
    (item) => `${item.dateKey}-${item.orderNumber}`,
  ).sort((a, b) =>
    `${a.dateKey} ${a.timeLabel}`.localeCompare(`${b.dateKey} ${b.timeLabel}`),
  );
  bundle.performance = uniqueBy(bundle.performance, (item) => item.dateKey).sort(
    (a, b) => a.dateKey.localeCompare(b.dateKey),
  );
  bundle.productSales = uniqueBy(
    bundle.productSales,
    (item) => `${item.category}-${item.product}`,
  ).sort((a, b) => b.totalQuantity - a.totalQuantity);
  bundle.productCurve = uniqueBy(
    bundle.productCurve,
    (item) => `${item.category}-${item.product}`,
  ).sort((a, b) => b.totalRevenue - a.totalRevenue);
  bundle.coverage = buildCoverage(bundle);

  return bundle;
}
