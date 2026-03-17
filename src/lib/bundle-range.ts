import "server-only";

import { aggregateProductCurve, buildProductKey } from "@/lib/product-curve";
import type {
  DeliveryRecord,
  OrderRecord,
  ParsedBundle,
  PerformanceDay,
  ProductCurveRecord,
  ProductSalesRecord,
} from "@/lib/types";

function sortPerformance(items: PerformanceDay[]) {
  return [...items].sort((left, right) => left.dateKey.localeCompare(right.dateKey));
}

function sortOrders(items: OrderRecord[]) {
  return [...items].sort((left, right) => {
    const leftKey = `${left.dateKey} ${left.timeLabel} ${left.orderNumber}`;
    const rightKey = `${right.dateKey} ${right.timeLabel} ${right.orderNumber}`;
    return leftKey.localeCompare(rightKey);
  });
}

function sortDeliveries(items: DeliveryRecord[]) {
  return [...items].sort((left, right) => {
    const leftKey = `${left.dateKey} ${left.timeLabel} ${left.orderNumber}`;
    const rightKey = `${right.dateKey} ${right.timeLabel} ${right.orderNumber}`;
    return leftKey.localeCompare(rightKey);
  });
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function mergeProductSales(records: ProductSalesRecord[]) {
  const grouped = new Map<string, ProductSalesRecord>();

  for (const record of records) {
    const key = buildProductKey(record.category, record.product);
    const current = grouped.get(key) || {
      category: record.category,
      product: record.product,
      totalQuantity: 0,
      channels: {},
    };

    current.totalQuantity += record.totalQuantity;

    for (const [channel, quantity] of Object.entries(record.channels)) {
      current.channels[channel] = (current.channels[channel] || 0) + quantity;
    }

    grouped.set(key, current);
  }

  return [...grouped.values()].sort((left, right) => right.totalQuantity - left.totalQuantity);
}

function mergeProductCurve(records: ProductCurveRecord[]) {
  return aggregateProductCurve(records).map((item) => ({
    category: item.category,
    sku: item.sku,
    product: item.product,
    totalQuantity: item.totalQuantity,
    averagePrice: item.averagePrice,
    totalRevenue: item.totalRevenue,
    mix: item.mix,
    accumulated: item.accumulated,
    abcClass: item.abcClass,
  }));
}

function buildMergedPeriodLabel(sortedBundles: ParsedBundle[]) {
  if (sortedBundles.length === 1) {
    return sortedBundles[0].periodLabel;
  }

  const oldest = sortedBundles[0];
  const newest = sortedBundles[sortedBundles.length - 1];
  return `${oldest.periodLabel} ate ${newest.periodLabel}`;
}

export function getRestaurantBundles(
  bundles: ParsedBundle[],
  restaurantCode?: string | null,
) {
  const normalizedRestaurantCode = (restaurantCode || "").trim().toUpperCase();

  if (!normalizedRestaurantCode) {
    return [...bundles];
  }

  return bundles.filter(
    (bundle) => bundle.restaurantCode.toUpperCase() === normalizedRestaurantCode,
  );
}

export function mergeBundles(bundles: ParsedBundle[]) {
  if (!bundles.length) {
    return null;
  }

  if (bundles.length === 1) {
    return bundles[0];
  }

  const sortedBundles = [...bundles].sort((left, right) => {
    if (left.year !== right.year) {
      return left.year - right.year;
    }

    if (left.month !== right.month) {
      return left.month - right.month;
    }

    return left.uploadedAt.localeCompare(right.uploadedAt);
  });

  const newestBundle = [...sortedBundles].sort((left, right) =>
    right.uploadedAt.localeCompare(left.uploadedAt),
  )[0];
  const firstBundle = sortedBundles[0];

  return {
    month: firstBundle.month,
    year: firstBundle.year,
    restaurantCode: firstBundle.restaurantCode,
    periodLabel: buildMergedPeriodLabel(sortedBundles),
    periodKey: `range-${firstBundle.restaurantCode}-${sortedBundles[0].year}-${String(sortedBundles[0].month).padStart(2, "0")}-${sortedBundles[sortedBundles.length - 1].year}-${String(sortedBundles[sortedBundles.length - 1].month).padStart(2, "0")}`,
    uploadedAt: newestBundle.uploadedAt,
    sourceFiles: uniqueStrings(sortedBundles.flatMap((bundle) => bundle.sourceFiles)),
    coverage: {
      orders: sortedBundles.some((bundle) => bundle.coverage.orders),
      deliveries: sortedBundles.some((bundle) => bundle.coverage.deliveries),
      performance: sortedBundles.some((bundle) => bundle.coverage.performance),
      products: sortedBundles.some((bundle) => bundle.coverage.products),
    },
    performance: sortPerformance(sortedBundles.flatMap((bundle) => bundle.performance)),
    orders: sortOrders(sortedBundles.flatMap((bundle) => bundle.orders)),
    deliveries: sortDeliveries(sortedBundles.flatMap((bundle) => bundle.deliveries)),
    productSales: mergeProductSales(sortedBundles.flatMap((bundle) => bundle.productSales)),
    productCurve: mergeProductCurve(sortedBundles.flatMap((bundle) => bundle.productCurve)),
    validation: null,
  } satisfies ParsedBundle;
}
