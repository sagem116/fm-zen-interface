import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Loader2, Globe2 } from "lucide-react";
import { useRankings } from "@/lib/useRankings";
import { buildCountryProfile } from "@/lib/fm-profiles";
import { fmtPts } from "@/lib/fmt";
import { continentOf } from "@/lib/fm-continents";
import { buildRankingSummaryFromEvolution } from "@/lib/profile/ranking-summary";
import { ScoreNarrative } from "@/components/score-story/ScoreNarrative";
import { buildCountryNarrativeContext } from "@/lib/editorial";
import {
  buildHistoryFromEvolution,
  makeEditorialDefinition,
  trendFromHistory,
} from "@/lib/editorial/pageNarratives";
import { ProfileShell } from "@/components/profile/ProfileShell";
import "@/components/profile/tabs";
import type { ProfileContext } from "@/lib/profile/types";

export const Route = createFileRoute("/paises/$name")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: CountryProfilePage,
});

function CountryProfilePage() {
  const { name } = Route.useParams();
  const { data, isLoading } = useRankings();
  const profile = useMemo(
    () => (data ? buildCountryProfile(data.data, name, data.config) : null),
    [data, name],
  );

  const ctx = useMemo<ProfileContext | null>(() => {
    if (!data || !profile) return null;
    const rank = data.ranks.countries.findIndex((c) => c.name === name);
    const rankEntry = data.ranks.countries.find((c) => c.name === name) ?? null;
    const ranking = buildRankingSummaryFromEvolution(data.ranks.evolution.countries, name);
    const latestYear = profile.chart[profile.chart.length - 1]?.year ?? null;
    return {
      kind: "country",
      name: profile.name,
      data,
      profile,
      meta: {
        country: profile.name,
        continent: continentOf(profile.name),
        currentSeason: latestYear != null ? String(latestYear) : null,
      },
      currentRank: rank >= 0 ? rank + 1 : null,
      ranking,
      quickStats: [
        { label: "Ranking", value: rank >= 0 ? `#${rank + 1}` : "—" },
        { label: "País", value: profile.name },
        { label: "Continente", value: continentOf(profile.name) ?? "—" },
        { label: "Reputação", value: rankEntry ? fmtPts(rankEntry.weighted) : "—" },
        { label: "Número de títulos", value: profile.titles },
      ],
    };
  }, [data, profile, name]);

  const narrativeCtx = useMemo(() => {
    if (!data || !profile) return null;
    const ranking = data.ranks.countries;
    const entry = ranking.find((c) => c.name === profile.name);
    if (!entry) return null;

    const rank = ranking.findIndex((c) => c.name === profile.name) + 1;
    const history = buildHistoryFromEvolution(data.ranks.evolution.countries, profile.name);
    const trend = trendFromHistory(history);

    return buildCountryNarrativeContext({
      identity: {
        name: profile.name,
        kind: "country",
        country: profile.name,
      },
      definition: makeEditorialDefinition("country", "Country Profile Narrative"),
      scoreValue: entry.weighted,
      rank: Math.max(rank, 1),
      totalRanked: Math.max(ranking.length, 1),
      history,
      peers: ranking.map((c) => ({ name: c.name, score: c.weighted })),
      ecosystem: {
        talentProduction: profile.clubs.length,
        clubs: profile.clubs.length,
        qualityTrend: trend,
        generationLabel: trend === "rising" ? "Nova geração competitiva" : "Ciclo estável",
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
  if (!ctx) return <p className="text-muted-foreground">País não encontrado: {name}</p>;
  return (
    <ProfileShell
      ctx={ctx}
      icon={Globe2}
      backTo={{ to: "/paises", label: "Todos os países" }}
      slot={
        narrativeCtx ? (
          <div className="space-y-4">
            <ScoreNarrative
              ctx={narrativeCtx}
              level="standard"
              preset="country"
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
