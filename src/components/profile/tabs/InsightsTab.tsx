import { Loader2, Rss } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileInsights } from "@/lib/profile/insights";
import type { ProfileContext } from "@/lib/profile/types";

export function InsightsTab({ ctx }: { ctx: ProfileContext }) {
  const { insights, loading } = useProfileInsights(ctx);
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="size-4 animate-spin" /> A analisar insights…
      </div>
    );
  }
  if (!insights.length) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Sem insights disponíveis para esta entidade.
      </p>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Rss className="size-4" /> {insights.length} insight{insights.length === 1 ? "" : "s"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l border-border/60 space-y-3 pl-4">
          {insights.map((i) => (
            <li key={i.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-gold" />
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {i.category}
                </span>
                {i.season && (
                  <span className="text-[10px] tabular-nums text-muted-foreground">{i.season}</span>
                )}
                <span className="text-[10px] text-muted-foreground/70">
                  importância {i.importance} · conf {(i.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-sm font-medium leading-tight">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.description}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
