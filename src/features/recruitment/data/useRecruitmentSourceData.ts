import { useMemo } from "react";
import { assertDataSourceForModule } from "@/lib/data-consumption-architecture";
import { usePlayerProfilesData } from "@/lib/usePlayerProfilesData";
import { usePlayerUniverse } from "@/lib/player-universe";
import { useFavoritesList } from "@/lib/profile/favorites";
import { useRecentProfiles } from "@/lib/profile/recent";
import { adaptPlayerProfilesToRecruitment } from "../adapters/rankings-to-recruitment";
import { adaptPlayerProfilesToRecruitmentEntities } from "../adapters/entities-to-recruitment";
import { adaptFavoritesToRecruitment } from "../adapters/profiles-to-recruitment";
import { adaptHistoryToRecruitmentEntities } from "../adapters/history-to-recruitment";
import { buildMarketSnapshot } from "../builders/buildMarketSnapshot";
import { createRecruitmentSearchProvider } from "./recruitment-search-provider";
import { createRecruitmentMarketProvider } from "./recruitment-market-provider";
import { createRecruitmentProfileProvider } from "./recruitment-profile-provider";
import { createRecruitmentStatsProvider } from "./recruitment-stats-provider";
import { useRecruitmentDictionaryCatalog } from "./useRecruitmentDictionaryCatalog";
import { useRecruitmentScoreDefinitions } from "./useRecruitmentScoreDefinitions";
import { resolvePlayerForModule } from "@/lib/player-resolver";

export function useRecruitmentSourceData() {
  assertDataSourceForModule("recruitment", "player_profiles");
  const playerProfiles = usePlayerProfilesData("recruitment");
  const playerUniverse = usePlayerUniverse("recruitment");
  const favorites = useFavoritesList();
  const recent = useRecentProfiles(80);
  const dictionary = useRecruitmentDictionaryCatalog();
  const scoreDefinitions = useRecruitmentScoreDefinitions();

  const data = useMemo(() => {
    if (!playerProfiles.data) return null;

    const entities = adaptPlayerProfilesToRecruitmentEntities(playerProfiles.data);
    const base = adaptPlayerProfilesToRecruitment(playerProfiles.data, entities);

    const favoriteEntities = adaptFavoritesToRecruitment(favorites).map((x) => ({
      id: x.id,
      type: x.kind,
      name: x.name,
      country: x.country ?? null,
      club: x.club ?? null,
      competition: x.competition ?? null,
      ranking: null,
      score: x.score ?? null,
      profileUrl:
        x.kind === "player"
          ? `/jogadores/${encodeURIComponent(x.name)}`
          : x.kind === "coach"
            ? `/treinadores/${encodeURIComponent(x.name)}`
            : x.kind === "club"
              ? `/clubes/${encodeURIComponent(x.name)}`
              : x.kind === "country"
                ? `/paises/${encodeURIComponent(x.name)}`
                : `/competicoes/${encodeURIComponent(x.name)}`,
      badges: [],
      tags: x.tags ?? [],
      metadata: { source: "favorites" },
    }));

    const historyEntities = adaptHistoryToRecruitmentEntities(recent);

    const marketSnapshot = buildMarketSnapshot({
      playersAvailable: base.market.playersAvailable,
      playersActive: base.market.playersActive,
      coachesActive: base.market.coachesActive,
      competitionsObserved: base.market.competitionsObserved,
      generatedAt: recent[0]?.visitedAt,
    });

    const searchProvider = createRecruitmentSearchProvider(entities);
    const marketProvider = createRecruitmentMarketProvider({
      totals: base.totals,
      marketSnapshot,
      players: entities.players,
      coaches: entities.coaches,
      clubs: entities.clubs,
      competitions: entities.competitions,
    });
    const profileProvider = createRecruitmentProfileProvider(entities.entities);
    const statsProvider = createRecruitmentStatsProvider();

    return {
      totals: base.totals,
      marketSnapshot,
      currentSeason: Math.max(0, ...playerProfiles.data.map((row) => row.season_year)),
      playerUniverse,
      resolvePlayerByUid: (uid?: string | null) => {
        const entry = playerUniverse.getByUid(uid ?? null);
        return resolvePlayerForModule(entry, "recruitment");
      },
      resolvePlayerByName: (name?: string | null) => {
        const entry = playerUniverse.getByName(name ?? null);
        return resolvePlayerForModule(entry, "recruitment");
      },
      entities,
      favoriteEntities,
      historyEntities,
      providers: {
        search: searchProvider,
        market: marketProvider,
        profile: profileProvider,
        stats: statsProvider,
      },
      catalogs: {
        dictionary,
        scores: scoreDefinitions,
      },
    };
  }, [playerProfiles.data, favorites, recent, dictionary, scoreDefinitions]);

  return {
    isLoading: playerProfiles.isLoading,
    source: data,
  };
}
