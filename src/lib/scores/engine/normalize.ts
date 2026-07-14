import type { NormalizationRule } from "../types";

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeUnit(value: number, rule: NormalizationRule): number {
  switch (rule.kind) {
    case "identity":
      return rule.clamp === false ? value : clamp01(value);
    case "range": {
      const span = rule.max - rule.min;
      if (span <= 0) return 0;
      const unit = (value - rule.min) / span;
      return rule.clamp === false ? unit : clamp01(unit);
    }
    case "percentage": {
      const sourceMax = rule.sourceMax ?? 100;
      if (sourceMax <= 0) return 0;
      const unit = value / sourceMax;
      return rule.clamp === false ? unit : clamp01(unit);
    }
    case "ratio": {
      if (rule.denominator <= 0) return 0;
      const unit = value / rule.denominator;
      return rule.clamp === false ? unit : clamp01(unit);
    }
  }
}

export function normalizeValue(value: number | null | undefined, rule: NormalizationRule): number {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }

  const unit = normalizeUnit(value, rule);
  const adjusted = rule.invert ? 1 - unit : unit;
  return adjusted * 100;
}
