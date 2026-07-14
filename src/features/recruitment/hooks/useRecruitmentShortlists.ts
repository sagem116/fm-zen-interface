import { useMemo } from "react";
import type { Shortlist } from "../types/recruitment-models";

export function useRecruitmentShortlists() {
  const shortlists = useMemo<Shortlist[]>(() => [], []);
  return { shortlists, isLoading: false };
}
