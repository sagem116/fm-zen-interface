import { createFileRoute } from "@tanstack/react-router";
import { RecruitmentPlaceholderPage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/shortlists")({
  head: () => ({ meta: [{ title: "Recruitment · Shortlists — FM World Rankings" }] }),
  component: ShortlistsPage,
});

function ShortlistsPage() {
  return (
    <RecruitmentPlaceholderPage
      title="Shortlists"
      description="A gestao detalhada de shortlists sera implementada nas proximas fases."
    />
  );
}
