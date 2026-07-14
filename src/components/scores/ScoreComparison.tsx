import { EntityCombobox } from "@/components/EntityCombobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ScoreEvaluationEntry } from "./types";
import { ScoreCard } from "./ScoreCard";
import { ScoreBreakdown } from "./ScoreBreakdown";

interface Props {
  options: string[];
  leftName: string;
  rightName: string;
  onLeftName: (name: string) => void;
  onRightName: (name: string) => void;
  left: ScoreEvaluationEntry | null;
  right: ScoreEvaluationEntry | null;
}

export function ScoreComparison(props: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Comparação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <EntityCombobox
            value={props.leftName}
            onChange={props.onLeftName}
            options={props.options}
            placeholder="Entidade A"
          />
          <EntityCombobox
            value={props.rightName}
            onChange={props.onRightName}
            options={props.options}
            placeholder="Entidade B"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ScoreCard title={props.leftName || "Entidade A"} entry={props.left} />
          <ScoreCard title={props.rightName || "Entidade B"} entry={props.right} />
        </div>

        <Separator />

        <div className="grid gap-3 md:grid-cols-2">
          <ScoreBreakdown result={props.left?.result ?? null} />
          <ScoreBreakdown result={props.right?.result ?? null} />
        </div>
      </CardContent>
    </Card>
  );
}
