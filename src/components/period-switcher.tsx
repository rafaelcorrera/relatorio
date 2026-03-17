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
    <div className="premium-field">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        Periodo
      </label>
      <select
        value={currentValue}
        onChange={(event) => router.push(`${pathname}?bundle=${event.currentTarget.value}`)}
        className="premium-select text-sm"
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
