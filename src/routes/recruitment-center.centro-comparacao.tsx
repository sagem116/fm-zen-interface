import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentCompareCenterPage } from "@/features/recruitment/components/RecruitmentCompareCenterPage";

export const Route = createFileRoute("/recruitment-center/centro-comparacao")({
  head: () => ({ meta: [{ title: "Recruitment · Centro de Comparacao — FM World Rankings" }] }),
  component: CentroComparacaoPage,
});

function CentroComparacaoPage() {
  return <RecruitmentCompareCenterPage />;
}
