import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCareerImportPlayersByCoachIdu,
  fetchCareerImportSeasonsByCoachIdu,
  type CareerImportPlayerSnapshot,
  type CareerImportSeasonSnapshot,
} from "@/lib/fm-db";
import type { CareerSeason } from "../types";
import { useCareer } from "./useCareer";

export interface CareerSeasonDataRow {
  year: number;
  localSeason?: CareerSeason;
  imported?: CareerImportSeasonSnapshot;
}

export interface UseCareerImportDataResult {
  associatedCoachIdu: string | null;
  seasons: CareerSeasonDataRow[];
  importedSeasons: CareerImportSeasonSnapshot[];
  importedPlayers: CareerImportPlayerSnapshot[];
  playersBySeason: Record<number, CareerImportPlayerSnapshot[]>;
  isLoading: boolean;
  isFetching: boolean;
}

function getAssociatedCoachIdu(metadata: Record<string, unknown> | undefined): string | null {
  const value = metadata?.associatedCoachIdu;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function useCareerImportData(): UseCareerImportDataResult {
  const { career } = useCareer();

  const associatedCoachIdu = useMemo(
    () => getAssociatedCoachIdu((career?.metadata ?? {}) as Record<string, unknown>),
    [career],
  );

  const seasonsQuery = useQuery({
    queryKey: ["career-import-seasons", associatedCoachIdu],
    queryFn: () => fetchCareerImportSeasonsByCoachIdu(associatedCoachIdu ?? ""),
    enabled: Boolean(associatedCoachIdu),
    staleTime: 120_000,
  });

  const playersQuery = useQuery({
    queryKey: ["career-import-players", associatedCoachIdu],
    queryFn: () => fetchCareerImportPlayersByCoachIdu(associatedCoachIdu ?? ""),
    enabled: Boolean(associatedCoachIdu),
    staleTime: 120_000,
  });

  const importedSeasons = seasonsQuery.data ?? [];
  const importedPlayers = playersQuery.data ?? [];

  const playersBySeason = useMemo(() => {
    const grouped: Record<number, CareerImportPlayerSnapshot[]> = {};
    for (const row of importedPlayers) {
      const list = grouped[row.seasonYear] ?? [];
      list.push(row);
      grouped[row.seasonYear] = list;
    }

    for (const list of Object.values(grouped)) {
      list.sort((a, b) => {
        const impactA = a.goals + a.assists;
        const impactB = b.goals + b.assists;
        if (impactA !== impactB) return impactB - impactA;
        return a.playerName.localeCompare(b.playerName, "pt", { sensitivity: "base" });
      });
    }

    return grouped;
  }, [importedPlayers]);

  const seasons = useMemo(() => {
    const byYear = new Map<number, CareerSeasonDataRow>();

    for (const localSeason of Object.values(career?.seasons ?? {})) {
      byYear.set(localSeason.season, {
        year: localSeason.season,
        localSeason,
      });
    }

    for (const imported of importedSeasons) {
      const current = byYear.get(imported.seasonYear);
      byYear.set(imported.seasonYear, {
        year: imported.seasonYear,
        localSeason: current?.localSeason,
        imported,
      });
    }

    return [...byYear.values()].sort((a, b) => a.year - b.year);
  }, [career, importedSeasons]);

  return {
    associatedCoachIdu,
    seasons,
    importedSeasons,
    importedPlayers,
    playersBySeason,
    isLoading: seasonsQuery.isLoading || playersQuery.isLoading,
    isFetching: seasonsQuery.isFetching || playersQuery.isFetching,
  };
}
