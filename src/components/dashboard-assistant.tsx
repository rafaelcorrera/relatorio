"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  LoaderCircle,
  SendHorizonal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import type { AssistantSection } from "@/lib/report-assistant";

interface LocalMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  toolsUsed?: string[];
}

const SECTION_PROMPTS: Record<AssistantSection, string[]> = {
  faturamento: [
    "Qual foi o faturamento bruto e a venda liquida do periodo?",
    "Quais dias tiveram mais faturamento bruto?",
    "Quanto representaram os descontos no periodo?",
  ],
  entregas: [
    "Qual horario teve mais entregas?",
    "Quais canais trouxeram mais pedidos de entrega?",
    "Quais bairros mais receberam pedidos?",
  ],
  mesa: [
    "Qual foi o ticket medio de mesa?",
    "Em que horario a mesa teve mais pedidos?",
    "Quais formas de pagamento apareceram mais na mesa?",
  ],
  produtos: [
    "Quais foram os 5 itens mais vendidos?",
    "Quais categorias venderam mais no periodo?",
    "Quais itens venderam menos fora da categoria Extras?",
  ],
};

function createId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildWelcomeMessage(periodLabel: string, restaurantCode: string) {
  return `Faça uma pergunta sobre ${restaurantCode} em ${periodLabel}. Eu respondo com base nos relatórios carregados e explico os filtros usados.`;
}

export function DashboardAssistant({
  bundleKey,
  periodLabel,
  restaurantCode,
  currentSection,
  enabled,
}: {
  bundleKey: string;
  periodLabel: string;
  restaurantCode: string;
  currentSection: AssistantSection;
  enabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content: buildWelcomeMessage(periodLabel, restaurantCode),
    },
  ]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const suggestions = SECTION_PROMPTS[currentSection];

  useEffect(() => {
    if (!isOpen || !conversationRef.current) {
      return;
    }

    conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [isOpen, isPending, messages]);

  async function submitQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();

    if (!trimmedQuestion || isPending || !enabled) {
      return;
    }

    setIsOpen(true);

    const userMessage: LocalMessage = {
      id: createId(),
      role: "user",
      content: trimmedQuestion,
    };
    const historyPayload = [...messages, userMessage]
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError("");
    setIsPending(true);

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
          history: historyPayload,
        }),
      });

      const payload = (await response.json()) as {
        answer?: string;
        error?: string;
        toolsUsed?: string[];
      };

      if (!response.ok || !payload.answer) {
        throw new Error(
          payload.error || "Nao foi possivel consultar o assistente de IA.",
        );
      }

      const answer = payload.answer;

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: answer,
          toolsUsed: payload.toolsUsed || [],
        },
      ]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Nao foi possivel consultar o assistente agora.",
      );
    } finally {
      setIsPending(false);
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <div className="fixed bottom-5 right-4 z-[1100] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 md:bottom-6 md:right-6">
      {isOpen ? (
        <section
          id="dashboard-assistant-panel"
          className="relative w-[min(430px,calc(100vw-1.5rem))] overflow-hidden rounded-[30px] border border-[#7a3652] bg-[linear-gradient(135deg,rgba(91,18,40,0.98),rgba(57,10,26,0.98))] text-white shadow-[0_24px_80px_rgba(68,8,28,0.36)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,220,190,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_22%)]" />

          <div className="relative p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd9c0]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Assistente IA
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
                  Faça uma pergunta
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  {restaurantCode} • {periodLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/72 transition hover:bg-white/12 hover:text-white"
                aria-label="Fechar assistente"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              ref={conversationRef}
              className="mt-4 grid max-h-[320px] gap-3 overflow-y-auto pr-1"
            >
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-[24px] border px-4 py-4 ${
                    message.role === "assistant"
                      ? "border-white/10 bg-[rgba(255,255,255,0.08)]"
                      : "border-[#efbb8f]/28 bg-[rgba(243,193,149,0.12)]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {message.role === "assistant" ? (
                      <>
                        <Bot className="h-4 w-4 text-[#ffd4b3]" />
                        <span className="text-[#ffd4b3]">Assistente</span>
                      </>
                    ) : (
                      <>
                        <UserRound className="h-4 w-4 text-[#f6d3ba]" />
                        <span className="text-[#f6d3ba]">Voce</span>
                      </>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/88">
                    {message.content}
                  </p>
                  {message.role === "assistant" && message.toolsUsed?.length ? (
                    <p className="mt-3 text-xs text-white/48">
                      Consultou: {message.toolsUsed.join(", ")}.
                    </p>
                  ) : null}
                </article>
              ))}

              {isPending ? (
                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-4 text-sm text-white/68">
                  A IA esta analisando os relatórios deste periodo...
                </div>
              ) : null}
            </div>

            {enabled ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void submitQuestion(suggestion)}
                      disabled={isPending}
                      className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-left text-xs text-white/82 transition hover:border-[#f5bb8d] hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleFormSubmit} className="mt-4 grid gap-3">
                  <label className="grid gap-2 text-sm font-medium text-white/88">
                    Sua pergunta
                    <textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={4}
                      placeholder="Ex.: Em qual horario o delivery mais vendeu e qual foi o ticket medio?"
                      className="min-h-28 rounded-[24px] border border-white/12 bg-[rgba(255,255,255,0.08)] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-[#f5bb8d] focus:bg-[rgba(255,255,255,0.1)]"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={isPending || !question.trim()}
                      className="inline-flex items-center gap-2 rounded-full bg-[#f3c195] px-5 py-3 text-sm font-semibold text-[#4f1528] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
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
              </>
            ) : (
              <div className="mt-4 rounded-[24px] border border-[#c68497]/30 bg-[rgba(255,255,255,0.08)] px-4 py-4 text-sm leading-7 text-white/78">
                Defina `OPENAI_API_KEY` no arquivo `.env.local` para habilitar este
                assistente. Se quiser, tambem pode ajustar `OPENAI_MODEL`.
              </div>
            )}

            {error ? (
              <div className="mt-4 rounded-[24px] border border-[#d58e80]/40 bg-[rgba(120,25,36,0.34)] px-4 py-3 text-sm text-[#ffe1d5]">
                {error}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-controls="dashboard-assistant-panel"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fechar assistente IA" : "Abrir assistente IA"}
        className="group relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#7a3652] bg-[linear-gradient(135deg,rgba(91,18,40,0.98),rgba(57,10,26,0.98))] text-white shadow-[0_22px_60px_rgba(68,8,28,0.38)] transition hover:-translate-y-1 hover:brightness-110"
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top_left,rgba(255,220,190,0.18),transparent_30%)]" />
        <Bot className="relative h-7 w-7" />
        <span className="absolute -left-1 -top-1 inline-flex min-w-7 items-center justify-center rounded-full border border-[#f3c195]/30 bg-[#f3c195] px-1.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5a1831]">
          IA
        </span>
        <span className="pointer-events-none absolute right-[calc(100%+12px)] hidden rounded-full border border-[#7a3652] bg-[rgba(57,10,26,0.96)] px-3 py-2 text-xs font-medium text-white/88 shadow-[0_12px_30px_rgba(68,8,28,0.24)] md:block">
          Assistente IA
        </span>
      </button>
    </div>
  );
}
