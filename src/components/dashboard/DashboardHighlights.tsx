import { TrendingUp, TrendingDown, Star, Activity } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Link } from "@tanstack/react-router";

export interface HighlightsData {
  biggestRise: { name: string; delta: number } | null;
  biggestFall: { name: string; delta: number } | null;
  bestSeason: { name: string; year: number; value: number } | null;
  mostRegular: { name: string; std: number; mean: number } | null;
}

function Tile({
  icon: Icon,
  label,
  name,
  sub,
  accent,
  href,
}: {
  icon: typeof TrendingUp;
  label: string;
  name: string;
  sub: string;
  accent?: "up" | "down" | "gold";
  href?: string;
}) {
  const color =
    accent === "up" ? "text-emerald-500" : accent === "down" ? "text-rose-500" : "text-gold";
  const inner = (
    <div className="rounded-xl border border-border/60 p-3 hover:bg-muted/40 transition-colors h-full">
      <div className={`flex items-center gap-1.5 text-xs uppercase tracking-wider ${color}`}>
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="mt-1.5 font-display font-bold truncate">{name}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );

  return href ? (
    <Link to={href as any} params={{ name } as any} search={true}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function DashboardHighlights({ highlights }: { highlights: HighlightsData }) {
  return (
    <DashboardCard title="Destaques" icon={Star}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {highlights.biggestRise && (
          <Tile
            icon={TrendingUp}
            label="Maior crescimento"
            name={highlights.biggestRise.name}
            sub={`+${highlights.biggestRise.delta.toFixed(0)} pts na última época`}
            accent="up"
            href="/clubes/$name"
          />
        )}
        {highlights.biggestFall && (
          <Tile
            icon={TrendingDown}
            label="Maior declínio"
            name={highlights.biggestFall.name}
            sub={`${highlights.biggestFall.delta.toFixed(0)} pts na última época`}
            accent="down"
            href="/clubes/$name"
          />
        )}
        {highlights.bestSeason && (
          <Tile
            icon={Star}
            label="Melhor época"
            name={highlights.bestSeason.name}
            sub={`${highlights.bestSeason.year} · ${highlights.bestSeason.value.toFixed(0)} pts`}
            accent="gold"
            href="/clubes/$name"
          />
        )}
        {highlights.mostRegular && (
          <Tile
            icon={Activity}
            label="Maior regularidade"
            name={highlights.mostRegular.name}
            sub={`CV ${(highlights.mostRegular.std * 100).toFixed(0)}% · média ${highlights.mostRegular.mean.toFixed(0)}`}
            accent="gold"
            href="/clubes/$name"
          />
        )}
      </div>
    </DashboardCard>
  );
}
