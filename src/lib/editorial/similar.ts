import type { EditorialInput, SimilarEntity } from "./types";

/**
 * Similarity via 1D euclidean distance on the aggregated Score value,
 * refined by component vector when the caller provides one.
 * No new algorithm — just a distance over existing Score outputs.
 */
export function findSimilar(input: EditorialInput, k = 5): SimilarEntity[] {
  const peers = input.peers ?? [];
  if (!peers.length) return [];
  const self = input.identity.name.toLowerCase();
  const target = input.scoreValue;
  const selfComponents = peers.find((p) => p.name.toLowerCase() === self)?.components;

  const scored = peers
    .filter((p) => p.name.toLowerCase() !== self)
    .map((p) => {
      let d = Math.abs(p.score - target);
      if (selfComponents && p.components && p.components.length === selfComponents.length) {
        let sq = 0;
        for (let i = 0; i < selfComponents.length; i++) {
          const diff = (p.components[i] ?? 0) - (selfComponents[i] ?? 0);
          sq += diff * diff;
        }
        d = 0.5 * d + 0.5 * Math.sqrt(sq);
      }
      return { name: p.name, score: p.score, grade: p.grade, distance: d } satisfies SimilarEntity;
    })
    .sort((a, b) => a.distance - b.distance);

  return scored.slice(0, k);
}
