import { useMemo } from "react";
import { type StyleVector } from "@/lib/profile/style";
import type { TacticalProfileId } from "../constants/recruitment-tactical";
import { tacticalPresetById } from "../constants/recruitment-tactical";
import { useRecruitmentSourceData } from "../data/useRecruitmentSourceData";
import { buildRecruitmentStyleAnalysis } from "../services/recruitment-style";
import {
  buildCompatibilityRadar,
  buildCompatibilityScores,
  buildPositionalCompatibility,
  buildStrengths,
  buildStyleIndicators,
  buildTeamStyleSummary,
  buildWeaknesses,
  type PositionalCompatibility,
  type TacticalDimensionScores,
  type TacticalRadarItem,
  type TacticalStyleIndicator,
} from "../services/recruitment-tactical";

export type TacticalEntityTab = "player" | "coach";

export interface TacticalRecruitmentCandidate {
  id: string;
  kind: TacticalEntityTab;
  name: string;
  club: string | null;
  country: string | null;
  age: number | null;
  position: string | null;
  compatibility: TacticalDimensionScores;
  radar: TacticalRadarItem[];
  positions: PositionalCompatibility[];
  strengths: string[];
  weaknesses: string[];
  styleIndicators: TacticalStyleIndicator[];
  vector: StyleVector;
  summary: string;
}

export interface TacticalRecruitmentQuery {
  profileId: TacticalProfileId;
  customVector: StyleVector;
  tab: TacticalEntityTab;
  query: string;
  minCompatibility: number;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function scoreValue(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function useRecruitmentTacticalRecruitment(input: TacticalRecruitmentQuery) {
  const { source, isLoading: sourceLoading } = useRecruitmentSourceData();

  const data = useMemo(() => {
    if (!source) return null;

    const styleTarget =
      input.profileId === "custom"
        ? input.customVector
        : tacticalPresetById(input.profileId).vector;

    const raw =
      input.tab === "player"
        ? (source.playerUniverse?.list ?? []).map((e: any) => {
            const season = e.seasonYear ?? null;
            const historyPoint = season != null && e.history ? e.history[season] ?? {} : {};
            return {
              id: `player:${e.uid}`,
              type: "player",
              name: e.name,
              club: e.currentClub ?? null,
              country: e.country ?? null,
              competition: (e.extras && (e.extras.competition ?? e.extras.league)) ?? null,
              profileUrl: `/jogadores/${encodeURIComponent(e.name)}`,
              ranking: null,
              score: e.ca ?? null,
              marketValue: historyPoint.value ?? null,
              ca: e.ca ?? null,
              pa: e.pa ?? null,
              age: e.age ?? null,
              position: (e.extras && (e.extras.primary_position ?? e.extras.position)) ?? null,
              currentSeason: season,
              badges: [],
              tags: [],
              metadata: {
                source: "player_universe",
                idu: e.idu ?? null,
                salary: historyPoint.salary ?? null,
                personality: e.extras?.personality ?? null,
                reputation: historyPoint.reputation ?? null,
                age: e.age ?? null,
                marketValue: historyPoint.value ?? null,
                position: e.extras?.primary_position ?? null,
                nationality: e.country ?? null,
                extras: e.extras ?? {},
              },
            } as any;
          })
        : source.entities.coaches;
    const filterQuery = normalize(input.query);

    const candidates: TacticalRecruitmentCandidate[] = raw
      .filter((item) => {
        if (!filterQuery) return true;
        const bag = [item.name, item.club, item.country, item.competition].map(normalize).join(" ");
        return bag.includes(filterQuery);
      })
      .slice(0, 900)
      .map((item) => {
        const analysis = buildRecruitmentStyleAnalysis(item);
        const meta = (item.metadata ?? {}) as Record<string, unknown>;

        const compatibility = buildCompatibilityScores({
          vector: analysis.vector,
          philosophy: styleTarget,
          currentScore: scoreValue(item.score),
          potentialScore: scoreValue((item as { pa?: number | null }).pa),
          age: scoreValue((item as { age?: number | null }).age ?? meta.age),
        });

        return {
          id: item.id,
          kind: (item.type === "coach" ? "coach" : "player") as TacticalEntityTab,
          name: item.name,
          club: item.club ?? null,
          country: item.country ?? null,
          age: scoreValue((item as { age?: number | null }).age ?? meta.age),
          position:
            ((item as { position?: string | null }).position ?? String(meta.position ?? "")) ||
            null,
          compatibility,
          radar: buildCompatibilityRadar(analysis.vector),
          positions: buildPositionalCompatibility(
            ((item as { position?: string | null }).position ?? String(meta.position ?? "")) ||
              null,
            analysis.vector,
          ),
          strengths: buildStrengths(analysis.vector),
          weaknesses: buildWeaknesses(analysis.vector),
          styleIndicators: buildStyleIndicators(analysis.vector),
          vector: analysis.vector,
          summary: analysis.summary,
        };
      })
      .filter((item) => item.compatibility.global >= input.minCompatibility)
      .sort(
        (a, b) =>
          b.compatibility.global - a.compatibility.global || a.name.localeCompare(b.name, "pt-PT"),
      );

    const teamSummary = buildTeamStyleSummary(candidates.slice(0, 60).map((item) => item.vector));

    return {
      targetVector: styleTarget,
      candidates,
      teamSummary,
    };
  }, [source, input]);

  return {
    isLoading: sourceLoading,
    data,
  };
}
