import type {
  CareerJournalCategory,
  CareerJournalEntry,
  CareerSeasonId,
  CareerSeasonJournal,
  JournalEntryId,
} from "../types";
import { nowIso, toJournalEntryId } from "../utils";

export interface JournalEntryCreateInput {
  id?: JournalEntryId;
  seasonId: CareerSeasonId;
  title: string;
  content: string;
  date?: string;
  category: CareerJournalCategory;
}

export function createSeasonJournal(seasonId: CareerSeasonId): CareerSeasonJournal {
  return {
    seasonId,
    notes: [],
    updatedAt: nowIso(),
  };
}

export function createJournalEntry(input: JournalEntryCreateInput): CareerJournalEntry {
  return {
    id: toJournalEntryId(input.id),
    seasonId: input.seasonId,
    title: input.title,
    content: input.content,
    date: input.date ?? nowIso(),
    category: input.category,
  };
}

export function addJournalEntry(
  journal: CareerSeasonJournal,
  note: CareerJournalEntry,
): CareerSeasonJournal {
  return {
    ...journal,
    notes: [...journal.notes, note],
    updatedAt: nowIso(),
  };
}

export function setSeasonStartNote(
  journal: CareerSeasonJournal,
  note: string,
): CareerSeasonJournal {
  return { ...journal, startNote: note, updatedAt: nowIso() };
}

export function setSeasonEndNote(journal: CareerSeasonJournal, note: string): CareerSeasonJournal {
  return { ...journal, endNote: note, updatedAt: nowIso() };
}
