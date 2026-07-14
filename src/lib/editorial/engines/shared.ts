import { hashSeed } from "../narrative/tone";

export function pickText(seed: string, key: string, variants: string[]): string {
  if (!variants.length) return "";
  const index = hashSeed(`${seed}::${key}`) % variants.length;
  return variants[index] ?? "";
}

export function formatSigned(value: number, digits = 1): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}`;
}

export function movementLabel(delta?: number): string {
  if (delta == null || Number.isNaN(delta)) return "sem variação relevante";
  if (delta < 0) return `subida de ${Math.abs(delta)} posições`;
  if (delta > 0) return `queda de ${delta} posições`;
  return "manutenção da posição";
}

export function trendLabel(
  deltaScore?: number,
  deltaRank?: number,
): "ascendente" | "estável" | "descendente" | "transição" {
  const score = deltaScore ?? 0;
  const rank = deltaRank ?? 0;
  if (Math.abs(score) < 0.25 && Math.abs(rank) <= 1) return "estável";
  if (score > 0 && rank < 0) return "ascendente";
  if (score < 0 && rank > 0) return "descendente";
  return "transição";
}
