export function formatRecruitmentTimestamp(iso: string | null): string {
  if (!iso) return "Sem atualizacao";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sem atualizacao";
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export function percentageOf(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((value / max) * 100);
}
