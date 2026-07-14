import type {
  CanonicalId,
  EvaluateScoreInput,
  ScoreDefinition,
  ScoreResult,
  ScoreResultMeta,
  ValidationInput,
  ValidationIssue,
  ValidationResult,
} from "./types";

const SCORE_SCHEMA_VERSION = "1.0" as const;
const MAX_COMPONENT_WEIGHT = 10;

interface ValidationCatalogs {
  attributes: Set<string>;
  metrics: Set<string>;
  contexts: Set<string>;
  modifiers: Set<string>;
  scores: Set<string>;
}

function buildFallbackMeta(input: ValidationInput): ScoreResultMeta {
  const result = input.result;
  return {
    schemaVersion: SCORE_SCHEMA_VERSION,
    engineVersion: "1.0",
    generatedAt: result?.computedAt ?? new Date().toISOString(),
    scoreId: result?.scoreId ?? input.definition?.id ?? "score.generic",
    entityKind: input.definition?.entityKind ?? "unknown",
    entityId: result?.entityId ?? input.evaluateInput?.entityId ?? "entity.generic",
  };
}

function asValidationInput(input: ValidationInput | ScoreDefinition): ValidationInput {
  if ("id" in input && "entityKind" in input) {
    return { definition: input };
  }
  return input;
}

function pushIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

function validateDefinition(
  definition: ScoreDefinition,
  catalogs: ValidationCatalogs,
  warnings: ValidationIssue[],
  errors: ValidationIssue[],
): void {
  if (!definition.name) {
    pushIssue(errors, {
      code: "score.definition.missing_name",
      message: "ScoreDefinition is missing name.",
      path: "name",
      id: definition.id,
      severity: "error",
    });
  }

  if (!definition.entityKind) {
    pushIssue(errors, {
      code: "score.definition.missing_entity_kind",
      message: "ScoreDefinition is missing entityKind.",
      path: "entityKind",
      id: definition.id,
      severity: "error",
    });
  }

  if (!definition.categoryId || !definition.categoryId.startsWith("score_category.")) {
    pushIssue(errors, {
      code: "score.definition.invalid_category",
      message: "ScoreDefinition has an invalid categoryId.",
      path: "categoryId",
      id: definition.id,
      severity: "error",
    });
  }

  const allRefs = [
    ...(definition.attributeRefs ?? []).map((item) => ({
      id: item.attributeId,
      weight: item.weight,
      bucket: "attribute" as const,
    })),
    ...(definition.metricRefs ?? []).map((item) => ({
      id: item.metricId,
      weight: item.weight,
      bucket: "metric" as const,
    })),
    ...(definition.contextRefs ?? []).map((item) => ({
      id: item.contextId,
      weight: item.weight,
      bucket: "context" as const,
    })),
    ...(definition.modifierRefs ?? []).map((item) => ({
      id: item.modifierId,
      weight: item.weight,
      bucket: "modifier" as const,
    })),
  ];

  if (allRefs.length === 0) {
    pushIssue(errors, {
      code: "score.definition.empty",
      message: "ScoreDefinition must reference at least one component.",
      id: definition.id,
      severity: "error",
    });
  }

  for (const ref of allRefs) {
    if (ref.weight !== undefined && ref.weight < 0) {
      pushIssue(errors, {
        code: "score.definition.negative_weight",
        message: `Negative weight is not allowed for ${ref.id}.`,
        id: ref.id,
        severity: "error",
      });
    }

    if (ref.weight !== undefined && ref.weight > MAX_COMPONENT_WEIGHT) {
      pushIssue(warnings, {
        code: "score.definition.weight_above_limit",
        message: `Weight is above recommended limit for ${ref.id}.`,
        id: ref.id,
        severity: "warning",
      });
    }

    const exists =
      ref.bucket === "attribute"
        ? catalogs.attributes.has(ref.id)
        : ref.bucket === "metric"
          ? catalogs.metrics.has(ref.id)
          : ref.bucket === "context"
            ? catalogs.contexts.has(ref.id)
            : catalogs.modifiers.has(ref.id);

    if (!exists) {
      pushIssue(errors, {
        code: "score.definition.unknown_reference",
        message: `Unknown ${ref.bucket} reference: ${ref.id}`,
        id: ref.id,
        severity: "error",
      });
    }
  }
}

function validateEvaluateInput(
  evaluateInput: EvaluateScoreInput,
  warnings: ValidationIssue[],
  missingInputs: CanonicalId[],
): void {
  const buckets = [
    ...(evaluateInput.attributes ?? []),
    ...(evaluateInput.metrics ?? []),
    ...(evaluateInput.contexts ?? []),
    ...(evaluateInput.modifiers ?? []),
  ];

  for (const component of buckets) {
    if (
      component.value === null ||
      component.value === undefined ||
      Number.isNaN(component.value)
    ) {
      missingInputs.push(component.id);
      continue;
    }

    const rule = component.normalization;
    if (!rule) continue;

    if (rule.kind === "range" && (component.value < rule.min || component.value > rule.max)) {
      pushIssue(warnings, {
        code: "score.input.value_outside_range",
        message: `Value for ${component.id} is outside normalization range.`,
        id: component.id,
        severity: "warning",
      });
    }

    if (rule.kind === "percentage") {
      const max = rule.sourceMax ?? 100;
      if (component.value < 0 || component.value > max) {
        pushIssue(warnings, {
          code: "score.input.percentage_outside_bounds",
          message: `Percentage value for ${component.id} is outside expected bounds.`,
          id: component.id,
          severity: "warning",
        });
      }
    }

    if (rule.kind === "ratio" && rule.denominator <= 0) {
      pushIssue(warnings, {
        code: "score.input.invalid_ratio_denominator",
        message: `Ratio denominator must be greater than zero for ${component.id}.`,
        id: component.id,
        severity: "warning",
      });
    }
  }
}

function validateResult(
  result: ScoreResult,
  warnings: ValidationIssue[],
  errors: ValidationIssue[],
): void {
  const score = result.score ?? result.value;
  if (score !== undefined && score !== null && (score < 0 || score > 100)) {
    pushIssue(errors, {
      code: "score.result.out_of_bounds",
      message: "Result score is outside 0..100.",
      id: result.scoreId,
      severity: "error",
    });
  }

  if (result.confidence && (result.confidence.value < 0 || result.confidence.value > 100)) {
    pushIssue(warnings, {
      code: "score.result.confidence_out_of_bounds",
      message: "Result confidence is outside 0..100.",
      id: result.scoreId,
      severity: "warning",
    });
  }
}

export function validateScore(
  input: ValidationInput | ScoreDefinition,
  catalogs: ValidationCatalogs,
): ValidationResult {
  const normalizedInput = asValidationInput(input);
  const warnings: ValidationIssue[] = [];
  const errors: ValidationIssue[] = [];
  const missingInputs: CanonicalId[] = [];
  const unusedInputs: CanonicalId[] = [];

  if (normalizedInput.definition) {
    validateDefinition(normalizedInput.definition, catalogs, warnings, errors);
  }

  if (normalizedInput.evaluateInput) {
    validateEvaluateInput(normalizedInput.evaluateInput, warnings, missingInputs);
  }

  if (normalizedInput.result) {
    validateResult(normalizedInput.result, warnings, errors);

    const ignored = [
      ...(normalizedInput.result.components?.attributes.ignoredComponents ?? []),
      ...(normalizedInput.result.components?.metrics.ignoredComponents ?? []),
      ...(normalizedInput.result.components?.contexts.ignoredComponents ?? []),
      ...(normalizedInput.result.components?.modifiers.ignoredComponents ?? []),
    ];

    for (const item of ignored) {
      unusedInputs.push(item.id);
    }
  }

  const meta = normalizedInput.result?.meta ?? buildFallbackMeta(normalizedInput);

  return {
    schemaVersion: SCORE_SCHEMA_VERSION,
    valid: errors.length === 0,
    warnings,
    errors,
    missingInputs,
    unusedInputs,
    meta,
  };
}

export function countMissingInputs(result: ValidationResult): number {
  return result.missingInputs.length;
}

export function countWarnings(result: ValidationResult): number {
  return result.warnings.length;
}

export function countErrors(result: ValidationResult): number {
  return result.errors.length;
}
