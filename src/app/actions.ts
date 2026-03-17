"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSession, destroySession, getAuthConfig, requireSession } from "@/lib/auth";
import { upsertBundleFromFiles } from "@/lib/report-store";
import { getStoreByRestaurantCode, resolveStore } from "@/lib/stores";

export interface FormState {
  error: string;
}

const EMPTY_STATE: FormState = {
  error: "",
};

export async function loginAction(
  _previousState: FormState = EMPTY_STATE,
  formData: FormData,
): Promise<FormState> {
  void _previousState;
  const auth = getAuthConfig();

  if (auth.googleLoginEnabled) {
    return {
      error: "Use o botao Entrar com Google para autenticar neste ambiente.",
    };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Preencha email e senha para continuar.",
    };
  }

  if (email !== auth.email.toLowerCase() || password !== auth.password) {
    return {
      error: "As credenciais informadas nao conferem.",
    };
  }

  await createSession(auth.email);
  redirect("/dashboard");
}

export async function logoutAction(formData?: FormData) {
  void formData;
  await destroySession();
  redirect("/login");
}

export async function uploadReportsAction(
  _previousState: FormState = EMPTY_STATE,
  formData: FormData,
): Promise<FormState> {
  void _previousState;
  await requireSession();

  const rawFiles = formData
    .getAll("reports")
    .filter((value): value is File => value instanceof File);
  const requestedStoreSlug = String(formData.get("store") ?? "").trim();

  if (!rawFiles.length) {
    return {
      error: "Selecione pelo menos um arquivo .xlsx para importar.",
    };
  }

  try {
    const bundle = await upsertBundleFromFiles(rawFiles);
    const store =
      getStoreByRestaurantCode(bundle.restaurantCode) ||
      resolveStore(requestedStoreSlug);
    revalidatePath("/dashboard");
    revalidatePath("/login");
    redirect(`/dashboard?store=${store.slug}&bundle=${bundle.periodKey}`);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel processar os relatorios enviados.",
    };
  }
}
