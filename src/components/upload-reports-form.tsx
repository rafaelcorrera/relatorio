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
      <div className="grid gap-2">
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
          className="block w-full rounded-2xl border border-dashed border-[var(--line)] bg-white/80 px-4 py-3 text-sm text-[var(--muted)] file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-[var(--accent)]"
        />
      </div>

      <div className="rounded-2xl bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--muted)]">
        Envie os arquivos de um mesmo periodo. O sistema reconhece automaticamente
        pedidos, entregas, performance da loja e venda de produtos por canal.
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-[color:rgba(182,67,44,0.2)] bg-[color:rgba(182,67,44,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--forest)] px-5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Upload className="h-4 w-4" />
        {isPending ? "Processando arquivos..." : "Atualizar dashboard"}
      </button>
    </form>
  );
}
