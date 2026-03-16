"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function GoogleLoginButton() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleGoogleLogin() {
    startTransition(async () => {
      setError("");

      try {
        const supabase = createSupabaseBrowserClient();
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { data, error: authError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            queryParams: {
              prompt: "select_account",
            },
          },
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        if (data.url) {
          window.location.assign(data.url);
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Nao foi possivel iniciar o login com Google.",
        );
      }
    });
  }

  return (
    <div className="grid gap-4">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Conectando com Google..." : "Entrar com Google"}
      </button>

      {error ? (
        <p className="rounded-2xl border border-[color:rgba(182,67,44,0.2)] bg-[color:rgba(182,67,44,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
