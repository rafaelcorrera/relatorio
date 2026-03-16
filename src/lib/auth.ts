import "server-only";

import { createHmac } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { describeAllowlistSource, isEmailAllowed } from "@/lib/auth-allowlist";
import { isSupabaseAuthEnabled } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SESSION_COOKIE = "gafs_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getSessionSecret() {
  return process.env.SESSION_SECRET || "gafs-dev-session-secret";
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function getAuthConfig() {
  const googleLoginEnabled = isSupabaseAuthEnabled();
  const mode: "google" | "local" = googleLoginEnabled ? "google" : "local";

  return {
    email: process.env.ADMIN_EMAIL || "admin@gafs.local",
    password: process.env.ADMIN_PASSWORD || "gafs123",
    usingDefaultCredentials:
      !process.env.ADMIN_EMAIL && !process.env.ADMIN_PASSWORD,
    mode,
    googleLoginEnabled,
    allowlistDescription: googleLoginEnabled ? describeAllowlistSource() : "",
  };
}

export async function createSession(email: string) {
  if (isSupabaseAuthEnabled()) {
    throw new Error("Use o login Google do Supabase para criar sessoes.");
  }

  const payload = Buffer.from(
    JSON.stringify({
      email,
      exp: Date.now() + SESSION_TTL_MS,
    }),
  ).toString("base64url");

  const store = await cookies();
  store.set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession() {
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return;
  }

  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession() {
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (error || !claims?.sub) {
      return null;
    }

    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";

    if (!email) {
      return null;
    }

    const allowed = await isEmailAllowed(email);
    if (!allowed) {
      return null;
    }

    return {
      email,
    };
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      email: string;
      exp: number;
    };

    if (!parsed.email || parsed.exp < Date.now()) {
      return null;
    }

    return {
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function isAuthenticated() {
  const session = await getSession();
  return Boolean(session);
}
