import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentReplacementCenterPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/necessidades")({
  head: () => ({ meta: [{ title: "Recruitment · Necessidades — FM World Rankings" }] }),
  component: NecessidadesPage,
});

function NecessidadesPage() {
  return <RecruitmentReplacementCenterPage />;
}
