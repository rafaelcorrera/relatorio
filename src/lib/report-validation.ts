import {
  aggregateProductCurve,
  buildProductLookup,
  resolveProductLookup,
} from "@/lib/product-curve";
import type {
  BundleValidationReport,
  BundleValidationTotals,
  ExtendedReportKind,
  ParseDiagnostics,
  ParsedBundle,
  ValidationIssue,
  ValidationSeverity,
} from "@/lib/types";

const CORE_REPORTS: ExtendedReportKind[] = [
  "orders",
  "deliveries",
  "performance",
  "products",
];

interface ValidateBundleOptions {
  sourceDirectory?: string | null;
  expectedYear?: number;
  expectedRestaurantCode?: string;
  requireProductCurve?: boolean;
}

function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function createIssue(
  code: string,
  severity: ValidationSeverity,
  message: string,
  context?: ValidationIssue["context"],
) {
  return {
    code,
    severity,
    message,
    context,
  } satisfies ValidationIssue;
}

function countSheetsByKind(diagnostics: ParseDiagnostics, kind: ExtendedReportKind) {
  return diagnostics.sheets.filter((sheet) => sheet.kind === kind).length;
}

function buildValidationTotals(bundle: ParsedBundle): BundleValidationTotals {
  const aggregatedCurve = aggregateProductCurve(bundle.productCurve);

  return {
    performanceGrossSales: sumBy(bundle.performance, (item) => item.grossSales),
    performanceFinalNetSales: sumBy(bundle.performance, (item) => item.finalNetSales),
    performanceOrders: sumBy(bundle.performance, (item) => item.orders),
    performanceDeliveryFee: sumBy(bundle.performance, (item) => item.deliveryFee),
    orderCount: bundle.orders.length,
    orderTotal: sumBy(bundle.orders, (item) => item.total),
    orderProductsTotal: sumBy(bundle.orders, (item) => item.productsTotal),
    orderAddOnsTotal: sumBy(bundle.orders, (item) => item.addOnsTotal),
    orderDiscountTotal: sumBy(bundle.orders, (item) => item.discount),
    orderDeliveryFeeTotal: sumBy(bundle.orders, (item) => item.deliveryFee),
    deliveryCount: bundle.deliveries.length,
    deliveryCountFromOrders: bundle.orders.filter(
      (item) => item.primaryChannel === "Delivery",
    ).length,
    deliveryOrderTotal: sumBy(bundle.deliveries, (item) => item.orderTotal),
    deliveryFeeTotal: sumBy(bundle.deliveries, (item) => item.deliveryFee),
    productQuantityTotal: sumBy(bundle.productSales, (item) => item.totalQuantity),
    productCurveProductCount: aggregatedCurve.length,
    productCurveSplitProductCount: aggregatedCurve.filter((item) => item.rowCount > 1).length,
    productCurveMultiClassProductCount: aggregatedCurve.filter(
      (item) => item.classes.length > 1,
    ).length,
    productCurveQuantityTotal: sumBy(bundle.productCurve, (item) => item.totalQuantity),
    productCurveRevenueTotal: sumBy(bundle.productCurve, (item) => item.totalRevenue),
  };
}

function getExpectedPeriodPrefix(bundle: ParsedBundle) {
  return `${bundle.year}-${String(bundle.month).padStart(2, "0")}-`;
}

function countOutOfPeriodDates(bundle: ParsedBundle) {
  const prefix = getExpectedPeriodPrefix(bundle);

  return {
    orders: bundle.orders.filter((item) => !item.dateKey.startsWith(prefix)).length,
    deliveries: bundle.deliveries.filter((item) => !item.dateKey.startsWith(prefix)).length,
    performance: bundle.performance.filter((item) => !item.dateKey.startsWith(prefix)).length,
  };
}

function exceedsTolerance(
  left: number,
  right: number,
  relativeTolerance: number,
  absoluteTolerance = 0,
) {
  const diff = Math.abs(left - right);
  const base = Math.max(Math.abs(left), Math.abs(right), 1);
  return diff > Math.max(base * relativeTolerance, absoluteTolerance);
}

function buildStatus(issues: ValidationIssue[]): BundleValidationReport["status"] {
  if (issues.some((issue) => issue.severity === "error")) {
    return "rejected";
  }

  if (issues.some((issue) => issue.severity === "warning")) {
    return "approved_with_warnings";
  }

  return "approved";
}

export function validateParsedBundle(
  bundle: ParsedBundle,
  diagnostics: ParseDiagnostics,
  options: ValidateBundleOptions = {},
): BundleValidationReport {
  const issues: ValidationIssue[] = [];
  const totals = buildValidationTotals(bundle);
  const fileContext = diagnostics.fileContext;
  const requireProductCurve = options.requireProductCurve ?? false;
  const aggregatedCurve = aggregateProductCurve(bundle.productCurve);
  const splitCurveProducts = aggregatedCurve.filter((item) => item.rowCount > 1);
  const multiClassCurveProducts = aggregatedCurve.filter((item) => item.classes.length > 1);
  const productSalesLookup = buildProductLookup(bundle.productSales);
  const curveLookup = buildProductLookup(aggregatedCurve);

  if (!fileContext.months.length) {
    issues.push(
      createIssue(
        "file_context_missing_month",
        "error",
        "Nao foi possivel identificar o mes pelos nomes dos arquivos.",
      ),
    );
  }

  if (fileContext.months.length > 1) {
    issues.push(
      createIssue(
        "file_context_multiple_months",
        "error",
        "Os arquivos parecem misturar mais de um mes no mesmo lote.",
        {
          months: fileContext.months.join(", "),
        },
      ),
    );
  }

  if (!fileContext.restaurantCodes.length) {
    issues.push(
      createIssue(
        "file_context_missing_restaurant",
        "warning",
        "Nao foi possivel identificar a sigla do restaurante em todos os nomes de arquivo.",
      ),
    );
  }

  if (fileContext.restaurantCodes.length > 1) {
    issues.push(
      createIssue(
        "file_context_multiple_restaurants",
        "error",
        "Os arquivos parecem misturar mais de um restaurante no mesmo lote.",
        {
          restaurantCodes: fileContext.restaurantCodes.join(", "),
        },
      ),
    );
  }

  if (!fileContext.years.length) {
    if (!options.expectedYear) {
      issues.push(
        createIssue(
          "file_context_missing_year",
          "error",
          "Os arquivos nao trazem ano suficiente para importacao segura. Informe o ano esperado no processo de importacao.",
        ),
      );
    } else {
      issues.push(
        createIssue(
          "file_context_year_inferred",
          "warning",
          "O ano foi aplicado por override manual porque os arquivos nao trazem esse dado no nome.",
          {
            expectedYear: options.expectedYear,
          },
        ),
      );
    }
  }

  if (fileContext.years.length > 1) {
    issues.push(
      createIssue(
        "file_context_multiple_years",
        "error",
        "Os arquivos parecem misturar mais de um ano no mesmo lote.",
        {
          years: fileContext.years.join(", "),
        },
      ),
    );
  }

  if (
    options.expectedYear &&
    fileContext.years.length > 0 &&
    !fileContext.years.includes(options.expectedYear)
  ) {
    issues.push(
      createIssue(
        "expected_year_mismatch",
        "error",
        "O ano esperado nao bate com o ano identificado nos nomes dos arquivos.",
        {
          expectedYear: options.expectedYear,
          detectedYears: fileContext.years.join(", "),
        },
      ),
    );
  }

  if (
    options.expectedRestaurantCode &&
    fileContext.restaurantCodes.length > 0 &&
    !fileContext.restaurantCodes.includes(options.expectedRestaurantCode.toUpperCase())
  ) {
    issues.push(
      createIssue(
        "expected_restaurant_mismatch",
        "error",
        "A sigla esperada do restaurante nao bate com os arquivos deste lote.",
        {
          expectedRestaurantCode: options.expectedRestaurantCode.toUpperCase(),
          detectedRestaurantCodes: fileContext.restaurantCodes.join(", "),
        },
      ),
    );
  }

  for (const reportKind of CORE_REPORTS) {
    if (countSheetsByKind(diagnostics, reportKind) === 0) {
      issues.push(
        createIssue(
          `missing_${reportKind}_sheet`,
          "error",
          `Nao foi encontrada nenhuma planilha reconhecida para ${reportKind}.`,
        ),
      );
    }
  }

  if (!bundle.coverage.products) {
    issues.push(
      createIssue(
        "missing_products_coverage",
        "error",
        "O lote nao gerou cobertura de produtos suficiente para analise.",
      ),
    );
  }

  if (countSheetsByKind(diagnostics, "productCurve") === 0) {
    issues.push(
      createIssue(
        "missing_product_curve_sheet",
        requireProductCurve ? "error" : "warning",
        "Nao foi encontrada uma planilha valida de Curva ABC neste lote.",
      ),
    );
  }

  const outOfPeriod = countOutOfPeriodDates(bundle);

  if (outOfPeriod.orders > 0) {
    issues.push(
      createIssue(
        "orders_out_of_period",
        "error",
        "Existem pedidos fora do periodo esperado do bundle.",
        {
          count: outOfPeriod.orders,
          expectedPeriod: `${bundle.month}/${bundle.year}`,
        },
      ),
    );
  }

  if (outOfPeriod.deliveries > 0) {
    issues.push(
      createIssue(
        "deliveries_out_of_period",
        "error",
        "Existem entregas fora do periodo esperado do bundle.",
        {
          count: outOfPeriod.deliveries,
          expectedPeriod: `${bundle.month}/${bundle.year}`,
        },
      ),
    );
  }

  if (outOfPeriod.performance > 0) {
    issues.push(
      createIssue(
        "performance_out_of_period",
        "error",
        "Existem linhas de performance fora do periodo esperado do bundle.",
        {
          count: outOfPeriod.performance,
          expectedPeriod: `${bundle.month}/${bundle.year}`,
        },
      ),
    );
  }

  for (const [section, data] of Object.entries(diagnostics.sections) as Array<
    [ExtendedReportKind, ParseDiagnostics["sections"][ExtendedReportKind]]
  >) {
    if (data.duplicatesRemoved > 0) {
      const severity: ValidationSeverity =
        section === "performance" ? "warning" : "error";
      const message =
        section === "performance"
          ? "A importacao consolidou linhas repetidas em performance e manteve a ultima leitura de cada dia."
          : `A importacao removeu duplicidades em ${section}.`;

      issues.push(
        createIssue(
          `${section}_duplicates_removed`,
          severity,
          message,
          {
            duplicatesRemoved: data.duplicatesRemoved,
          },
        ),
      );
    }

    if (data.skippedRows > 0) {
      const severity: ValidationSeverity =
        data.skippedRows <= 1 ? "info" : "warning";

      issues.push(
        createIssue(
          `${section}_rows_skipped`,
          severity,
          `Algumas linhas de ${section} foram ignoradas na leitura.`,
          {
            skippedRows: data.skippedRows,
            inputRows: data.inputRows,
          },
        ),
      );
    }
  }

  if (splitCurveProducts.length > 0) {
    issues.push(
      createIssue(
        "curve_products_split_across_rows",
        "warning",
        "A Curva ABC trouxe produtos repartidos em mais de uma linha. O cruzamento usa consolidacao por produto para evitar subcontagem ou superposicao.",
        {
          products: splitCurveProducts.length,
          sample: splitCurveProducts
            .slice(0, 3)
            .map((item) => item.product)
            .join(" | ") || null,
        },
      ),
    );
  }

  if (multiClassCurveProducts.length > 0) {
    issues.push(
      createIssue(
        "curve_products_multiple_classes",
        "warning",
        "Alguns produtos aparecem com mais de uma classe ABC no mesmo lote. O painel passa a usar a classe dominante por faturamento.",
        {
          products: multiClassCurveProducts.length,
          sample: multiClassCurveProducts
            .slice(0, 3)
            .map((item) => `${item.product} (${item.classes.join("/")})`)
            .join(" | ") || null,
        },
      ),
    );
  }

  if (totals.performanceOrders !== totals.orderCount) {
    issues.push(
      createIssue(
        "performance_orders_mismatch",
        "error",
        "A soma de pedidos em Performance da Loja nao bate com o total de pedidos parseados.",
        {
          performanceOrders: totals.performanceOrders,
          orderCount: totals.orderCount,
        },
      ),
    );
  }

  if (totals.deliveryCount !== totals.deliveryCountFromOrders) {
    issues.push(
      createIssue(
        "delivery_count_mismatch",
        "error",
        "O total de entregas nao bate com a contagem de pedidos classificados como Delivery.",
        {
          deliveries: totals.deliveryCount,
          deliveryOrders: totals.deliveryCountFromOrders,
        },
      ),
    );
  }

  if (Math.abs(totals.performanceDeliveryFee - totals.orderDeliveryFeeTotal) > 0.01) {
    issues.push(
      createIssue(
        "delivery_fee_perf_vs_orders_mismatch",
        "error",
        "A taxa de entrega em Performance da Loja nao bate com a taxa de entrega somada dos pedidos.",
        {
          performanceDeliveryFee: totals.performanceDeliveryFee,
          orderDeliveryFeeTotal: totals.orderDeliveryFeeTotal,
        },
      ),
    );
  }

  if (Math.abs(totals.performanceDeliveryFee - totals.deliveryFeeTotal) > 0.01) {
    issues.push(
      createIssue(
        "delivery_fee_perf_vs_deliveries_mismatch",
        "error",
        "A taxa de entrega em Performance da Loja nao bate com a taxa de entrega somada das entregas.",
        {
          performanceDeliveryFee: totals.performanceDeliveryFee,
          deliveryFeeTotal: totals.deliveryFeeTotal,
        },
      ),
    );
  }

  if (
    exceedsTolerance(
      totals.performanceGrossSales,
      totals.orderTotal,
      0.0005,
      25,
    )
  ) {
    issues.push(
      createIssue(
        "gross_sales_perf_vs_orders_mismatch",
        "warning",
        "Venda Bruta de Performance da Loja difere do total de pedidos acima da tolerancia definida.",
        {
          performanceGrossSales: totals.performanceGrossSales,
          orderTotal: totals.orderTotal,
        },
      ),
    );
  }

  const productRevenueReference = totals.orderProductsTotal + totals.orderAddOnsTotal;
  const aliasMatchedProducts = bundle.productSales.filter(
    (item) =>
      resolveProductLookup(curveLookup, item.category, item.product).strategy === "alias",
  );
  const missingInCurve = bundle.productSales.filter(
    (item) =>
      resolveProductLookup(curveLookup, item.category, item.product).strategy === "missing",
  );
  const missingInProducts = aggregatedCurve.filter(
    (item) =>
      resolveProductLookup(productSalesLookup, item.category, item.product).strategy === "missing",
  );

  if (
    exceedsTolerance(
      totals.productCurveRevenueTotal,
      productRevenueReference,
      0.01,
      100,
    )
  ) {
    issues.push(
      createIssue(
        "curve_revenue_vs_products_mismatch",
        "warning",
        "O faturamento da Curva ABC difere da receita de produtos dos pedidos acima da tolerancia definida.",
        {
          productCurveRevenueTotal: totals.productCurveRevenueTotal,
          orderProductsRevenue: productRevenueReference,
        },
      ),
    );
  }

  if (
    exceedsTolerance(
      totals.productCurveQuantityTotal,
      totals.productQuantityTotal,
      0.01,
      10,
    )
  ) {
    issues.push(
      createIssue(
        "curve_quantity_vs_products_mismatch",
        "warning",
        "A quantidade total da Curva ABC difere do relatorio de produtos acima da tolerancia definida.",
        {
          productCurveQuantityTotal: totals.productCurveQuantityTotal,
          productQuantityTotal: totals.productQuantityTotal,
        },
      ),
    );
  }

  if (
    aggregatedCurve.length > 0 &&
    exceedsTolerance(aggregatedCurve.length, bundle.productSales.length, 0.02, 1)
  ) {
    issues.push(
      createIssue(
        "curve_row_count_vs_products_mismatch",
        "warning",
        "A quantidade de produtos unicos da Curva ABC difere da lista de produtos.",
        {
          productCurveProducts: aggregatedCurve.length,
          productRows: bundle.productSales.length,
        },
      ),
    );
  }

  if (aliasMatchedProducts.length > 0) {
    issues.push(
      createIssue(
        "curve_alias_matches_applied",
        "info",
        "Alguns produtos precisaram de alias controlado para cruzar Curva ABC e relatorio por canal.",
        {
          products: aliasMatchedProducts.length,
          sample: aliasMatchedProducts
            .slice(0, 3)
            .map((item) => item.product)
            .join(" | ") || null,
        },
      ),
    );
  }

  if (missingInCurve.length > 0) {
    issues.push(
      createIssue(
        "products_missing_in_curve",
        "warning",
        "Alguns produtos do relatorio por canal nao foram encontrados na Curva ABC agregada.",
        {
          products: missingInCurve.length,
          sample: missingInCurve
            .slice(0, 3)
            .map((item) => item.product)
            .join(" | ") || null,
        },
      ),
    );
  }

  if (missingInProducts.length > 0) {
    issues.push(
      createIssue(
        "curve_missing_in_products",
        "warning",
        "Alguns produtos da Curva ABC agregada nao foram encontrados no relatorio de produtos por canal.",
        {
          products: missingInProducts.length,
          sample: missingInProducts
            .slice(0, 3)
            .map((item) => item.product)
            .join(" | ") || null,
        },
      ),
    );
  }

  return {
    status: buildStatus(issues),
    validatedAt: new Date().toISOString(),
    source: {
      directory: options.sourceDirectory || null,
      fileCount: bundle.sourceFiles.length,
    },
    fileContext,
    totals,
    diagnostics,
    issues,
  };
}
