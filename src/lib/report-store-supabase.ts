import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseReportBundle } from "@/lib/report-parser";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BundleInputFile, ParsedBundle, ReportStore } from "@/lib/types";

const EMPTY_STORE: ReportStore = {
  version: 1,
  bundles: [],
  updatedAt: "",
};

interface BundleRow {
  period_key: string;
  month: number;
  year: number;
  restaurant_code: string;
  period_label: string;
  uploaded_at: string;
  source_files: string[] | null;
  bundle: ParsedBundle;
  updated_at: string;
}

function sortBundles(bundles: ParsedBundle[]) {
  return [...bundles].sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }

    if (a.month !== b.month) {
      return b.month - a.month;
    }

    return b.uploadedAt.localeCompare(a.uploadedAt);
  });
}

function toBundleRow(bundle: ParsedBundle) {
  return {
    period_key: bundle.periodKey,
    month: bundle.month,
    year: bundle.year,
    restaurant_code: bundle.restaurantCode,
    period_label: bundle.periodLabel,
    uploaded_at: bundle.uploadedAt,
    source_files: bundle.sourceFiles,
    bundle,
  };
}

function readBundleRow(row: BundleRow) {
  return row.bundle as ParsedBundle;
}

async function loadRootExcelFiles(): Promise<BundleInputFile[]> {
  const entries = await readdir(process.cwd(), { withFileTypes: true });
  const excelFiles = entries.filter(
    (entry) =>
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".xlsx") &&
      !entry.name.startsWith("~$"),
  );

  return Promise.all(
    excelFiles.map(async (entry) => ({
      name: entry.name,
      buffer: await readFile(path.join(process.cwd(), entry.name)),
    })),
  );
}

export async function readSupabaseStore() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("report_bundles")
    .select(
      "period_key, month, year, restaurant_code, period_label, uploaded_at, source_files, bundle, updated_at",
    )
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao ler bundles no Supabase: ${error.message}`);
  }

  const bundles = sortBundles(((data as BundleRow[] | null) || []).map(readBundleRow));

  return {
    version: 1,
    bundles,
    updatedAt: (data as BundleRow[] | null)?.[0]?.updated_at || "",
  } satisfies ReportStore;
}

async function upsertSupabaseBundle(bundle: ParsedBundle) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("report_bundles")
    .upsert(toBundleRow(bundle), { onConflict: "period_key" });

  if (error) {
    throw new Error(`Falha ao salvar bundle no Supabase: ${error.message}`);
  }

  return bundle;
}

export async function ensureSeededSupabaseStore() {
  const store = await readSupabaseStore();

  if (store.bundles.length > 0) {
    return store;
  }

  const rootFiles = await loadRootExcelFiles();

  if (!rootFiles.length) {
    return EMPTY_STORE;
  }

  const bundle = parseReportBundle(rootFiles);
  await upsertSupabaseBundle(bundle);

  return {
    version: 1,
    bundles: [bundle],
    updatedAt: new Date().toISOString(),
  } satisfies ReportStore;
}

export async function getSupabaseBundles() {
  const store = await ensureSeededSupabaseStore();
  return store.bundles;
}

export async function getSupabaseBundleByKey(periodKey?: string | null) {
  const bundles = await getSupabaseBundles();

  if (!bundles.length) {
    return null;
  }

  if (!periodKey) {
    return bundles[0];
  }

  return bundles.find((bundle) => bundle.periodKey === periodKey) || bundles[0];
}

export async function upsertSupabaseBundleFromFiles(files: File[]) {
  const excelFiles = files.filter(
    (file) => file.size > 0 && file.name.toLowerCase().endsWith(".xlsx"),
  );

  if (!excelFiles.length) {
    throw new Error("Envie ao menos um arquivo .xlsx para importar.");
  }

  const inputs: BundleInputFile[] = await Promise.all(
    excelFiles.map(async (file) => ({
      name: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    })),
  );

  const bundle = parseReportBundle(inputs);
  return upsertSupabaseBundle(bundle);
}
