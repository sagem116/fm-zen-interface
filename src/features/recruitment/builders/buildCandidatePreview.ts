import type { RecruitmentCandidate, RecruitmentEntityKind } from "../types/recruitment-models";

export interface BuildCandidatePreviewInput {
  kind: RecruitmentEntityKind;
  name: string;
  club?: string | null;
  country?: string | null;
  score?: number | null;
}

export function buildCandidatePreview(input: BuildCandidatePreviewInput): RecruitmentCandidate {
  return {
    id: `${input.kind}:${input.name}`,
    kind: input.kind,
    name: input.name,
    club: input.club ?? null,
    country: input.country ?? null,
    score: input.score ?? null,
    status: "new",
    confidence: null,
  };
}
