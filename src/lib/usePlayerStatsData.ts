import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllPlayerStats, fetchAllCompetitionStats } from "./fm-player-stats-db";
import { buildClubMap } from "./fm-club-map";
import { fetchClubMapSources } from "./fm-club-map-db";
import { usePlayerUniverse } from "./player-universe";

export function usePlayerStatsData() {
  const universe = usePlayerUniverse();

  return useQuery({
    queryKey: ["player-stats-all"],
    queryFn: async () => {
      const [players, competitions, mapSources] = await Promise.all([
        fetchAllPlayerStats(),
        fetchAllCompetitionStats(),
        fetchClubMapSources(),
      ]);
      // SSOT: clubMap is built EXCLUSIVELY from Importar Época standings.
      // Player rows are passed only so the map can report unmapped clubs.
      const clubMap = buildClubMap(mapSources, players);

      // Merge individual Player Universe fields onto player stat rows for UI consumers.
      // Do not alter original ranking or stats computations; this is a presentation overlay.
      const merged = players.map((p) => {
        try {
          const uni = p.idu ? universe.getByIdu(p.idu) : universe.getByName(p.player_name);
          if (!uni) return p;
          const seasonHist = p.season_year ? uni.history?.[p.season_year] ?? null : null;
          return {
            ...p,
            player_name: uni.name ?? p.player_name,
            nationality: uni.country ?? p.nationality,
            age: uni.age ?? p.age,
            ca: seasonHist?.ca ?? uni.ca ?? p.ca,
            cp: seasonHist?.cp ?? uni.pa ?? p.cp,
            vp: seasonHist?.value ?? p.vp,
            salary: seasonHist?.salary ?? p.salary,
            // keep raw extras for advanced consumers
            _universe: {
              uid: uni.uid,
              idu: uni.idu,
              season: seasonHist?.season ?? uni.seasonYear,
            },
          } as typeof p;
        } catch (e) {
          return p;
        }
      });

      return { players: merged, competitions, clubMap };
    },
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });
}
