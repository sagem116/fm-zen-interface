import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Loader2, Trophy } from "lucide-react";
import { useRankings } from "@/lib/useRankings";
import { fmtNum } from "@/lib/fmt";
import { ScoreNarrative } from "@/components/score-story/ScoreNarrative";
import { loadCompetitionReputationsSync } from "@/lib/fm-competition-reputation";
import { buildCompetitionNarrativeContext } from "@/lib/editorial";
import { makeEditorialDefinition, trendFromHistory } from "@/lib/editorial/pageNarratives";
import { ProfileShell } from "@/components/profile/ProfileShell";
import "@/components/profile/tabs";
import type { ProfileContext } from "@/lib/profile/types";

export const Route = createFileRoute("/competicoes/$name")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: CompetitionPage,
});

function CompetitionPage() {
  const { name } = Route.useParams();
  const decoded = decodeURIComponent(name);
  const { data, isLoading } = useRankings();

  const ctx = useMemo<ProfileContext | null>(() => {
    if (!data) return null;
    const cont = data.data.continental.filter((c) => c.competition === decoded);
    const intl = (data.data.international ?? []).filter((c) => c.competition === decoded);
    const champs = data.data.standings.filter(
      (s) =>
        s.is_champion &&
        (s.competition === decoded ||
          s.division_label === decoded ||
          (s.module === "superleague" &&
            s.division_num != null &&
            `Div. ${s.division_num}` === decoded)),
    );
    const editions = cont.length || intl.length || champs.length;
    const kindLabel = cont.length
      ? "Continental"
      : intl.length
        ? "Internacional"
        : champs[0]?.module === "superleague"
          ? "Super League"
          : champs.length
            ? "Liga Nacional"
            : "Competição";
    const totalByCompetition = new Map<string, number>();
    for (const c of data.data.continental) {
      totalByCompetition.set(c.competition, (totalByCompetition.get(c.competition) ?? 0) + 1);
    }
    for (const c of data.data.international ?? []) {
      totalByCompetition.set(c.competition, (totalByCompetition.get(c.competition) ?? 0) + 1);
    }
    for (const s of data.data.standings) {
      const key =
        s.competition ??
        s.division_label ??
        (s.module === "superleague" && s.division_num != null ? `Div. ${s.division_num}` : null);
      if (!key || !s.is_champion) continue;
      totalByCompetition.set(key, (totalByCompetition.get(key) ?? 0) + 1);
    }
    const peers = [...totalByCompetition.entries()].sort((a, b) => b[1] - a[1]);
    const currentRankIdx = peers.findIndex(([n]) => n === decoded);
    const currentRank = currentRankIdx >= 0 ? currentRankIdx + 1 : null;
    const scoreValue = totalByCompetition.get(decoded) ?? 0;

    const perSeason = new Map<number, number>();
    for (const c of cont) perSeason.set(c.season_year, (perSeason.get(c.season_year) ?? 0) + 1);
    for (const c of intl) perSeason.set(c.season_year, (perSeason.get(c.season_year) ?? 0) + 1);
    for (const s of champs) perSeason.set(s.season_year, (perSeason.get(s.season_year) ?? 0) + 1);
    const years = [...perSeason.keys()].sort((a, b) => a - b);
    const latestYear = years.length ? years[years.length - 1] : null;
    const previousYear = years.length > 1 ? years[years.length - 2] : null;
    const current = latestYear != null ? (perSeason.get(latestYear) ?? null) : null;
    const previous = previousYear != null ? (perSeason.get(previousYear) ?? null) : null;
    const best = years.length ? Math.max(...years.map((y) => perSeason.get(y) ?? 0)) : null;
    const deltaVsPrevious = current != null && previous != null ? current - previous : null;
    const trend =
      deltaVsPrevious == null
        ? "na"
        : deltaVsPrevious > 0
          ? "up"
          : deltaVsPrevious < 0
            ? "down"
            : "stable";

    const winners = new Set([
      ...cont.filter((c) => c.winner).map((c) => c.winner!),
      ...intl.filter((c) => c.winner).map((c) => c.winner!),
      ...champs.map((s) => s.club_name),
    ]);

    const compReps = loadCompetitionReputationsSync();
    const importedReputation = compReps[decoded] ?? null;

    return {
      kind: "competition",
      name: decoded,
      data,
      profile: null,
      meta: {
        description: kindLabel,
        competition: decoded,
        currentSeason: latestYear != null ? String(latestYear) : null,
      },
      currentRank,
      ranking: {
        current: currentRank,
        best: currentRank,
        previous: null,
        trend,
        deltaVsPrevious,
      },
      quickStats: [
        { label: "Ranking", value: currentRank != null ? `#${currentRank}` : "—" },
        { label: "Competição", value: decoded },
        { label: "Tipo", value: kindLabel },
        {
          label: "Reputação",
          value: importedReputation == null ? "—" : fmtNum(importedReputation, 2),
        },
        { label: "Edições", value: editions },
        { label: "Vencedores distintos", value: winners.size },
      ],
    };
  }, [data, decoded]);

  const narrativeCtx = useMemo(() => {
    if (!data) return null;

    const cont = data.data.continental.filter((c) => c.competition === decoded);
    const intl = (data.data.international ?? []).filter((c) => c.competition === decoded);
    const champs = data.data.standings.filter(
      (s) =>
        s.is_champion &&
        (s.competition === decoded ||
          s.division_label === decoded ||
          (s.module === "superleague" &&
            s.division_num != null &&
            `Div. ${s.division_num}` === decoded)),
    );

    const totalByCompetition = new Map<string, number>();
    for (const c of data.data.continental)
      totalByCompetition.set(c.competition, (totalByCompetition.get(c.competition) ?? 0) + 1);
    for (const c of data.data.international ?? [])
      totalByCompetition.set(c.competition, (totalByCompetition.get(c.competition) ?? 0) + 1);
    for (const s of data.data.standings) {
      const key =
        s.competition ??
        s.division_label ??
        (s.module === "superleague" && s.division_num != null ? `Div. ${s.division_num}` : null);
      if (!key || !s.is_champion) continue;
      totalByCompetition.set(key, (totalByCompetition.get(key) ?? 0) + 1);
    }

    const peers = [...totalByCompetition.entries()].map(([competition, score]) => ({
      name: competition,
      score,
    }));
    peers.sort((a, b) => b.score - a.score);
    const scoreValue = totalByCompetition.get(decoded) ?? 0;
    const rank = Math.max(1, peers.findIndex((p) => p.name === decoded) + 1);

    const perSeason = new Map<number, number>();
    for (const c of cont) perSeason.set(c.season_year, (perSeason.get(c.season_year) ?? 0) + 1);
    for (const c of intl) perSeason.set(c.season_year, (perSeason.get(c.season_year) ?? 0) + 1);
    for (const s of champs) perSeason.set(s.season_year, (perSeason.get(s.season_year) ?? 0) + 1);
    const history = [...perSeason.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([season, score]) => ({ season, score }));

    const topClubs = [
      ...new Set([
        ...cont.flatMap((c) => [c.team1, c.team2]).filter((club): club is string => Boolean(club)),
        ...champs.map((s) => s.club_name),
      ]),
    ].slice(0, 2);

    return buildCompetitionNarrativeContext({
      identity: {
        name: decoded,
        kind: "competition",
        type: ctx?.meta.description ?? undefined,
      },
      definition: makeEditorialDefinition("competition", "Competition Profile Narrative"),
      scoreValue,
      rank,
      totalRanked: Math.max(peers.length, 1),
      history,
      peers,
      competitionProfile: {
        seasonsTracked: history.length,
        topClubs,
        avgStrength: scoreValue,
        strengthTrend: trendFromHistory(history),
        competitionKind: ctx?.meta.description ?? undefined,
      },
    });
  }, [ctx?.meta.description, data, decoded]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" /> A carregar…
      </div>
    );
  }
  if (!ctx) return <p className="text-muted-foreground">Competição não encontrada: {decoded}</p>;
  return (
    <ProfileShell
      ctx={ctx}
      icon={Trophy}
      backTo={{ to: "/rankings", label: "Voltar" }}
      slot={
        narrativeCtx ? (
          <div className="space-y-4">
            <ScoreNarrative
              ctx={narrativeCtx}
              level="standard"
              preset="competition"
              title="Narrativa Editorial"
            />
            <ScoreNarrative
              ctx={narrativeCtx}
              level="standard"
              preset="explain"
              mode="explain"
              title="Explain Mode"
            />
          </div>
        ) : null
      }
    />
  );
}
