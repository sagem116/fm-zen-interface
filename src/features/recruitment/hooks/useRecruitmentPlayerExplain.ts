import { useMemo } from "react";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import type { RecruitmentPlayer } from "../types/recruitment-models";

function adaptUniverseEntryToRecruitmentPlayer(entry: any): RecruitmentPlayer {
  const meta = entry?.extras ?? {};
  const historyPoints = entry?.history ? Object.values(entry.history).map((h: any) => ({
    season: h.season,
    ca: h.ca,
    cp: h.cp,
    value: h.value,
    salary: h.salary,
    reputation: h.reputation,
    avgRating: h.metrics?.["avg_rating"] ?? null,
  })) : [];

  return {
    id: `player:${entry.uid}`,
    type: "player",
    name: entry.name,
    club: entry.individual?.club ?? null,
    country: entry.individual?.country ?? null,
    competition: (meta["competition"] as string) ?? null,
    profileUrl: `/jogadores/${encodeURIComponent(entry.name)}`,
    ranking: null,
    score: entry.individual?.ca ?? null,
    marketValue: meta.marketValue ?? null,
    ca: entry.individual?.ca ?? null,
    pa: entry.individual?.pa ?? null,
    age: entry.individual?.age ?? null,
    position: meta.position ?? null,
    currentSeason: entry.seasonYear ?? null,
    badges: [],
    tags: [],
    attributes: (entry.individual?.attributes as Record<string, number>) ?? {},
    statistics: meta.statistics ?? {},
    reputation: meta.reputation ?? null,
    metadata: {
      source: "player_universe",
      idu: entry.idu ?? entry.uid,
      salary: meta.salary ?? null,
      personality: meta.personality ?? null,
      reputation: meta.reputation ?? null,
      age: entry.individual?.age ?? null,
      marketValue: meta.marketValue ?? null,
      position: meta.primary_position ?? meta.primaryPosition ?? null,
      secondaryPositions: meta.secondary_positions ?? null,
      nationality: meta.nationality ?? null,
      preferredFoot: meta.preferred_foot ?? null,
      contract: meta.contract ?? null,
      coach: meta.coach ?? null,
      attributes: entry.individual?.attributes ?? {},
      metrics: meta.metrics ?? {},
      statistics: meta.statistics ?? {},
      extras: meta,
      history: historyPoints,
    },
  } as unknown as RecruitmentPlayer;
}
import {
  buildRecruitmentPlayerExplainModel,
  type RecruitmentPlayerExplainModel,
} from "../services/recruitment-player-explain";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function useRecruitmentPlayerExplain(playerName: string | null | undefined): {
  isLoading: boolean;
  model: RecruitmentPlayerExplainModel | null;
  player: RecruitmentPlayer | null;
} {
  const { source, isLoading } = useRecruitmentSourceData();

  const payload = useMemo(() => {
    if (!source || !playerName) return { model: null, player: null };

    const resolved = source.resolvePlayerByName?.(playerName) ?? null;
    if (!resolved) return { model: null, player: null };

    const player = adaptUniverseEntryToRecruitmentPlayer(resolved);

    const peers = source.playerUniverse?.list?.map((entry: any) => adaptUniverseEntryToRecruitmentPlayer({ name: entry.name, individual: { club: entry.currentClub, country: entry.country, age: entry.age, ca: entry.ca, pa: entry.pa, attributes: entry.attributes }, extras: entry.extras, history: entry.history, uid: entry.uid, idu: entry.idu, seasonYear: entry.seasonYear })) ?? [];

    const model = buildRecruitmentPlayerExplainModel({ player, peers });

    return { model, player };
  }, [source, playerName]);

  return {
    isLoading,
    model: payload.model,
    player: payload.player,
  };
}
