import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentScoutReportsPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/relatorios")({
  head: () => ({ meta: [{ title: "Recruitment · Relatorios — FM World Rankings" }] }),
  component: RecruitmentScoutReportsPage,
});
