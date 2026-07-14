import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listScores } from "@/lib/scores";
import { useScoresExplorer } from "@/components/scores/useScoresExplorer";
import { ScoreRanking } from "@/components/scores/ScoreRanking";

export function DashboardTopPerformersByScore() {
  const scores = useMemo(() => listScores().filter((score) => score.entityKind === "player"), []);
  const defaultScore = scores[0];
  const explorer = useScoresExplorer(defaultScore?.entityKind, "", defaultScore?.id);

  const top = explorer.ranking.slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Performers by Score</CardTitle>
      </CardHeader>
      <CardContent>
        {!defaultScore || top.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados de score para exibir.</p>
        ) : (
          <div className="h-[380px]">
            <ScoreRanking
              entries={top}
              entityKind={defaultScore.entityKind}
              selectedEntityName={explorer.selectedEntityName}
              onSelectEntity={explorer.setSelectedEntityName}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
