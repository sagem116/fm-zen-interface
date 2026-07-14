import { createFileRoute } from "@tanstack/react-router";
import { RecommendationEnginePage } from "@/features/recruitment";

export const Route = createFileRoute("/recruitment-center/recomendacoes")({
  head: () => ({
    meta: [{ title: "Recommendation Engine — FM World Rankings" }],
  }),
  component: RecommendationEnginePage,
});
