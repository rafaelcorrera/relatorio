export type ReportKind = "orders" | "deliveries" | "performance" | "products";
export type ExtendedReportKind = ReportKind | "productCurve";
export type ValidationSeverity = "info" | "warning" | "error";

export type ReportCoverage = Record<ReportKind, boolean>;

export interface BundleMeta {
  month: number;
  year: number;
  restaurantCode: string;
  periodLabel: string;
  periodKey: string;
  uploadedAt: string;
  sourceFiles: string[];
  coverage: ReportCoverage;
}

export interface PerformanceDay {
  dateKey: string;
  dateLabel: string;
  grossSales: number;
  discounts: number;
  courtesies: number;
  netSales: number;
  serviceFee: number;
  deliveryFee: number;
  finalNetSales: number;
  orders: number;
  customers: number;
  averageOrderTicket: number;
  averageCustomerTicket: number;
  averageFinalTicket: number;
}

export interface OrderRecord {
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  hour: number | null;
  origin: string;
  primaryChannel: "Mesa" | "Delivery" | "Retirada" | "Outros";
  catalog: string;
  orderNumber: string;
  sourceId: string;
  productsTotal: number;
  addOnsTotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  discount: number;
  courtesy: number;
  bonus: number;
  accountCredit: number;
  payment: string;
  paymentMethod: string;
  deliveryBy: string;
  courier: string;
  user: string;
  invoice: string;
  invoiceStatus: string;
  customerCount: number;
  itemCount: number;
  prepMinutes: number;
  deliveryMinutes: number;
}

export interface DeliveryRecord {
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  hour: number | null;
  courier: string;
  neighborhood: string;
  address: string;
  customer: string;
  deliveryFee: number;
  courierPayout: number;
  orderNumber: string;
  origin: string;
  orderTotal: number;
  deliveryMode: string;
}

export interface ProductSalesRecord {
  category: string;
  product: string;
  totalQuantity: number;
  channels: Record<string, number>;
}

export interface ProductCurveRecord {
  category: string;
  sku: string;
  product: string;
  totalQuantity: number;
  averagePrice: number;
  totalRevenue: number;
  mix: number;
  accumulated: number;
  abcClass: string;
}

export interface ParseSectionDiagnostics {
  inputRows: number;
  parsedRows: number;
  skippedRows: number;
  duplicatesRemoved: number;
}

export interface ParseSheetDiagnostics {
  fileName: string;
  sheetName: string;
  kind: ExtendedReportKind | "unknown";
  rowCount: number;
  headerCount: number;
}

export interface FileContextDetails {
  months: number[];
  years: number[];
  restaurantCodes: string[];
}

export interface BundleContextOverrides {
  month?: number;
  year?: number;
  restaurantCode?: string;
}

export interface ParseDiagnostics {
  fileContext: FileContextDetails;
  sheets: ParseSheetDiagnostics[];
  sections: Record<ExtendedReportKind, ParseSectionDiagnostics>;
}

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  context?: Record<string, string | number | boolean | null>;
}

export interface BundleValidationTotals {
  performanceGrossSales: number;
  performanceFinalNetSales: number;
  performanceOrders: number;
  performanceDeliveryFee: number;
  orderCount: number;
  orderTotal: number;
  orderProductsTotal: number;
  orderAddOnsTotal: number;
  orderDiscountTotal: number;
  orderDeliveryFeeTotal: number;
  deliveryCount: number;
  deliveryCountFromOrders: number;
  deliveryOrderTotal: number;
  deliveryFeeTotal: number;
  productQuantityTotal: number;
  productCurveProductCount: number;
  productCurveSplitProductCount: number;
  productCurveMultiClassProductCount: number;
  productCurveQuantityTotal: number;
  productCurveRevenueTotal: number;
}

export interface BundleValidationReport {
  status: "approved" | "approved_with_warnings" | "rejected";
  validatedAt: string;
  source: {
    directory?: string | null;
    fileCount: number;
  };
  fileContext: FileContextDetails;
  totals: BundleValidationTotals;
  diagnostics: ParseDiagnostics;
  issues: ValidationIssue[];
}

export interface ParseReportBundleResult {
  bundle: ParsedBundle;
  diagnostics: ParseDiagnostics;
}

export interface ParsedBundle extends BundleMeta {
  performance: PerformanceDay[];
  orders: OrderRecord[];
  deliveries: DeliveryRecord[];
  productSales: ProductSalesRecord[];
  productCurve: ProductCurveRecord[];
  validation?: BundleValidationReport | null;
}

export interface ReportStore {
  version?: number;
  bundles: ParsedBundle[];
  updatedAt: string;
}

export interface BundleInputFile {
  name: string;
  buffer: Buffer;
}

export interface MetricCard {
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
  helper: string;
  accent: "terracotta" | "forest" | "gold";
}

export interface InsightCard {
  label: string;
  value: string;
  helper: string;
}

export interface SeriesPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface RankedItem {
  label: string;
  value: number;
  secondaryLabel?: string;
  secondaryValue?: string;
}

export interface CoverageStatus {
  key: ReportKind;
  label: string;
  present: boolean;
  entries: number;
}

export interface DashboardSnapshot {
  meta: BundleMeta;
  metrics: MetricCard[];
  insights: InsightCard[];
  dailyRevenue: Array<{
    label: string;
    revenue: number;
    grossRevenue: number;
    orders: number;
  }>;
  hourlyDemand: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
  channelMix: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
  originMix: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
  neighborhoods: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
  paymentMix: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
  topProducts: RankedItem[];
  lowProducts: RankedItem[];
  categories: RankedItem[];
  reportStatus: CoverageStatus[];
  serviceFeeTotal: number;
  deliveryFeeTotal: number;
  deliveryModeMix: Array<{
    label: string;
    orders: number;
  }>;
  averagePrepMinutes: number;
  averageDeliveryMinutes: number;
}
