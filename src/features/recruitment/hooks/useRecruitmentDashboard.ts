import { useMemo } from "react";
import { buildRecruitmentContext } from "../builders/buildRecruitmentContext";
import { buildRecruitmentSummary } from "../builders/buildRecruitmentSummary";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export function useRecruitmentDashboard() {
  const { isLoading, source } = useRecruitmentSourceData();

  const data = useMemo(() => {
    if (!source) return null;

    const summary = buildRecruitmentSummary({
      totals: source.totals,
      marketSnapshot: source.marketSnapshot,
      favorites: {
        players: source.favoriteEntities
          .filter((x) => x.type === "player")
          .slice(0, 8)
          .map((x) => ({ id: x.id, kind: "player" as const, name: x.name })),
        clubs: source.favoriteEntities
          .filter((x) => x.type === "club")
          .slice(0, 8)
          .map((x) => ({ id: x.id, kind: "club" as const, name: x.name })),
        coaches: source.favoriteEntities
          .filter((x) => x.type === "coach")
          .slice(0, 8)
          .map((x) => ({ id: x.id, kind: "coach" as const, name: x.name })),
      },
      recentProfiles: {
        players: source.historyEntities
          .filter((x) => x.type === "player")
          .slice(0, 6)
          .map((x) => ({ id: x.id, kind: "player" as const, name: x.name })),
        clubs: source.historyEntities
          .filter((x) => x.type === "club")
          .slice(0, 6)
          .map((x) => ({ id: x.id, kind: "club" as const, name: x.name })),
        coaches: source.historyEntities
          .filter((x) => x.type === "coach")
          .slice(0, 6)
          .map((x) => ({ id: x.id, kind: "coach" as const, name: x.name })),
      },
      lastUpdatedAt: source.marketSnapshot.generatedAt ?? null,
    });

    return {
      summary,
      context: buildRecruitmentContext(),
    };
  }, [source]);

  return {
    isLoading,
    data,
  };
}
