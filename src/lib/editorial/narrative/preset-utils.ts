import type { EditorialContext, EditorialLevel, NarrativeBlock, NarrativeBlockId } from "../types";
import { fill } from "./templates";
import { pickVariant } from "./tone";

export type NarrativeVars = Record<string, string | number | null | undefined>;

export interface PresetArgs {
  ctx: EditorialContext;
  level: EditorialLevel;
  vars: NarrativeVars;
  seed: string;
  push: (id: NarrativeBlockId, variants: string[], blockKey: string, refs?: string[]) => void;
}

export type PresetFn = (args: PresetArgs) => void;

/**
 * Shared helper factory. Creates a `push` that composes a NarrativeBlock
 * from a set of template variants with deterministic variant selection.
 */
export function makePush(
  ctx: EditorialContext,
  level: EditorialLevel,
  vars: NarrativeVars,
  seed: string,
  out: NarrativeBlock[],
) {
  return (id: NarrativeBlockId, variants: string[], blockKey: string, refs?: string[]) => {
    if (!variants.length) return;
    const raw = pickVariant(variants, seed, blockKey);
    const text = fill(raw, vars).trim();
    if (text) out.push({ id, text, level, refs });
  };
}
