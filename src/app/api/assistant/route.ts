import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import {
  generateAssistantAnswer,
  type AssistantHistoryMessage,
  type AssistantSection,
} from "@/lib/report-assistant";
import { getBundleByKey } from "@/lib/report-store";

export const runtime = "nodejs";

function sanitizeHistory(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const role =
        item.role === "user" || item.role === "assistant" ? item.role : null;
      const content = typeof item.content === "string" ? item.content.trim() : "";

      if (!role || !content) {
        return null;
      }

      return {
        role,
        content: content.slice(0, 3000),
      };
    })
    .filter(Boolean) as AssistantHistoryMessage[];
}

function sanitizeSection(value: unknown) {
  return value === "faturamento" ||
    value === "entregas" ||
    value === "mesa" ||
    value === "produtos"
    ? value
    : undefined;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Sua sessao expirou. Entre novamente para usar o assistente." },
      { status: 401 },
    );
  }

  let body: {
    bundleKey?: string;
    question?: string;
    history?: unknown;
    currentSection?: AssistantSection;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel ler a pergunta enviada." },
      { status: 400 },
    );
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const bundleKey = typeof body.bundleKey === "string" ? body.bundleKey.trim() : "";
  const currentSection = sanitizeSection(body.currentSection);

  if (!question) {
    return NextResponse.json(
      { error: "Digite uma pergunta para consultar a IA." },
      { status: 400 },
    );
  }

  const bundle = await getBundleByKey(bundleKey || undefined);

  if (!bundle) {
    return NextResponse.json(
      { error: "Nenhum periodo foi encontrado para responder essa pergunta." },
      { status: 404 },
    );
  }

  try {
    const result = await generateAssistantAnswer({
      bundle,
      question,
      history: sanitizeHistory(body.history),
      currentSection,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error:
            error.status === 401
              ? "A chave da OpenAI foi rejeitada. Revise OPENAI_API_KEY."
              : "A OpenAI nao conseguiu processar a pergunta agora. Tente novamente em instantes.",
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel responder a pergunta no momento.",
      },
      { status: 500 },
    );
  }
}
