"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";

import { type FormState, uploadReportsAction } from "@/app/actions";

const INITIAL_STATE: FormState = {
  error: "",
};

export function UploadReportsForm() {
  const [state, formAction, isPending] = useActionState(
    uploadReportsAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="premium-field">
        <label
          htmlFor="reports"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          Importar relatorios
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
        Envie os arquivos de um mesmo periodo. O sistema reconhece automaticamente
        pedidos, entregas, performance da loja e venda de produtos por canal.
      </div>

      {state.error ? (
        <p className="rounded-[24px] border border-[color:rgba(159,35,68,0.18)] bg-[color:rgba(159,35,68,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="premium-button-forest"
      >
        <Upload className="h-4 w-4" />
        {isPending ? "Processando arquivos..." : "Atualizar dashboard"}
      </button>
    </form>
  );
}
