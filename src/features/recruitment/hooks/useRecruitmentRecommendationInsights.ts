import { useMemo } from "react";
import { useRecruitmentObservations } from "./useRecruitmentObservations";

function tagValue(tags: string[] | undefined, prefix: string): string | null {
  const match = (tags ?? []).find((item) => item.startsWith(prefix));
  if (!match) return null;
  return match.slice(prefix.length);
}

export function useRecruitmentRecommendationInsights() {
  const { observations } = useRecruitmentObservations();

  return useMemo(() => {
    const entries = observations
      .filter((item) => item.type === "recommendation")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const latest = entries[0] ?? null;

    return {
      latestSearch: latest?.title ?? "Sem pesquisa registada",
      latestPreset: tagValue(latest?.tags, "rec:preset:") ?? "-",
      analyzedCandidates: Number(tagValue(latest?.tags, "rec:analyzed:") ?? 0),
      bestRecommendationScore: Number(tagValue(latest?.tags, "rec:best-score:") ?? 0),
      bestWonderkid: tagValue(latest?.tags, "rec:best-wonderkid:") ?? "-",
      bestReady: tagValue(latest?.tags, "rec:best-ready:") ?? "-",
      bestMarket: tagValue(latest?.tags, "rec:best-market:") ?? "-",
      totalRecommendationEntries: entries.length,
      latestEntry: latest,
    };
  }, [observations]);
}
