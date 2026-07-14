import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Sparkles, ChevronDown, TrendingUp, TrendingDown, Crown, Zap, Flame } from "lucide-react";
import type { BreakdownItem, RankingEntry } from "@/lib/fm-rankings";
import {
  computeMovers,
  dominanceByCompetition,
  leadershipChanges,
  sustainedTrend,
} from "@/lib/fm-rankings-analysis";
import { fmtPts } from "@/lib/fmt";

interface Props {
  entries: RankingEntry[];
  evolution: Record<string, Record<number, number>>;
  years: number[];
  breakdown?: Record<string, BreakdownItem[]>;
  onPick?: (name: string) => void;
}

/** Collapsible panel with auto-generated insights over the filtered dataset. */
export function RankingsInsightsPanel({ entries, evolution, years, breakdown, onPick }: Props) {
  const [open, setOpen] = useState(false);

  const movers = useMemo(
    () => computeMovers(entries, evolution, years),
    [entries, evolution, years],
  );
  const risingSustained = useMemo(
    () => sustainedTrend(entries, evolution, years, 3, "up").slice(0, 5),
    [entries, evolution, years],
  );
  const fallingSustained = useMemo(
    () => sustainedTrend(entries, evolution, years, 3, "down").slice(0, 5),
    [entries, evolution, years],
  );
  const changes = useMemo(
    () => leadershipChanges(evolution, years).filter((c) => c.changed),
    [evolution, years],
  );
  const dominance = useMemo(
    () => (breakdown ? dominanceByCompetition(breakdown).slice(0, 5) : []),
    [breakdown],
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="p-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 text-sm font-medium hover:text-primary"
          >
            <Sparkles className="size-4 text-primary" />
            Insights automáticos
            <span className="text-xs text-muted-foreground">
              — quem mais evoluiu, quem caiu, dominância e mudanças de liderança
            </span>
            <ChevronDown className="size-4 ml-auto opacity-60 transition-transform data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InsightBlock
              icon={<TrendingUp className="size-3.5 text-emerald-500" />}
              title="Quem mais evoluiu (última época)"
              items={movers.risers.slice(0, 5).map((m) => ({
                name: m.name,
                info: `${m.rankDelta && m.rankDelta > 0 ? `+${m.rankDelta} pos · ` : ""}+${fmtPts(m.ptsDelta)} pts`,
              }))}
              onPick={onPick}
            />
            <InsightBlock
              icon={<TrendingDown className="size-3.5 text-rose-500" />}
              title="Quem mais perdeu (última época)"
              items={movers.fallers.slice(0, 5).map((m) => ({
                name: m.name,
                info: `${m.rankDelta && m.rankDelta < 0 ? `${m.rankDelta} pos · ` : ""}${fmtPts(m.ptsDelta)} pts`,
              }))}
              onPick={onPick}
            />
            <InsightBlock
              icon={<Flame className="size-3.5 text-orange-500" />}
              title="Em ascensão sustentada (3 épocas)"
              items={risingSustained.map((r) => ({
                name: r.name,
                info: `+${fmtPts(r.slope)} pts/ép`,
              }))}
              onPick={onPick}
            />
            <InsightBlock
              icon={<Zap className="size-3.5 text-amber-500" />}
              title="Em declínio sustentado (3 épocas)"
              items={fallingSustained.map((r) => ({
                name: r.name,
                info: `${fmtPts(r.slope)} pts/ép`,
              }))}
              onPick={onPick}
            />
            {dominance.length > 0 && (
              <InsightBlock
                icon={<Crown className="size-3.5 text-gold" />}
                title="Dominância por competição"
                items={dominance.map((d) => ({
                  name: d.leader,
                  info: `${d.competition} · ${Math.round(d.share * 100)}%`,
                }))}
                onPick={onPick}
              />
            )}
            {changes.length > 0 && (
              <InsightBlock
                icon={<Sparkles className="size-3.5 text-primary" />}
                title="Mudanças de liderança"
                items={changes
                  .slice(-5)
                  .reverse()
                  .map((c) => ({
                    name: c.leader,
                    info: `Época ${c.year} · ${fmtPts(c.value)} pts`,
                  }))}
                onPick={onPick}
              />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground pt-3 border-t border-border/50 mt-3">
            Insights derivados exclusivamente dos resultados oficiais do motor de Rankings sobre os
            filtros ativos.
          </p>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function InsightBlock({
  icon,
  title,
  items,
  onPick,
}: {
  icon: React.ReactNode;
  title: string;
  items: { name: string; info: string }[];
  onPick?: (name: string) => void;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
        {icon} {title}
      </div>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {onPick ? (
                <button
                  type="button"
                  onClick={() => onPick(it.name)}
                  className="truncate hover:text-primary hover:underline text-left"
                >
                  {it.name}
                </button>
              ) : (
                <span className="truncate">{it.name}</span>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                {it.info}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Sem dados suficientes.</p>
      )}
    </div>
  );
}

// keep Button import used-free by not importing it; retained for future toolbar actions
