import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import {
  getFileContextDetails,
  parseReportBundleWithDiagnostics,
} from "@/lib/report-parser-core";
import { validateParsedBundle } from "@/lib/report-validation";
import type {
  BundleInputFile,
  BundleValidationReport,
  ParsedBundle,
  ReportStore,
} from "@/lib/types";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const STORE_FILE = path.join(STORAGE_DIR, "report-store.json");
const VALIDATION_DIR = path.join(STORAGE_DIR, "validation-reports");
const LOCAL_STORE_VERSION = 3;

loadEnvConfig(process.cwd());

function getArgument(flag: string) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return "";
  }

  return process.argv[index + 1] || "";
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function loadExcelFilesFromDirectory(directory: string) {
  const absoluteDirectory = path.resolve(process.cwd(), directory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const excelEntries = entries.filter(
    (entry) =>
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".xlsx") &&
      !entry.name.startsWith("~$"),
  );

  const files: BundleInputFile[] = await Promise.all(
    excelEntries.map(async (entry) => {
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const relativePath = path.relative(process.cwd(), absolutePath);

      return {
        name: relativePath,
        buffer: await readFile(absolutePath),
      };
    }),
  );

  return files.sort((left, right) => left.name.localeCompare(right.name));
}

function groupFilesByPeriod(
  files: BundleInputFile[],
  overrides: {
    month?: number;
    year?: number;
    restaurantCode?: string;
  },
) {
  const groups = new Map<string, BundleInputFile[]>();

  for (const file of files) {
    const details = getFileContextDetails([file.name]);
    const month = details.months[0] || overrides.month;
    const year = details.years[0] || overrides.year;
    const restaurantCode =
      details.restaurantCodes[0] || overrides.restaurantCode || "LOJA";

    if (!month) {
      throw new Error(
        `Nao foi possivel identificar o mes do arquivo ${file.name}. Informe --month para importar com seguranca.`,
      );
    }

    if (!year) {
      throw new Error(
        `Nao foi possivel identificar o ano do arquivo ${file.name}. Informe --year para importar com seguranca.`,
      );
    }

    const periodKey = `${restaurantCode}-${year}-${String(month).padStart(2, "0")}`;
    const current = groups.get(periodKey) || [];
    current.push(file);
    groups.set(periodKey, current);
  }

  return new Map(
    [...groups.entries()].map(([periodKey, groupFiles]) => [
      periodKey,
      groupFiles.sort((left, right) => left.name.localeCompare(right.name)),
    ]),
  );
}

async function ensureValidationDirectory() {
  await mkdir(VALIDATION_DIR, { recursive: true });
}

async function writeValidationReport(
  periodKey: string,
  report: BundleValidationReport,
) {
  await ensureValidationDirectory();
  const reportPath = path.join(VALIDATION_DIR, `${periodKey}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  return reportPath;
}

function sortBundles(bundles: ParsedBundle[]) {
  return [...bundles].sort((left, right) => {
    if (left.year !== right.year) {
      return right.year - left.year;
    }

    if (left.month !== right.month) {
      return right.month - left.month;
    }

    return right.uploadedAt.localeCompare(left.uploadedAt);
  });
}

async function upsertLocalBundle(bundle: ParsedBundle) {
  await mkdir(STORAGE_DIR, { recursive: true });

  let store: ReportStore = {
    version: LOCAL_STORE_VERSION,
    bundles: [],
    updatedAt: "",
  };

  try {
    store = JSON.parse(await readFile(STORE_FILE, "utf8")) as ReportStore;
  } catch {
    store = {
      version: LOCAL_STORE_VERSION,
      bundles: [],
      updatedAt: "",
    };
  }

  const nextStore: ReportStore = {
    version: LOCAL_STORE_VERSION,
    bundles: sortBundles([
      ...(store.bundles || []).filter((item) => item.periodKey !== bundle.periodKey),
      bundle,
    ]),
    updatedAt: new Date().toISOString(),
  };

  await writeFile(STORE_FILE, JSON.stringify(nextStore, null, 2), "utf8");
}

async function upsertSupabaseBundle(bundle: ParsedBundle) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para publicar o bundle no Supabase.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabase.from("report_bundles").upsert(
    {
      period_key: bundle.periodKey,
      month: bundle.month,
      year: bundle.year,
      restaurant_code: bundle.restaurantCode,
      period_label: bundle.periodLabel,
      uploaded_at: bundle.uploadedAt,
      source_files: bundle.sourceFiles,
      bundle,
    },
    { onConflict: "period_key" },
  );

  if (error) {
    throw new Error(`Falha ao publicar bundle no Supabase: ${error.message}`);
  }
}

async function publishBundle(bundle: ParsedBundle) {
  const canPublishToSupabase = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );

  if (canPublishToSupabase) {
    await upsertSupabaseBundle(bundle);
    return "supabase";
  }

  await upsertLocalBundle(bundle);
  return "local";
}

function printReport(report: BundleValidationReport) {
  const bySeverity = {
    error: report.issues.filter((issue) => issue.severity === "error").length,
    warning: report.issues.filter((issue) => issue.severity === "warning").length,
    info: report.issues.filter((issue) => issue.severity === "info").length,
  };

  console.log("");
  console.log(`Status: ${report.status}`);
  console.log(
    `Issues -> erros: ${bySeverity.error}, alertas: ${bySeverity.warning}, infos: ${bySeverity.info}`,
  );
  console.log(
    `Totais -> pedidos: ${report.totals.orderCount}, entregas: ${report.totals.deliveryCount}, venda bruta: ${report.totals.performanceGrossSales.toFixed(2)}`,
  );
  console.log("");

  for (const issue of report.issues) {
    console.log(`[${issue.severity.toUpperCase()}] ${issue.message}`);
  }
}

async function main() {
  const directory = getArgument("--dir") || "imputs";
  const expectedYearRaw = getArgument("--year");
  const expectedMonthRaw = getArgument("--month");
  const expectedRestaurantCode = getArgument("--restaurant");
  const dryRun = hasFlag("--dry-run");
  const expectedYear = expectedYearRaw ? Number.parseInt(expectedYearRaw, 10) : NaN;
  const expectedMonth = expectedMonthRaw ? Number.parseInt(expectedMonthRaw, 10) : NaN;

  if (expectedYearRaw && Number.isNaN(expectedYear)) {
    throw new Error("O valor informado em --year precisa ser numerico.");
  }

  if (expectedMonthRaw && Number.isNaN(expectedMonth)) {
    throw new Error("O valor informado em --month precisa ser numerico.");
  }

  const files = await loadExcelFilesFromDirectory(directory);

  if (!files.length) {
    throw new Error(`Nenhum arquivo .xlsx foi encontrado em ${directory}.`);
  }

  let groupedFiles = groupFilesByPeriod(files, {
    month: Number.isNaN(expectedMonth) ? undefined : expectedMonth,
    year: Number.isNaN(expectedYear) ? undefined : expectedYear,
    restaurantCode: expectedRestaurantCode || undefined,
  });

  if (!Number.isNaN(expectedMonth)) {
    groupedFiles = new Map(
      [...groupedFiles.entries()].filter(([periodKey]) =>
        periodKey.endsWith(`-${String(expectedMonth).padStart(2, "0")}`),
      ),
    );
  }

  if (groupedFiles.size === 0) {
    throw new Error("Nenhum periodo compativel foi encontrado para os filtros informados.");
  }

  if (groupedFiles.size > 1) {
    throw new Error(
      `A pasta contem mais de um periodo. Informe --month para selecionar um lote. Periodos encontrados: ${
        [...groupedFiles.keys()].join(", ")
      }`,
    );
  }

  const [periodKey, periodFiles] = [...groupedFiles.entries()][0];
  const parseResult = parseReportBundleWithDiagnostics(periodFiles, {
    year: Number.isNaN(expectedYear) ? undefined : expectedYear,
    month: Number.isNaN(expectedMonth) ? undefined : expectedMonth,
    restaurantCode: expectedRestaurantCode || undefined,
  });

  const report = validateParsedBundle(parseResult.bundle, parseResult.diagnostics, {
    sourceDirectory: directory,
    expectedYear: Number.isNaN(expectedYear) ? undefined : expectedYear,
    expectedRestaurantCode: expectedRestaurantCode || undefined,
  });

  parseResult.bundle.validation = report;

  const reportPath = await writeValidationReport(periodKey, report);

  console.log(`Laudo salvo em: ${reportPath}`);
  printReport(report);

  if (report.status === "rejected") {
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log("");
    console.log("Dry-run concluido. Nenhum bundle foi publicado.");
    return;
  }

  const target = await publishBundle(parseResult.bundle);
  console.log("");
  console.log(
    `Bundle ${parseResult.bundle.periodKey} publicado com sucesso em ${target}.`,
  );
}

void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Falha inesperada ao importar o lote.",
  );
  process.exitCode = 1;
});
