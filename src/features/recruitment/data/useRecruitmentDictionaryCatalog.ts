import { useMemo } from "react";
import { listDictionaryEntries } from "@/lib/dictionary";
import type { DictionaryEntry } from "@/lib/dictionary";

function sortEntries(items: DictionaryEntry[]): DictionaryEntry[] {
  return [...items].sort((a, b) =>
    (a.abbreviation ?? a.name).localeCompare(b.abbreviation ?? b.name, "pt-PT"),
  );
}

const PSYCHO_TERMS = [
  "profissionalismo",
  "ambicao",
  "pressao",
  "lideranca",
  "temperamento",
  "consistencia",
  "versatilidade",
];

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function useRecruitmentDictionaryCatalog() {
  return useMemo(() => {
    const entries = listDictionaryEntries();
    const attributes = sortEntries(entries.filter((entry) => entry.category === "attribute"));
    const metrics = sortEntries(entries.filter((entry) => entry.category === "metric"));
    const contexts = sortEntries(entries.filter((entry) => entry.category === "context"));
    const profileFields = sortEntries(
      entries.filter((entry) => entry.category === "profile_field"),
    );

    const psychological = sortEntries(
      attributes.filter((entry) => {
        const bag = [entry.name, entry.abbreviation ?? "", ...entry.aliases].map(norm).join(" ");
        return PSYCHO_TERMS.some((t) => bag.includes(norm(t)));
      }),
    );

    return {
      entries,
      attributes,
      metrics,
      contexts,
      profileFields,
      psychological,
    };
  }, []);
}
