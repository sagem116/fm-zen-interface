import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentPlaceholderPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/historico")({
  head: () => ({ meta: [{ title: "Recruitment · Historico — FM World Rankings" }] }),
  component: HistoricoPage,
});

function HistoricoPage() {
  return (
    <RecruitmentPlaceholderPage
      title="Historico"
      description="O historico completo de observacoes e decisoes de mercado sera introduzido em fases futuras."
    />
  );
}
