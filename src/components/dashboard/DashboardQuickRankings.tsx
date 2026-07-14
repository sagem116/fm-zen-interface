import { Shield, Users, Globe2, Trophy, User as UserIcon, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashboardCard } from "./DashboardCard";
import { Sparkline } from "@/components/Sparkline";
import { fmtPts } from "@/lib/fmt";
import type { RankingEntry } from "@/lib/fm-rankings";

interface MiniListProps {
  title: string;
  icon: typeof Shield;
  entries: RankingEntry[];
  evolution?: Record<string, Record<number, number>>;
  years?: number[];
  hrefBase?: string;
  action?: { to: string; label?: string };
  formatValue?: (e: RankingEntry) => string;
}

function MiniList({
  title,
  icon: Icon,
  entries,
  evolution,
  years,
  hrefBase,
  action,
  formatValue,
}: MiniListProps) {
  return (
    <DashboardCard title={title} icon={Icon} action={action} compact>
      <div className="space-y-0.5">
        {entries.slice(0, 6).map((e, i) => {
          const evo = evolution?.[e.name] ?? {};
          const series = (years ?? []).map((y) => evo[y] ?? 0);
          const body = (
            <>
              <span
                className={`w-5 text-center font-bold tabular-nums ${i < 3 ? "text-gold" : "text-muted-foreground"}`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate">{e.name}</span>
              {series.length > 1 && <Sparkline values={series} />}
              <span className="font-semibold tabular-nums w-16 text-right">
                {formatValue ? formatValue(e) : fmtPts(e.weighted)}
              </span>
            </>
          );
          return (
            <div
              key={e.name}
              className="flex items-center gap-3 py-1 text-sm border-b border-border/40 last:border-0"
            >
              {hrefBase ? (
                <Link
                  to={hrefBase as any}
                  params={{ name: e.name } as any}
                  className="flex items-center gap-3 w-full hover:text-gold"
                  search={true}
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">Sem dados.</p>
        )}
      </div>
    </DashboardCard>
  );
}

interface Props {
  clubs: RankingEntry[];
  coaches: RankingEntry[];
  countries: RankingEntry[];
  evolution: {
    clubs: Record<string, Record<number, number>>;
    coaches: Record<string, Record<number, number>>;
    countries: Record<string, Record<number, number>>;
  };
  years: number[];
  topPlayers?: Array<{ name: string; goals: number; assists?: number }>;
  topCompetitions?: Array<{ name: string; clubs: number }>;
}

export function DashboardQuickRankings({
  clubs,
  coaches,
  countries,
  evolution,
  years,
  topPlayers = [],
  topCompetitions = [],
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MiniList
        title="Top Clubes"
        icon={Shield}
        entries={clubs}
        evolution={evolution.clubs}
        years={years}
        hrefBase="/clubes/$name"
        action={{ to: "/rankings" }}
      />
      <MiniList
        title="Top Treinadores"
        icon={Users}
        entries={coaches}
        evolution={evolution.coaches}
        years={years}
        hrefBase="/treinadores/$name"
        action={{ to: "/rankings" }}
      />
      <MiniList
        title="Top Países"
        icon={Globe2}
        entries={countries}
        evolution={evolution.countries}
        years={years}
        hrefBase="/paises/$name"
        action={{ to: "/rankings" }}
      />
      <MiniList
        title="Top Jogadores (G+A)"
        icon={UserIcon}
        entries={
          topPlayers.map((p) => ({
            name: p.name,
            raw: p.goals + (p.assists ?? 0),
            weighted: p.goals + (p.assists ?? 0),
            titles: 0,
          })) as RankingEntry[]
        }
        hrefBase="/jogadores/$name"
        action={{ to: "/estatisticas" }}
        formatValue={(e) => `${e.raw} gls`}
      />
      <MiniList
        title="Top Competições"
        icon={Award}
        entries={
          topCompetitions.map((c) => ({
            name: c.name,
            raw: c.clubs,
            weighted: c.clubs,
            titles: 0,
          })) as RankingEntry[]
        }
        hrefBase="/competicoes/$name"
        action={{ to: "/estatisticas" }}
        formatValue={(e) => `${e.raw} clubes`}
      />
      <DashboardCard
        title="Ver todos os rankings"
        icon={Trophy}
        action={{ to: "/rankings", label: "Abrir" }}
        compact
      >
        <p className="text-xs text-muted-foreground">
          Explora os rankings completos, filtros por época, competição, país e configuração ativa.
        </p>
      </DashboardCard>
    </div>
  );
}
