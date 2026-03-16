import { redirect } from "next/navigation";

export default async function DashboardIndexPage({
  searchParams,
}: {
  searchParams: Promise<{
    bundle?: string;
  }>;
}) {
  const params = await searchParams;
  redirect(
    params.bundle
      ? `/dashboard/faturamento?bundle=${params.bundle}`
      : "/dashboard/faturamento",
  );
}
