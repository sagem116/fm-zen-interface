/** Deterministic variant picker from an entity+season+block seed. */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickVariant<T>(variants: T[], seed: string, blockId: string): T {
  if (variants.length === 0) throw new Error("pickVariant: empty variants");
  const h = hashSeed(`${seed}::${blockId}`);
  return variants[h % variants.length];
}
