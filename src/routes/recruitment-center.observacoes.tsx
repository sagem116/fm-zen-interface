import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentObservationsPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/observacoes")({
  head: () => ({ meta: [{ title: "Recruitment · Observacoes — FM World Rankings" }] }),
  component: RecruitmentObservationsPage,
});
