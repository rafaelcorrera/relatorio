import type { CSSProperties } from "react";
import { BrainCircuit, Sparkles } from "lucide-react";

import { ExecutiveAiQuestionBox } from "@/components/executive-ai-question-box";
import type { AssistantSection } from "@/lib/report-assistant";
import type { ExecutiveInsightResult } from "@/lib/report-assistant";

const TONE_STYLES: Record<
  ExecutiveInsightResult["cards"][number]["tone"],
  {
    cardStyle: CSSProperties;
    badgeStyle: CSSProperties;
  }
> = {
  accent: {
    cardStyle: {
      borderColor: "rgb(var(--accent-rgb) / 0.22)",
    },
    badgeStyle: {
      backgroundColor: "rgb(var(--accent-rgb) / 0.12)",
      color: "var(--accent)",
    },
  },
  forest: {
    cardStyle: {
      borderColor: "color-mix(in srgb, var(--chart-2) 28%, white)",
    },
    badgeStyle: {
      backgroundColor: "color-mix(in srgb, var(--chart-2) 14%, white)",
      color: "var(--chart-2)",
    },
  },
  gold: {
    cardStyle: {
      borderColor: "color-mix(in srgb, var(--chart-3) 28%, white)",
    },
    badgeStyle: {
      backgroundColor: "color-mix(in srgb, var(--chart-3) 14%, white)",
      color: "var(--chart-3)",
    },
  },
};

export function ExecutiveAiInsight({
  insight,
  bundleKey,
  currentSection,
  enabled,
  periodLabel,
  restaurantCode,
}: {
  insight: ExecutiveInsightResult;
  bundleKey: string;
  currentSection?: AssistantSection;
  enabled: boolean;
  periodLabel: string;
  restaurantCode: string;
}) {
  const statusLabel =
    insight.status === "ai"
      ? "Insight gerado por IA"
      : insight.status === "fallback"
        ? "Leitura automatica"
        : "IA indisponivel";

  return (
    <section className="brand-dark-surface relative overflow-hidden rounded-[38px]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(255,234,194,0.18), transparent 20%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.08), transparent 18%), radial-gradient(circle at bottom right, rgb(var(--accent-rgb) / 0.16), transparent 22%)",
        }}
      />
      <div className="relative grid gap-5 p-6 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#f7dbca]">
                <BrainCircuit className="h-4 w-4 text-[#ffd4a4]" />
                {statusLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-medium text-white/78">
                <Sparkles className="h-4 w-4 text-[#ffd4a4]" />
                {insight.providerLabel}
                {insight.model ? ` • ${insight.model}` : ""}
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white md:text-[2.55rem]">
              {insight.headline}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/76 md:text-base">
              {insight.summary}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-3 text-right backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
              Atualizado em
            </p>
            <p className="mt-2 text-sm font-medium text-white/86">
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(insight.generatedAt))}
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {insight.cards.map((card) => {
            const tone = TONE_STYLES[card.tone];

            return (
              <article
                key={`${card.title}-${card.body}`}
                className="rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(249,241,232,0.92))] p-5 shadow-[0_18px_48px_rgba(34,16,15,0.08)]"
                style={tone.cardStyle}
              >
                <span
                  className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={tone.badgeStyle}
                >
                  {card.title}
                </span>
                <p className="mt-4 text-sm leading-7 text-[var(--ink)]">
                  {card.body}
                </p>
              </article>
            );
          })}
        </div>

        <ExecutiveAiQuestionBox
          bundleKey={bundleKey}
          currentSection={currentSection}
          enabled={enabled}
          periodLabel={periodLabel}
          restaurantCode={restaurantCode}
        />
      </div>
    </section>
  );
}
