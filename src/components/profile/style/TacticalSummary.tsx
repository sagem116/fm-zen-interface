import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StyleAnalysis } from "@/lib/profile/style";

export function TacticalSummary({ analysis }: { analysis: StyleAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumo Tático</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 text-sm">
          <QuickChip label="Amostra" value={String(analysis.sampleSize)} />
          <QuickChip label="Época" value={String(analysis.season)} />
          <QuickChip
            label="Ataque"
            value={String(Math.round(avg(analysis.offensive.map((it) => it.value))))}
          />
          <QuickChip
            label="Defesa"
            value={String(Math.round(avg(analysis.defensive.map((it) => it.value))))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function QuickChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
