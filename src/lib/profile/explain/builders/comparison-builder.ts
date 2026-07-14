import type { RecruitmentPlayer } from "@/features/recruitment/types/recruitment-models";
import type { StyleVector } from "@/lib/profile/style";
import { buildRecruitmentStyleAnalysis } from "@/features/recruitment/services/recruitment-style";
import type { ClubPeerComparison, PlayerPeerComparison, TeamCollectiveMetrics } from "../types";

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pctDelta(value: number, base: number): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Math.round(((value - base) / base) * 100);
}

function similarity(a: StyleVector, b: StyleVector): number {
  const keys: Array<keyof StyleVector> = [
    "possession",
    "buildUp",
    "shortPassing",
    "longPassing",
    "progression",
    "pressing",
    "recovery",
    "counterAttack",
    "transitions",
    "crossing",
    "interiorPlay",
    "widePlay",
    "finishing",
    "creativity",
    "defensiveIntensity",
    "discipline",
  ];
  const diff = avg(keys.map((key) => Math.abs((a[key] ?? 0) - (b[key] ?? 0))));
  return Math.max(0, Math.min(100, Math.round(100 - diff)));
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function buildPlayerPeerComparisons(input: {
  player: RecruitmentPlayer;
  peers: RecruitmentPlayer[];
  teamPlayers: RecruitmentPlayer[];
  leaguePlayers: RecruitmentPlayer[];
}): PlayerPeerComparison[] {
  const own = buildRecruitmentStyleAnalysis(input.player).vector;
  const positionPeers = input.peers.filter(
    (candidate) =>
      candidate.id !== input.player.id && normalize(candidate.position) === normalize(input.player.position),
  );
  const globalPeers = input.peers.filter((candidate) => candidate.id !== input.player.id);

  const scopes: Array<{ scope: PlayerPeerComparison["scope"]; list: RecruitmentPlayer[] }> = [
    { scope: "position", list: positionPeers },
    { scope: "team", list: input.teamPlayers.filter((candidate) => candidate.id !== input.player.id) },
    { scope: "league", list: input.leaguePlayers.filter((candidate) => candidate.id !== input.player.id) },
    { scope: "global", list: globalPeers },
  ];

  return scopes.map(({ scope, list }) => {
    const vectors = list.map((candidate) => buildRecruitmentStyleAnalysis(candidate).vector);
    const base = {
      creativity: avg(vectors.map((vector) => vector.creativity)),
      finishing: avg(vectors.map((vector) => vector.finishing)),
      defensive: avg(vectors.map((vector) => vector.defensiveIntensity)),
      buildUp: avg(vectors.map((vector) => vector.buildUp)),
    };
    return {
      scope,
      sample: list.length,
      deltaCreativity: pctDelta(own.creativity, base.creativity),
      deltaFinishing: pctDelta(own.finishing, base.finishing),
      deltaDefensive: pctDelta(own.defensiveIntensity, base.defensive),
      deltaBuildUp: pctDelta(own.buildUp, base.buildUp),
    };
  });
}

export function buildClubPeerComparisons(input: {
  ownClub: string;
  ownCompetition: string | null;
  ownMetrics: TeamCollectiveMetrics;
  clubs: Array<{ club: string; competition: string | null; metrics: TeamCollectiveMetrics }>;
}): ClubPeerComparison[] {
  const own = input.ownMetrics;

  return input.clubs
    .filter((candidate) => normalize(candidate.club) !== normalize(input.ownClub))
    .map((candidate) => ({
      club: candidate.club,
      competition: candidate.competition,
      similarity: similarity(own.vector, candidate.metrics.vector),
      deltaAttack: pctDelta(own.attack, candidate.metrics.attack),
      deltaDefense: pctDelta(own.defense, candidate.metrics.defense),
      deltaPossession: pctDelta(own.possession, candidate.metrics.possession),
      deltaTransitions: pctDelta(own.transitions, candidate.metrics.transitions),
    }))
    .sort((a, b) => b.similarity - a.similarity || a.club.localeCompare(b.club, "pt-PT"))
    .slice(0, 6);
}
