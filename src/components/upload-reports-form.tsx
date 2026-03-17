"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";

import { type FormState, uploadReportsAction } from "@/app/actions";

const INITIAL_STATE: FormState = {
  error: "",
};

export function UploadReportsForm({
  storeSlug,
}: {
  storeSlug?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    uploadReportsAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="store" value={storeSlug || ""} />

      <div className="premium-field">
        <label
          htmlFor="reports"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          Importar relatórios
        </label>
        <input
          id="reports"
          name="reports"
          type="file"
          accept=".xlsx"
          multiple
          className="premium-file block text-sm text-[var(--muted)]"
        />
      </div>

      <div className="premium-note rounded-[26px] px-5 py-4 text-sm leading-7 text-[var(--muted)]">
        Envie os arquivos de um mesmo período. O sistema reconhece automaticamente
        pedidos, entregas, performance da loja e venda de produtos por canal.
      </div>

      {state.error ? (
        <p className="premium-alert rounded-[24px] px-4 py-3 text-sm">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="premium-button-forest"
      >
        <Upload className="h-4 w-4" />
        {isPending ? "Processando arquivos..." : "Atualizar painel"}
      </button>
    </form>
  );
}
