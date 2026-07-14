import { listDictionaryEntries } from "./registry";
import type {
  DictionaryStats,
  DictionaryStatsV2,
  DictionaryStatus,
  DictionarySubcategory,
} from "./types";

export function getDictionaryStats(): DictionaryStats {
  const entries = listDictionaryEntries();

  const totalAliases = entries.reduce((sum, entry) => sum + entry.aliases.length, 0);
  const unusedEntries = entries.filter((entry) => !entry.visible || !entry.searchable).length;

  return {
    totalEntries: entries.length,
    totalAttributes: entries.filter((entry) => entry.category === "attribute").length,
    totalMetrics: entries.filter((entry) => entry.category === "metric").length,
    totalRatings: entries.filter((entry) => entry.category === "rating").length,
    totalContexts: entries.filter((entry) => entry.category === "context").length,
    totalClubs: entries.filter((entry) => entry.entity === "club").length,
    totalPlayers: entries.filter((entry) => entry.entity === "player").length,
    totalCoaches: entries.filter((entry) => entry.entity === "coach").length,
    totalCompetitions: entries.filter((entry) => entry.entity === "competition").length,
    totalAliases,
    unusedEntries,
    deprecatedEntries: entries.filter((entry) => entry.deprecated).length,
  };
}

export function getDictionaryStatsV2(): DictionaryStatsV2 {
  const base = getDictionaryStats();
  const entries = listDictionaryEntries();

  const byStatus: Partial<Record<DictionaryStatus, number>> = {};
  for (const status of ["official", "auto_discovered", "confirmed", "ignored", "obsolete"] as DictionaryStatus[]) {
    byStatus[status] = entries.filter((e) => e.status === status).length;
  }

  const bySubcategory: Partial<Record<DictionarySubcategory, number>> = {};
  for (const entry of entries) {
    if (entry.subcategory) {
      bySubcategory[entry.subcategory] = (bySubcategory[entry.subcategory] ?? 0) + 1;
    }
  }

  const totalPending = entries.filter((e) => !e.status || e.status === "auto_discovered").length;
  const totalAmbiguous = entries.filter(
    (e) => e.aliases.length > 1 && !e.status,
  ).length;

  return {
    ...base,
    totalOfficial: byStatus.official ?? 0,
    totalAutoDiscovered: byStatus.auto_discovered ?? 0,
    totalConfirmed: byStatus.confirmed ?? 0,
    totalIgnored: byStatus.ignored ?? 0,
    totalObsolete: (byStatus.obsolete ?? 0) + base.deprecatedEntries,
    totalPending,
    totalAmbiguous,
    byStatus,
    bySubcategory,
  };
}
