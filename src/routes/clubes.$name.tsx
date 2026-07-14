import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Loader2, Shield } from "lucide-react";
import { useRankings } from "@/lib/useRankings";
import { buildClubProfile } from "@/lib/fm-profiles";
import { fmtPts } from "@/lib/fmt";
import { continentOf } from "@/lib/fm-continents";
import { buildRankingSummaryFromEvolution } from "@/lib/profile/ranking-summary";
import { ScoreNarrative } from "@/components/score-story/ScoreNarrative";
import { buildClubNarrativeContext } from "@/lib/editorial";
import {
  buildHistoryFromEvolution,
  makeEditorialDefinition,
  trendFromHistory,
} from "@/lib/editorial/pageNarratives";
import { ProfileShell } from "@/components/profile/ProfileShell";
import "@/components/profile/tabs";
import type { ProfileContext } from "@/lib/profile/types";
import { usePlayerUniverse } from "@/lib/player-universe";
import { reputationFor, loadReputations, loadClubAliases } from "@/lib/fm-club-reputation";
import { fmtNum } from "@/lib/fmt";

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export const Route = createFileRoute("/clubes/$name")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: ClubProfilePage,
});

function ClubProfilePage() {
  const { name } = Route.useParams();
  const { data, isLoading } = useRankings();
  const universe = usePlayerUniverse();
  const profile = useMemo(
    () => (data ? buildClubProfile(data.data, name, data.config) : null),
    [data, name],
  );

  const ctx = useMemo<ProfileContext | null>(() => {
    if (!data || !profile) return null;
    const rank = data.ranks.clubs.findIndex((c) => c.name === name);
    const rankEntry = data.ranks.clubs.find((c) => c.name === name) ?? null;
    const ranking = buildRankingSummaryFromEvolution(data.ranks.evolution.clubs, name);
    const currentStanding =
      [...data.data.standings]
        .filter((s) => s.club_name === name)
        .sort((a, b) => b.season_year - a.season_year)[0] ?? null;
    const latestSeason =
      currentStanding?.season_year ?? profile.chart[profile.chart.length - 1]?.year ?? null;
    const currentSquadValue = (() => {
      if (latestSeason == null) return 0;
      const universeValue = (universe.list ?? [])
        .filter((entry) => norm(entry.currentClub) === norm(name))
        .reduce((sum, entry) => {
          const seasonPoint = entry.history?.[latestSeason];
          const value = Number(seasonPoint?.value ?? 0);
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
      if (universeValue > 0) return universeValue;
      return data.data.players
        .filter((p) => p.club_name === name && p.season_year === latestSeason)
        .reduce((sum, p) => sum + (p.vp ?? 0), 0);
    })();
    const importedReputation = reputationFor(
      profile.name,
      loadClubAliases(),
      loadReputations(),
    );
    return {
      kind: "club",
      name: profile.name,
      data,
      profile,
      meta: {
        country: profile.country ?? null,
        league: currentStanding?.competition ?? currentStanding?.division_label ?? null,
        competition: currentStanding?.competition ?? null,
        continent: continentOf(profile.country ?? null),
        currentSeason: latestSeason != null ? String(latestSeason) : null,
      },
      currentRank: rank >= 0 ? rank + 1 : null,
      ranking,
      quickStats: [
        { label: "Ranking", value: rank >= 0 ? `#${rank + 1}` : "—" },
        { label: "País", value: profile.country ?? "—" },
        {
          label: "Liga",
          value: currentStanding?.competition ?? currentStanding?.division_label ?? "—",
        },
        {
          label: "Reputação",
          value: importedReputation == null ? "—" : fmtNum(importedReputation, 2),
        },
        {
          label: "Valor do Plantel",
          value: currentSquadValue > 0 ? fmtPts(currentSquadValue) : "—",
        },
        { label: "Número de títulos", value: profile.titles },
      ],
    };
  }, [data, profile, name, universe.list]);

  const narrativeCtx = useMemo(() => {
    if (!data || !profile) return null;
    const ranking = data.ranks.clubs;
    const entry = ranking.find((c) => c.name === profile.name);
    if (!entry) return null;

    const rank = ranking.findIndex((c) => c.name === profile.name) + 1;
    const history = buildHistoryFromEvolution(data.ranks.evolution.clubs, profile.name);

    return buildClubNarrativeContext({
      identity: {
        name: profile.name,
        kind: "club",
        country: profile.country ?? undefined,
      },
      definition: makeEditorialDefinition("club", "Club Profile Narrative"),
      scoreValue: entry.weighted,
      rank: Math.max(rank, 1),
      totalRanked: Math.max(ranking.length, 1),
      history,
      peers: ranking.map((c) => ({ name: c.name, score: c.weighted })),
      institution: {
        titles: profile.titles,
        continentalTitles: profile.continentalTitles,
        bestSeason: profile.chart.reduce(
          (best, p) => (p.weighted > best.weighted ? p : best),
          profile.chart[0] ?? {
            year: 0,
            weighted: 0,
            raw: 0,
            positionWeighted: null,
            positionRaw: null,
          },
        ).year,
        bestRank: profile.bestPosition ?? undefined,
        cyclePhase:
          trendFromHistory(history) === "rising"
            ? "rise"
            : trendFromHistory(history) === "declining"
              ? "decline"
              : "stable",
      },
    });
  }, [data, profile]);

  if (isLoading) return <Loading />;
  if (!ctx) return <NotFound label="Clube" name={name} />;
  return (
    <ProfileShell
      ctx={ctx}
      icon={Shield}
      backTo={{ to: "/clubes", label: "Todos os clubes" }}
      slot={
        narrativeCtx ? (
          <div className="space-y-4">
            <ScoreNarrative
              ctx={narrativeCtx}
              level="standard"
              preset="club"
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

function Loading() {
  return (
    <div className="flex items-center justify-center py-32 text-muted-foreground">
      <Loader2 className="size-6 animate-spin mr-2" /> A carregar…
    </div>
  );
}
function NotFound({ label, name }: { label: string; name: string }) {
  return (
    <p className="text-muted-foreground">
      {label} não encontrado: {name}
    </p>
  );
}
