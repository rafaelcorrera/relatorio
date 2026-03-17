"use client";

import { useState } from "react";
import { LoaderCircle, SendHorizonal, Sparkles } from "lucide-react";

import type { AssistantSection } from "@/lib/report-assistant";

export function ExecutiveAiQuestionBox({
  bundleKey,
  currentSection,
  enabled,
  periodLabel,
  restaurantCode,
}: {
  bundleKey: string;
  currentSection?: AssistantSection;
  enabled: boolean;
  periodLabel: string;
  restaurantCode: string;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submitQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();

    if (!trimmedQuestion || isPending || !enabled) {
      return;
    }

    setIsPending(true);
    setError("");
    setAnswer("");
    setToolsUsed([]);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bundleKey,
          currentSection,
          question: trimmedQuestion,
          history: [],
        }),
      });

      const payload = (await response.json()) as {
        answer?: string;
        error?: string;
        toolsUsed?: string[];
      };

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || "Nao foi possivel consultar a IA.");
      }

      setAnswer(payload.answer);
      setToolsUsed(payload.toolsUsed || []);
      setQuestion("");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Nao foi possivel consultar a IA agora.",
      );
    } finally {
      setIsPending(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(question);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion(question);
    }
  }

  return (
    <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd9c0]">
            <Sparkles className="h-3.5 w-3.5" />
            Pergunte a IA
          </span>
          <p className="mt-3 text-sm leading-7 text-white/76">
            Faça uma pergunta sobre {restaurantCode} em {periodLabel}. A resposta usa os relatórios já carregados e o histórico disponível da loja.
          </p>
        </div>
      </div>

      {enabled ? (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm font-medium text-white/88">
            Sua pergunta
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Ex.: Quais itens de baixa saída você recomenda revisar neste mês?"
              className="min-h-24 rounded-[22px] border border-white/12 bg-[rgba(255,255,255,0.08)] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-[rgb(var(--accent-rgb)/0.44)] focus:bg-[rgba(255,255,255,0.1)]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !question.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-[linear-gradient(135deg,var(--brand-icon-start),var(--brand-icon-mid))] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgb(var(--hero-shadow-rgb)/0.22)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
              Perguntar agora
            </button>
            <p className="text-xs leading-6 text-white/56">
              `Enter` envia e `Shift + Enter` quebra a linha.
            </p>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-[24px] border border-[#c68497]/30 bg-[rgba(255,255,255,0.08)] px-4 py-4 text-sm leading-7 text-white/78">
          Defina `GROQ_API_KEY` ou `OPENAI_API_KEY` para habilitar perguntas neste bloco.
        </div>
      )}

      {answer ? (
        <article className="mt-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.05))] px-4 py-4 text-white shadow-[0_12px_26px_rgba(24,7,14,0.16)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd4b3]">
            Resposta da IA
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/88">
            {answer}
          </p>
          {toolsUsed.length ? (
            <p className="mt-3 text-xs text-white/48">
              Consultou: {toolsUsed.join(", ")}.
            </p>
          ) : null}
        </article>
      ) : null}

      {error ? (
        <div
          className="mt-4 rounded-[24px] px-4 py-3 text-sm text-[#ffe1d5]"
          style={{
            border: "1px solid rgb(var(--accent-rgb) / 0.34)",
            backgroundColor: "rgb(var(--accent-rgb) / 0.18)",
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
