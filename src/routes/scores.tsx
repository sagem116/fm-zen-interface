import { createFileRoute } from "@tanstack/react-router";
import { ScoreRankingsPage } from "@/components/score-rankings/ScoreRankingsPage";
import type { ScoreEntityKind } from "@/lib/scores";

export const Route = createFileRoute("/scores")({
  validateSearch: (search: Record<string, unknown>) => ({
    scoreId: typeof search.scoreId === "string" ? search.scoreId : undefined,
    entityKind:
      typeof search.entityKind === "string" ? (search.entityKind as ScoreEntityKind) : undefined,
    entityName: typeof search.entityName === "string" ? search.entityName : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Score Rankings - FM World Rankings" },
      {
        name: "description",
        content:
          "Rankings por Score de jogadores, clubes, competições e países com dashboards, filtros, comparação e Hall of Fame.",
      },
    ],
  }),
  component: ScoresRoutePage,
});

function ScoresRoutePage() {
  const search = Route.useSearch();
  return (
    <ScoreRankingsPage
      initialEntityKind={search.entityKind ?? "player"}
      initialScoreId={search.scoreId}
      initialEntityName={search.entityName}
    />
  );
}
