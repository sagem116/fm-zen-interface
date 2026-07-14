import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemporalPoint } from "@/lib/profile/temporal";
import { fmtNum } from "@/lib/fmt";

export function TimelineSummary({ points }: { points: TemporalPoint[] }) {
  if (!points.length) return null;

  const values = points.map((point) => point.value);
  const sum = values.reduce((acc, value) => acc + value, 0);
  const mean = sum / values.length;
  const best = points.reduce((acc, point) => (point.value > acc.value ? point : acc), points[0]);
  const worst = points.reduce((acc, point) => (point.value < acc.value ? point : acc), points[0]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resumo</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <SummaryItem label="Média histórica" value={fmtNum(mean, 2)} />
        <SummaryItem label="Melhor época" value={`${best.season} · ${fmtNum(best.value, 2)}`} />
        <SummaryItem label="Pior época" value={`${worst.season} · ${fmtNum(worst.value, 2)}`} />
        <SummaryItem label="Amplitude" value={fmtNum(best.value - worst.value, 2)} />
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
