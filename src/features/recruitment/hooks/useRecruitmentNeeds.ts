import { useMemo } from "react";
import type { RecruitmentNeed } from "../types/recruitment-models";

export function useRecruitmentNeeds() {
  const needs = useMemo<RecruitmentNeed[]>(
    () => [
      { id: "need-rb", role: "Lateral Direito", priority: "undefined" },
      { id: "need-dm", role: "Medio Defensivo", priority: "undefined" },
      { id: "need-st", role: "Ponta de Lanca", priority: "undefined" },
    ],
    [],
  );

  return { needs, isLoading: false };
}
