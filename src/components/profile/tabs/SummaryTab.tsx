import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/Sparkline";
import { fmtPts } from "@/lib/fmt";
import type { ProfileContext } from "@/lib/profile/types";

export function SummaryTab({ ctx }: { ctx: ProfileContext }) {
  const evo = useMemo(() => selectEvolution(ctx), [ctx]);
  const stats = useMemo(() => computeStats(evo.values), [evo.values]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Evolução resumida</CardTitle>
        </CardHeader>
        <CardContent>
          {evo.values.length > 1 ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-3xl font-bold tabular-nums">
                  {fmtPts(evo.values[evo.values.length - 1])}
                </p>
                <p className="text-xs text-muted-foreground">
                  {evo.years[0]} – {evo.years[evo.years.length - 1]}
                </p>
              </div>
              <Sparkline values={evo.values} width={520} height={64} />
              <p className="text-xs text-muted-foreground mt-2">
                {evo.values.length} épocas · média {fmtPts(stats.mean)} · pico {fmtPts(stats.max)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sem histórico agregado disponível.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cartões rápidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <MiniStat
            label="Ranking atual"
            value={ctx.currentRank != null ? `#${ctx.currentRank}` : "—"}
          />
          <MiniStat
            label="Melhor época"
            value={stats.bestYear ? `${stats.bestYear} · ${fmtPts(stats.max)}` : "—"}
          />
          <MiniStat
            label="Pior época"
            value={stats.worstYear ? `${stats.worstYear} · ${fmtPts(stats.min)}` : "—"}
          />
          <MiniStat
            label="Regularidade"
            value={
              stats.cv != null ? `${(100 - Math.min(100, stats.cv * 100)).toFixed(0)} / 100` : "—"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 pb-1 last:border-none">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function selectEvolution(ctx: ProfileContext): { years: number[]; values: number[] } {
  const { data, kind, name } = ctx;
  const evoMap: Record<string, Record<number, number>> | undefined =
    kind === "club"
      ? data.ranks.evolution.clubs
      : kind === "coach"
        ? data.ranks.evolution.coaches
        : kind === "country"
          ? data.ranks.evolution.countries
          : undefined;
  if (!evoMap || !evoMap[name]) return { years: [], values: [] };
  const years = Object.keys(evoMap[name])
    .map(Number)
    .sort((a, b) => a - b);
  return { years, values: years.map((y) => evoMap[name][y] ?? 0) };
}

function computeStats(values: number[]) {
  if (values.length === 0)
    return { mean: 0, max: 0, min: 0, bestYear: null, worstYear: null, cv: null };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  const cv = mean > 0 ? std / mean : null;
  return { mean, max, min, bestYear: null as number | null, worstYear: null as number | null, cv };
}
