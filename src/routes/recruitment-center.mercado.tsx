import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentPlaceholderPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/mercado")({
  head: () => ({ meta: [{ title: "Recruitment · Mercado — FM World Rankings" }] }),
  component: MercadoPage,
});

function MercadoPage() {
  return (
    <RecruitmentPlaceholderPage
      title="Mercado"
      description="A analise aprofundada de mercado ficara disponivel nas fases seguintes."
    />
  );
}
