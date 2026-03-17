import { SessionTimeoutWatcher } from "@/components/session-timeout-watcher";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <>
      <SessionTimeoutWatcher expiresAt={session.expiresAt} />
      {children}
    </>
  );
}
