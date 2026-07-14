import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ScoreEntityKind } from "@/lib/scores";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreSearch } from "./ScoreSearch";
import { ScoreFilters } from "./ScoreFilters";
import { ScoreLibrary } from "./ScoreLibrary";
import { ScoreRanking } from "./ScoreRanking";
import { ScoreProfile } from "./ScoreProfile";
import { ScoreEvolution } from "./ScoreEvolution";
import { ScoreCompare } from "./ScoreCompare";
import { ScoreFavorites } from "./ScoreFavorites";
import { ScoreEmptyState } from "./ScoreEmptyState";
import { ScoresHeader } from "./ScoresHeader";
import { useScoresExplorer } from "./useScoresExplorer";

const ScoreExplain = lazy(() =>
  import("./ScoreExplain").then((m) => ({ default: m.ScoreExplain })),
);
const ScoreHistory = lazy(() =>
  import("./ScoreHistory").then((m) => ({ default: m.ScoreHistory })),
);
const ScoreBreakdown = lazy(() =>
  import("./ScoreBreakdown").then((m) => ({ default: m.ScoreBreakdown })),
);

interface Props {
  contextEntityKind?: ScoreEntityKind;
  contextEntityName?: string;
  contextScoreId?: string;
  embedded?: boolean;
}

export function ScoresPage({
  contextEntityKind,
  contextEntityName,
  contextScoreId,
  embedded = false,
}: Props) {
  const {
    loading,
    filteredScores,
    selectedScore,
    selectedScoreId,
    setSelectedScoreId,
    selectedEntityName,
    setSelectedEntityName,
    selectedSeason,
    setSelectedSeason,
    entitySeasonOptions,
    entityOptions,
    categories,
    tags,
    filters,
    setFilters,
    favorites,
    toggleFavorite,
    ranking,
    selectedRankIndex,
    selectedEvaluation,
    history,
    scoreFormulaText,
    compareEntities,
  } = useScoresExplorer(contextEntityKind, contextEntityName, contextScoreId);

  const [compareLeft, setCompareLeft] = useState("");
  const [compareRight, setCompareRight] = useState("");

  const compareResult = useMemo(
    () => compareEntities(compareLeft || selectedEntityName, compareRight),
    [compareEntities, compareLeft, compareRight, selectedEntityName],
  );

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">A carregar scores...</div>
    );
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <ScoresHeader
          selectedScore={selectedScore}
          selectedEntityName={selectedEntityName}
          rankIndex={selectedRankIndex}
        />
      ) : null}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <ScoreSearch
            value={filters.search}
            onChange={(search) => setFilters((prev) => ({ ...prev, search }))}
          />
          <ScoreFilters
            entityKind={filters.entityKind}
            category={filters.category}
            tag={filters.tag}
            status={filters.status}
            favoritesOnly={filters.favoritesOnly}
            categories={categories}
            tags={tags}
            onEntityKind={(entityKind) => setFilters((prev) => ({ ...prev, entityKind }))}
            onCategory={(category) => setFilters((prev) => ({ ...prev, category }))}
            onTag={(tag) => setFilters((prev) => ({ ...prev, tag }))}
            onStatus={(status) => setFilters((prev) => ({ ...prev, status }))}
            onFavoritesOnly={(favoritesOnly) => setFilters((prev) => ({ ...prev, favoritesOnly }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <ScoreLibrary
            scores={filteredScores}
            selectedScoreId={selectedScoreId}
            favorites={favorites}
            onSelectScore={setSelectedScoreId}
            onToggleFavorite={toggleFavorite}
          />
          <ScoreFavorites
            scores={filteredScores}
            favorites={favorites}
            selectedScoreId={selectedScoreId}
            onSelectScore={setSelectedScoreId}
            onToggleFavorite={toggleFavorite}
          />
        </div>

        <div className="space-y-4">
          {!selectedScore ? (
            <ScoreEmptyState message="Selecione um score na biblioteca para começar." />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/scores"
                    search={{
                      scoreId: selectedScore.id,
                      entityName: selectedEntityName,
                      entityKind: selectedScore.entityKind,
                    }}
                  >
                    Partilhar vista
                  </Link>
                </Button>
                {entitySeasonOptions.map((season) => (
                  <Button
                    key={season}
                    variant={selectedSeason === season ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSeason(season)}
                  >
                    {season}
                  </Button>
                ))}
                {selectedSeason != null ? (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSeason(null)}>
                    Todas épocas
                  </Button>
                ) : null}
              </div>

              <Tabs defaultValue="profile" className="space-y-3">
                <TabsList className="flex h-auto flex-wrap justify-start">
                  <TabsTrigger value="profile">Perfil</TabsTrigger>
                  <TabsTrigger value="ranking">Ranking</TabsTrigger>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                  <TabsTrigger value="evolution">Evolução</TabsTrigger>
                  <TabsTrigger value="compare">Comparação</TabsTrigger>
                  <TabsTrigger value="explain">Explain</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <ScoreProfile
                    score={selectedScore}
                    entityName={selectedEntityName}
                    evaluation={selectedEvaluation}
                    formula={scoreFormulaText(selectedScore)}
                  />
                </TabsContent>

                <TabsContent value="ranking">
                  <ScoreRanking
                    entries={ranking}
                    entityKind={selectedScore.entityKind}
                    selectedEntityName={selectedEntityName}
                    onSelectEntity={setSelectedEntityName}
                  />
                </TabsContent>

                <TabsContent value="history">
                  <Suspense
                    fallback={
                      <p className="text-sm text-muted-foreground">A carregar histórico...</p>
                    }
                  >
                    <ScoreHistory
                      history={history}
                      selectedSeason={selectedSeason}
                      onSelectSeason={setSelectedSeason}
                    />
                  </Suspense>
                </TabsContent>

                <TabsContent value="evolution">
                  <ScoreEvolution history={history} />
                </TabsContent>

                <TabsContent value="compare">
                  <ScoreCompare
                    options={entityOptions}
                    leftName={compareLeft || selectedEntityName}
                    rightName={compareRight}
                    onLeftName={setCompareLeft}
                    onRightName={setCompareRight}
                    left={compareResult.left}
                    right={compareResult.right}
                  />
                </TabsContent>

                <TabsContent value="explain" className="space-y-3">
                  <Suspense
                    fallback={
                      <p className="text-sm text-muted-foreground">A carregar explain...</p>
                    }
                  >
                    <ScoreExplain
                      explain={selectedEvaluation?.explain ?? null}
                      validation={selectedEvaluation?.validation ?? null}
                      debug={selectedEvaluation?.debug ?? null}
                    />
                  </Suspense>
                  <Suspense
                    fallback={
                      <p className="text-sm text-muted-foreground">A carregar breakdown...</p>
                    }
                  >
                    <ScoreBreakdown result={selectedEvaluation?.result ?? null} />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
