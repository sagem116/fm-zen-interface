import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentIntelligencePage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/intelligence")({
  head: () => ({ meta: [{ title: "Recruitment · Intelligence — FM World Rankings" }] }),
  component: RecruitmentIntelligencePage,
});
