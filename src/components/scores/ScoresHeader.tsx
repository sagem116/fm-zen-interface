import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ScoreDefinition } from "@/lib/scores";

interface Props {
  selectedScore: ScoreDefinition | undefined;
  selectedEntityName: string;
  rankIndex: number;
}

export function ScoresHeader({ selectedScore, selectedEntityName, rankIndex }: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-display font-bold">Scores</h1>
        <p className="text-sm text-muted-foreground">
          Biblioteca pública de scores, ranking por score, explain, validação e debug usando o Score
          Engine.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {selectedScore ? <Badge variant="outline">{selectedScore.id}</Badge> : null}
        {selectedEntityName ? <Badge variant="secondary">{selectedEntityName}</Badge> : null}
        {rankIndex >= 0 ? <Badge>#{rankIndex + 1}</Badge> : null}
        <Button asChild variant="outline" size="sm">
          <Link to="/scores-studio" search={{ tab: undefined }}>
            Abrir Score Studio
          </Link>
        </Button>
      </div>
    </header>
  );
}
