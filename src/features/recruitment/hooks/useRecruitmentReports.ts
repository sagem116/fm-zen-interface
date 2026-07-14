import { useMemo } from "react";
import { useRecruitmentScoutReports } from "../services/recruitment-reports";

export function useRecruitmentReports() {
  const reports = useRecruitmentScoutReports();

  const groupedByTarget = useMemo(() => {
    const map = new Map<string, typeof reports>();
    for (const report of reports) {
      const key = `${report.entityKind ?? "unknown"}:${report.targetId}`;
      const arr = map.get(key) ?? [];
      arr.push(report);
      map.set(key, arr);
    }
    return map;
  }, [reports]);

  return {
    reports,
    groupedByTarget,
    isLoading: false,
  };
}
