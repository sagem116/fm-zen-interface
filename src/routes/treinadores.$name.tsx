import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Loader2, Users } from "lucide-react";
import { useRankings } from "@/lib/useRankings";
import { buildCoachProfile } from "@/lib/fm-profiles";
import { fmtPts } from "@/lib/fmt";
import { continentOf } from "@/lib/fm-continents";
import { buildRankingSummaryFromEvolution } from "@/lib/profile/ranking-summary";
import { ScoreNarrative } from "@/components/score-story/ScoreNarrative";
import { buildCoachNarrativeContext } from "@/lib/editorial";
import { buildHistoryFromEvolution, makeEditorialDefinition } from "@/lib/editorial/pageNarratives";
import { ProfileShell } from "@/components/profile/ProfileShell";
import "@/components/profile/tabs";
import type { ProfileContext } from "@/lib/profile/types";

export const Route = createFileRoute("/treinadores/$name")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: CoachProfilePage,
});

function CoachProfilePage() {
  const { name } = Route.useParams();
  const { data, isLoading } = useRankings();
  const profile = useMemo(
    () => (data ? buildCoachProfile(data.data, name, data.config) : null),
    [data, name],
  );

  const ctx = useMemo<ProfileContext | null>(() => {
    if (!data || !profile) return null;
    const rank = data.ranks.coaches.findIndex((c) => c.name === name);
    const rankEntry = data.ranks.coaches.find((c) => c.name === name) ?? null;
    const ranking = buildRankingSummaryFromEvolution(data.ranks.evolution.coaches, name);
    const latestCoachRow =
      [...data.data.coaches]
        .filter((c) => c.name === name)
        .sort((a, b) => b.season_year - a.season_year)[0] ?? null;
    const coachCountry = latestCoachRow?.nationality ?? null;
    const role = latestCoachRow?.club_role ?? latestCoachRow?.intl_role ?? null;
    return {
      kind: "coach",
      name: profile.name,
      data,
      profile,
      meta: {
        club: latestCoachRow?.club_name ?? null,
        country: coachCountry,
        continent: continentOf(coachCountry),
        role,
        currentSeason:
          latestCoachRow?.season_year != null ? String(latestCoachRow.season_year) : null,
      },
      currentRank: rank >= 0 ? rank + 1 : null,
      ranking,
      quickStats: [
        { label: "Ranking", value: rank >= 0 ? `#${rank + 1}` : "—" },
        { label: "Clube", value: latestCoachRow?.club_name ?? "—" },
        { label: "Nacionalidade", value: coachCountry ?? "—" },
        { label: "Reputação", value: rankEntry ? fmtPts(rankEntry.weighted) : "—" },
        { label: "Número de títulos", value: profile.titles },
      ],
    };
  }, [data, profile, name]);

  const narrativeCtx = useMemo(() => {
    if (!data || !profile) return null;
    const ranking = data.ranks.coaches;
    const entry = ranking.find((c) => c.name === profile.name);
    if (!entry) return null;

    const rank = ranking.findIndex((c) => c.name === profile.name) + 1;
    const history = buildHistoryFromEvolution(data.ranks.evolution.coaches, profile.name);

    return buildCoachNarrativeContext({
      identity: {
        name: profile.name,
        kind: "coach",
        club: profile.clubs[0] ?? undefined,
      },
      definition: makeEditorialDefinition("coach", "Coach Profile Narrative"),
      scoreValue: entry.weighted,
      rank: Math.max(rank, 1),
      totalRanked: Math.max(ranking.length, 1),
      history,
      peers: ranking.map((c) => ({ name: c.name, score: c.weighted })),
      career: {
        seasons: profile.seasonsCount,
        clubs: profile.clubs,
        titles: profile.titles,
        peakSeason: profile.chart.reduce(
          (best, p) => (p.weighted > best.weighted ? p : best),
          profile.chart[0] ?? {
            year: 0,
            weighted: 0,
            raw: 0,
            positionWeighted: null,
            positionRaw: null,
          },
        ).year,
        peakScore: profile.chart.reduce((best, p) => (p.weighted > best ? p.weighted : best), 0),
      },
    });
  }, [data, profile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" /> A carregar…
      </div>
    );
  }
  if (!ctx) return <p className="text-muted-foreground">Treinador não encontrado: {name}</p>;
  return (
    <ProfileShell
      ctx={ctx}
      icon={Users}
      backTo={{ to: "/treinadores", label: "Todos os treinadores" }}
      slot={
        narrativeCtx ? (
          <div className="space-y-4">
            <ScoreNarrative
              ctx={narrativeCtx}
              level="standard"
              preset="coach"
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
