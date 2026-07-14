import type { Json } from "@/integrations/supabase/types";
import type { PlayerProfileDataRow } from "@/lib/usePlayerProfilesData";
import type {
  RecruitmentClub,
  RecruitmentCoach,
  RecruitmentCompetition,
  RecruitmentCountry,
  RecruitmentEntitiesPayload,
  RecruitmentEntity,
  RecruitmentPlayer,
} from "../types/recruitment-models";

function clubProfileUrl(name: string) {
  return `/clubes/${encodeURIComponent(name)}`;
}
function coachProfileUrl(name: string) {
  return `/treinadores/${encodeURIComponent(name)}`;
}
function playerProfileUrl(name: string) {
  return `/jogadores/${encodeURIComponent(name)}`;
}
function competitionProfileUrl(name: string) {
  return `/competicoes/${encodeURIComponent(name)}`;
}
function countryProfileUrl(name: string) {
  return `/paises/${encodeURIComponent(name)}`;
}

function asRecord(value: Json | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function toNumberMap(record: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    const parsed = asNumber(value);
    if (parsed != null) out[key] = parsed;
  }
  return out;
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function extractStringByCandidates(pool: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (pool[key] == null) continue;
    const value = asString(pool[key]);
    if (value) return value;
  }
  for (const [key, raw] of Object.entries(pool)) {
    const normalized = key.toLowerCase();
    if (keys.some((candidate) => normalized.includes(candidate.toLowerCase()))) {
      const value = asString(raw);
      if (value) return value;
    }
  }
  return null;
}

function extractCompetition(extras: Record<string, unknown>): string | null {
  return extractStringByCandidates(extras, [
    "player.context.competition",
    "player.context.league",
    "competition",
    "league",
  ]);
}

function extractCoach(extras: Record<string, unknown>): string | null {
  return extractStringByCandidates(extras, ["coach", "treinador", "manager"]);
}

function extractContract(extras: Record<string, unknown>): string | null {
  return extractStringByCandidates(extras, ["contract", "contrato"]);
}

function extractStatistics(extras: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(extras)) {
    if (!key.includes("stat") && !key.includes("performance") && !key.includes("history")) {
      continue;
    }
    const parsed = asNumber(value);
    if (parsed != null) out[key] = parsed;
  }
  const nestedStats = asRecord(extras.statistics as Json | null);
  return { ...out, ...toNumberMap(nestedStats) };
}

type HistoryPoint = {
  season: number;
  ca: number | null;
  cp: number | null;
  value: number | null;
  salary: number | null;
  reputation: number | null;
  avgRating: number | null;
};

export function adaptPlayerProfilesToRecruitmentEntities(
  rows: PlayerProfileDataRow[],
): RecruitmentEntitiesPayload {
  const rowsByPlayer = new Map<string, PlayerProfileDataRow[]>();

  for (const row of rows) {
    const playerName = asString(row.player_name);
    if (!playerName) continue;
    const key = row.idu ? `idu:${row.idu}` : `name:${playerName.toLowerCase()}`;
    const bucket = rowsByPlayer.get(key) ?? [];
    bucket.push(row);
    rowsByPlayer.set(key, bucket);
  }

  const players: RecruitmentPlayer[] = [];
  const coachesBucket = new Map<string, { name: string; club: string | null; country: string | null; seasons: Set<number>; scoreSamples: number[] }>();

  for (const playerRows of rowsByPlayer.values()) {
    const sortedRows = [...playerRows].sort((a, b) => b.season_year - a.season_year);
    const latest = sortedRows[0];
    if (!latest) continue;

    const latestExtras = asRecord(latest.extras);
    const latestAttributes = toNumberMap(asRecord(latest.attributes));
    const extrasMetrics = asRecord(asRecord(latest.extras).metrics as Json | null);
    const latestMetrics = toNumberMap(extrasMetrics);
    const competition = extractCompetition(latestExtras);
    const coachName = extractCoach(latestExtras);
    const contract = extractContract(latestExtras);
    const stats = extractStatistics(latestExtras);

    const history: HistoryPoint[] = sortedRows
      .map((row) => {
        const extras = asRecord(row.extras);
        const metrics = toNumberMap(asRecord(extras.metrics as Json | null));
        return {
          season: row.season_year,
          ca: row.ca,
          cp: row.cp,
          value: row.vp,
          salary: row.salary,
          reputation: row.reputation,
          avgRating:
            metrics["metric.performance.avg_rating"] ??
            metrics["avg_rating"] ??
            asNumber(extras["player.performance.avg_rating"]) ??
            null,
        };
      })
      .sort((a, b) => a.season - b.season);

    const age = latest.age;
    const name = latest.player_name;
    const country = latest.country ?? latest.nationality ?? null;

    players.push({
      id: `player:${latest.idu ?? name}`,
      type: "player",
      name,
      club: latest.club ?? null,
      country,
      competition,
      profileUrl: playerProfileUrl(name),
      ranking: null,
      score: latest.ca ?? null,
      marketValue: latest.vp ?? null,
      ca: latest.ca,
      pa: latest.cp,
      age,
      position: latest.primary_position,
      currentSeason: latest.season_year,
      badges: [],
      tags: [],
      attributes: latestAttributes,
      statistics: stats,
      reputation: latest.reputation,
      metadata: {
        source: "player_profiles",
        idu: latest.idu,
        salary: latest.salary,
        personality: latest.personality,
        reputation: latest.reputation,
        age,
        marketValue: latest.vp,
        position: latest.primary_position,
        secondaryPositions: latest.secondary_positions,
        nationality: latest.nationality,
        preferredFoot: latest.preferred_foot,
        contract,
        coach: coachName,
        attributes: latestAttributes,
        metrics: latestMetrics,
        statistics: stats,
        extras: latestExtras,
        history,
      },
    });

    if (coachName) {
      const entry = coachesBucket.get(coachName) ?? {
        name: coachName,
        club: latest.club ?? null,
        country,
        seasons: new Set<number>(),
        scoreSamples: [] as number[],
      };
      entry.seasons.add(latest.season_year);
      const score = asNumber(latest.ca);
      if (score != null) entry.scoreSamples.push(score);
      if (!entry.club && latest.club) entry.club = latest.club;
      if (!entry.country && country) entry.country = country;
      coachesBucket.set(coachName, entry);
    }
  }

  const latestSeason = players.length ? Math.max(...players.map((player) => player.currentSeason ?? 0)) : 0;
  const latestPlayers = players.filter((player) => (player.currentSeason ?? 0) === latestSeason);

  const clubsByName = new Map<string, RecruitmentClub>();
  const countriesByName = new Map<string, RecruitmentCountry>();
  const competitionsByName = new Map<string, RecruitmentCompetition>();

  for (const player of latestPlayers) {
    if (player.club) {
      const existing = clubsByName.get(player.club);
      const samples = existing?.metadata?.scoreSamples as number[] | undefined;
      const nextSamples = [...(samples ?? []), ...(typeof player.ca === "number" ? [player.ca] : [])];
      clubsByName.set(player.club, {
        id: `club:${player.club}`,
        type: "club",
        name: player.club,
        country: player.country ?? null,
        ranking: null,
        score: avg(nextSamples),
        profileUrl: clubProfileUrl(player.club),
        currentSeason: latestSeason || null,
        badges: [],
        tags: [],
        metadata: {
          source: "player_profiles",
          scoreSamples: nextSamples,
          rosterSize: nextSamples.length,
        },
      });
    }

    if (player.country) {
      const existing = countriesByName.get(player.country);
      const samples = existing?.metadata?.scoreSamples as number[] | undefined;
      const nextSamples = [...(samples ?? []), ...(typeof player.ca === "number" ? [player.ca] : [])];
      countriesByName.set(player.country, {
        id: `country:${player.country}`,
        type: "country",
        name: player.country,
        ranking: null,
        score: avg(nextSamples),
        profileUrl: countryProfileUrl(player.country),
        currentSeason: latestSeason || null,
        badges: [],
        tags: [],
        metadata: {
          source: "player_profiles",
          scoreSamples: nextSamples,
          playerCount: nextSamples.length,
        },
      });
    }

    if (player.competition) {
      competitionsByName.set(player.competition, {
        id: `competition:${player.competition}`,
        type: "competition",
        name: player.competition,
        profileUrl: competitionProfileUrl(player.competition),
        ranking: null,
        score: null,
        currentSeason: latestSeason || null,
        badges: [],
        tags: [],
        metadata: {
          source: "player_profiles",
        },
      });
    }
  }

  const coaches: RecruitmentCoach[] = [...coachesBucket.values()]
    .map((coach) => ({
      id: `coach:${coach.name}`,
      type: "coach" as const,
      name: coach.name,
      club: coach.club,
      country: coach.country,
      profileUrl: coachProfileUrl(coach.name),
      ranking: null,
      score: avg(coach.scoreSamples),
      role: "Treinador",
      currentSeason: coach.seasons.size ? Math.max(...coach.seasons) : null,
      badges: [],
      tags: [],
      metadata: {
        source: "player_profiles",
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));

  const clubs = [...clubsByName.values()]
    .map((club) => ({
      ...club,
      metadata: {
        ...club.metadata,
        scoreSamples: undefined,
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
  const competitions = [...competitionsByName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-PT"),
  );
  const countries = [...countriesByName.values()]
    .map((country) => ({
      ...country,
      metadata: {
        ...country.metadata,
        scoreSamples: undefined,
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));

  const entities: RecruitmentEntity[] = [...sortedPlayers, ...coaches, ...clubs, ...competitions, ...countries];

  return {
    players: sortedPlayers,
    coaches,
    clubs,
    competitions,
    countries,
    entities,
  };
}
