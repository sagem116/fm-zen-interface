import type {
  CareerAchievement,
  CareerMuseum,
  CareerSeason,
  CareerSeasonJournal,
  CareerTrophy,
} from "../types";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}

function done(errors: ValidationIssue[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

export function validateSeason(season: CareerSeason): ValidationResult {
  const errors: ValidationIssue[] = [];
  if (!season.season || season.season <= 0)
    errors.push({ path: "season", message: "Season must be a positive year." });
  if (!season.coach.trim()) errors.push({ path: "coach", message: "Coach is required." });
  if (!season.club.trim()) errors.push({ path: "club", message: "Club is required." });
  if (!season.country.trim()) errors.push({ path: "country", message: "Country is required." });
  if (!season.league.trim()) errors.push({ path: "league", message: "League is required." });
  return done(errors);
}

export function validateJournal(journal: CareerSeasonJournal): ValidationResult {
  const errors: ValidationIssue[] = [];
  if (!journal.seasonId) errors.push({ path: "seasonId", message: "seasonId is required." });
  for (let i = 0; i < journal.notes.length; i += 1) {
    const note = journal.notes[i];
    if (!note.title.trim())
      errors.push({ path: `notes[${i}].title`, message: "Title is required." });
    if (!note.content.trim())
      errors.push({ path: `notes[${i}].content`, message: "Content is required." });
  }
  return done(errors);
}

export function validateAchievement(achievement: CareerAchievement): ValidationResult {
  const errors: ValidationIssue[] = [];
  if (!achievement.name.trim())
    errors.push({ path: "name", message: "Achievement name is required." });
  if (!achievement.type.trim())
    errors.push({ path: "type", message: "Achievement type is required." });
  if (!achievement.season) errors.push({ path: "season", message: "Season is required." });
  return done(errors);
}

export function validateGallery(museum: CareerMuseum): ValidationResult {
  const errors: ValidationIssue[] = [];
  if (!museum.seasonId) errors.push({ path: "seasonId", message: "seasonId is required." });
  return done(errors);
}

export function validateTrophy(trophy: CareerTrophy): ValidationResult {
  const errors: ValidationIssue[] = [];
  if (!trophy.name.trim()) errors.push({ path: "name", message: "Trophy name is required." });
  if (!trophy.competition.trim())
    errors.push({ path: "competition", message: "Competition is required." });
  if (!trophy.club.trim()) errors.push({ path: "club", message: "Club is required." });
  if (!trophy.season) errors.push({ path: "season", message: "Season is required." });
  return done(errors);
}
