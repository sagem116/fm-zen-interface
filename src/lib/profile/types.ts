// Profile plugin architecture — shared types
// Zero coupling to any engine. Consumers register tabs in the registry.

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { useRankings } from "@/lib/useRankings";

export type ProfileEntityKind = "club" | "player" | "coach" | "competition" | "country";

export type RankingsPayload = NonNullable<ReturnType<typeof useRankings>["data"]>;

export interface ProfileQuickStat {
  label: string;
  value: string | number;
  hint?: string;
}

export interface ProfileHeaderMeta {
  /** Country associated with the entity, when applicable. */
  country?: string | null;
  /** League/competition, when applicable (players, coaches). */
  league?: string | null;
  /** Club associated with the entity, when applicable. */
  club?: string | null;
  /** Main competition associated with the entity, when applicable. */
  competition?: string | null;
  /** Continent associated with the entity, when applicable. */
  continent?: string | null;
  /** Current role/cargo, when applicable. */
  role?: string | null;
  /** Current season label, when available. */
  currentSeason?: string | null;
  /** Free-form description under the title. */
  description?: string | null;
}

export interface ProfileRankingSummary {
  current: number | null;
  best: number | null;
  previous: number | null;
  trend: "up" | "down" | "stable" | "na";
  deltaVsPrevious: number | null;
}

export interface ProfileContext {
  kind: ProfileEntityKind;
  name: string;
  data: RankingsPayload;
  /** Kind-specific profile object built by existing fm-profiles helpers. `null` when the entity is derived only from rankings. */
  profile: unknown;
  /** Header metadata (country, league, description). */
  meta: ProfileHeaderMeta;
  /** Global current ranking position (1-based) when known. */
  currentRank: number | null;
  /** Header ranking summary (current / best / previous / trend). */
  ranking?: ProfileRankingSummary;
  /** Header quick stat cards. */
  quickStats: ProfileQuickStat[];
}

export interface ProfileTabDef {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Sort key; the default set uses 100-step increments so new modules fit between them. */
  order: number;
  /** Entity kinds this tab applies to. */
  kinds: ProfileEntityKind[];
  /** Optional runtime gate. Returning false hides the tab. */
  enabled?: (ctx: ProfileContext) => boolean;
  render: (ctx: ProfileContext) => ReactNode;
}

/** Metadata used by future Global Search to deep-link into profiles. */
export interface ProfileDeepLink {
  kind: ProfileEntityKind;
  name: string;
  tab?: string;
}
