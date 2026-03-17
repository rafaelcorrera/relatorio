import type { CSSProperties } from "react";

export type StoreSlug =
  | "alpha-point-1"
  | "alpha-point-2"
  | "nasai-sushi"
  | "blach-sushi"
  | "almar";

export interface StoreDefinition {
  slug: StoreSlug;
  name: string;
  shortName: string;
  description: string;
  restaurantCodes: string[];
  accent: string;
  plum: string;
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  glow: string;
  iconStart: string;
  iconMid: string;
  iconEnd: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

export interface ThemePalette {
  accent: string;
  plum: string;
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  glow: string;
  iconStart: string;
  iconMid: string;
  iconEnd: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

function hexToRgb(value: string) {
  const cleaned = value.replace("#", "").trim();
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((item) => `${item}${item}`)
          .join("")
      : cleaned;

  const numeric = Number.parseInt(normalized, 16);
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;

  return `${red} ${green} ${blue}`;
}

export const STORES: StoreDefinition[] = [
  {
    slug: "alpha-point-1",
    name: "Alpha Point 1",
    shortName: "Point 1",
    description: "Cockpit executivo da unidade com foco em faturamento, entrega e produtos.",
    restaurantCodes: ["HB"],
    accent: "#cf8795",
    plum: "#8d6570",
    heroStart: "#6c525b",
    heroMid: "#c69aa6",
    heroEnd: "#7b6169",
    glow: "#e0aab5",
    iconStart: "#f7ebe5",
    iconMid: "#d8a1ac",
    iconEnd: "#9b6c78",
    chart2: "#d6a38f",
    chart3: "#dfc18d",
    chart4: "#9f92c6",
    chart5: "#94afb9",
  },
  {
    slug: "alpha-point-2",
    name: "Alpha Point 2",
    shortName: "Point 2",
    description: "Painel da unidade com leitura consolidada para operacao e performance.",
    restaurantCodes: ["AP2", "ALPHA2", "MR"],
    accent: "#d7b36f",
    plum: "#9f8156",
    heroStart: "#70604b",
    heroMid: "#d1ba88",
    heroEnd: "#7e6d58",
    glow: "#edd7a5",
    iconStart: "#faf2d9",
    iconMid: "#e1c786",
    iconEnd: "#b18f59",
    chart2: "#c99b7c",
    chart3: "#9fbb7d",
    chart4: "#b89a7a",
    chart5: "#91a6bb",
  },
  {
    slug: "nasai-sushi",
    name: "Nasai Sushi",
    shortName: "Nasai",
    description: "Visao da unidade com indicadores de vendas, canais e comportamento do menu.",
    restaurantCodes: ["NASAI", "NS", "NAS"],
    accent: "#7fb79a",
    plum: "#5f8571",
    heroStart: "#53695c",
    heroMid: "#99c6ae",
    heroEnd: "#607669",
    glow: "#b9dec9",
    iconStart: "#ecf7ef",
    iconMid: "#9fceb2",
    iconEnd: "#6a927b",
    chart2: "#86aecd",
    chart3: "#e0c38d",
    chart4: "#bb8f9d",
    chart5: "#93a6aa",
  },
  {
    slug: "blach-sushi",
    name: "Blach Sushi",
    shortName: "Blach",
    description: "Cockpit da unidade com leitura premium de receita, horario e operacao.",
    restaurantCodes: ["BLACH", "BLACK", "BS"],
    accent: "#8c8a94",
    plum: "#66636f",
    heroStart: "#52505a",
    heroMid: "#8e8b96",
    heroEnd: "#5d5b65",
    glow: "#bcbac3",
    iconStart: "#f5f4f7",
    iconMid: "#b3b0ba",
    iconEnd: "#74707c",
    chart2: "#a9a6b1",
    chart3: "#d4be90",
    chart4: "#91a6bf",
    chart5: "#b18f8f",
  },
  {
    slug: "almar",
    name: "Almar",
    shortName: "Almar",
    description: "Dashboard da unidade com foco em tickets, canais e desempenho de produtos.",
    restaurantCodes: ["ALMAR", "ALM", "AM"],
    accent: "#84abd8",
    plum: "#6884a8",
    heroStart: "#576981",
    heroMid: "#9eb9db",
    heroEnd: "#60738d",
    glow: "#bfd4ed",
    iconStart: "#eff5fd",
    iconMid: "#a2c0e6",
    iconEnd: "#7794bc",
    chart2: "#8dc2b6",
    chart3: "#e1c08c",
    chart4: "#a591d0",
    chart5: "#97a9b6",
  },
];

export const GROUP_THEME: ThemePalette = {
  accent: "#b996ac",
  plum: "#88718d",
  heroStart: "#6f6277",
  heroMid: "#c7b6d2",
  heroEnd: "#7b6f84",
  glow: "#ddd1e4",
  iconStart: "#f7f1ec",
  iconMid: "#d4c0de",
  iconEnd: "#a489b1",
  chart2: "#a8c6c0",
  chart3: "#e2c7a0",
  chart4: "#a6b3d6",
  chart5: "#c6a4af",
};

export function getDefaultStore() {
  return STORES[0];
}

export function getStoreBySlug(slug?: string | null) {
  if (!slug) {
    return null;
  }

  return STORES.find((store) => store.slug === slug) || null;
}

export function getStoreByRestaurantCode(restaurantCode?: string | null) {
  const normalizedCode = (restaurantCode || "").trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  return STORES.find((store) => store.restaurantCodes.includes(normalizedCode)) || null;
}

export function resolveStore(
  storeSlug?: string | null,
  restaurantCode?: string | null,
) {
  return (
    getStoreBySlug(storeSlug) ||
    getStoreByRestaurantCode(restaurantCode) ||
    getDefaultStore()
  );
}

export function getStoreThemeStyle(store: StoreDefinition): ThemeStyle {
  return getThemeStyle(store);
}

export function getGroupThemeStyle(): ThemeStyle {
  return getThemeStyle(GROUP_THEME);
}

function getThemeStyle(theme: ThemePalette): ThemeStyle {
  return {
    "--accent": theme.accent,
    "--accent-rgb": hexToRgb(theme.accent),
    "--plum": theme.plum,
    "--plum-rgb": hexToRgb(theme.plum),
    "--hero-start": theme.heroStart,
    "--hero-mid": theme.heroMid,
    "--hero-end": theme.heroEnd,
    "--hero-glow-rgb": hexToRgb(theme.glow),
    "--hero-shadow-rgb": hexToRgb(theme.plum),
    "--brand-icon-start": theme.iconStart,
    "--brand-icon-mid": theme.iconMid,
    "--brand-icon-end": theme.iconEnd,
    "--chart-1": theme.accent,
    "--chart-2": theme.chart2,
    "--chart-3": theme.chart3,
    "--chart-4": theme.chart4,
    "--chart-5": theme.chart5,
  };
}
