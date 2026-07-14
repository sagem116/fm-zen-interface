import { useMemo } from "react";
import { useRecruitmentObservationEntries } from "../services/recruitment-observations";

export function useRecruitmentObservations() {
  const observations = useRecruitmentObservationEntries();

  const byEntity = useMemo(() => {
    const map = new Map<string, typeof observations>();
    for (const item of observations) {
      const key = `${item.entityKind}:${item.entityId}`;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [observations]);

  return { observations, byEntity, isLoading: false };
}
