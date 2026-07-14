import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Loader2, User } from "lucide-react";
import { useRankings } from "@/lib/useRankings";
import { buildPlayerProfile } from "@/lib/fm-players";
import { usePlayerUniverse } from "@/lib/player-universe";
import { fmtPts } from "@/lib/fmt";
import { continentOf } from "@/lib/fm-continents";
import { ScoreNarrative } from "@/components/score-story/ScoreNarrative";
import { buildPlayerNarrativeContext } from "@/lib/editorial";
import { makeEditorialDefinition } from "@/lib/editorial/pageNarratives";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { RecruitmentPlayerExplainSheet } from "@/features/recruitment/components/explain/RecruitmentPlayerExplainSheet";
import "@/components/profile/tabs";
import type { ProfileContext } from "@/lib/profile/types";

export const Route = createFileRoute("/jogadores/$name")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: PlayerProfilePage,
});

function PlayerProfilePage() {
  const { name } = Route.useParams();
  const { data, isLoading } = useRankings();
  const profile = useMemo(
    () => (data ? buildPlayerProfile(data.data.players, data.data.standings, name) : null),
    [data, name],
  );
  const universe = usePlayerUniverse();
  const fallbackProfile = useMemo(() => {
    if (profile) return null;
    const uni = universe.getByName(name) ?? null;
    if (!uni) return null;
    const history = Object.values(uni.history || {})
      .map((h: any) => ({
        year: h.season,
        club: uni.currentClub ?? null,
        league: null,
        division: null,
        divisionLabel: null,
        module: null,
        age: uni.age ?? null,
        gls: 0,
        ast: 0,
        ca: h.ca ?? uni.ca ?? 0,
        cp: h.cp ?? uni.pa ?? 0,
        ra: 0,
        rm: 0,
        salary: h.salary ?? null,
        vp: h.value ?? null,
      }))
      .sort((a: any, b: any) => a.year - b.year);
    const totals = { gls: 0, ast: 0, seasons: history.length };
    return { name: uni.name, idu: uni.idu ?? null, history, totals };
  }, [profile, universe, name]);

  const ctx = useMemo<ProfileContext | null>(() => {
    const usedProfile = profile ?? fallbackProfile;
    if (!usedProfile) return null;
    const history = usedProfile.history ?? [];
    const last = history.length ? [...history].reverse().find((h) => h?.club) : null;
    const uni = universe.getByIdu((usedProfile as any).idu) ?? universe.getByName(usedProfile.name);
    const country = uni?.country ?? (last?.club ? (data?.data.clubCountry[last.club] ?? null) : null);
    const peakCa = usedProfile.history?.reduce((m: number, h: any) => (h.ca > m ? h.ca : m), 0) ?? 0;
    const years = data ? [...new Set(data.data.players.map((p) => p.season_year))].sort((a, b) => a - b) : [];
    const rankForYear = (year: number) => {
      if (!data) return null;
      const byName = new Map<string, number>();
      for (const row of data.data.players) {
        if (row.season_year !== year) continue;
        const cur = byName.get(row.name) ?? 0;
        if (row.ca > cur) byName.set(row.name, row.ca);
      }
      const sorted = [...byName.entries()].sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([playerName]) => playerName === usedProfile.name);
      return idx >= 0 ? idx + 1 : null;
    };
    const rankHistory = (usedProfile.history ?? [])
      .map((h: any) => ({ year: h.year, rank: data ? rankForYear(h.year) : null }))
      .filter((h: any) => h.rank != null) as Array<{ year: number; rank: number }>;
    const currentRank = rankHistory.length ? rankHistory[rankHistory.length - 1]!.rank : null;
    const previousRank = rankHistory.length > 1 ? rankHistory[rankHistory.length - 2]!.rank : null;
    const bestRank = rankHistory.length ? Math.min(...rankHistory.map((h) => h.rank)) : null;
    const deltaVsPrevious = currentRank != null && previousRank != null ? previousRank - currentRank : null;
    const trend = deltaVsPrevious == null ? "na" : deltaVsPrevious > 0 ? "up" : deltaVsPrevious < 0 ? "down" : "stable";
    const latestSeason = years.length ? years[years.length - 1] : null;
    const latestPlayerRows = latestSeason == null || !data ? [] : data.data.players.filter((p) => p.name === usedProfile.name && p.season_year === latestSeason);
    const latestPlayer = latestPlayerRows[0] ?? null;
    return {
      kind: "player",
      name: usedProfile.name,
      data: data ?? ({} as any),
      profile: usedProfile,
      meta: {
        country,
        continent: continentOf(country),
        club: uni?.currentClub ?? last?.club ?? null,
        competition: last?.league ?? null,
        league: last?.league ?? null,
        role: (latestPlayer as unknown as { position?: string | null })?.position ?? null,
        currentSeason: latestSeason != null ? String(latestSeason) : null,
        description: (usedProfile as any).idu ? `UID: ${(usedProfile as any).idu}` : "Sem UID (chave por nome+clube)",
      },
      currentRank,
      ranking: {
        current: currentRank,
        best: bestRank,
        previous: previousRank,
        trend,
        deltaVsPrevious,
      },
      quickStats: [
        { label: "Ranking", value: currentRank != null ? `#${currentRank}` : "—" },
        { label: "Clube", value: uni?.currentClub ?? last?.club ?? "—" },
        { label: "Nacionalidade", value: uni?.country ?? country ?? "—" },
        { label: "Liga", value: last?.league ?? "—" },
        { label: "Reputação", value: peakCa ? fmtPts(peakCa) : "—" },
        { label: "CA", value: uni?.ca != null ? fmtPts(uni.ca) : latestPlayer?.ca != null ? fmtPts(latestPlayer.ca) : "—" },
        {
          label: "Valor de Mercado",
          value: (uni?.seasonYear && uni.history?.[uni.seasonYear]?.value != null ? fmtPts(uni.history[uni.seasonYear].value as number) : latestPlayer?.vp != null ? fmtPts(latestPlayer.vp) : "—"),
        },
      ],
    };
  }, [data, profile, fallbackProfile, universe]);

  const narrativeCtx = useMemo(() => {
    if (!data || !profile) return null;

    const peakCa = profile.history.reduce((m, h) => (h.ca > m ? h.ca : m), 0);
    const allPeaks = new Map<string, number>();
    for (const row of data.data.players) {
      const cur = allPeaks.get(row.name) ?? 0;
      if (row.ca > cur) allPeaks.set(row.name, row.ca);
    }
    const peers = [...allPeaks.entries()].map(([playerName, score]) => ({
      name: playerName,
      score,
    }));
    const sorted = peers.slice().sort((a, b) => b.score - a.score);
    const rank = Math.max(1, sorted.findIndex((p) => p.name === profile.name) + 1);

    return buildPlayerNarrativeContext({
      identity: {
        name: profile.name,
        kind: "player",
        age: profile.history[profile.history.length - 1]?.age ?? undefined,
        club: profile.history[profile.history.length - 1]?.club ?? undefined,
        competition: profile.history[profile.history.length - 1]?.league ?? undefined,
      },
      definition: makeEditorialDefinition("player", "Player Profile Narrative"),
      scoreValue: peakCa,
      rank,
      totalRanked: Math.max(sorted.length, 1),
      history: profile.history.map((h) => ({ season: h.year, score: h.ca })),
      peers,
      career: {
        seasons: profile.totals.seasons,
        clubs: [
          ...new Set(
            profile.history.map((h) => h.club).filter((club): club is string => Boolean(club)),
          ),
        ],
        peakSeason: profile.history.reduce(
          (best, h) => (h.ca > best.score ? { season: h.year, score: h.ca } : best),
          {
            season: profile.history[0]?.year ?? 0,
            score: profile.history[0]?.ca ?? 0,
          },
        ).season,
        peakScore: peakCa,
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
  if (!ctx) return <p className="text-muted-foreground">Jogador não encontrado: {name}</p>;
  return (
    <ProfileShell
      ctx={ctx}
      icon={User}
      backTo={{ to: "/hall-of-fame", label: "Hall of Fame" }}
      slot={
        <div className="space-y-3">
          <div className="flex justify-end">
            <RecruitmentPlayerExplainSheet
              playerName={profile?.name ?? name}
              triggerLabel="Explain"
              triggerVariant="outline"
            />
          </div>
          {narrativeCtx ? (
            <div className="space-y-4">
              <ScoreNarrative
                ctx={narrativeCtx}
                level="standard"
                preset="player"
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
          ) : null}
        </div>
      }
    />
  );
}
