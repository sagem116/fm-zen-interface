import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentScoutSearchPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/pesquisa")({
  head: () => ({ meta: [{ title: "Recruitment · Pesquisa — FM World Rankings" }] }),
  component: RecruitmentScoutSearchPage,
});
