import type { ProfileResult } from "@/lib/intelligence";
import type { RecruitmentPlayer } from "../types/recruitment-models";

export interface DevelopmentPoint {
  season: number;
  ca: number;
  pa: number;
  value: number;
  ranking: number | null;
  score: number;
  avgRating: number;
}

export interface IntelligenceRisk {
  label: string;
  value: number;
}

export interface IntelligenceTrend {
  label: string;
  tone: "up" | "down" | "neutral";
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildDevelopmentSeries(
  player: RecruitmentPlayer,
): DevelopmentPoint[] {
  const history = ((player.metadata ?? {}).history as Array<Record<string, unknown>> | undefined) ?? [];
  if (!history.length) {
    return [
      {
        season: player.currentSeason ?? new Date().getFullYear(),
        ca: round(player.ca ?? player.score ?? 0),
        pa: round(player.pa ?? player.ca ?? 0),
        value: round(player.marketValue ?? 0),
        ranking: null,
        score: round(player.score ?? player.ca ?? 0),
        avgRating: 0,
      },
    ];
  }

  return history
    .map((point) => ({
      season: Number(point.season ?? 0),
      ca: round(Number(point.ca ?? player.ca ?? 0)),
      pa: round(Number(point.cp ?? player.pa ?? player.ca ?? 0)),
      value: round(Number(point.value ?? player.marketValue ?? 0)),
      ranking: null,
      score: round(Number(point.ca ?? player.score ?? player.ca ?? 0)),
      avgRating: round(Number(point.avgRating ?? 0)),
    }))
    .filter((point) => Number.isFinite(point.season) && point.season > 0)
    .sort((a, b) => a.season - b.season);
}

export function buildTrends(
  series: DevelopmentPoint[],
  profile: ProfileResult | null,
): IntelligenceTrend[] {
  if (series.length < 2) return [{ label: "Consistente", tone: "neutral" }];
  const latest = series[series.length - 1];
  const prev = series[series.length - 2];
  const trends: IntelligenceTrend[] = [];

  if (latest.ca - prev.ca >= 4 || latest.avgRating - prev.avgRating >= 0.2)
    trends.push({ label: "Em ascensão", tone: "up" });
  if (prev.ca - latest.ca >= 4 || prev.avgRating - latest.avgRating >= 0.2)
    trends.push({ label: "Em declínio", tone: "down" });
  if (Math.abs(latest.ca - prev.ca) <= 2 && Math.abs(latest.avgRating - prev.avgRating) <= 0.1)
    trends.push({ label: "Consistente", tone: "neutral" });

  if (series.length >= 3) {
    const a = series[series.length - 3];
    if (latest.ca - a.ca >= 8) trends.push({ label: "Explosão recente", tone: "up" });
  }

  const ageHint = profile?.traits.find((item) => item.id.includes("veteran"));
  if (ageHint && ageHint.score >= 65) trends.push({ label: "Veterano fiável", tone: "neutral" });

  const wonderkid = profile?.traits.find((item) => item.id.includes("wonderkid"));
  if (wonderkid && wonderkid.score >= 65) trends.push({ label: "Wonderkid", tone: "up" });

  if (!trends.length) trends.push({ label: "Jogador consolidado", tone: "neutral" });

  return trends;
}

export function buildRisks(
  series: DevelopmentPoint[],
  statistics: Record<string, unknown> | null,
): IntelligenceRisk[] {
  const latest = series[series.length - 1];
  if (!latest) {
    return [
      { label: "Risco físico", value: 50 },
      { label: "Risco disciplinar", value: 50 },
      { label: "Risco de inconsistência", value: 50 },
      { label: "Risco de adaptação", value: 50 },
      { label: "Potencial de evolução", value: 50 },
    ];
  }

  const ratings = series
    .map((item) => item.avgRating)
    .filter((value) => Number.isFinite(value) && value > 0);
  const ratingStd = ratings.length
    ? Math.sqrt(avg(ratings.map((value) => (value - avg(ratings)) ** 2)))
    : 0;

  const yellows = Number(statistics?.yellows ?? statistics?.["player.statistics.yellows"] ?? 0);
  const reds = Number(statistics?.reds ?? statistics?.["player.statistics.reds"] ?? 0);
  const games = Number(statistics?.games ?? statistics?.["player.statistics.games"] ?? 1);
  const cards = (yellows + reds * 2) / Math.max(games, 1);
  const rankingValue = latest.ranking ?? 300;

  const riskPhysical = Math.max(
    20,
    Math.min(95, Math.round((rankingValue <= 80 ? 35 : 55) + (latest.ca < 120 ? 8 : 0))),
  );
  const riskDiscipline = Math.max(10, Math.min(95, Math.round(cards * 100)));
  const riskConsistency = Math.max(10, Math.min(95, Math.round(ratingStd * 120)));
  const riskAdaptation = Math.max(10, Math.min(95, Math.round(rankingValue > 200 ? 68 : 38)));
  const potential = Math.max(5, Math.min(99, Math.round(((latest.pa - latest.ca) / 80) * 100)));

  return [
    { label: "Risco físico", value: riskPhysical },
    { label: "Risco disciplinar", value: riskDiscipline },
    { label: "Risco de inconsistência", value: riskConsistency },
    { label: "Risco de adaptação", value: riskAdaptation },
    { label: "Potencial de evolução", value: potential },
  ];
}

export function buildDeterministicSummary(profile: ProfileResult | null, fallback: string): string {
  if (!profile) return fallback;
  const first = profile.narrative[0]?.text;
  if (first?.trim()) return first.replace(/\*\*/g, "");

  const strengths = profile.strengths.slice(0, 2).map((item) => item.label.toLowerCase());
  const weaknesses = profile.weaknesses.slice(0, 2).map((item) => item.label.toLowerCase());

  if (!strengths.length && !weaknesses.length) return fallback;

  return (
    `Perfil com destaque em ${strengths.join(" e ") || "consistência geral"}. ` +
    `Pontos a monitorizar: ${weaknesses.join(" e ") || "sem fragilidades críticas"}.`
  );
}
