import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreEvaluationEntry } from "./types";

interface Props {
  title: string;
  entry: ScoreEvaluationEntry | null;
}

export function ScoreCard({ title, entry }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!entry ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-3xl font-bold tabular-nums">{entry.score.toFixed(1)}</p>
            <div className="flex items-center gap-2">
              <Badge>{entry.grade}</Badge>
              <Badge variant="outline">Conf {entry.confidence.toFixed(0)}%</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
