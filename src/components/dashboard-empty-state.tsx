import Link from "next/link";
import { FileSpreadsheet, Upload } from "lucide-react";

export function DashboardEmptyState({
  storeSlug,
  storeName,
}: {
  storeSlug: string;
  storeName: string;
}) {
  return (
    <section className="premium-surface rounded-[36px] p-8">
      <div className="flex items-start gap-4">
        <div
          className="rounded-[24px] p-3 text-[var(--accent)]"
          style={{
            backgroundColor: "rgb(var(--accent-rgb) / 0.12)",
            boxShadow: "0 16px 34px rgb(var(--accent-rgb) / 0.16)",
          }}
        >
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {storeName}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Nenhum periodo foi importado para esta loja.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Carregue os arquivos Excel de {storeName} na área exclusiva de importação
            para habilitar as páginas de faturamento, entregas, mesa, produtos e DRE.
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-xl">
        <Link
          href={`/dashboard/arquivos?store=${storeSlug}`}
          className="premium-button inline-flex"
        >
          <Upload className="h-4 w-4" />
          Ir para carga de arquivos
        </Link>
      </div>
    </section>
  );
}
