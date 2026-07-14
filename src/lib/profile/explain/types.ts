import type { RecruitmentPlayer } from "@/features/recruitment/types/recruitment-models";
import type { StyleVector } from "@/lib/profile/style";

export interface ExplainBadge {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

export interface ExplainIndicator {
  label: string;
  value: number;
  hint?: string;
}

export interface ExplainSection {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  bullets?: string[];
  badges?: ExplainBadge[];
  indicators?: ExplainIndicator[];
}

export interface TeamCollectiveMetrics {
  playerCount: number;
  build: number;
  attack: number;
  defense: number;
  possession: number;
  transitions: number;
  intensity: number;
  creativity: number;
  physicality: number;
  organization: number;
  unpredictability: number;
  vector: StyleVector;
}

export interface ClubPeerComparison {
  club: string;
  competition: string | null;
  similarity: number;
  deltaAttack: number;
  deltaDefense: number;
  deltaPossession: number;
  deltaTransitions: number;
}

export interface PlayerPeerComparison {
  scope: "position" | "team" | "league" | "global";
  deltaCreativity: number;
  deltaFinishing: number;
  deltaDefensive: number;
  deltaBuildUp: number;
  sample: number;
}

export interface ClubExplainModel {
  clubName: string;
  season: number;
  sections: ExplainSection[];
}

export interface PlayerExplainModel {
  playerName: string;
  season: number;
  sections: ExplainSection[];
}

export interface ClubCollectiveInput {
  clubName: string;
  season: number;
  players: RecruitmentPlayer[];
}
