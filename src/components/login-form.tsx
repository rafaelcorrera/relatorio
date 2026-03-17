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
  storeSlug,
  storeName,
}: {
  mode: "google" | "local";
  usingDefaultCredentials: boolean;
  allowlistDescription?: string;
  errorMessage?: string;
  storeSlug?: string;
  storeName?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  if (mode === "google") {
    return (
      <div className="grid gap-5">
        {errorMessage ? (
          <p className="premium-alert rounded-[24px] px-4 py-3 text-sm">
            {errorMessage}
          </p>
        ) : null}

        <GoogleLoginButton storeSlug={storeSlug} />

        <div className="premium-note rounded-[26px] px-5 py-5 text-sm leading-7 text-[var(--muted)]">
          <p className="font-medium text-[var(--ink)]">
            A autenticacao usa Google via Supabase
            {storeName ? ` para ${storeName}` : " para o Grupo Alpha Food Service"}.
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
      {storeSlug ? <input type="hidden" name="store" value={storeSlug} /> : null}

      <div className="premium-field">
        <label htmlFor="email" className="text-sm font-medium text-[var(--ink)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue="admin@gafs.local"
          className="premium-input text-sm"
          placeholder="admin@gafs.local"
        />
      </div>

      <div className="premium-field">
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
          className="premium-input text-sm"
          placeholder="Sua senha de acesso"
        />
      </div>

      {state.error ? (
        <p className="premium-alert rounded-[24px] px-4 py-3 text-sm">
          {state.error}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="premium-alert rounded-[24px] px-4 py-3 text-sm">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="premium-button"
      >
        {isPending ? "Entrando..." : "Acessar painel"}
      </button>

      <div className="premium-note rounded-[26px] px-5 py-4 text-sm leading-7 text-[var(--muted)]">
        {usingDefaultCredentials ? (
          <p>
            Ambiente inicial configurado
            {storeName ? ` para ${storeName}` : " para acesso interno"} com credencial padrao:
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
