import type { ProfileEntityKind } from "@/lib/profile/types";
import type { RecentProfileVisit } from "@/lib/profile/recent";
import type { RecruitmentTarget } from "../types/recruitment-models";

function fromProfileKind(kind: ProfileEntityKind): RecruitmentTarget["kind"] {
  if (kind === "coach") return "coach";
  if (kind === "club") return "club";
  if (kind === "player") return "player";
  if (kind === "competition") return "competition";
  return "country";
}

export function adaptFavoritesToRecruitment(
  input: Array<{ kind: ProfileEntityKind; name: string }>,
): RecruitmentTarget[] {
  return input.map((item) => ({
    id: `${item.kind}:${item.name}`,
    kind: fromProfileKind(item.kind),
    name: item.name,
  }));
}

export function adaptRecentProfilesToRecruitment(input: RecentProfileVisit[]): RecruitmentTarget[] {
  return input.map((item) => ({
    id: `${item.kind}:${item.name}`,
    kind: item.kind,
    name: item.name,
  }));
}
