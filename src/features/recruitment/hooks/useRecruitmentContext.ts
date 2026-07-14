import { useMemo, useState } from "react";
import type { RecruitmentContextModel } from "../types/recruitment-models";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export function useRecruitmentContext() {
  const { source } = useRecruitmentSourceData();

  const initial = useMemo<RecruitmentContextModel>(
    () => ({
      currentSeason: source?.currentSeason ?? null,
      selectedCompetition: null,
      selectedClub: null,
      selectedCountry: null,
      selectedPosition: null,
      selectedScore: null,
      filters: {},
    }),
    [source?.currentSeason],
  );

  const [context, setContext] = useState<RecruitmentContextModel>(initial);

  const updateContext = (patch: Partial<RecruitmentContextModel>) => {
    setContext((prev) => ({ ...prev, ...patch }));
  };

  const resetContext = () => setContext(initial);

  return { context, setContext: updateContext, resetContext };
}
