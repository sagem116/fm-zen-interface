import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EditorialContext, InsightCard } from "@/lib/editorial";

interface Props {
  ctx: EditorialContext;
}

const TONE_CLASS: Record<InsightCard["tone"], string> = {
  positive: "border-emerald-500/40 bg-emerald-500/5",
  neutral: "border-border bg-muted/30",
  warning: "border-amber-500/40 bg-amber-500/5",
};

export function ScoreInsights({ ctx }: Props) {
  if (!ctx.insights.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {ctx.insights.map((ins) => (
        <Card key={ins.id} className={TONE_CLASS[ins.tone]}>
          <CardContent className="space-y-1 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {ins.kind}
              </Badge>
              <span className="text-sm font-semibold">{ins.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">{ins.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
