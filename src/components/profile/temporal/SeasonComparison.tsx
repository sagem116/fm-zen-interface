import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TemporalPoint } from "@/lib/profile/temporal";
import { fmtNum } from "@/lib/fmt";

export function SeasonComparison({ points }: { points: TemporalPoint[] }) {
  const seasons = useMemo(() => points.map((point) => String(point.season)), [points]);
  const [left, setLeft] = useState<string>(seasons[0] ?? "");
  const [right, setRight] = useState<string>(seasons[seasons.length - 1] ?? "");

  const leftValue = points.find((point) => String(point.season) === left)?.value ?? null;
  const rightValue = points.find((point) => String(point.season) === right)?.value ?? null;
  const diff = leftValue != null && rightValue != null ? rightValue - leftValue : null;
  const diffPct =
    diff != null && leftValue != null && leftValue !== 0 ? (diff / leftValue) * 100 : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comparação de épocas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Comparar</span>
          <Select value={left} onValueChange={setLeft}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={`a-${season}`} value={season}>
                  {season}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">vs</span>
          <Select value={right} onValueChange={setRight}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={`b-${season}`} value={season}>
                  {season}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Item label="Valor inicial" value={leftValue == null ? "—" : fmtNum(leftValue, 2)} />
          <Item label="Valor final" value={rightValue == null ? "—" : fmtNum(rightValue, 2)} />
          <Item
            label="Diferença absoluta"
            value={diff == null ? "—" : `${diff >= 0 ? "+" : ""}${fmtNum(diff, 2)}`}
          />
          <Item
            label="Diferença %"
            value={diffPct == null ? "—" : `${diffPct >= 0 ? "+" : ""}${fmtNum(diffPct, 2)}%`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
