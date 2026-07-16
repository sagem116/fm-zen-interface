import { useMemo } from "react";
import { Loader2, TrendingUp, Award, Sparkles, Baby } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProfileContext } from "@/lib/profile/types";
import { useCoachRoster } from "@/lib/coach-identity/data";
import { computeDevelopment } from "@/lib/coach-identity/development";

const fmtInt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("pt-PT") : "—");
const fmtSigned = (n: number) => (n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`);

export function CoachDevelopmentTab({ ctx }: { ctx: ProfileContext }) {
  const { data: roster, isLoading } = useCoachRoster(ctx.name);
  const dev = useMemo(() => (roster ? computeDevelopment(roster.players) : null), [roster]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!roster || !dev || dev.playersTracked === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sem dados suficientes para calcular o desenvolvimento de jogadores.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Award className="h-3.5 w-3.5" /> Melhor jogador treinado
            </div>
            <div className="text-lg font-semibold truncate">
              {dev.bestPlayer?.name ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              CA pico {fmtInt(dev.bestPlayer?.peakCa ?? 0)} · {dev.bestPlayer?.seasons ?? 0} épocas
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Maior evolução de CA
            </div>
            <div className="text-lg font-semibold truncate">
              {dev.biggestDelta?.name ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {fmtInt(dev.biggestDelta?.firstCa ?? 0)} → {fmtInt(dev.biggestDelta?.lastCa ?? 0)}{" "}
              ({fmtSigned(dev.biggestDelta?.caDelta ?? 0)})
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Sparkles className="h-3.5 w-3.5" /> Transformações
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {dev.transformations.length}
            </div>
            <div className="text-xs text-muted-foreground">
              Jogadores CA&lt;130 → pico &gt;170
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Baby className="h-3.5 w-3.5" /> Wonderkids no plantel
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {dev.wonderkidUsageRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              ≤20 anos com PA-CA ≥ 30
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary line */}
      <Card>
        <CardContent className="pt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Jogadores acompanhados</div>
            <div className="text-lg font-semibold tabular-nums">{dev.playersTracked}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Δ CA médio (multi-época)</div>
            <div className="text-lg font-semibold tabular-nums">
              {fmtSigned(dev.avgCaDelta)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Jogadores com Δ CA positivo</div>
            <div className="text-lg font-semibold tabular-nums">{dev.positiveDeltas}</div>
          </div>
        </CardContent>
      </Card>

      {/* Top risers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Maiores evoluções de CA</CardTitle>
        </CardHeader>
        <CardContent>
          {dev.topRisers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem jogadores multi-época.</p>
          ) : (
            <div className="space-y-1">
              {dev.topRisers.map((p) => (
                <div
                  key={p.key}
                  className="flex items-center gap-3 text-sm py-1 border-b last:border-b-0"
                >
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.firstYear}–{p.lastYear}
                  </span>
                  <span className="w-28 text-right tabular-nums">
                    {fmtInt(p.firstCa)} → {fmtInt(p.lastCa)}
                  </span>
                  <Badge variant="outline" className="w-14 justify-center">
                    {fmtSigned(p.caDelta)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Young developed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Jovens desenvolvidos (≤21 à entrada)</CardTitle>
        </CardHeader>
        <CardContent>
          {dev.youngDeveloped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem jovens desenvolvidos.</p>
          ) : (
            <div className="space-y-1">
              {dev.youngDeveloped.slice(0, 15).map((p) => (
                <div
                  key={p.key}
                  className="flex items-center gap-3 text-sm py-1 border-b last:border-b-0"
                >
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground w-24 tabular-nums">
                    {p.firstAge ?? "—"} → {p.lastAge ?? "—"} anos
                  </span>
                  <span className="w-28 text-right tabular-nums">
                    {fmtInt(p.firstCa)} → {fmtInt(p.lastCa)}
                  </span>
                  <Badge variant="outline" className="w-14 justify-center">
                    {fmtSigned(p.caDelta)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transformations */}
      {dev.transformations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Jogadores transformados em estrelas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {dev.transformations.slice(0, 15).map((p) => (
                <div
                  key={p.key}
                  className="flex items-center gap-3 text-sm py-1 border-b last:border-b-0"
                >
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="w-28 text-right tabular-nums">
                    {fmtInt(p.firstCa)} → pico {fmtInt(p.peakCa)}
                  </span>
                  <Badge className="w-14 justify-center">
                    {fmtSigned(p.peakCa - p.firstCa)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
