import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EditorialContext } from "@/lib/editorial";

interface Props {
  ctx: EditorialContext;
}

export function ScoreConfidence({ ctx }: Props) {
  const c = ctx.confidence;
  const pct = Math.round(c.level * 100);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Confiança</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{pct}%</span>
          <span className="text-xs text-muted-foreground">nível estimado</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Row
            label="Minutos"
            value={c.minutes != null ? c.minutes.toLocaleString("pt-PT") : "—"}
          />
          <Row label="Jogos" value={c.matches != null ? String(c.matches) : "—"} />
          <Row
            label="Épocas"
            value={c.seasons != null ? String(c.seasons) : `${ctx.evolution.seasonsTracked}`}
          />
          <Row
            label="Cobertura"
            value={c.coverage != null ? `${Math.round(c.coverage * 100)}%` : "—"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
