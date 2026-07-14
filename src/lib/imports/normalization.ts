import type { DictionaryDataType } from "@/lib/dictionary";

const NUMERIC_NULL_SENTINELS = new Set(["", "-", "—", "N/D"]);

function isNumericDictionaryType(dataType: DictionaryDataType | string): boolean {
  return (
    dataType === "number" ||
    dataType === "integer" ||
    dataType === "float" ||
    dataType === "decimal"
  );
}

function parseLooseNumber(value: string): number | null {
  let normalized = value.trim();
  if (!normalized) return null;

  normalized = normalized.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!normalized) return null;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = normalized.split(",");
    const lastPart = parts[parts.length - 1] ?? "";
    if (parts.length > 2 || lastPart.length === 3) {
      normalized = normalized.replace(/,/g, "");
    } else {
      normalized = normalized.replace(/,/g, ".");
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeImportValue(value: unknown, dataType: DictionaryDataType): unknown {
  if (!isNumericDictionaryType(dataType)) return value;
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const text = String(value).trim();
  if (!text || NUMERIC_NULL_SENTINELS.has(text) || NUMERIC_NULL_SENTINELS.has(text.toUpperCase())) {
    return null;
  }

  return parseLooseNumber(text);
}
