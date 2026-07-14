import { useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScoreEntityKind } from "@/lib/scores";
import type { ScoreEvaluationEntry } from "./types";

interface Props {
  entries: ScoreEvaluationEntry[];
  entityKind: ScoreEntityKind;
  selectedEntityName: string;
  onSelectEntity: (name: string) => void;
}

function entityProfilePath(kind: ScoreEntityKind, name: string): string {
  const encoded = encodeURIComponent(name);
  if (kind === "player") return `/jogadores/${encoded}`;
  if (kind === "coach") return `/treinadores/${encoded}`;
  if (kind === "club") return `/clubes/${encoded}`;
  if (kind === "competition") return `/competicoes/${encoded}`;
  return `/paises/${encoded}`;
}

export function ScoreRanking({ entries, entityKind, selectedEntityName, onSelectEntity }: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    [entries],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 46,
    overscan: 12,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Ranking por Score</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem entidades para ranking.</p>
        ) : (
          <div ref={parentRef} className="h-[420px] overflow-auto rounded-md border">
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
              {virtualizer.getVirtualItems().map((item) => {
                const row = rows[item.index];
                const selected = row.entityName === selectedEntityName;
                return (
                  <div
                    key={`${row.entityName}-${row.rank}`}
                    className={`absolute left-0 top-0 flex w-full items-center justify-between border-b px-3 text-sm ${selected ? "bg-muted/60" : ""}`}
                    style={{ height: `${item.size}px`, transform: `translateY(${item.start}px)` }}
                  >
                    <button
                      className="flex min-w-0 items-center gap-2"
                      onClick={() => onSelectEntity(row.entityName)}
                    >
                      <span className="w-7 tabular-nums text-muted-foreground">{row.rank}</span>
                      <span className="truncate font-medium">{row.entityName}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{row.score.toFixed(1)}</Badge>
                      <Badge>{row.grade}</Badge>
                      {}
                      <Link
                        to={entityProfilePath(entityKind, row.entityName) as any}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        search={true}
                      >
                        Perfil
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
