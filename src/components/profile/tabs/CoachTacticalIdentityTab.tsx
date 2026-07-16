import { useMemo } from "react";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProfileContext } from "@/lib/profile/types";
import { useCoachRoster, useCoachUniverse } from "@/lib/coach-identity/data";
import {
  computeSquadProfile,
  computeStyleIndicators,
  computeTacticalTags,
} from "@/lib/coach-identity/compute";

export function CoachTacticalIdentityTab({ ctx }: { ctx: ProfileContext }) {
  const { data: roster, isLoading } = useCoachRoster(ctx.name);
  const { data: universe } = useCoachUniverse();

  const tags = useMemo(() => {
    if (!roster) return [];
    const squad = computeSquadProfile(roster.players, roster.assignments);
    const style = computeStyleIndicators(roster.players, universe);
    return computeTacticalTags(roster.players, roster.assignments, squad, style, universe);
  }, [roster, universe]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!roster || !roster.players.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sem dados suficientes para inferir a identidade tática.
        </CardContent>
      </Card>
    );
  }

  const groups = new Map<string, typeof tags>();
  for (const t of tags) {
    const list = groups.get(t.category) ?? [];
    list.push(t);
    groups.set(t.category, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Identidade tática</h3>
        <p className="text-sm text-muted-foreground">
          Conclusões geradas por regras determinísticas com base nos dados do plantel e da carreira.
          Cada classificação inclui a origem exata dos dados.
        </p>
      </div>

      {[...groups.entries()].map(([category, list]) => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            {category}
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((t) => (
              <Card
                key={t.id}
                className={t.active ? "border-primary/40 bg-primary/5" : "opacity-60"}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {t.active ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      {t.label}
                    </CardTitle>
                    {t.metric && (
                      <Badge variant="outline" className="text-[10px]">
                        {t.metric.label}: {t.metric.value}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{t.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
