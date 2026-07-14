import type { ProfileRankingSummary } from "./types";

function computeRanksByYear(
  evolution: Record<string, Record<number, number>>,
): Record<number, Record<string, number>> {
  const years = new Set<number>();
  for (const series of Object.values(evolution)) {
    for (const year of Object.keys(series)) years.add(Number(year));
  }

  const out: Record<number, Record<string, number>> = {};
  for (const year of [...years].sort((a, b) => a - b)) {
    const rows = Object.entries(evolution)
      .map(([name, byYear]) => ({ name, value: byYear[year] ?? 0 }))
      .sort((a, b) => b.value - a.value);
    const rankMap: Record<string, number> = {};
    rows.forEach((row, idx) => {
      rankMap[row.name] = idx + 1;
    });
    out[year] = rankMap;
  }

  return out;
}

export function buildRankingSummaryFromEvolution(
  evolution: Record<string, Record<number, number>>,
  name: string,
): ProfileRankingSummary {
  const rankByYear = computeRanksByYear(evolution);
  const years = Object.keys(rankByYear)
    .map(Number)
    .sort((a, b) => a - b);
  if (years.length === 0) {
    return { current: null, best: null, previous: null, trend: "na", deltaVsPrevious: null };
  }

  const currentYear = years[years.length - 1];
  const previousYear = years.length > 1 ? years[years.length - 2] : null;
  const current = rankByYear[currentYear]?.[name] ?? null;
  const previous = previousYear != null ? (rankByYear[previousYear]?.[name] ?? null) : null;

  let best: number | null = null;
  for (const year of years) {
    const rank = rankByYear[year]?.[name] ?? null;
    if (rank == null) continue;
    if (best == null || rank < best) best = rank;
  }

  const deltaVsPrevious = current != null && previous != null ? previous - current : null;
  const trend =
    deltaVsPrevious == null
      ? "na"
      : deltaVsPrevious > 0
        ? "up"
        : deltaVsPrevious < 0
          ? "down"
          : "stable";

  return {
    current,
    best,
    previous,
    trend,
    deltaVsPrevious,
  };
}
