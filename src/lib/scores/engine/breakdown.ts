import type {
  BreakdownInput,
  CanonicalId,
  ScoreBreakdown,
  ScoreBreakdownItem,
  WeightedComponentGroupResult,
} from "../types";

function toBreakdownItems<Id extends CanonicalId>(
  type: "attribute" | "metric" | "context" | "modifier",
  group: WeightedComponentGroupResult<Id>,
): ScoreBreakdownItem[] {
  return group.components.map((component) => ({
    id: component.id,
    type,
    value: component.value,
    normalizedValue: component.normalizedValue,
    weight: component.weight,
    normalizedWeight: component.normalizedWeight,
    contribution: component.contribution,
    metadata: component.metadata,
  }));
}

export function calculateBreakdown(input: BreakdownInput): ScoreBreakdown {
  return {
    score: input.score,
    baseScore: input.baseScore,
    modifierAdjustment: input.modifierAdjustment,
    sections: [
      {
        id: "attributes",
        label: "component.attributes",
        subtotal: input.attributes.subtotal,
        items: toBreakdownItems("attribute", input.attributes),
      },
      {
        id: "metrics",
        label: "component.metrics",
        subtotal: input.metrics.subtotal,
        items: toBreakdownItems("metric", input.metrics),
      },
      {
        id: "contexts",
        label: "component.contexts",
        subtotal: input.contexts.subtotal,
        items: toBreakdownItems("context", input.contexts),
      },
      {
        id: "modifiers",
        label: "component.modifiers",
        subtotal: input.modifiers.subtotal,
        items: toBreakdownItems("modifier", input.modifiers),
      },
    ],
  };
}
