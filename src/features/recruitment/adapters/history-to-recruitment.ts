import type { RecentProfileVisit } from "@/lib/profile/recent";
import type { RecruitmentEntity } from "../types/recruitment-models";

export function adaptHistoryToRecruitmentEntities(
  history: RecentProfileVisit[],
): RecruitmentEntity[] {
  return history.map((item) => ({
    id: `${item.kind}:${item.name}`,
    type: item.kind,
    name: item.name,
    profileUrl:
      item.kind === "player"
        ? `/jogadores/${encodeURIComponent(item.name)}`
        : item.kind === "coach"
          ? `/treinadores/${encodeURIComponent(item.name)}`
          : `/clubes/${encodeURIComponent(item.name)}`,
    metadata: {
      visitedAt: item.visitedAt,
      path: item.path,
    },
  }));
}
