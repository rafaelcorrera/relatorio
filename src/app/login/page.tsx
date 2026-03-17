import { Building2, ChartColumnIncreasing, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getAuthConfig, getSession } from "@/lib/auth";
import { getGroupThemeStyle } from "@/lib/stores";

function mapErrorMessage(errorCode: string | undefined) {
  if (errorCode === "session_expired") {
    return "Sua sessao expirou apos 60 minutos. Faça login novamente para continuar.";
  }

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
    <main
      className="relative min-h-screen overflow-hidden px-4 py-6 md:px-6 md:py-8"
      style={getGroupThemeStyle()}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] brand-glow blur-2xl" />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1600px] gap-6 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="brand-hero-panel relative overflow-hidden rounded-[42px] p-8 text-white lg:p-12">
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="max-w-2xl">
              <div className="premium-pill w-fit border-white/12 bg-white/8 text-[#f6dac8]">
                Grupo Alpha Food Service
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.32em] text-white/46">
                Plataforma Multiloja
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-[4.2rem] md:leading-[0.98]">
                Inteligencia operacional com leitura mais suave e premium.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/78 md:text-lg">
                A entrada agora e institucional. Depois do login, o sistema apresenta
                o menu das unidades para voce escolher a loja e entrar no dashboard
                correspondente.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur">
                <Building2 className="h-5 w-5 text-[#fff0de]" />
                <p className="mt-4 text-lg font-semibold">Entrada centralizada</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Um unico acesso para todo o ecossistema de lojas do grupo.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur">
                <ChartColumnIncreasing className="h-5 w-5 text-[#fff0de]" />
                <p className="mt-4 text-lg font-semibold">Leitura executiva</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Faturamento, canais, produtos, horarios e curva ABC num fluxo unico.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur">
                <ShieldCheck className="h-5 w-5 text-[#fff0de]" />
                <p className="mt-4 text-lg font-semibold">Acesso seguro</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Login com Google, allowlist e ambiente pronto para operar com seguranca.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-surface rounded-[42px] p-8 lg:p-10">
          <div className="relative mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Acesso
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
              Entrar no hub do Grupo Alpha Food Service
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              Depois da autenticacao, voce escolhe a unidade no menu multiloja e o
              painel carrega os dados da operacao selecionada.
            </p>
          </div>

          <LoginForm
            mode={auth.mode}
            usingDefaultCredentials={auth.usingDefaultCredentials}
            allowlistDescription={auth.allowlistDescription}
            errorMessage={errorMessage}
          />

          <div className="premium-note mt-6 rounded-[30px] px-5 py-5 text-sm leading-7 text-[var(--muted)]">
            <div className="flex items-center gap-2 text-[var(--ink)]">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <span className="font-semibold">Proximo passo apos o login</span>
            </div>
            <p className="mt-2">
              O sistema abre uma tela de selecao com as unidades Alpha Point 1,
              Alpha Point 2, Nasai Sushi, Blach Sushi e Almar.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
