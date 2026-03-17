"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export function PeriodSwitcher({
  currentValue,
  options,
  pathname,
}: {
  currentValue: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  pathname: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingValue, setPendingValue] = useState("");
  const pendingLabel = useMemo(
    () => options.find((option) => option.value === pendingValue)?.label || "",
    [options, pendingValue],
  );

  return (
    <>
      <div className="premium-field">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Periodo
        </label>
        <select
          value={currentValue}
          disabled={isPending}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            setPendingValue(nextValue);
            startTransition(() => {
              router.push(`${pathname}?bundle=${nextValue}`);
            });
          }}
          className="premium-select text-sm disabled:cursor-wait disabled:opacity-70"
          aria-busy={isPending}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isPending ? (
          <p className="mt-3 text-xs font-medium text-[var(--muted)]">
            Carregando dados do periodo selecionado...
          </p>
        ) : null}
      </div>

      {isPending ? (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-[rgba(18,7,11,0.46)] px-6 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-[34px] border border-[rgba(255,235,214,0.12)] bg-[linear-gradient(145deg,rgba(30,11,17,0.96),rgba(85,24,40,0.95))] p-8 text-white shadow-[0_30px_120px_rgba(18,6,9,0.46)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-white/10">
                <LoaderCircle className="h-6 w-6 animate-spin text-[#ffd4a4]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f6d9c6]">
                  Carregando dados
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                  Atualizando o painel
                </h3>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/74">
              {pendingLabel
                ? `Estamos buscando os dados de ${pendingLabel}. Isso evita confusao durante a troca de periodo.`
                : "Estamos buscando os dados do periodo selecionado. Isso evita confusao durante a troca de periodo."}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
