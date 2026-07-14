import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EditorialContext } from "@/lib/editorial";

interface Props {
  ctx: EditorialContext;
}

/**
 * Friendly breakdown — no formulas. Shows section shares and top contributions.
 */
export function ScoreBreakdown({ ctx }: Props) {
  if (!ctx.breakdown.length) return null;
  const total = ctx.score.value;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Como se explica este Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{total.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">Score final</span>
        </div>

        <div className="space-y-2">
          {ctx.breakdown.map((slice) => (
            <div key={slice.section} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{slice.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {(slice.share * 100).toFixed(0)}% · {slice.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, slice.share * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {ctx.topContributions.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Principais contribuições
            </div>
            <ul className="space-y-1 text-sm">
              {ctx.topContributions.slice(0, 5).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1"
                >
                  <span className="truncate">{c.label}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {c.contribution.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
