import { createFileRoute } from "@tanstack/react-router";
import { ScoreStudio } from "@/components/scores-studio/ScoreStudio";

export const Route = createFileRoute("/scores-studio")({
  head: () => ({
    meta: [
      { title: "Score Studio - FM World Rankings" },
      {
        name: "description",
        content: "Admin declarativo para criação, simulação e validação de scores.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ScoreStudio,
});
