import * as XLSX from "xlsx";

import { buildProductCurveRowKey } from "@/lib/product-curve";
import type {
  BundleContextOverrides,
  BundleInputFile,
  DeliveryRecord,
  ExtendedReportKind,
  FileContextDetails,
  OrderRecord,
  ParseDiagnostics,
  ParseReportBundleResult,
  ParseSectionDiagnostics,
  ParsedBundle,
  PerformanceDay,
  ProductCurveRecord,
  ProductSalesRecord,
  ReportCoverage,
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

type ParsedSheetKind = ExtendedReportKind;

interface SectionParseResult<T> {
  items: T[];
  inputRows: number;
  skippedRows: number;
}

function createSectionDiagnostics(): ParseSectionDiagnostics {
  return {
    inputRows: 0,
    parsedRows: 0,
    skippedRows: 0,
    duplicatesRemoved: 0,
  };
}

function createDiagnostics(fileContext: FileContextDetails): ParseDiagnostics {
  return {
    fileContext,
    sheets: [],
    sections: {
      orders: createSectionDiagnostics(),
      deliveries: createSectionDiagnostics(),
      performance: createSectionDiagnostics(),
      products: createSectionDiagnostics(),
      productCurve: createSectionDiagnostics(),
    },
  };
}

export function normalizeReportText(value: string) {
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
  const origin = normalizeReportText(String(originValue ?? ""));

  if (origin.includes("mesa") || origin.includes("comanda")) {
    return "Mesa";
  }

  if (origin.includes("retirada")) {
    return "Retirada";
  }

  if (origin.includes("delivery")) {
    return "Delivery";
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

function extractFileSignals(fileName: string) {
  const normalized = normalizeReportText(fileName);
  const monthByName = Object.entries(MONTH_MAP).find(([token]) => normalized.includes(token))?.[1];
  const namedYearMatch = normalized.match(
    /(?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[_-]?(\d{2,4})/,
  );
  const numericPeriodMatch = normalized.match(
    /(?:^|[_\s-])(0?[1-9]|1[0-2])[_\s-](\d{2,4})(?=$|[_\s.-])/,
  );
  const restaurantCode = fileName.match(/_([A-Za-z]{2,8})(?:\.[^.]+)?$/)?.[1]?.toUpperCase();
  const monthByNumber = numericPeriodMatch
    ? Number.parseInt(numericPeriodMatch[1], 10)
    : null;
  const yearToken = namedYearMatch?.[1] || numericPeriodMatch?.[2] || "";

  return {
    month: monthByName || monthByNumber || null,
    year: yearToken
      ? yearToken.length === 2
        ? 2000 + Number.parseInt(yearToken, 10)
        : Number.parseInt(yearToken, 10)
      : null,
    restaurantCode: restaurantCode || null,
  };
}

export function getFileContextDetails(fileNames: string[]): FileContextDetails {
  const months = new Set<number>();
  const years = new Set<number>();
  const restaurantCodes = new Set<string>();

  for (const fileName of fileNames) {
    const signal = extractFileSignals(fileName);

    if (signal.month) {
      months.add(signal.month);
    }

    if (signal.year) {
      years.add(signal.year);
    }

    if (signal.restaurantCode) {
      restaurantCodes.add(signal.restaurantCode);
    }
  }

  return {
    months: [...months].sort((a, b) => a - b),
    years: [...years].sort((a, b) => a - b),
    restaurantCodes: [...restaurantCodes].sort(),
  };
}

export function inferBundleContext(
  fileNames: string[],
  overrides: BundleContextOverrides = {},
) {
  const details = getFileContextDetails(fileNames);
  const month = overrides.month || details.months[0] || 1;
  const year = overrides.year || details.years[0] || new Date().getFullYear();
  const restaurantCode = overrides.restaurantCode || details.restaurantCodes[0] || "LOJA";

  return {
    month,
    year,
    restaurantCode,
    periodLabel: `${MONTH_NAMES[month]}/${year}`,
    periodKey: `${restaurantCode}-${year}-${String(month).padStart(2, "0")}`,
  };
}

export function inferReportKind(
  fileName: string,
  sheetName: string,
  headers: string[],
): ParsedSheetKind | null {
  const probe = normalizeReportText(`${fileName} ${sheetName} ${headers.join(" ")}`);

  if (probe.includes("performance da loja") || probe.includes("venda bruta")) {
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

  if (probe.includes("venda de produtos") || probe.includes("quantidade vendida")) {
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

function finalizeSection<T>(
  items: T[],
  getKey: (item: T) => string,
  inputRows: number,
  skippedRows: number,
  sorter?: (left: T, right: T) => number,
) {
  const uniqueItems = uniqueBy(items, getKey);
  const sortedItems = sorter ? [...uniqueItems].sort(sorter) : uniqueItems;

  return {
    items: sortedItems,
    diagnostics: {
      inputRows,
      parsedRows: uniqueItems.length,
      skippedRows,
      duplicatesRemoved: Math.max(0, items.length - uniqueItems.length),
    } satisfies ParseSectionDiagnostics,
  };
}

function parseOrders(
  rows: Array<Record<string, unknown>>,
  month: number,
  year: number,
): SectionParseResult<OrderRecord> {
  const items: OrderRecord[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    const orderNumber = parseIntegerString(row["Pedido #"]);
    const rawDate = row["Data"];

    if (!orderNumber || !rawDate) {
      skippedRows += 1;
      continue;
    }

    const parsedDate = parseDateParts(rawDate, month, year);
    if (!parsedDate.isValid) {
      skippedRows += 1;
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

  return {
    items,
    inputRows: rows.length,
    skippedRows,
  };
}

function parseDeliveries(
  rows: Array<Record<string, unknown>>,
  month: number,
  year: number,
): SectionParseResult<DeliveryRecord> {
  const items: DeliveryRecord[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    const orderNumber = String(row["Pedido #"] ?? "").replace("#", "").trim();
    const rawDate = row["Data"];

    if (!orderNumber || !rawDate) {
      skippedRows += 1;
      continue;
    }

    const parsedDate = parseDateParts(rawDate, month, year);
    if (!parsedDate.isValid) {
      skippedRows += 1;
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

  return {
    items,
    inputRows: rows.length,
    skippedRows,
  };
}

function parsePerformance(
  rows: Array<Record<string, unknown>>,
  month: number,
  year: number,
): SectionParseResult<PerformanceDay> {
  const items: PerformanceDay[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    const rawDate = row["Data"];

    if (!rawDate) {
      skippedRows += 1;
      continue;
    }

    const parsedDate = parseDateParts(rawDate, month, year);
    if (!parsedDate.isValid) {
      skippedRows += 1;
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

  return {
    items,
    inputRows: rows.length,
    skippedRows,
  };
}

function parseProducts(rows: Array<Record<string, unknown>>): SectionParseResult<ProductSalesRecord> {
  const items: ProductSalesRecord[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    const product = String(row["Produto"] ?? "").trim();

    if (!product) {
      skippedRows += 1;
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

  return {
    items,
    inputRows: rows.length,
    skippedRows,
  };
}

function parseProductCurve(
  rows: Array<Record<string, unknown>>,
): SectionParseResult<ProductCurveRecord> {
  const items: ProductCurveRecord[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    const product = String(row["Produto"] ?? "").trim();

    if (!product) {
      skippedRows += 1;
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

  return {
    items,
    inputRows: rows.length,
    skippedRows,
  };
}

export function parseReportBundleWithDiagnostics(
  files: BundleInputFile[],
  overrides: BundleContextOverrides = {},
): ParseReportBundleResult {
  if (!files.length) {
    throw new Error("Nenhum arquivo Excel foi enviado.");
  }

  const fileNames = files.map((file) => file.name);
  const context = inferBundleContext(fileNames, overrides);
  const diagnostics = createDiagnostics(getFileContextDetails(fileNames));

  const bundle: ParsedBundle = {
    ...context,
    uploadedAt: new Date().toISOString(),
    sourceFiles: [...fileNames].sort(),
    coverage: { ...EMPTY_COVERAGE },
    performance: [],
    orders: [],
    deliveries: [],
    productSales: [],
    productCurve: [],
    validation: null,
  };

  const ordersAccumulator: OrderRecord[] = [];
  const deliveriesAccumulator: DeliveryRecord[] = [];
  const performanceAccumulator: PerformanceDay[] = [];
  const productsAccumulator: ProductSalesRecord[] = [];
  const productCurveAccumulator: ProductCurveRecord[] = [];

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

      diagnostics.sheets.push({
        fileName: file.name,
        sheetName,
        kind: kind || "unknown",
        rowCount: rows.length,
        headerCount: headers.length,
      });

      if (!kind) {
        continue;
      }

      if (kind === "orders") {
        const result = parseOrders(rows, context.month, context.year);
        ordersAccumulator.push(...result.items);
        diagnostics.sections.orders.inputRows += result.inputRows;
        diagnostics.sections.orders.skippedRows += result.skippedRows;
      }

      if (kind === "deliveries") {
        const result = parseDeliveries(rows, context.month, context.year);
        deliveriesAccumulator.push(...result.items);
        diagnostics.sections.deliveries.inputRows += result.inputRows;
        diagnostics.sections.deliveries.skippedRows += result.skippedRows;
      }

      if (kind === "performance") {
        const result = parsePerformance(rows, context.month, context.year);
        performanceAccumulator.push(...result.items);
        diagnostics.sections.performance.inputRows += result.inputRows;
        diagnostics.sections.performance.skippedRows += result.skippedRows;
      }

      if (kind === "products") {
        const result = parseProducts(rows);
        productsAccumulator.push(...result.items);
        diagnostics.sections.products.inputRows += result.inputRows;
        diagnostics.sections.products.skippedRows += result.skippedRows;
      }

      if (kind === "productCurve") {
        const result = parseProductCurve(rows);
        productCurveAccumulator.push(...result.items);
        diagnostics.sections.productCurve.inputRows += result.inputRows;
        diagnostics.sections.productCurve.skippedRows += result.skippedRows;
      }
    }
  }

  const ordersSection = finalizeSection(
    ordersAccumulator,
    (item) => `${item.dateKey}-${item.orderNumber}-${item.origin}`,
    diagnostics.sections.orders.inputRows,
    diagnostics.sections.orders.skippedRows,
    (left, right) =>
      `${left.dateKey} ${left.timeLabel}`.localeCompare(`${right.dateKey} ${right.timeLabel}`),
  );
  const deliveriesSection = finalizeSection(
    deliveriesAccumulator,
    (item) => `${item.dateKey}-${item.orderNumber}`,
    diagnostics.sections.deliveries.inputRows,
    diagnostics.sections.deliveries.skippedRows,
    (left, right) =>
      `${left.dateKey} ${left.timeLabel}`.localeCompare(`${right.dateKey} ${right.timeLabel}`),
  );
  const performanceSection = finalizeSection(
    performanceAccumulator,
    (item) => item.dateKey,
    diagnostics.sections.performance.inputRows,
    diagnostics.sections.performance.skippedRows,
    (left, right) => left.dateKey.localeCompare(right.dateKey),
  );
  const productsSection = finalizeSection(
    productsAccumulator,
    (item) => `${item.category}-${item.product}`,
    diagnostics.sections.products.inputRows,
    diagnostics.sections.products.skippedRows,
    (left, right) => right.totalQuantity - left.totalQuantity,
  );
  const productCurveSection = finalizeSection(
    productCurveAccumulator,
    buildProductCurveRowKey,
    diagnostics.sections.productCurve.inputRows,
    diagnostics.sections.productCurve.skippedRows,
    (left, right) => right.totalRevenue - left.totalRevenue,
  );

  bundle.orders = ordersSection.items;
  bundle.deliveries = deliveriesSection.items;
  bundle.performance = performanceSection.items;
  bundle.productSales = productsSection.items;
  bundle.productCurve = productCurveSection.items;
  bundle.coverage = buildCoverage(bundle);

  diagnostics.sections.orders = ordersSection.diagnostics;
  diagnostics.sections.deliveries = deliveriesSection.diagnostics;
  diagnostics.sections.performance = performanceSection.diagnostics;
  diagnostics.sections.products = productsSection.diagnostics;
  diagnostics.sections.productCurve = productCurveSection.diagnostics;

  return {
    bundle,
    diagnostics,
  };
}

export function parseReportBundle(files: BundleInputFile[]): ParsedBundle {
  return parseReportBundleWithDiagnostics(files).bundle;
}
