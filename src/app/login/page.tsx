import { ChartColumnIncreasing, ShieldCheck, UtensilsCrossed } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getAuthConfig, getSession } from "@/lib/auth";

function mapErrorMessage(errorCode: string | undefined) {
  if (errorCode === "unauthorized_email") {
    return "Este email nao esta liberado para acessar o painel.";
  }

  if (errorCode === "oauth_callback_failed") {
    return "Nao foi possivel concluir o login com Google. Tente novamente.";
  }

  return "";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const auth = getAuthConfig();
  const params = await searchParams;
  const errorMessage = mapErrorMessage(params.error);

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[36px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(182,67,44,0.95),rgba(46,90,76,0.9))] p-8 text-white shadow-[0_24px_80px_rgba(64,36,16,0.22)] lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,240,207,0.38),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.14),transparent_28%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/70">
                Relatorios GAFS
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Analise de vendas de restaurante com leitura direta de Excel.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/82 md:text-lg">
                O painel ja nasce preparado para responder as perguntas mais
                importantes da operacao: o que vende mais, quando vende mais,
                qual canal puxa o faturamento e onde o delivery se concentra.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border border-white/18 bg-white/10 p-5 backdrop-blur">
                <UtensilsCrossed className="h-5 w-5 text-white/85" />
                <p className="mt-4 text-lg font-semibold">Itens e categorias</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  Ranking de produtos, menu mix e itens com baixa saida.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/18 bg-white/10 p-5 backdrop-blur">
                <ChartColumnIncreasing className="h-5 w-5 text-white/85" />
                <p className="mt-4 text-lg font-semibold">Receita e canais</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  Faturamento diario, ticket medio, delivery, mesa e retirada.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/18 bg-white/10 p-5 backdrop-blur">
                <ShieldCheck className="h-5 w-5 text-white/85" />
                <p className="mt-4 text-lg font-semibold">Acesso controlado</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  Google Login com allowlist e base pronta para deploy.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-[var(--line)] bg-white/84 p-8 shadow-[0_24px_80px_rgba(64,36,16,0.12)] backdrop-blur lg:p-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
              Login
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--ink)]">
              Entre para acompanhar a operacao do restaurante
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              O projeto ja carregou a estrutura para leitura dos arquivos mensais
              e vai evoluir conosco conforme voce decidir novos dashboards.
            </p>
          </div>

          <LoginForm
            mode={auth.mode}
            usingDefaultCredentials={auth.usingDefaultCredentials}
            allowlistDescription={auth.allowlistDescription}
            errorMessage={errorMessage}
          />
        </section>
      </div>
    </main>
  );
}
