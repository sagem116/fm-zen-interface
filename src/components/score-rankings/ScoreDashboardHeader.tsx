import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScoreDefinition } from "@/lib/scores";

interface Stats {
  count: number;
  avg: number;
  max: number;
  min: number;
  elite: number;
  worldClass: number;
  distribution: { grade: string; count: number }[];
}

interface Props {
  score: ScoreDefinition;
  stats: Stats;
  lastSeason: number | null;
}

function fmtNum(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

export function ScoreDashboardHeader({ score, stats, lastSeason }: Props) {
  const kpis = [
    { label: "Entidades", value: String(stats.count) },
    { label: "Score Médio", value: fmtNum(stats.avg) },
    { label: "Maior Score", value: fmtNum(stats.max) },
    { label: "Menor Score", value: fmtNum(stats.min) },
    { label: "Elite", value: String(stats.elite) },
    { label: "World Class", value: String(stats.worldClass) },
    { label: "Última Época", value: lastSeason != null ? String(lastSeason) : "—" },
  ];

  const totalDist = stats.distribution.reduce((a, b) => a + b.count, 0);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{score.name}</h1>
            {score.description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{score.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {(score.tags ?? []).slice(0, 6).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <Badge variant="secondary" className="uppercase">
            {score.entityKind}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {k.label}
              </div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums">{k.value}</div>
            </div>
          ))}
        </div>

        {stats.distribution.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              Distribuição por classe
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full border">
              {stats.distribution.map((d, idx) => {
                const pct = totalDist ? (d.count / totalDist) * 100 : 0;
                const hue = (idx * 47) % 360;
                return (
                  <div
                    key={d.grade}
                    title={`${d.grade}: ${d.count}`}
                    style={{ width: `${pct}%`, background: `hsl(${hue} 60% 50%)` }}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              {stats.distribution.map((d, idx) => {
                const hue = (idx * 47) % 360;
                return (
                  <span key={d.grade} className="flex items-center gap-1 text-muted-foreground">
                    <span
                      className="inline-block size-2 rounded-sm"
                      style={{ background: `hsl(${hue} 60% 50%)` }}
                    />
                    {d.grade} · {d.count}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
