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
        className="premium-button-secondary"
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Conectando com Google..." : "Entrar com Google"}
      </button>

      {error ? (
        <p className="rounded-[24px] border border-[color:rgba(159,35,68,0.18)] bg-[color:rgba(159,35,68,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
