import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StyleAnalysis, StyleIndicator } from "@/lib/profile/style";

export function TacticalIndicators({ analysis }: { analysis: StyleAnalysis }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <IndicatorsCard title="Construção" items={analysis.build} />
      <IndicatorsCard title="Ataque" items={analysis.offensive} />
      <IndicatorsCard title="Defesa" items={analysis.defensive} />
    </div>
  );
}

function IndicatorsCard({ title, items }: { title: string; items: StyleIndicator[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="tabular-nums font-semibold">{item.value}</span>
            </div>
            <Progress value={item.value} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
