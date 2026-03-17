"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function GoogleLoginButton({
  storeSlug,
}: {
  storeSlug?: string;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleGoogleLogin() {
    startTransition(async () => {
      setError("");

      try {
        const supabase = createSupabaseBrowserClient();
        const redirectUrl = new URL("/auth/callback", window.location.origin);
        if (storeSlug) {
          redirectUrl.searchParams.set("store", storeSlug);
        }
        const { data, error: authError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl.toString(),
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
        <p className="premium-alert rounded-[24px] px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
