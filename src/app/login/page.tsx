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
    <main className="relative min-h-screen overflow-hidden px-4 py-6 md:px-6 md:py-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_top_left,rgba(255,227,188,0.28),transparent_24%),radial-gradient(circle_at_top_right,rgba(159,35,68,0.18),transparent_22%)] blur-2xl" />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1600px] gap-6 lg:grid-cols-[1.16fr_0.84fr]">
        <section className="relative overflow-hidden rounded-[42px] border border-[rgba(252,234,215,0.12)] bg-[linear-gradient(138deg,#1f0d14_0%,#5d1a2c_48%,#211015_100%)] p-8 text-white shadow-[0_40px_120px_rgba(39,11,18,0.28)] lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,236,199,0.26),transparent_22%),radial-gradient(circle_at_10%_80%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_76%_72%,rgba(203,154,72,0.18),transparent_18%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="max-w-xl">
              <div className="premium-pill w-fit border-white/12 bg-white/8 text-[#f6dac8]">
                Relatorios GAFS
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.32em] text-white/42">
                Cockpit de performance
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-[4.35rem] md:leading-[0.98]">
                Inteligencia visual para a operacao do restaurante.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/74 md:text-lg">
                O painel transforma os relatórios mensais em leitura executiva:
                mix de produtos, canais, ticket medio, horario de pico,
                entregas e perguntas guiadas por IA em uma experiencia unica.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[30px] border border-white/10 bg-white/7 p-6 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/46">
                  O que voce enxerga aqui
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-white/10 bg-black/10 p-5">
                    <UtensilsCrossed className="h-5 w-5 text-[#ffd7a1]" />
                    <p className="mt-4 text-lg font-semibold">Itens e categorias</p>
                    <p className="mt-2 text-sm leading-6 text-white/66">
                      Ranking premium de produtos, curva ABC, canais e menu mix.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/10 p-5">
                    <ChartColumnIncreasing className="h-5 w-5 text-[#ffd7a1]" />
                    <p className="mt-4 text-lg font-semibold">Receita e canais</p>
                    <p className="mt-2 text-sm leading-6 text-white/66">
                      Faturamento, descontos, taxa de servico e comparacao por fluxo.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/10 p-5">
                    <ShieldCheck className="h-5 w-5 text-[#ffd7a1]" />
                    <p className="mt-4 text-lg font-semibold">Acesso controlado</p>
                    <p className="mt-2 text-sm leading-6 text-white/66">
                      Login com Google, allowlist e base pronta para operacao segura.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-6 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/46">
                  Direcao visual
                </p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-black/10 px-5 py-4">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/42">
                      Visao
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      Da consolidacao mensal ao detalhe hora a hora, tudo no mesmo fluxo.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/10 px-5 py-4">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/42">
                      Pronto para crescer
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      A proxima camada sera comparar meses, lojas e sazonalidade.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-surface rounded-[42px] p-8 lg:p-10">
          <div className="relative mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Login
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
              Entre para acessar o cockpit da operacao
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              A autenticacao protege o dashboard e libera uma experiencia pensada
              para analise executiva, operacao diaria e leitura aprofundada dos
              dados do restaurante.
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
