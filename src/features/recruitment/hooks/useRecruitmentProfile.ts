import { useMemo } from "react";
import type { RecruitmentEntityKind } from "../types/recruitment-models";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

interface UseRecruitmentProfileInput {
  id?: string;
  type?: RecruitmentEntityKind;
  name?: string;
}

export function useRecruitmentProfile(input: UseRecruitmentProfileInput) {
  const { source, isLoading } = useRecruitmentSourceData();

  const profile = useMemo(() => {
    if (!source) return null;
    if (input.id) return source.providers.profile.getProfileById(input.id);
    if (input.type && input.name)
      return source.providers.profile.getProfileByTypeAndName(input.type, input.name);
    return null;
  }, [source, input.id, input.type, input.name]);

  const stats = useMemo(() => {
    if (!source || !profile) return null;
    return source.providers.stats.getStats(profile);
  }, [source, profile]);

  return { profile, stats, isLoading };
}
