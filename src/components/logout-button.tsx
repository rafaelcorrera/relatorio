"use client";

import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/80 px-4 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </form>
  );
}
