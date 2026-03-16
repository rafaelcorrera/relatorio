"use client";

import { useActionState } from "react";

import { loginAction, type FormState } from "@/app/actions";
import { GoogleLoginButton } from "@/components/google-login-button";

const INITIAL_STATE: FormState = {
  error: "",
};

export function LoginForm({
  mode,
  usingDefaultCredentials,
  allowlistDescription,
  errorMessage,
}: {
  mode: "google" | "local";
  usingDefaultCredentials: boolean;
  allowlistDescription?: string;
  errorMessage?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  if (mode === "google") {
    return (
      <div className="grid gap-5">
        {errorMessage ? (
          <p className="rounded-2xl border border-[color:rgba(182,67,44,0.2)] bg-[color:rgba(182,67,44,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
            {errorMessage}
          </p>
        ) : null}

        <GoogleLoginButton />

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-medium text-[var(--ink)]">
            A autenticacao usa Google via Supabase.
          </p>
          <p className="mt-2">
            {allowlistDescription ||
              "Somente emails previamente autorizados podem concluir a entrada no painel."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium text-[var(--ink)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue="admin@gafs.local"
          className="h-12 rounded-2xl border border-[var(--line)] bg-white/90 px-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[color:rgba(182,67,44,0.12)]"
          placeholder="admin@gafs.local"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-[var(--ink)]"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue={usingDefaultCredentials ? "gafs123" : ""}
          className="h-12 rounded-2xl border border-[var(--line)] bg-white/90 px-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[color:rgba(182,67,44,0.12)]"
          placeholder="Sua senha de acesso"
        />
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-[color:rgba(182,67,44,0.2)] bg-[color:rgba(182,67,44,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
          {state.error}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-[color:rgba(182,67,44,0.2)] bg-[color:rgba(182,67,44,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Acessar painel"}
      </button>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--muted)]">
        {usingDefaultCredentials ? (
          <p>
            Ambiente inicial configurado com credencial padrao:
            {" "}
            <span className="font-semibold text-[var(--ink)]">
              admin@gafs.local / gafs123
            </span>
            . Depois podemos trocar isso no arquivo <code>.env</code>.
          </p>
        ) : (
          <p>
            Use a credencial configurada para o ambiente. Se quiser, depois eu
            adiciono multiplos usuarios e niveis de acesso.
          </p>
        )}
      </div>
    </form>
  );
}
