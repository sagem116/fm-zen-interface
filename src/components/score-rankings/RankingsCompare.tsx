import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ScoreEvaluationEntry } from "@/components/scores/types";

interface Props {
  ranking: ScoreEvaluationEntry[];
  onCompare: (
    left: string,
    right: string,
  ) => { left: ScoreEvaluationEntry | null; right: ScoreEvaluationEntry | null };
  defaultLeft?: string;
}

export function RankingsCompare({ ranking, onCompare, defaultLeft }: Props) {
  const options = useMemo(() => ranking.map((e) => e.entityName), [ranking]);
  const [left, setLeft] = useState(defaultLeft ?? options[0] ?? "");
  const [right, setRight] = useState(options[1] ?? "");

  const result = useMemo(() => onCompare(left, right), [left, right, onCompare]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Comparação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <Picker label="Entidade A" value={left} options={options} onChange={setLeft} />
          <Picker label="Entidade B" value={right} options={options} onChange={setRight} />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <EntityCard entry={result.left} />
          <EntityCard entry={result.right} />
        </div>
      </CardContent>
    </Card>
  );
}

function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <select
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {options.slice(0, 500).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function EntityCard({ entry }: { entry: ScoreEvaluationEntry | null }) {
  if (!entry)
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
        Selecione uma entidade
      </div>
    );
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="truncate font-medium">{entry.entityName}</span>
        <Badge>{entry.grade}</Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border bg-muted/30 px-2 py-1">
          <div className="text-[10px] uppercase text-muted-foreground">Score</div>
          <div className="text-lg font-semibold tabular-nums">{entry.score.toFixed(1)}</div>
        </div>
        <div className="rounded-md border bg-muted/30 px-2 py-1">
          <div className="text-[10px] uppercase text-muted-foreground">Confiança</div>
          <div className="text-lg font-semibold tabular-nums">{entry.confidence.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

export { Button };
