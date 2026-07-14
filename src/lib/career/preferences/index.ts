import type {
  CareerPreferenceBucket,
  CareerPreferenceCategory,
  CareerPreferenceItem,
} from "../types";
import { nowIso } from "../utils";

export const CAREER_PREFERENCE_CATEGORIES: CareerPreferenceCategory[] = [
  "nationalities",
  "countries",
  "leagues",
  "competitions",
  "positions",
  "ages",
  "clubs",
  "continents",
  "contract_types",
  "player_profiles",
];

export function createPreferenceBucket(
  category: CareerPreferenceCategory,
  maxItems = 20,
): CareerPreferenceBucket {
  return {
    category,
    top: [],
    maxItems,
    updatedAt: nowIso(),
  };
}

export function createDefaultPreferenceState(
  maxItems = 20,
): Record<CareerPreferenceCategory, CareerPreferenceBucket> {
  return Object.fromEntries(
    CAREER_PREFERENCE_CATEGORIES.map((category) => [
      category,
      createPreferenceBucket(category, maxItems),
    ]),
  ) as Record<CareerPreferenceCategory, CareerPreferenceBucket>;
}

export function mergePreferenceItems(
  bucket: CareerPreferenceBucket,
  items: CareerPreferenceItem[],
): CareerPreferenceBucket {
  const sorted = [...items].sort((a, b) => b.count - a.count).slice(0, bucket.maxItems);

  return {
    ...bucket,
    top: sorted,
    updatedAt: nowIso(),
  };
}
