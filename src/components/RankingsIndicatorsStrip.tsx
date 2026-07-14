import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Crown,
  TrendingUp,
  TrendingDown,
  Mountain,
  Sparkles,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import type { RankingEntry } from "@/lib/fm-rankings";
import {
  bestMoment,
  computeMovers,
  computePeaks,
  computeRegularity,
} from "@/lib/fm-rankings-analysis";
import { fmtPts } from "@/lib/fmt";

interface Props {
  entries: RankingEntry[];
  evolution: Record<string, Record<number, number>>;
  years: number[];
  mode: "weighted" | "raw";
  onPick?: (name: string) => void;
}

/** Compact indicator cards reacting to the filtered dataset. */
export function RankingsIndicatorsStrip({ entries, evolution, years, mode, onPick }: Props) {
  const leader = entries[0];
  const highest = useMemo(() => {
    let best: RankingEntry | undefined;
    for (const e of entries) {
      const v = mode === "raw" ? e.raw : e.weighted;
      const cv = best ? (mode === "raw" ? best.raw : best.weighted) : -Infinity;
      if (v > cv) best = e;
    }
    return best;
  }, [entries, mode]);
  const movers = useMemo(
    () => computeMovers(entries, evolution, years),
    [entries, evolution, years],
  );
  const peaks = useMemo(() => computePeaks(entries, evolution), [entries, evolution]);
  const reg = useMemo(() => computeRegularity(entries, evolution), [entries, evolution]);
  const moment = useMemo(() => bestMoment(entries, evolution), [entries, evolution]);

  const riser = movers.risers[0];
  const faller = movers.fallers[0];
  const peak = peaks[0];
  const regular = reg[0];

  const cards: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    sub?: string;
    name?: string;
    tone?: string;
  }[] = [
    {
      icon: Crown,
      label: "Líder atual",
      value: leader?.name ?? "—",
      sub: leader ? `${fmtPts(mode === "raw" ? leader.raw : leader.weighted)} pts` : undefined,
      name: leader?.name,
      tone: "text-gold",
    },
    {
      icon: Trophy,
      label: "Maior pontuação",
      value: highest?.name ?? "—",
      sub: highest ? `${fmtPts(mode === "raw" ? highest.raw : highest.weighted)} pts` : undefined,
      name: highest?.name,
    },
    {
      icon: TrendingUp,
      label: "Maior subida",
      value: riser?.name ?? "—",
      sub: riser
        ? `${riser.rankDelta && riser.rankDelta > 0 ? `+${riser.rankDelta} pos.` : ""} ${riser.ptsDelta > 0 ? `+${fmtPts(riser.ptsDelta)} pts` : ""}`.trim() ||
          "—"
        : undefined,
      name: riser?.name,
      tone: "text-emerald-500",
    },
    {
      icon: TrendingDown,
      label: "Maior descida",
      value: faller?.name ?? "—",
      sub: faller
        ? `${faller.rankDelta && faller.rankDelta < 0 ? `${faller.rankDelta} pos.` : ""} ${faller.ptsDelta < 0 ? `${fmtPts(faller.ptsDelta)} pts` : ""}`.trim() ||
          "—"
        : undefined,
      name: faller?.name,
      tone: "text-rose-500",
    },
    {
      icon: Mountain,
      label: "Maior pico histórico",
      value: peak?.name ?? "—",
      sub: peak ? `${fmtPts(peak.value)} pts (${peak.year})` : undefined,
      name: peak?.name,
    },
    {
      icon: ShieldCheck,
      label: "Maior regularidade",
      value: regular?.name ?? "—",
      sub: regular ? `${regular.seasons} épocas · CV ${(regular.cv * 100).toFixed(0)}%` : undefined,
      name: regular?.name,
    },
    {
      icon: Sparkles,
      label: "Melhor momento",
      value: moment?.name ?? "—",
      sub: moment ? `${fmtPts(moment.value)} pts (${moment.year})` : undefined,
      name: moment?.name,
      tone: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
      {cards.map((c) => {
        const Icon = c.icon;
        const clickable = c.name && onPick;
        return (
          <Card
            key={c.label}
            className={`p-2.5 min-w-0 ${clickable ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
            onClick={clickable ? () => onPick!(c.name!) : undefined}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Icon className={`size-3 ${c.tone ?? ""}`} /> {c.label}
            </div>
            <div className="text-sm font-semibold truncate mt-1" title={c.value}>
              {c.value}
            </div>
            {c.sub && <div className="text-[11px] text-muted-foreground truncate">{c.sub}</div>}
          </Card>
        );
      })}
    </div>
  );
}
