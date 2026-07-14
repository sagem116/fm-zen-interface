import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentTacticalPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/tactical")({
  head: () => ({ meta: [{ title: "Recruitment · Tactical Recruitment — FM World Rankings" }] }),
  component: RecruitmentTacticalPage,
});
