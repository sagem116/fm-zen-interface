import { useEffect, useMemo, useState } from "react";
import type { ProfileContext } from "@/lib/profile/types";
import { usePlayerStatsData } from "@/lib/usePlayerStatsData";
import { buildTemporalMetrics } from "@/lib/profile/temporal";
import { MetricSelector } from "./MetricSelector";
import { TimelineChart } from "./TimelineChart";
import { TimelineTable } from "./TimelineTable";
import { TimelineSummary } from "./TimelineSummary";
import { SeasonComparison } from "./SeasonComparison";

export function TemporalEvolutionPanel({ ctx }: { ctx: ProfileContext }) {
  const statsQuery = usePlayerStatsData();

  const metrics = useMemo(
    () =>
      buildTemporalMetrics(ctx, {
        playerRows: statsQuery.data?.players ?? [],
        competitionRows: statsQuery.data?.competitions ?? [],
      }),
    [ctx, statsQuery.data?.competitions, statsQuery.data?.players],
  );

  const [metricKey, setMetricKey] = useState<string>(metrics[0]?.key ?? "");

  useEffect(() => {
    if (!metrics.length) {
      setMetricKey("");
      return;
    }
    if (!metrics.some((metric) => metric.key === metricKey)) setMetricKey(metrics[0].key);
  }, [metrics, metricKey]);

  const selected = metrics.find((metric) => metric.key === metricKey) ?? metrics[0] ?? null;

  if (statsQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        A carregar evolução temporal...
      </p>
    );
  }

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Sem métricas temporais disponíveis para esta entidade.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Evolução Temporal
        </h3>
        <MetricSelector metrics={metrics} metricKey={selected.key} onChange={setMetricKey} />
      </div>

      <TimelineChart points={selected.points} label={selected.label} />
      <TimelineSummary points={selected.points} />
      <SeasonComparison points={selected.points} />
      <TimelineTable points={selected.points} />
    </div>
  );
}
