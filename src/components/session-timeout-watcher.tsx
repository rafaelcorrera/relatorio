"use client";

import { useEffect } from "react";

export function SessionTimeoutWatcher({
  expiresAt,
}: {
  expiresAt: number;
}) {
  useEffect(() => {
    const remainingMs = expiresAt - Date.now();

    if (remainingMs <= 0) {
      window.location.assign("/auth/logout?reason=session_expired");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.location.assign("/auth/logout?reason=session_expired");
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [expiresAt]);

  return null;
}
