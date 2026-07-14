import { Star } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreDefinition, ScoreEntityKind } from "@/lib/scores";

interface Props {
  scores: ScoreDefinition[];
  selectedScoreId: string;
  favorites: string[];
  onSelectScore: (scoreId: string) => void;
  onToggleFavorite: (scoreId: string) => void;
}

const GROUP_ORDER: ScoreEntityKind[] = ["player", "coach", "club", "competition", "country"];

const GROUP_LABEL: Record<ScoreEntityKind, string> = {
  player: "Jogadores",
  coach: "Treinadores",
  club: "Clubes",
  competition: "Competições",
  country: "Países",
};

export function ScoreLibrary(props: Props) {
  const grouped = GROUP_ORDER.map((kind) => ({
    kind,
    items: props.scores.filter((score) => score.entityKind === kind),
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Biblioteca de Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-300px)] pr-3">
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.kind} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {GROUP_LABEL[group.kind]}
                </h4>
                {group.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem scores.</p>
                ) : (
                  group.items.map((score) => {
                    const selected = score.id === props.selectedScoreId;
                    const favorited = props.favorites.includes(score.id);
                    const totalComponents =
                      (score.attributeRefs?.length ?? 0) +
                      (score.metricRefs?.length ?? 0) +
                      (score.contextRefs?.length ?? 0) +
                      (score.modifierRefs?.length ?? 0);
                    return (
                      <button
                        key={score.id}
                        className={`w-full rounded-md border p-2 text-left text-xs ${selected ? "bg-muted" : ""}`}
                        onClick={() => props.onSelectScore(score.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-sm">{score.name}</p>
                            <p className="truncate text-muted-foreground">{score.id}</p>
                          </div>
                          <span
                            role="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              props.onToggleFavorite(score.id);
                            }}
                          >
                            <Star
                              className={`size-3.5 ${favorited ? "fill-current text-yellow-500" : "text-muted-foreground"}`}
                            />
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="secondary">{score.categoryId}</Badge>
                          <Badge variant="outline">{totalComponents} comp.</Badge>
                          <Badge variant="outline">{score.version ?? "v1"}</Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
