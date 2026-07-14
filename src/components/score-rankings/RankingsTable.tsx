import { useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ScoreEntityKind } from "@/lib/scores";
import type { ScoreEvaluationEntry } from "@/components/scores/types";
import { cn } from "@/lib/utils";

export interface RankingRowExtras {
  age?: number;
  matches?: number;
  minutes?: number;
  club?: string;
  country?: string;
  competition?: string;
  previousScore?: number;
  deltaScore?: number;
  deltaRank?: number;
  percentile?: number;
}

interface Props {
  entries: ScoreEvaluationEntry[];
  entityKind: ScoreEntityKind;
  selectedEntityName?: string;
  onSelectEntity?: (name: string) => void;
  /** Optional per-entity metadata. Missing cells render "—". */
  extrasByEntity?: Record<string, RankingRowExtras>;
}

function entityProfilePath(kind: ScoreEntityKind, name: string): string {
  const encoded = encodeURIComponent(name);
  if (kind === "player") return `/jogadores/${encoded}`;
  if (kind === "coach") return `/treinadores/${encoded}`;
  if (kind === "club") return `/clubes/${encoded}`;
  if (kind === "competition") return `/competicoes/${encoded}`;
  return `/paises/${encoded}`;
}

function fmt(v: number | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

function pct(index: number, total: number): number {
  if (total <= 1 || index < 0) return 50;
  return Math.max(0, Math.min(100, (1 - index / (total - 1)) * 100));
}

/** Virtualized ranking table, reusable across profiles/dashboards. */
export function RankingsTable({
  entries,
  entityKind,
  selectedEntityName,
  onSelectEntity,
  extrasByEntity = {},
}: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rows = useMemo(() => entries.map((e, i) => ({ ...e, rank: i + 1 })), [entries]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Ranking ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem entidades para ranking.</p>
        ) : (
          <div className="rounded-md border">
            <div className="sticky top-0 z-10 grid grid-cols-[48px_1fr_100px_100px_120px_80px_80px_80px_80px_60px_60px_60px_60px_60px_88px] gap-2 border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>#</span>
              <span>Entidade</span>
              <span>Clube</span>
              <span>País</span>
              <span>Competição</span>
              <span className="text-right">Score</span>
              <span className="text-right">Último</span>
              <span className="text-right">Δ Score</span>
              <span className="text-right">Δ Rank</span>
              <span className="text-right">Perc.</span>
              <span className="text-center">Classe</span>
              <span className="text-right">Idade</span>
              <span className="text-right">Min.</span>
              <span className="text-right">Conf.</span>
              <span />
            </div>
            <div ref={parentRef} className="h-[560px] overflow-auto">
              <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
                {virtualizer.getVirtualItems().map((item) => {
                  const row = rows[item.index];
                  const extras = extrasByEntity[row.entityName] ?? {};
                  const selected = row.entityName === selectedEntityName;
                  const percentile = extras.percentile ?? pct(item.index, rows.length);
                  return (
                    <div
                      key={`${row.entityName}-${row.rank}`}
                      className={cn(
                        "absolute left-0 top-0 grid w-full grid-cols-[48px_1fr_100px_100px_120px_80px_80px_80px_80px_60px_60px_60px_60px_60px_88px] gap-2 border-b px-3 py-2 text-sm items-center",
                        selected && "bg-muted/60",
                      )}
                      style={{ height: `${item.size}px`, transform: `translateY(${item.start}px)` }}
                    >
                      <span className="tabular-nums text-muted-foreground">{row.rank}</span>
                      <button
                        type="button"
                        className="min-w-0 truncate text-left font-medium hover:underline"
                        onClick={() => onSelectEntity?.(row.entityName)}
                        title={row.entityName}
                      >
                        {row.entityName}
                      </button>
                      <span className="truncate text-xs text-muted-foreground">
                        {extras.club ?? "—"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {extras.country ?? "—"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {extras.competition ?? "—"}
                      </span>
                      <span className="text-right font-semibold tabular-nums">
                        {fmt(row.score)}
                      </span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        {fmt(extras.previousScore)}
                      </span>
                      <DeltaCell value={extras.deltaScore} />
                      <DeltaCell value={extras.deltaRank} invert />
                      <span className="text-right tabular-nums text-xs">{fmt(percentile, 0)}</span>
                      <span className="text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {row.grade}
                        </Badge>
                      </span>
                      <span className="text-right tabular-nums text-xs">{extras.age ?? "—"}</span>
                      <span className="text-right tabular-nums text-xs">
                        {extras.minutes ?? "—"}
                      </span>
                      <span className="text-right tabular-nums text-xs">
                        {fmt(row.confidence, 2)}
                      </span>
                      <div className="text-right">
                        <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                          {}
                          <Link
                            to={entityProfilePath(entityKind, row.entityName) as any}
                            search={true}
                          >
                            Perfil
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeltaCell({ value, invert = false }: { value?: number; invert?: boolean }) {
  if (value == null || !Number.isFinite(value))
    return <span className="text-right text-muted-foreground">—</span>;
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  const sign = value > 0 ? "+" : "";
  return (
    <span
      className={cn(
        "text-right tabular-nums text-xs",
        positive && "text-emerald-500",
        negative && "text-rose-500",
      )}
    >
      {sign}
      {value.toFixed(1)}
    </span>
  );
}
