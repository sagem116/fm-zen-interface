export function nowIso(): string {
  return new Date().toISOString();
}

export function randomId(prefix: string): string {
  return `${prefix}.${Math.random().toString(36).slice(2, 10)}`;
}

export function toCareerId(value?: string): `career.${string}` {
  return (value ?? randomId("career")) as `career.${string}`;
}

export function toCareerSeasonId(value?: string): `career_season.${string}` {
  return (value ?? randomId("career_season")) as `career_season.${string}`;
}

export function toTimelineEntryId(value?: string): `career_timeline.${string}` {
  return (value ?? randomId("career_timeline")) as `career_timeline.${string}`;
}

export function toJournalEntryId(value?: string): `career_journal.${string}` {
  return (value ?? randomId("career_journal")) as `career_journal.${string}`;
}

export function toAttachmentId(value?: string): `career_attachment.${string}` {
  return (value ?? randomId("career_attachment")) as `career_attachment.${string}`;
}

export function toTrophyId(value?: string): `career_trophy.${string}` {
  return (value ?? randomId("career_trophy")) as `career_trophy.${string}`;
}

export function toAchievementId(value?: string): `career_achievement.${string}` {
  return (value ?? randomId("career_achievement")) as `career_achievement.${string}`;
}

export function toRecordId(value?: string): `career_record.${string}` {
  return (value ?? randomId("career_record")) as `career_record.${string}`;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function safeObject<T extends Record<string, unknown>>(value: T | null | undefined): T {
  return (value ?? {}) as T;
}
