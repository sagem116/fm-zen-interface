import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreDefinition } from "@/lib/scores";

interface Props {
  scores: ScoreDefinition[];
  favorites: string[];
  selectedScoreId: string;
  onSelectScore: (scoreId: string) => void;
  onToggleFavorite: (scoreId: string) => void;
}

export function ScoreFavorites({
  scores,
  favorites,
  selectedScoreId,
  onSelectScore,
  onToggleFavorite,
}: Props) {
  const favoriteScores = scores.filter((score) => favorites.includes(score.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Favoritos</CardTitle>
      </CardHeader>
      <CardContent>
        {favoriteScores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem favoritos.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favoriteScores.map((score) => {
              const active = score.id === selectedScoreId;
              return (
                <button
                  key={score.id}
                  className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${active ? "bg-muted" : ""}`}
                  onClick={() => onSelectScore(score.id)}
                >
                  <span>{score.name}</span>
                  <Badge variant="outline">{score.entityKind}</Badge>
                  <span
                    role="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(score.id);
                    }}
                  >
                    <Star className="size-3.5 fill-current text-yellow-500" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
