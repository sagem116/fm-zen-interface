import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { ScoreEntityKind } from "@/lib/scores";
import { RankingsEntityTabs } from "./RankingsEntityTabs";
import { RankingsSidebar } from "./RankingsSidebar";
import { ScoreDashboardHeader } from "./ScoreDashboardHeader";
import { ScoreHighlights } from "./ScoreHighlights";
import { RankingScopeTabs } from "./RankingScopeTabs";
import { RankingsFilters } from "./RankingsFilters";
import { RankingsTable } from "./RankingsTable";
import { RankingsPlaceholders } from "./RankingsPlaceholders";
import { useRankingsExplorer, type RankingScope } from "./useRankingsExplorer";
import {
  ScoreIdentityCard,
  ScoreNarrative,
  ScoreInsights,
  ScoreBreakdown,
  ScoreConfidence,
  SimilarProfiles,
} from "@/components/score-story";
import { buildEditorialContext, type EditorialInput } from "@/lib/editorial";

const RankingsCompare = lazy(() =>
  import("./RankingsCompare").then((m) => ({ default: m.RankingsCompare })),
);
const RankingsHallOfFame = lazy(() =>
  import("./RankingsHallOfFame").then((m) => ({ default: m.RankingsHallOfFame })),
);
const ScoreEvolution = lazy(() =>
  import("@/components/scores/ScoreEvolution").then((m) => ({ default: m.ScoreEvolution })),
);

interface Props {
  initialEntityKind?: ScoreEntityKind;
  initialScoreId?: string;
  initialEntityName?: string;
}

export function ScoreRankingsPage({ initialEntityKind = "player", initialScoreId }: Props) {
  const [entityKind, setEntityKind] = useState<ScoreEntityKind>(initialEntityKind);
  const explorer = useRankingsExplorer(entityKind, initialScoreId);

  const scopeOptions = useMemo<RankingScope[]>(() => {
    if (entityKind === "player")
      return ["world", "continental", "national", "competition", "club", "season"];
    return ["world", "season"];
  }, [entityKind]);

  const scoresForEntity = useMemo(
    () => explorer.allScores.filter((s) => s.entityKind === entityKind),
    [explorer.allScores, entityKind],
  );

  useEffect(() => {
    if (explorer.selectedScore && explorer.selectedScore.entityKind !== entityKind) {
      const fallback = scoresForEntity[0];
      if (fallback) explorer.setSelectedScoreId(fallback.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKind, scoresForEntity, explorer.selectedScore?.entityKind]);

  const selectedRankIndex = explorer.selectedRankIndex;
  const selectedEntry = selectedRankIndex >= 0 ? explorer.ranking[selectedRankIndex] : null;

  const editorialCtx = useMemo(() => {
    if (!explorer.selectedScore || !selectedEntry) return null;
    const peers = explorer.ranking.map((e) => ({
      name: e.entityName,
      score: e.score,
      grade: e.grade,
    }));
    const history = explorer.history.map((h) => ({ season: h.season, score: h.score }));
    const input: EditorialInput = {
      identity: {
        name: selectedEntry.entityName,
        kind: explorer.selectedScore.entityKind,
        role: entityKind === "player" ? explorer.selectedScore.name : undefined,
      },
      definition: explorer.selectedScore,
      result: selectedEntry.result,
      scoreValue: selectedEntry.score,
      grade: selectedEntry.grade,
      rank: selectedRankIndex + 1,
      totalRanked: explorer.ranking.length,
      history,
      season: explorer.selectedSeason ?? undefined,
      peers,
    };
    return buildEditorialContext(input);
  }, [
    explorer.selectedScore,
    explorer.ranking,
    explorer.history,
    explorer.selectedSeason,
    selectedEntry,
    selectedRankIndex,
    entityKind,
  ]);

  const compare = useCallback(
    (left: string, right: string) => explorer.compareEntities(left, right),
    [explorer],
  );

  if (explorer.loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">A carregar rankings...</div>
    );
  }

  return (
    <div className="space-y-4">
      <RankingsEntityTabs value={entityKind} onChange={setEntityKind} />

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <RankingsSidebar
          scores={scoresForEntity}
          entityKind={entityKind}
          selectedScoreId={explorer.selectedScoreId}
          onSelect={explorer.setSelectedScoreId}
          favorites={explorer.favorites}
          onToggleFavorite={explorer.toggleFavorite}
        />

        <div className="space-y-4">
          {!explorer.selectedScore ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Selecione um score na barra lateral para começar.
            </div>
          ) : (
            <>
              <ScoreDashboardHeader
                score={explorer.selectedScore}
                stats={explorer.stats}
                lastSeason={explorer.lastSeason}
              />

              <ScoreHighlights ranking={explorer.ranking} />

              {editorialCtx && (
                <>
                  <ScoreIdentityCard ctx={editorialCtx} />
                  <ScoreNarrative ctx={editorialCtx} level="standard" preset="rankings" />
                  <ScoreNarrative
                    ctx={editorialCtx}
                    level="standard"
                    preset="explain"
                    mode="explain"
                    title="Explain Mode"
                  />
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <ScoreBreakdown ctx={editorialCtx} />
                    </div>
                    <ScoreConfidence ctx={editorialCtx} />
                  </div>
                  <ScoreInsights ctx={editorialCtx} />
                </>
              )}

              <RankingScopeTabs
                value={explorer.scope}
                onChange={explorer.setScope}
                scopes={scopeOptions}
              />

              <RankingsFilters
                seasons={explorer.entitySeasonOptions}
                filters={explorer.rankingFilters}
                onChange={(patch) => explorer.setRankingFilters((prev) => ({ ...prev, ...patch }))}
                showPlayerFilters={entityKind === "player"}
              />

              <RankingsTable
                entries={explorer.filteredRanking}
                entityKind={explorer.selectedScore.entityKind}
                selectedEntityName={explorer.selectedEntityName}
                onSelectEntity={explorer.setSelectedEntityName}
              />

              {editorialCtx && (
                <SimilarProfiles ctx={editorialCtx} onSelect={explorer.setSelectedEntityName} />
              )}

              <Suspense fallback={<Loading label="Comparação" />}>
                <RankingsCompare
                  ranking={explorer.filteredRanking}
                  onCompare={compare}
                  defaultLeft={explorer.selectedEntityName}
                />
              </Suspense>

              <Suspense fallback={<Loading label="Evolução" />}>
                <ScoreEvolution history={explorer.history} />
              </Suspense>

              <Suspense fallback={<Loading label="Hall of Fame" />}>
                <RankingsHallOfFame ranking={explorer.ranking} history={explorer.history} />
              </Suspense>

              <RankingsPlaceholders />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="rounded-md border p-4 text-xs text-muted-foreground">A carregar {label}...</div>
  );
}
