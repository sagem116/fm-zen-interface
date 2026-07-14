import { normalizeValue } from "./normalize";
import type {
  CanonicalId,
  NormalizationRule,
  WeightedComponentGroupResult,
  WeightedComponentParams,
  WeightedInputComponent,
} from "../types";

function sanitizeWeight(weight: number | undefined): number {
  if (weight === undefined || Number.isNaN(weight) || weight <= 0) {
    return 1;
  }
  return weight;
}

export function normalizeWeights(weights: number[]): number[] {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return weights.map(() => 0);
  }
  return weights.map((value) => value / total);
}

export function calculateWeightedComponent(params: WeightedComponentParams): number {
  return params.normalizedValue * params.normalizedWeight;
}

export function calculateWeightedGroup<Id extends CanonicalId>(args: {
  components: WeightedInputComponent<Id>[];
  defaultNormalization: NormalizationRule;
}): WeightedComponentGroupResult<Id> {
  const totalComponents = args.components.length;
  const available = args.components.filter(
    (component) =>
      component.value !== null && component.value !== undefined && !Number.isNaN(component.value),
  );
  const ignored = args.components
    .filter(
      (component) =>
        component.value === null || component.value === undefined || Number.isNaN(component.value),
    )
    .map((component) => ({
      id: component.id,
      value: component.value,
      reason:
        component.value === null || component.value === undefined
          ? ("missing_value" as const)
          : ("invalid_value" as const),
      metadata: component.metadata,
    }));

  if (available.length === 0) {
    return {
      subtotal: 0,
      totalWeight: 0,
      totalComponents,
      availableComponents: 0,
      coverage: totalComponents === 0 ? 1 : 0,
      components: [],
      ignoredComponents: ignored,
    };
  }

  const weights = available.map((component) => sanitizeWeight(component.weight));
  const normalizedWeights = normalizeWeights(weights);

  const normalizedComponents = available.map((component, index) => {
    const normalizedValue = normalizeValue(
      component.value,
      component.normalization ?? args.defaultNormalization,
    );
    const weight = weights[index] ?? 0;
    const normalizedWeight = normalizedWeights[index] ?? 0;
    const contribution = calculateWeightedComponent({ normalizedValue, normalizedWeight });

    return {
      id: component.id,
      value: component.value ?? null,
      normalizedValue,
      weight,
      normalizedWeight,
      contribution,
      status: "used" as const,
      metadata: component.metadata,
    };
  });

  const subtotal = normalizedComponents.reduce((sum, component) => sum + component.contribution, 0);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  return {
    subtotal,
    totalWeight,
    totalComponents,
    availableComponents: available.length,
    coverage: totalComponents === 0 ? 1 : available.length / totalComponents,
    components: normalizedComponents,
    ignoredComponents: ignored,
  };
}
