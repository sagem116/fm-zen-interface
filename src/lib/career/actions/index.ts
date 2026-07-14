import { createCareerAchievement } from "../achievements";
import { createCareerAttachment } from "../attachments";
import { createJournalEntry } from "../journal";
import { addAttachmentToMuseum } from "../museum";
import { getCareerDomain, getCareerRepository } from "../runtime";
import { createCareerSeason, updateCareerSeason } from "../season";
import { createCareerTrophy } from "../trophies";
import type {
  AchievementId,
  AttachmentId,
  CareerAchievement,
  CareerCreateInput,
  CareerId,
  CareerSnapshot,
  CareerSeason,
  CareerSeasonCreateInput,
  CareerSeasonId,
  CareerTimelineEntry,
  CareerTrophy,
  JournalEntryId,
  TrophyId,
} from "../types";
import { emitCareerEvent } from "../events";
import {
  validateAchievement,
  validateJournal,
  validateSeason,
  validateTrophy,
} from "../validation";
import { nowIso } from "../utils";

function resolveCareerId(careerId?: CareerId): CareerId {
  if (careerId) return careerId;
  const active = getCareerDomain().getActiveCareer();
  if (!active) throw new Error("[career] no active career");
  return active.id;
}

function mutateCareer(careerId: CareerId, mutator: (career: CareerSnapshot) => void) {
  const repository = getCareerRepository();
  const career = repository.get(careerId);
  if (!career) throw new Error(`[career] not found: ${careerId}`);
  mutator(career);
  career.updatedAt = nowIso();
  repository.save(career);
  emitCareerEvent("CareerChanged", { careerId });
  return career;
}

export function createCareer(input: CareerCreateInput) {
  const career = getCareerDomain().createCareer(input);
  emitCareerEvent("CareerChanged", { careerId: career.id });
  return career;
}

export function setActiveCareer(careerId: CareerId) {
  getCareerDomain().setActiveCareer(careerId);
  emitCareerEvent("CareerChanged", { careerId });
}

export function createSeason(input: CareerSeasonCreateInput, careerId?: CareerId) {
  const resolvedCareerId = resolveCareerId(careerId);
  const seasonDraft = createCareerSeason(input);
  const validation = validateSeason(seasonDraft);
  if (!validation.valid) throw new Error(validation.errors.map((e) => e.message).join("; "));
  const career = getCareerDomain().addSeason(resolvedCareerId, input);
  const created = Object.values(career.seasons).find((item) => item.season === input.season);
  emitCareerEvent("SeasonCreated", { careerId: resolvedCareerId, seasonId: created?.id });
  emitCareerEvent("CareerChanged", { careerId: resolvedCareerId, seasonId: created?.id });
  return career;
}

export function updateSeason(
  seasonId: CareerSeasonId,
  patch: Partial<Omit<CareerSeason, "id" | "createdAt">>,
  careerId?: CareerId,
) {
  const resolvedCareerId = resolveCareerId(careerId);
  const career = mutateCareer(resolvedCareerId, (currentCareer) => {
    const target = currentCareer.seasons[seasonId];
    if (!target) throw new Error(`[career] season not found: ${seasonId}`);
    const next = updateCareerSeason(target, patch);
    const validation = validateSeason(next);
    if (!validation.valid) throw new Error(validation.errors.map((e) => e.message).join("; "));
    currentCareer.seasons[seasonId] = next;
    currentCareer.coachIdentityBySeason[seasonId] = {
      name: next.coach,
      club: next.club,
      country: next.country,
      mainCompetition: next.league,
    };
  });
  emitCareerEvent("SeasonUpdated", { careerId: resolvedCareerId, seasonId });
  return career;
}

export function deleteSeason(seasonId: CareerSeasonId, careerId?: CareerId) {
  const resolvedCareerId = resolveCareerId(careerId);
  const career = mutateCareer(resolvedCareerId, (currentCareer) => {
    delete currentCareer.seasons[seasonId];
    delete currentCareer.coachIdentityBySeason[seasonId];
    delete currentCareer.journals[seasonId];
    delete currentCareer.museums[seasonId];
    delete currentCareer.dna.bySeason[seasonId];
    delete currentCareer.bestElevens.bySeason[seasonId];
    delete currentCareer.seasonAssessments[seasonId];
    delete currentCareer.transferAssessments[seasonId];
    currentCareer.timeline = currentCareer.timeline.filter((entry) => entry.seasonId !== seasonId);
    for (const [id, item] of Object.entries(currentCareer.attachments)) {
      if (item.seasonId === seasonId) delete currentCareer.attachments[id as AttachmentId];
    }
    for (const [id, item] of Object.entries(currentCareer.achievements)) {
      if (item.seasonId === seasonId) delete currentCareer.achievements[id as AchievementId];
    }
    for (const [id, item] of Object.entries(currentCareer.trophies)) {
      if (item.seasonId === seasonId) delete currentCareer.trophies[id as TrophyId];
    }
    if (currentCareer.currentSeasonId === seasonId) currentCareer.currentSeasonId = undefined;
  });
  emitCareerEvent("SeasonDeleted", { careerId: resolvedCareerId, seasonId });
  return career;
}

export function addJournalEntry(
  input: {
    seasonId: CareerSeasonId;
    title: string;
    content: string;
    date?: string;
    category: import("../types").CareerJournalCategory;
  },
  careerId?: CareerId,
) {
  const resolvedCareerId = resolveCareerId(careerId);
  const note = createJournalEntry(input);
  const career = mutateCareer(resolvedCareerId, (currentCareer) => {
    const journal = currentCareer.journals[input.seasonId];
    if (!journal) throw new Error(`[career] journal not found for season: ${input.seasonId}`);
    const nextJournal = {
      ...journal,
      notes: [...journal.notes, note],
      updatedAt: nowIso(),
    };
    const validation = validateJournal(nextJournal);
    if (!validation.valid) throw new Error(validation.errors.map((e) => e.message).join("; "));
    currentCareer.journals[input.seasonId] = nextJournal;
  });
  emitCareerEvent("JournalUpdated", {
    careerId: resolvedCareerId,
    seasonId: input.seasonId,
    entityId: note.id,
  });
  return note;
}

export function updateJournalEntry(
  input: {
    seasonId: CareerSeasonId;
    noteId: JournalEntryId;
    patch: Partial<{
      title: string;
      content: string;
      date: string;
      category: import("../types").CareerJournalCategory;
    }>;
  },
  careerId?: CareerId,
) {
  const resolvedCareerId = resolveCareerId(careerId);
  const updated = mutateCareer(resolvedCareerId, (currentCareer) => {
    const journal = currentCareer.journals[input.seasonId];
    if (!journal) throw new Error(`[career] journal not found for season: ${input.seasonId}`);
    const notes = journal.notes.map((note) =>
      note.id === input.noteId ? { ...note, ...input.patch } : note,
    );
    const nextJournal = { ...journal, notes, updatedAt: nowIso() };
    const validation = validateJournal(nextJournal);
    if (!validation.valid) throw new Error(validation.errors.map((e) => e.message).join("; "));
    currentCareer.journals[input.seasonId] = nextJournal;
  });
  emitCareerEvent("JournalUpdated", {
    careerId: resolvedCareerId,
    seasonId: input.seasonId,
    entityId: input.noteId,
  });
  return updated;
}

export function addAchievement(
  input: {
    seasonId: CareerSeasonId;
    name: string;
    type: import("../types").CareerAchievementType;
    competition?: string;
    personalComment?: string;
  },
  careerId?: CareerId,
): CareerAchievement {
  const resolvedCareerId = resolveCareerId(careerId);
  const career = getCareerRepository().get(resolvedCareerId);
  if (!career) throw new Error(`[career] not found: ${resolvedCareerId}`);
  const season = career.seasons[input.seasonId];
  if (!season) throw new Error(`[career] season not found: ${input.seasonId}`);
  const achievement = createCareerAchievement({ ...input, season });
  const validation = validateAchievement(achievement);
  if (!validation.valid) throw new Error(validation.errors.map((e) => e.message).join("; "));

  mutateCareer(resolvedCareerId, (currentCareer) => {
    currentCareer.achievements[achievement.id] = achievement;
  });
  emitCareerEvent("AchievementAdded", {
    careerId: resolvedCareerId,
    seasonId: input.seasonId,
    entityId: achievement.id,
  });
  return achievement;
}

export function updateAchievement(
  achievementId: AchievementId,
  patch: Partial<Omit<CareerAchievement, "id" | "seasonId" | "createdAt">>,
  careerId?: CareerId,
): CareerAchievement {
  const resolvedCareerId = resolveCareerId(careerId);
  let updated: CareerAchievement | undefined;
  mutateCareer(resolvedCareerId, (currentCareer) => {
    const target = currentCareer.achievements[achievementId];
    if (!target) throw new Error(`[career] achievement not found: ${achievementId}`);
    const next: CareerAchievement = {
      ...target,
      ...patch,
      id: target.id,
      seasonId: target.seasonId,
      createdAt: target.createdAt,
    };
    const validation = validateAchievement(next);
    if (!validation.valid) throw new Error(validation.errors.map((e) => e.message).join("; "));
    currentCareer.achievements[achievementId] = next;
    updated = next;
  });
  emitCareerEvent("AchievementUpdated", { careerId: resolvedCareerId, entityId: achievementId });
  if (!updated) throw new Error(`[career] achievement not found: ${achievementId}`);
  return updated;
}

export function addAttachment(
  input: {
    seasonId: CareerSeasonId;
    name: string;
    type: import("../types").CareerAttachmentType;
    category: import("../types").CareerAttachmentCategory;
    path: string;
    date?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  },
  careerId?: CareerId,
) {
  const resolvedCareerId = resolveCareerId(careerId);
  const attachment = createCareerAttachment(input);
  mutateCareer(resolvedCareerId, (currentCareer) => {
    currentCareer.attachments[attachment.id] = attachment;
  });
  emitCareerEvent("GalleryUpdated", {
    careerId: resolvedCareerId,
    seasonId: input.seasonId,
    entityId: attachment.id,
  });
  return attachment;
}

export function removeAttachment(attachmentId: AttachmentId, careerId?: CareerId) {
  const resolvedCareerId = resolveCareerId(careerId);
  mutateCareer(resolvedCareerId, (currentCareer) => {
    delete currentCareer.attachments[attachmentId];
    for (const museum of Object.values(currentCareer.museums)) {
      museum.attachmentIds = museum.attachmentIds.filter((id) => id !== attachmentId);
      museum.updatedAt = nowIso();
    }
    for (const achievement of Object.values(currentCareer.achievements)) {
      achievement.attachmentIds = achievement.attachmentIds.filter((id) => id !== attachmentId);
    }
    for (const trophy of Object.values(currentCareer.trophies)) {
      trophy.attachmentIds = trophy.attachmentIds.filter((id) => id !== attachmentId);
    }
  });
  emitCareerEvent("GalleryUpdated", { careerId: resolvedCareerId, entityId: attachmentId });
}

export function addGalleryItem(
  input: { seasonId: CareerSeasonId; attachmentId: AttachmentId },
  careerId?: CareerId,
) {
  const resolvedCareerId = resolveCareerId(careerId);
  mutateCareer(resolvedCareerId, (currentCareer) => {
    const museum = currentCareer.museums[input.seasonId];
    if (!museum) throw new Error(`[career] museum not found: ${input.seasonId}`);
    const attachment = currentCareer.attachments[input.attachmentId];
    if (!attachment) throw new Error(`[career] attachment not found: ${input.attachmentId}`);
    currentCareer.museums[input.seasonId] = addAttachmentToMuseum(
      museum,
      input.attachmentId,
      attachment.category,
    );
  });
  emitCareerEvent("GalleryUpdated", {
    careerId: resolvedCareerId,
    seasonId: input.seasonId,
    entityId: input.attachmentId,
  });
}

export function removeGalleryItem(
  input: { seasonId: CareerSeasonId; attachmentId: AttachmentId },
  careerId?: CareerId,
) {
  const resolvedCareerId = resolveCareerId(careerId);
  mutateCareer(resolvedCareerId, (currentCareer) => {
    const museum = currentCareer.museums[input.seasonId];
    if (!museum) throw new Error(`[career] museum not found: ${input.seasonId}`);
    currentCareer.museums[input.seasonId] = {
      ...museum,
      attachmentIds: museum.attachmentIds.filter((id) => id !== input.attachmentId),
      updatedAt: nowIso(),
    };
  });
  emitCareerEvent("GalleryUpdated", {
    careerId: resolvedCareerId,
    seasonId: input.seasonId,
    entityId: input.attachmentId,
  });
}

export function addTrophy(
  input: { seasonId: CareerSeasonId; name: string; competition: string; description?: string },
  careerId?: CareerId,
): CareerTrophy {
  const resolvedCareerId = resolveCareerId(careerId);
  const career = getCareerRepository().get(resolvedCareerId);
  if (!career) throw new Error(`[career] not found: ${resolvedCareerId}`);
  const season = career.seasons[input.seasonId];
  if (!season) throw new Error(`[career] season not found: ${input.seasonId}`);
  const trophy = createCareerTrophy({ ...input, season });
  const validation = validateTrophy(trophy);
  if (!validation.valid) throw new Error(validation.errors.map((e) => e.message).join("; "));
  mutateCareer(resolvedCareerId, (currentCareer) => {
    currentCareer.trophies[trophy.id] = trophy;
  });
  emitCareerEvent("TrophyAdded", {
    careerId: resolvedCareerId,
    seasonId: input.seasonId,
    entityId: trophy.id,
  });
  return trophy;
}

export function updateTrophy(
  trophyId: TrophyId,
  patch: Partial<Omit<CareerTrophy, "id" | "seasonId" | "createdAt">>,
  careerId?: CareerId,
): CareerTrophy {
  const resolvedCareerId = resolveCareerId(careerId);
  let updated: CareerTrophy | undefined;
  mutateCareer(resolvedCareerId, (currentCareer) => {
    const target = currentCareer.trophies[trophyId];
    if (!target) throw new Error(`[career] trophy not found: ${trophyId}`);
    const next: CareerTrophy = {
      ...target,
      ...patch,
      id: target.id,
      seasonId: target.seasonId,
      createdAt: target.createdAt,
    };
    const validation = validateTrophy(next);
    if (!validation.valid) throw new Error(validation.errors.map((e) => e.message).join("; "));
    currentCareer.trophies[trophyId] = next;
    updated = next;
  });
  emitCareerEvent("TrophyUpdated", { careerId: resolvedCareerId, entityId: trophyId });
  if (!updated) throw new Error(`[career] trophy not found: ${trophyId}`);
  return updated;
}

export function favoriteMoment(momentId: string, careerId?: CareerId) {
  const resolvedCareerId = resolveCareerId(careerId);
  mutateCareer(resolvedCareerId, (currentCareer) => {
    const metadata = (currentCareer.metadata ?? {}) as Record<string, unknown>;
    const favorites = Array.isArray(metadata.favoriteMomentIds)
      ? (metadata.favoriteMomentIds as string[])
      : [];
    metadata.favoriteMomentIds = favorites.includes(momentId)
      ? favorites
      : [...favorites, momentId];
    currentCareer.metadata = metadata;
  });
}

export function pinMoment(momentId: string, careerId?: CareerId) {
  const resolvedCareerId = resolveCareerId(careerId);
  mutateCareer(resolvedCareerId, (currentCareer) => {
    const metadata = (currentCareer.metadata ?? {}) as Record<string, unknown>;
    const pinned = Array.isArray(metadata.pinnedMomentIds)
      ? (metadata.pinnedMomentIds as string[])
      : [];
    metadata.pinnedMomentIds = pinned.includes(momentId) ? pinned : [...pinned, momentId];
    currentCareer.metadata = metadata;
  });
}

export function setCareerAssociatedCoachIdu(idu: string | null, careerId?: CareerId) {
  const resolvedCareerId = resolveCareerId(careerId);
  const career = mutateCareer(resolvedCareerId, (currentCareer) => {
    const metadata = (currentCareer.metadata ?? {}) as Record<string, unknown>;
    if (idu && idu.trim()) {
      metadata.associatedCoachIdu = idu.trim();
    } else {
      delete metadata.associatedCoachIdu;
    }
    currentCareer.metadata = metadata;
  });

  return career;
}

export function addTimelineEntry(entry: CareerTimelineEntry, careerId?: CareerId) {
  const resolvedCareerId = resolveCareerId(careerId);
  const career = getCareerDomain().appendTimelineEntry(resolvedCareerId, entry);
  emitCareerEvent("CareerChanged", {
    careerId: resolvedCareerId,
    seasonId: entry.seasonId,
    entityId: entry.id,
  });
  return career;
}
