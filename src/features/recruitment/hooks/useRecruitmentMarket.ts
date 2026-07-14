import { useMemo } from "react";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";

export function useRecruitmentMarket() {
  const { isLoading, source } = useRecruitmentSourceData();

  const market = useMemo(() => {
    if (!source) return null;
    return source.providers.market;
  }, [source]);

  return { market, isLoading };
}
