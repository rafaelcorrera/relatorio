import "server-only";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseReportBundle } from "@/lib/report-parser";
import type { BundleInputFile, ParsedBundle, ReportStore } from "@/lib/types";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const STORE_FILE = path.join(STORAGE_DIR, "report-store.json");
const CURRENT_STORE_VERSION = 3;
const MONTH_TOKENS = [
  "",
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const EMPTY_STORE: ReportStore = {
  version: CURRENT_STORE_VERSION,
  bundles: [],
  updatedAt: "",
};

async function ensureStorage() {
  await mkdir(STORAGE_DIR, { recursive: true });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

async function loadNamedExcelFiles(fileNames: string[]) {
  const uniqueNames = [...new Set(fileNames)];
  const inputs: BundleInputFile[] = [];

  for (const fileName of uniqueNames) {
    const filePath = path.join(process.cwd(), fileName);

    try {
      inputs.push({
        name: fileName,
        buffer: await readFile(filePath),
      });
    } catch {
      return [];
    }
  }

  return inputs;
}

function matchesBundleContext(bundle: ParsedBundle, fileName: string) {
  const normalized = normalizeText(fileName);
  const monthToken = MONTH_TOKENS[bundle.month] || "";
  const restaurantToken = normalizeText(bundle.restaurantCode);
  const shortYear = String(bundle.year % 100).padStart(2, "0");
  const fullYear = String(bundle.year);
  const hasRestaurant = normalized.includes(`_${restaurantToken}`) ||
    normalized.includes(`-${restaurantToken}`) ||
    normalized.includes(` ${restaurantToken}`) ||
    normalized.endsWith(`${restaurantToken}.xlsx`);
  const hasMonth = monthToken ? normalized.includes(monthToken) : true;
  const hasYear = normalized.includes(fullYear) ||
    normalized.includes(shortYear) ||
    normalized.includes("pedidos_periodo");

  return hasRestaurant && hasMonth && hasYear;
}

function mergeBundleFiles(
  bundle: ParsedBundle,
  currentFiles: BundleInputFile[],
  rootFiles: BundleInputFile[],
) {
  const byName = new Map<string, BundleInputFile>();

  for (const file of currentFiles) {
    byName.set(file.name, file);
  }

  for (const file of rootFiles) {
    if (!byName.has(file.name) && matchesBundleContext(bundle, file.name)) {
      byName.set(file.name, file);
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function rebuildBundlesFromCurrentParser(bundles: ParsedBundle[]) {
  const rootFiles = await loadRootExcelFiles();
  const rebuilt: ParsedBundle[] = [];

  for (const bundle of bundles) {
    const currentFiles = await loadNamedExcelFiles(bundle.sourceFiles);
    const files = mergeBundleFiles(bundle, currentFiles, rootFiles);

    if (!files.length) {
      rebuilt.push(bundle);
      continue;
    }

    try {
      rebuilt.push(parseReportBundle(files));
    } catch {
      rebuilt.push(bundle);
    }
  }

  return rebuilt;
}

export async function readLocalStore() {
  await ensureStorage();

  try {
    const content = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(content) as ReportStore;
    const version = parsed.version || 0;

    if (version !== CURRENT_STORE_VERSION) {
      const migratedStore: ReportStore = {
        version: CURRENT_STORE_VERSION,
        bundles: sortBundles(
          await rebuildBundlesFromCurrentParser(parsed.bundles || []),
        ),
        updatedAt: new Date().toISOString(),
      };
      await writeLocalStore(migratedStore);
      return migratedStore;
    }

    return {
      version: CURRENT_STORE_VERSION,
      bundles: sortBundles(parsed.bundles || []),
      updatedAt: parsed.updatedAt || "",
    };
  } catch {
    return EMPTY_STORE;
  }
}

async function writeLocalStore(store: ReportStore) {
  await ensureStorage();
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
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

export async function ensureSeededLocalStore() {
  const store = await readLocalStore();
  if (store.bundles.length > 0) {
    return store;
  }

  const rootFiles = await loadRootExcelFiles();
  if (!rootFiles.length) {
    return store;
  }

  try {
    const bundle = parseReportBundle(rootFiles);
    const nextStore = {
      version: CURRENT_STORE_VERSION,
      bundles: [bundle],
      updatedAt: new Date().toISOString(),
    };
    await writeLocalStore(nextStore);
    return nextStore;
  } catch (error) {
    console.error("Falha ao criar carga inicial dos relatórios:", error);
    return store;
  }
}

export async function getLocalBundles() {
  const store = await ensureSeededLocalStore();
  return sortBundles(store.bundles);
}

export async function getLocalBundleByKey(periodKey?: string | null) {
  const bundles = await getLocalBundles();
  if (!bundles.length) {
    return null;
  }

  if (!periodKey) {
    return bundles[0];
  }

  return bundles.find((bundle) => bundle.periodKey === periodKey) || bundles[0];
}

export async function upsertLocalBundleFromFiles(files: File[]) {
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
  const store = await readLocalStore();
  const bundles = [
    ...store.bundles.filter((item) => item.periodKey !== bundle.periodKey),
    bundle,
  ];

  await writeLocalStore({
    version: CURRENT_STORE_VERSION,
    bundles: sortBundles(bundles),
    updatedAt: new Date().toISOString(),
  });

  return bundle;
}
