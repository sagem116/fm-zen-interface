import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown } from "lucide-react";
import { useRankings } from "@/lib/useRankings";
import { usePlayerStatsData } from "@/lib/usePlayerStatsData";
import { fmtNum } from "@/lib/fmt";

interface Achievement {
  year: number;
  competition: string;
  club: string;
  kind: "national" | "continental";
}

interface Distinction {
  year: number;
  competition: string;
  award: "Melhor Marcador" | "Melhor Assistente" | "MVP";
  value: number;
}

interface PersonalRecord {
  label: string;
  value: number;
  year: number;
  competition: string;
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function PlayerAchievementsSection({ playerName }: { playerName: string }) {
  const { data } = useRankings();
  const { data: statsData } = usePlayerStatsData();

  const achievements = useMemo<Achievement[]>(() => {
    if (!data) return [];
    // Collect (year, club) pairs the player was at, from legacy players table
    const key = new Set<string>();
    for (const p of data.data.players) {
      if (p.name !== playerName || !p.club_name) continue;
      key.add(`${p.season_year}|${p.club_name}`);
    }
    if (key.size === 0) return [];

    const out: Achievement[] = [];
    // National / SuperLeague titles: standings where champion=true and (year,club) matches
    for (const s of data.data.standings) {
      if (!s.is_champion) continue;
      if (!key.has(`${s.season_year}|${s.club_name}`)) continue;
      const label =
        s.competition ??
        (s.module === "superleague"
          ? s.division_num
            ? `Div. ${s.division_num}`
            : "Super League"
          : (s.division_label ?? "Liga Nacional"));
      out.push({ year: s.season_year, competition: label, club: s.club_name, kind: "national" });
    }
    // Continental winners
    for (const c of data.data.continental) {
      if (!c.winner) continue;
      if (!key.has(`${c.season_year}|${c.winner}`)) continue;
      out.push({
        year: c.season_year,
        competition: c.competition,
        club: c.winner,
        kind: "continental",
      });
    }
    return out.sort(
      (a, b) => b.year - a.year || a.competition.localeCompare(b.competition, "pt-PT"),
    );
  }, [data, playerName]);

  const distinctions = useMemo<Distinction[]>(() => {
    if (!statsData) return [];

    const grouped = new Map<string, typeof statsData.players>();
    for (const row of statsData.players) {
      const key = `${row.season_year}|${row.competition}`;
      const rows = grouped.get(key) ?? [];
      rows.push(row);
      grouped.set(key, rows);
    }

    const out: Distinction[] = [];
    for (const rows of grouped.values()) {
      const byPlayer = new Map<
        string,
        { name: string; gls: number; ast: number; ratingTotal: number; ratingN: number }
      >();
      for (const row of rows) {
        const key = norm(row.player_name);
        const cur = byPlayer.get(key) ?? {
          name: row.player_name,
          gls: 0,
          ast: 0,
          ratingTotal: 0,
          ratingN: 0,
        };
        cur.gls += row.gls ?? 0;
        cur.ast += row.ast ?? 0;
        if (row.avg_rating != null) {
          cur.ratingTotal += row.avg_rating;
          cur.ratingN += 1;
        }
        byPlayer.set(key, cur);
      }

      const all = [...byPlayer.values()];
      if (!all.length) continue;

      const topScorer = [...all].sort((a, b) => b.gls - a.gls)[0] ?? null;
      const topAssist = [...all].sort((a, b) => b.ast - a.ast)[0] ?? null;
      const mvp =
        [...all].sort(
          (a, b) =>
            (b.ratingN ? b.ratingTotal / b.ratingN : 0) -
            (a.ratingN ? a.ratingTotal / a.ratingN : 0),
        )[0] ?? null;

      const sample = rows[0];
      if (!sample) continue;

      if (topScorer && norm(topScorer.name) === norm(playerName) && topScorer.gls > 0) {
        out.push({
          year: sample.season_year,
          competition: sample.competition,
          award: "Melhor Marcador",
          value: topScorer.gls,
        });
      }
      if (topAssist && norm(topAssist.name) === norm(playerName) && topAssist.ast > 0) {
        out.push({
          year: sample.season_year,
          competition: sample.competition,
          award: "Melhor Assistente",
          value: topAssist.ast,
        });
      }
      if (mvp && mvp.ratingN > 0 && norm(mvp.name) === norm(playerName)) {
        out.push({
          year: sample.season_year,
          competition: sample.competition,
          award: "MVP",
          value: mvp.ratingTotal / mvp.ratingN,
        });
      }
    }

    return out.sort((a, b) => b.year - a.year || a.competition.localeCompare(b.competition, "pt-PT"));
  }, [statsData, playerName]);

  const records = useMemo<PersonalRecord[]>(() => {
    if (!statsData) return [];
    const mine = statsData.players.filter((row) => norm(row.player_name) === norm(playerName));
    if (!mine.length) return [];

    const bySeasonCompetition = new Map<
      string,
      { season: number; competition: string; games: number; goals: number; assists: number; ratingTotal: number; ratingN: number }
    >();
    for (const row of mine) {
      const key = `${row.season_year}|${row.competition}`;
      const cur = bySeasonCompetition.get(key) ?? {
        season: row.season_year,
        competition: row.competition,
        games: 0,
        goals: 0,
        assists: 0,
        ratingTotal: 0,
        ratingN: 0,
      };
      cur.games += row.games ?? 0;
      cur.goals += row.gls ?? 0;
      cur.assists += row.ast ?? 0;
      if (row.avg_rating != null) {
        cur.ratingTotal += row.avg_rating;
        cur.ratingN += 1;
      }
      bySeasonCompetition.set(key, cur);
    }

    const points = [...bySeasonCompetition.values()];
    const bestGames = [...points].sort((a, b) => b.games - a.games)[0] ?? null;
    const bestGoals = [...points].sort((a, b) => b.goals - a.goals)[0] ?? null;
    const bestAssists = [...points].sort((a, b) => b.assists - a.assists)[0] ?? null;
    const bestRating =
      [...points].sort(
        (a, b) =>
          (b.ratingN ? b.ratingTotal / b.ratingN : 0) - (a.ratingN ? a.ratingTotal / a.ratingN : 0),
      )[0] ?? null;

    const out: PersonalRecord[] = [];
    if (bestGames)
      out.push({
        label: "Mais Jogos",
        value: bestGames.games,
        year: bestGames.season,
        competition: bestGames.competition,
      });
    if (bestGoals)
      out.push({
        label: "Mais Golos",
        value: bestGoals.goals,
        year: bestGoals.season,
        competition: bestGoals.competition,
      });
    if (bestAssists)
      out.push({
        label: "Mais Assistências",
        value: bestAssists.assists,
        year: bestAssists.season,
        competition: bestAssists.competition,
      });
    if (bestRating && bestRating.ratingN > 0)
      out.push({
        label: "Melhor Média",
        value: bestRating.ratingTotal / bestRating.ratingN,
        year: bestRating.season,
        competition: bestRating.competition,
      });

    return out;
  }, [statsData, playerName]);

  if (!achievements.length && !distinctions.length && !records.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="size-4 text-gold" /> Hall of Fame
          <Badge variant="outline" className="ml-2">
            {achievements.length + distinctions.length + records.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs uppercase">
              <th className="text-left p-3 w-20">Época</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Distinção</th>
              <th className="text-left p-3">Competição</th>
              <th className="text-left p-3">Clube</th>
              <th className="text-right p-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {achievements.map((a, i) => (
              <tr key={`achievement-${i}`} className="border-b border-border/50 hover:bg-muted/50">
                <td className="p-3 tabular-nums">{a.year}</td>
                <td className="p-3">Título</td>
                <td className="p-3">Campeão</td>
                <td className="p-3">
                  <Crown className="size-3 inline mr-1 text-gold" />
                  <Link
                    to="/competicoes/$name"
                    params={{ name: a.competition }}
                    className="hover:text-primary hover:underline"
                    search={{ tab: undefined }}
                  >
                    {a.competition}
                  </Link>
                </td>
                <td className="p-3 font-medium">
                  <Link
                    to="/clubes/$name"
                    params={{ name: a.club }}
                    className="hover:text-primary hover:underline"
                    search={{ tab: undefined }}
                  >
                    {a.club}
                  </Link>
                </td>
                <td className="p-3 text-right">—</td>
              </tr>
            ))}
            {distinctions.map((d, i) => (
              <tr key={`distinction-${i}`} className="border-b border-border/50 hover:bg-muted/50">
                <td className="p-3 tabular-nums">{d.year}</td>
                <td className="p-3">Prémio</td>
                <td className="p-3">{d.award}</td>
                <td className="p-3">
                  <Link
                    to="/competicoes/$name"
                    params={{ name: d.competition }}
                    className="hover:text-primary hover:underline"
                    search={{ tab: undefined }}
                  >
                    {d.competition}
                  </Link>
                </td>
                <td className="p-3">—</td>
                <td className="p-3 text-right tabular-nums">
                  {d.award === "MVP" ? fmtNum(d.value, 2) : fmtNum(d.value, 0)}
                </td>
              </tr>
            ))}
            {records.map((r, i) => (
              <tr key={`record-${i}`} className="border-b border-border/50 hover:bg-muted/50">
                <td className="p-3 tabular-nums">{r.year}</td>
                <td className="p-3">Recorde</td>
                <td className="p-3">{r.label}</td>
                <td className="p-3">
                  <Link
                    to="/competicoes/$name"
                    params={{ name: r.competition }}
                    className="hover:text-primary hover:underline"
                    search={{ tab: undefined }}
                  >
                    {r.competition}
                  </Link>
                </td>
                <td className="p-3">—</td>
                <td className="p-3 text-right tabular-nums">
                  {r.label === "Melhor Média" ? fmtNum(r.value, 2) : fmtNum(r.value, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
