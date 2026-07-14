import type { DomainEntity, EngineConfig, NarrativeParagraph, TraitResult } from "../types";

/**
 * Deterministic narrative generator.
 * Iterates over assigned traits (sorted by score desc) and emits one paragraph
 * per trait using the template registered in `config.narrativeTemplates`.
 * Falls back to a generic sentence when no template is registered.
 */
export function buildNarrative(
  traits: TraitResult[],
  entity: DomainEntity,
  config: EngineConfig,
): NarrativeParagraph[] {
  const out: NarrativeParagraph[] = [];
  const sorted = [...traits].sort((a, b) => b.score - a.score);
  for (const trait of sorted) {
    const tpl = config.narrativeTemplates?.[trait.id];
    let text: string;
    if (tpl) {
      const score01 = trait.score / 100;
      const bucket = [...tpl.buckets]
        .sort((a, b) => b.minScore - a.minScore)
        .find((b) => score01 >= b.minScore);
      text = bucket
        ? bucket.text({ entity, trait, evidence: trait.evidence })
        : defaultSentence(trait, entity);
    } else {
      text = defaultSentence(trait, entity);
    }
    out.push({ text, refs: [trait.id] });
  }
  return out;
}

function defaultSentence(trait: TraitResult, entity: DomainEntity): string {
  const level = trait.level ? ` (${trait.level})` : "";
  return `${entity.name} apresenta a característica **${trait.label}**${level} com score ${trait.score.toFixed(0)}/100 e confiança ${(trait.confidence * 100).toFixed(0)}%.`;
}
