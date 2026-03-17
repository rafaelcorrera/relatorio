import { FileSpreadsheet } from "lucide-react";

import { UploadReportsForm } from "@/components/upload-reports-form";

export function DashboardEmptyState() {
  return (
    <section className="premium-surface rounded-[36px] p-8">
      <div className="flex items-start gap-4">
        <div className="rounded-[24px] bg-[color:rgba(159,35,68,0.12)] p-3 text-[var(--accent)] shadow-[0_16px_34px_rgba(159,35,68,0.12)]">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Dashboard vazio
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Nenhum periodo foi importado ainda.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Envie os arquivos Excel do periodo para habilitar as paginas de
            faturamento, entregas, mesa e produtos.
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-xl">
        <UploadReportsForm />
      </div>
    </section>
  );
}
