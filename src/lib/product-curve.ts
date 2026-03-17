import type { ProductCurveRecord } from "@/lib/types";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeAbcClassToken(value: string) {
  const normalized = normalizeText(value);

  if (normalized.startsWith("a")) {
    return "A";
  }

  if (normalized.startsWith("b")) {
    return "B";
  }

  if (normalized.startsWith("c")) {
    return "C";
  }

  return "";
}

function getAbcClassRank(value: string) {
  const normalized = normalizeAbcClassToken(value);

  if (normalized === "A") {
    return 0;
  }

  if (normalized === "B") {
    return 1;
  }

  if (normalized === "C") {
    return 2;
  }

  return 3;
}

function formatNumberKey(value: number) {
  return Number.isFinite(value) ? value.toFixed(6) : "0";
}

function normalizeProductAliasText(value: string) {
  return normalizeText(value)
    .replace(/^novidade\s*-\s*/, "")
    .replace(/^novidade\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildProductKey(category: string, product: string) {
  return `${normalizeText(category)}|${normalizeText(product)}`;
}

export function buildProductAliasKey(category: string, product: string) {
  return `${normalizeText(category)}|${normalizeProductAliasText(product)}`;
}

export function buildProductCurveRowKey(item: ProductCurveRecord) {
  return [
    buildProductKey(item.category, item.product),
    normalizeText(item.sku),
    formatNumberKey(item.totalQuantity),
    formatNumberKey(item.averagePrice),
    formatNumberKey(item.totalRevenue),
    formatNumberKey(item.mix),
    formatNumberKey(item.accumulated),
    normalizeAbcClassToken(item.abcClass),
  ].join("|");
}

export interface AggregatedProductCurveRecord {
  key: string;
  category: string;
  sku: string;
  product: string;
  totalQuantity: number;
  averagePrice: number;
  totalRevenue: number;
  mix: number;
  accumulated: number;
  abcClass: string;
  classes: string[];
  rowCount: number;
}

export interface ProductLookup<T extends { category: string; product: string }> {
  exact: Map<string, T>;
  alias: Map<string, T[]>;
}

export function buildProductLookup<T extends { category: string; product: string }>(
  items: T[],
): ProductLookup<T> {
  const exact = new Map<string, T>();
  const alias = new Map<string, T[]>();

  for (const item of items) {
    exact.set(buildProductKey(item.category, item.product), item);

    const aliasKey = buildProductAliasKey(item.category, item.product);
    const aliasMatches = alias.get(aliasKey) || [];
    aliasMatches.push(item);
    alias.set(aliasKey, aliasMatches);
  }

  return {
    exact,
    alias,
  };
}

export function resolveProductLookup<T extends { category: string; product: string }>(
  lookup: ProductLookup<T>,
  category: string,
  product: string,
) {
  const exactMatch = lookup.exact.get(buildProductKey(category, product));

  if (exactMatch) {
    return {
      item: exactMatch,
      strategy: "exact" as const,
    };
  }

  const aliasMatches = lookup.alias.get(buildProductAliasKey(category, product)) || [];

  if (aliasMatches.length === 1) {
    return {
      item: aliasMatches[0],
      strategy: "alias" as const,
    };
  }

  return {
    item: null,
    strategy: aliasMatches.length > 1 ? ("ambiguous_alias" as const) : ("missing" as const),
  };
}

export function aggregateProductCurve(records: ProductCurveRecord[]) {
  const groups = new Map<
    string,
    {
      category: string;
      sku: string;
      product: string;
      totalQuantity: number;
      totalRevenue: number;
      mix: number;
      accumulated: number;
      rowCount: number;
      classes: Set<string>;
      classRevenue: Map<string, number>;
    }
  >();

  for (const record of records) {
    const key = buildProductKey(record.category, record.product);
    const current = groups.get(key) || {
      category: record.category,
      sku: record.sku,
      product: record.product,
      totalQuantity: 0,
      totalRevenue: 0,
      mix: 0,
      accumulated: 0,
      rowCount: 0,
      classes: new Set<string>(),
      classRevenue: new Map<string, number>(),
    };
    const normalizedClass = normalizeAbcClassToken(record.abcClass);

    current.category = current.category || record.category;
    current.sku = current.sku || record.sku;
    current.product = current.product || record.product;
    current.totalQuantity += record.totalQuantity;
    current.totalRevenue += record.totalRevenue;
    current.mix += record.mix;
    current.accumulated = Math.max(current.accumulated, record.accumulated);
    current.rowCount += 1;

    if (normalizedClass) {
      current.classes.add(normalizedClass);
      current.classRevenue.set(
        normalizedClass,
        (current.classRevenue.get(normalizedClass) || 0) + record.totalRevenue,
      );
    }

    groups.set(key, current);
  }

  return [...groups.entries()]
    .map(([key, item]) => {
      const dominantClass = [...item.classRevenue.entries()].sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }

        return getAbcClassRank(left[0]) - getAbcClassRank(right[0]);
      })[0]?.[0] || "";

      return {
        key,
        category: item.category,
        sku: item.sku,
        product: item.product,
        totalQuantity: item.totalQuantity,
        averagePrice: item.totalQuantity > 0 ? item.totalRevenue / item.totalQuantity : 0,
        totalRevenue: item.totalRevenue,
        mix: item.mix,
        accumulated: item.accumulated,
        abcClass: dominantClass,
        classes: [...item.classes].sort((left, right) => getAbcClassRank(left) - getAbcClassRank(right)),
        rowCount: item.rowCount,
      } satisfies AggregatedProductCurveRecord;
    })
    .sort((left, right) => right.totalRevenue - left.totalRevenue);
}
