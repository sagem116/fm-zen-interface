import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentDashboardPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/dashboard")({
  head: () => ({
    meta: [{ title: "Recruitment Dashboard — FM World Rankings" }],
  }),
  component: RecruitmentDashboardPage,
});
