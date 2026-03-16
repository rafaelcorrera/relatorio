"use client";

import { useRouter } from "next/navigation";

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

  return (
    <div className="grid gap-2">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        Periodo
      </label>
      <select
        value={currentValue}
        onChange={(event) => router.push(`${pathname}?bundle=${event.currentTarget.value}`)}
        className="h-11 rounded-2xl border border-[var(--line)] bg-white/90 px-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
