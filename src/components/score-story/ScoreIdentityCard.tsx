import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EditorialContext } from "@/lib/editorial";

interface Props {
  ctx: EditorialContext;
  compact?: boolean;
}

function fmt(v: number | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

/**
 * Full identity card — reusable across Rankings, Profiles, Career Center,
 * Dashboards, Hall of Fame. Presentation-only; data comes from EditorialContext.
 */
export function ScoreIdentityCard({ ctx, compact = false }: Props) {
  const { identity, score, rankings } = ctx;
  const initial = (identity.name || "?").slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-lg font-semibold">
          {identity.photoUrl ? (
            <img src={identity.photoUrl} alt={identity.name} className="size-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-lg font-semibold" title={identity.name}>
              {identity.name}
            </h3>
            {identity.role && (
              <Badge variant="secondary" className="text-[10px]">
                {identity.role}
              </Badge>
            )}
            {score.grade && <Badge className="text-[10px]">{score.grade}</Badge>}
            {identity.kind === "player" && identity.age != null && (
              <Badge variant="outline" className="text-[10px]">
                {identity.age} anos
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {identity.club && (
              <span>
                Clube: <span className="text-foreground">{identity.club}</span>
              </span>
            )}
            {identity.country && (
              <span>
                País: <span className="text-foreground">{identity.country}</span>
              </span>
            )}
            {identity.competition && (
              <span>
                Competição: <span className="text-foreground">{identity.competition}</span>
              </span>
            )}
            {identity.continent && (
              <span>
                Continente: <span className="text-foreground">{identity.continent}</span>
              </span>
            )}
            {identity.type && (
              <span>
                Tipo: <span className="text-foreground">{identity.type}</span>
              </span>
            )}
            {identity.nationality && identity.nationality !== identity.country && (
              <span>
                Nacionalidade: <span className="text-foreground">{identity.nationality}</span>
              </span>
            )}
          </div>

          {!compact && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi label="Score" value={fmt(score.value)} />
              <Kpi label="Percentil" value={fmt(score.percentile, 1)} />
              <Kpi label="Classe" value={score.grade ?? "—"} />
              <Kpi label="Confiança" value={fmt(ctx.confidence.level * 100, 0)} />
            </div>
          )}

          {!compact && (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Kpi
                label="Mundial"
                value={rankings.world ? `#${rankings.world.rank}/${rankings.world.total}` : "—"}
              />
              <Kpi
                label="Continental"
                value={rankings.continental ? `#${rankings.continental.rank}` : "—"}
              />
              <Kpi
                label="Nacional"
                value={rankings.national ? `#${rankings.national.rank}` : "—"}
              />
              <Kpi
                label="Competição"
                value={rankings.competition ? `#${rankings.competition.rank}` : "—"}
              />
              <Kpi label="Clube" value={rankings.club ? `#${rankings.club.rank}` : "—"} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
