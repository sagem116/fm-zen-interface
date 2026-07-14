import { Brain, Zap, Shield, Trophy, Sparkles, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashboardCard } from "./DashboardCard";

export interface SmartProfiles {
  offensiveClub: { name: string; value: number } | null;
  defensiveClub: { name: string; value: number } | null;
  highestScoringLeague: { name: string; value: number } | null;
  regularCoach: { name: string; value: number } | null;
  revelation: { name: string; value: number } | null;
}

function Row({
  icon: Icon,
  label,
  name,
  sub,
  href,
}: {
  icon: typeof Zap;
  label: string;
  name?: string;
  sub: string;
  href?: { to: string; params?: Record<string, string> };
}) {
  const content = (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
      <Icon className="size-4 text-gold shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-medium text-sm truncate">{name ?? "—"}</p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{sub}</span>
    </div>
  );

  return href ? (
    <Link
      to={href.to as any}
      params={href.params as any}
      className="block hover:bg-muted/40 rounded-md -mx-2 px-2"
      search={true}
    >
      {content}
    </Link>
  ) : (
    content
  );
}

export function DashboardSmartProfiles({ smart }: { smart: SmartProfiles }) {
  return (
    <DashboardCard
      title="Perfil Inteligente"
      icon={Brain}
      action={{ to: "/intelligence-studio", label: "Estúdio" }}
    >
      <div>
        <Row
          icon={Zap}
          label="Clube mais ofensivo"
          name={smart.offensiveClub?.name}
          sub={smart.offensiveClub ? `${smart.offensiveClub.value} GM` : "—"}
          href={
            smart.offensiveClub
              ? { to: "/clubes/$name", params: { name: smart.offensiveClub.name } }
              : undefined
          }
        />
        <Row
          icon={Shield}
          label="Melhor defesa"
          name={smart.defensiveClub?.name}
          sub={smart.defensiveClub ? `${smart.defensiveClub.value} GS` : "—"}
          href={
            smart.defensiveClub
              ? { to: "/clubes/$name", params: { name: smart.defensiveClub.name } }
              : undefined
          }
        />
        <Row
          icon={Trophy}
          label="Liga mais goleadora"
          name={smart.highestScoringLeague?.name}
          sub={
            smart.highestScoringLeague ? `${smart.highestScoringLeague.value.toFixed(2)} g/j` : "—"
          }
          href={
            smart.highestScoringLeague
              ? { to: "/competicoes/$name", params: { name: smart.highestScoringLeague.name } }
              : undefined
          }
        />
        <Row
          icon={Users}
          label="Treinador mais regular"
          name={smart.regularCoach?.name}
          sub={smart.regularCoach ? `${smart.regularCoach.value} épocas` : "—"}
          href={
            smart.regularCoach
              ? { to: "/treinadores/$name", params: { name: smart.regularCoach.name } }
              : undefined
          }
        />
        <Row
          icon={Sparkles}
          label="Jogador revelação"
          name={smart.revelation?.name}
          sub={smart.revelation ? `${smart.revelation.value} G+A` : "—"}
          href={
            smart.revelation
              ? { to: "/jogadores/$name", params: { name: smart.revelation.name } }
              : undefined
          }
        />
      </div>
    </DashboardCard>
  );
}
