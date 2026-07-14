import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentScorePage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/score")({
  head: () => ({
    meta: [{ title: "Recruitment Score — FM World Rankings" }],
  }),
  component: RecruitmentScorePage,
});
