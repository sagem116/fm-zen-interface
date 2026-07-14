import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Trophy, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProfileContext } from "@/lib/profile/types";

interface Event {
  year: number;
  label: string;
  detail?: string;
  link?: { to: string; params?: Record<string, string> };
  icon: "champion" | "continental" | "record";
}

export function TimelineTab({ ctx }: { ctx: ProfileContext }) {
  const events = useMemo(() => buildEvents(ctx), [ctx]);
  if (!events.length) {
    return <p className="text-sm text-muted-foreground">Sem acontecimentos registados.</p>;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cronologia</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l border-border/60 space-y-3 pl-4">
          {events.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-gold" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">{e.year}</span>
                {iconFor(e.icon)}
              </div>
              <p className="text-sm font-medium leading-tight">
                {e.link ? (
                  <Link
                    to={e.link.to as any}
                    params={e.link.params as any}
                    className="hover:text-primary"
                    search={true}
                  >
                    {e.label}
                  </Link>
                ) : (
                  e.label
                )}
              </p>
              {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function iconFor(k: Event["icon"]) {
  if (k === "champion") return <Crown className="size-3 text-gold" />;
  if (k === "continental") return <Trophy className="size-3 text-gold" />;
  return <Star className="size-3 text-primary" />;
}

function buildEvents(ctx: ProfileContext): Event[] {
  const { data, kind, name } = ctx;
  const events: Event[] = [];
  if (kind === "club") {
    for (const s of data.data.standings) {
      if (s.club_name === name && s.is_champion) {
        const label =
          s.competition ||
          (s.module === "superleague"
            ? `Super League${s.division_num ? ` Div. ${s.division_num}` : ""}`
            : s.division_label || "Liga Nacional");
        events.push({
          year: s.season_year,
          label: `Campeão · ${label}`,
          icon: "champion",
          link: { to: "/competicoes/$name", params: { name: label } },
        });
      }
    }
    for (const c of data.data.continental) {
      const loser = c.team1 === c.winner ? c.team2 : c.team1;
      if (c.winner === name)
        events.push({
          year: c.season_year,
          label: `Vencedor · ${c.competition}`,
          icon: "continental",
          link: { to: "/competicoes/$name", params: { name: c.competition } },
        });
      else if ((c.team1 === name || c.team2 === name) && c.winner && c.winner !== name)
        events.push({
          year: c.season_year,
          label: `Finalista · ${c.competition}`,
          detail: `Perdeu para ${c.winner}${loser ? "" : ""}`,
          icon: "continental",
        });
    }
  } else if (kind === "coach") {
    for (const c of data.data.coaches ?? []) {
      if (c.name === name && c.club_name) {
        // check if that club won that season
        const champ = data.data.standings.find(
          (s) => s.club_name === c.club_name && s.season_year === c.season_year && s.is_champion,
        );
        if (champ) {
          const label =
            champ.competition ||
            (champ.module === "superleague"
              ? `Super League${champ.division_num ? ` Div. ${champ.division_num}` : ""}`
              : champ.division_label || "Liga Nacional");
          events.push({
            year: c.season_year,
            label: `Campeão com ${c.club_name} · ${label}`,
            icon: "champion",
            link: { to: "/clubes/$name", params: { name: c.club_name } },
          });
        }
      }
    }
  } else if (kind === "country") {
    for (const c of data.data.continental) {
      if (c.winner && data.data.clubCountry[c.winner] === name) {
        events.push({
          year: c.season_year,
          label: `${c.winner} vence ${c.competition}`,
          icon: "continental",
          link: { to: "/clubes/$name", params: { name: c.winner } },
        });
      }
    }
  } else if (kind === "competition") {
    for (const s of data.data.standings) {
      if (
        s.is_champion &&
        (s.competition === name ||
          s.division_label === name ||
          (s.module === "superleague" &&
            s.division_num != null &&
            `Div. ${s.division_num}` === name))
      ) {
        events.push({
          year: s.season_year,
          label: `Campeão · ${s.club_name}`,
          icon: "champion",
          link: { to: "/clubes/$name", params: { name: s.club_name } },
        });
      }
    }
    for (const c of data.data.continental) {
      if (c.competition === name && c.winner) {
        events.push({
          year: c.season_year,
          label: `Vencedor · ${c.winner}`,
          icon: "continental",
          link: { to: "/clubes/$name", params: { name: c.winner } },
        });
      }
    }
  } else if (kind === "player") {
    for (const p of data.data.players ?? []) {
      if (p.name !== name || !p.club_name) continue;
      events.push({
        year: p.season_year,
        label: `${p.club_name}`,
        detail: `${p.gls}G · ${p.ast}A · CA ${p.ca}`,
        icon: "record",
        link: { to: "/clubes/$name", params: { name: p.club_name } },
      });
    }
  }
  return events.sort((a, b) => b.year - a.year);
}
