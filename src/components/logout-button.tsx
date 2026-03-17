"use client";

import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="premium-button-secondary min-h-11 px-4 text-sm font-medium"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </form>
  );
}
