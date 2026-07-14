export type CareerId = `career.${string}`;
export type CareerSeasonId = `career_season.${string}`;
export type TimelineEntryId = `career_timeline.${string}`;
export type JournalEntryId = `career_journal.${string}`;
export type AttachmentId = `career_attachment.${string}`;
export type TrophyId = `career_trophy.${string}`;
export type AchievementId = `career_achievement.${string}`;
export type RecordId = `career_record.${string}`;

export type CareerEntityKind = "player" | "coach" | "club" | "competition" | "country";

export type CareerJournalCategory =
  | "planning"
  | "targets"
  | "tactics"
  | "squad"
  | "matches"
  | "competitions"
  | "transfers"
  | "board"
  | "national_team"
  | "other";

export type CareerAttachmentType = "png" | "jpg" | "webp" | "gif" | "pdf" | "mp4";

export type CareerAttachmentCategory =
  | "squad"
  | "tactics"
  | "standings"
  | "transfers"
  | "matches"
  | "finals"
  | "records"
  | "other"
  | "achievement"
  | "trophy"
  | "journal";

export type CareerTimelineEventType =
  | "season_started"
  | "season_finished"
  | "club_changed"
  | "country_changed"
  | "national_team_changed"
  | "competition_changed"
  | "milestone";

export type CareerAchievementType =
  | "league"
  | "cup"
  | "continental"
  | "international"
  | "record"
  | "milestone"
  | "personal"
  | "other";

export type CareerDnaCategory =
  | "mercado"
  | "tatica"
  | "desenvolvimento"
  | "competicoes"
  | "transferencias"
  | "formacao"
  | "nacionalidades"
  | "faixa_etaria"
  | "perfil_jogadores";

export type CareerPreferenceCategory =
  | "nationalities"
  | "countries"
  | "leagues"
  | "competitions"
  | "positions"
  | "ages"
  | "clubs"
  | "continents"
  | "contract_types"
  | "player_profiles";

export type CareerHallOfFameGroup = "players" | "clubs" | "coaches" | "competitions";

export type CareerSeasonAssessmentType =
  "season" | "team" | "competitions" | "squad" | "highlights" | "disappointments";

export type CareerTransferAssessmentLabel =
  "signing_of_the_century" | "excellent" | "good" | "flop" | "worst_signing";

export interface CareerCoachIdentity {
  name: string;
  club: string;
  country: string;
  mainCompetition: string;
}

export interface CareerSeason {
  id: CareerSeasonId;
  season: number;
  club: string;
  coach: string;
  country: string;
  league: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareerTimelineEntry {
  id: TimelineEntryId;
  seasonId: CareerSeasonId;
  season: number;
  eventType: CareerTimelineEventType;
  title: string;
  description?: string;
  club?: string;
  country?: string;
  competition?: string;
  createdAt: string;
}

export interface CareerJournalEntry {
  id: JournalEntryId;
  seasonId: CareerSeasonId;
  title: string;
  content: string;
  date: string;
  category: CareerJournalCategory;
}

export interface CareerSeasonJournal {
  seasonId: CareerSeasonId;
  startNote?: string;
  endNote?: string;
  notes: CareerJournalEntry[];
  updatedAt: string;
}

export interface CareerAttachment {
  id: AttachmentId;
  seasonId: CareerSeasonId;
  name: string;
  type: CareerAttachmentType;
  category: CareerAttachmentCategory;
  path: string;
  date: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CareerMuseum {
  seasonId: CareerSeasonId;
  categories: CareerAttachmentCategory[];
  attachmentIds: AttachmentId[];
  updatedAt: string;
}

export interface CareerTrophy {
  id: TrophyId;
  seasonId: CareerSeasonId;
  name: string;
  competition: string;
  season: number;
  club: string;
  description?: string;
  attachmentIds: AttachmentId[];
  createdAt: string;
}

export interface CareerAchievement {
  id: AchievementId;
  seasonId: CareerSeasonId;
  name: string;
  type: CareerAchievementType;
  competition?: string;
  season: number;
  personalComment?: string;
  attachmentIds: AttachmentId[];
  createdAt: string;
}

export interface CareerBestElevenSlot {
  position: string;
  player: string;
  club: string;
  season: number;
}

export interface CareerBestEleven {
  scope: "season" | "career";
  seasonId?: CareerSeasonId;
  entries: CareerBestElevenSlot[];
  updatedAt: string;
}

export interface CareerHallOfFameEntry {
  id: string;
  group: CareerHallOfFameGroup;
  entityName: string;
  notes?: string;
  metrics?: Record<string, number>;
  seasons: number[];
  updatedAt: string;
}

export interface CareerDnaDimension {
  category: CareerDnaCategory;
  summary?: string;
  tags: string[];
  notes?: string;
}

export interface CareerDnaProfile {
  seasonId?: CareerSeasonId;
  dimensions: CareerDnaDimension[];
  updatedAt: string;
}

export interface CareerPreferenceItem {
  value: string;
  count: number;
  lastSeenAt?: string;
}

export interface CareerPreferenceBucket {
  category: CareerPreferenceCategory;
  top: CareerPreferenceItem[];
  maxItems: number;
  updatedAt: string;
}

export interface CareerStatisticsGlobal {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  titles: number;
  points: number;
  averages: Record<string, number>;
  percentages: Record<string, number>;
  updatedAt: string;
}

export interface CareerSeasonAssessmentEntry {
  type: CareerSeasonAssessmentType;
  title: string;
  body: string;
  rating?: number;
}

export interface CareerSeasonAssessmentBundle {
  seasonId: CareerSeasonId;
  entries: CareerSeasonAssessmentEntry[];
  updatedAt: string;
}

export interface CareerTransferAssessment {
  id: string;
  seasonId: CareerSeasonId;
  playerName: string;
  club: string;
  label: CareerTransferAssessmentLabel;
  value?: number;
  notes?: string;
  createdAt: string;
}

export interface CareerRecord {
  id: RecordId;
  key: string;
  label: string;
  value: string;
  season?: number;
  context?: string;
  updatedAt: string;
}

export interface CareerSnapshot {
  id: CareerId;
  name: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
  currentSeasonId?: CareerSeasonId;
  coachIdentityBySeason: Record<CareerSeasonId, CareerCoachIdentity>;
  seasons: Record<CareerSeasonId, CareerSeason>;
  timeline: CareerTimelineEntry[];
  journals: Record<CareerSeasonId, CareerSeasonJournal>;
  museums: Record<CareerSeasonId, CareerMuseum>;
  attachments: Record<AttachmentId, CareerAttachment>;
  trophies: Record<TrophyId, CareerTrophy>;
  achievements: Record<AchievementId, CareerAchievement>;
  bestElevens: {
    bySeason: Record<CareerSeasonId, CareerBestEleven>;
    career?: CareerBestEleven;
  };
  hallOfFame: CareerHallOfFameEntry[];
  dna: {
    bySeason: Record<CareerSeasonId, CareerDnaProfile>;
    career?: CareerDnaProfile;
  };
  preferences: Record<CareerPreferenceCategory, CareerPreferenceBucket>;
  statistics?: CareerStatisticsGlobal;
  seasonAssessments: Record<CareerSeasonId, CareerSeasonAssessmentBundle>;
  transferAssessments: Record<CareerSeasonId, CareerTransferAssessment[]>;
  records: Record<RecordId, CareerRecord>;
  metadata?: Record<string, unknown>;
}

export interface CareerStoreSnapshot {
  schemaVersion: "1.0";
  careers: Record<CareerId, CareerSnapshot>;
  activeCareerId?: CareerId;
  updatedAt: string;
}

export interface CareerCreateInput {
  id?: CareerId;
  name: string;
  ownerName?: string;
  metadata?: Record<string, unknown>;
}

export interface CareerSeasonCreateInput {
  id?: CareerSeasonId;
  season: number;
  club: string;
  coach: string;
  country: string;
  league: string;
}
