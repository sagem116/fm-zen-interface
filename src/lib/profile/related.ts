// Derive related entities from data already available (no new tables, no engine work).
// Pure functions consumed by the "Relacionados" tab.

import type { ProfileEntityKind, RankingsPayload } from "./types";

export interface RelatedEntity {
  kind: ProfileEntityKind;
  name: string;
  hint?: string;
}

export interface RelatedGroup {
  id: string;
  label: string;
  items: RelatedEntity[];
}

const MAX = 24;

function uniq<T extends { name: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    if (!it.name) continue;
    if (seen.has(it.name)) continue;
    seen.add(it.name);
    out.push(it);
    if (out.length >= MAX) break;
  }
  return out;
}

export function buildRelated(
  kind: ProfileEntityKind,
  name: string,
  payload: RankingsPayload,
): RelatedGroup[] {
  const { data, ranks } = payload;

  if (kind === "club") {
    const country = data.clubCountry[name] ?? null;
    const players = uniq(
      data.standings
        .filter((s) => s.club_name === name)
        .flatMap(() =>
          (data.coaches ?? [])
            .filter((c) => c.club_name === name)
            .map((c) => ({ kind: "coach" as const, name: c.name, hint: String(c.season_year) })),
        ),
    );
    const coaches = uniq(
      (data.coaches ?? [])
        .filter((c) => c.club_name === name)
        .map((c) => ({ kind: "coach" as const, name: c.name, hint: String(c.season_year) })),
    );
    const comps = uniq(
      data.standings
        .filter((s) => s.club_name === name && s.competition)
        .map((s) => ({ kind: "competition" as const, name: s.competition as string })),
    );
    // Similar clubs: same country, closest rank position
    const rank = ranks.clubs.findIndex((c) => c.name === name);
    const similar: { kind: "club"; name: string }[] = [];
    if (rank >= 0) {
      const window = ranks.clubs
        .map((c, i) => ({ name: c.name, dist: Math.abs(i - rank) }))
        .filter((c) => c.name !== name && (!country || data.clubCountry[c.name] === country))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 10);
      for (const w of window) similar.push({ kind: "club", name: w.name });
    }
    const groups: RelatedGroup[] = [];
    if (coaches.length) groups.push({ id: "coaches", label: "Treinadores", items: coaches });
    if (players.length && false) groups.push({ id: "players", label: "Jogadores", items: players });
    if (country)
      groups.push({ id: "country", label: "País", items: [{ kind: "country", name: country }] });
    if (comps.length) groups.push({ id: "competitions", label: "Competições", items: comps });
    if (similar.length) groups.push({ id: "similar", label: "Clubes semelhantes", items: similar });
    return groups;
  }

  if (kind === "coach") {
    const rows = (data.coaches ?? []).filter((c) => c.name === name);
    const clubs = uniq(
      rows
        .filter((c) => c.club_name)
        .map((c) => ({ kind: "club" as const, name: c.club_name as string })),
    );
    const countries = uniq(
      clubs
        .map((c) => data.clubCountry[c.name])
        .filter((n): n is string => !!n)
        .map((n) => ({ kind: "country" as const, name: n })),
    );
    const comps = uniq(
      data.standings
        .filter((s) =>
          rows.some((r) => r.club_name === s.club_name && r.season_year === s.season_year),
        )
        .filter((s) => s.competition)
        .map((s) => ({ kind: "competition" as const, name: s.competition as string })),
    );
    const groups: RelatedGroup[] = [];
    if (clubs.length) groups.push({ id: "clubs", label: "Clubes treinados", items: clubs });
    if (countries.length) groups.push({ id: "countries", label: "Países", items: countries });
    if (comps.length) groups.push({ id: "competitions", label: "Competições", items: comps });
    return groups;
  }

  if (kind === "country") {
    const clubs = uniq(
      Object.entries(data.clubCountry)
        .filter(([, c]) => c === name)
        .map(([club]) => ({ kind: "club" as const, name: club })),
    );
    const coaches = uniq(
      (data.coaches ?? [])
        .filter((c) => c.club_name && data.clubCountry[c.club_name] === name)
        .map((c) => ({ kind: "coach" as const, name: c.name })),
    );
    const comps = uniq(
      data.standings
        .filter((s) => data.clubCountry[s.club_name] === name && s.competition)
        .map((s) => ({ kind: "competition" as const, name: s.competition as string })),
    );
    const groups: RelatedGroup[] = [];
    if (clubs.length) groups.push({ id: "clubs", label: "Clubes", items: clubs });
    if (coaches.length) groups.push({ id: "coaches", label: "Treinadores", items: coaches });
    if (comps.length) groups.push({ id: "competitions", label: "Competições", items: comps });
    return groups;
  }

  if (kind === "competition") {
    const decoded = name;
    // Clubs from standings + continental winners
    const clubs = uniq([
      ...data.standings
        .filter((s) => s.competition === decoded)
        .map((s) => ({ kind: "club" as const, name: s.club_name })),
      ...data.continental
        .filter((c) => c.competition === decoded && c.winner)
        .map((c) => ({ kind: "club" as const, name: c.winner as string })),
    ]);
    const coaches = uniq(
      (data.coaches ?? [])
        .filter((c) =>
          data.standings.some(
            (s) =>
              s.competition === decoded &&
              s.club_name === c.club_name &&
              s.season_year === c.season_year,
          ),
        )
        .map((c) => ({ kind: "coach" as const, name: c.name })),
    );
    const countries = uniq(
      clubs
        .map((c) => data.clubCountry[c.name])
        .filter((n): n is string => !!n)
        .map((n) => ({ kind: "country" as const, name: n })),
    );
    const groups: RelatedGroup[] = [];
    if (clubs.length) groups.push({ id: "clubs", label: "Clubes", items: clubs });
    if (coaches.length) groups.push({ id: "coaches", label: "Treinadores", items: coaches });
    if (countries.length) groups.push({ id: "countries", label: "Países", items: countries });
    return groups;
  }

  // player
  const players = data.players ?? [];
  const rows = players.filter((p) => p.name === name);
  if (!rows.length) return [];
  const clubs = uniq(
    rows
      .filter((r) => r.club_name)
      .map((r) => ({ kind: "club" as const, name: r.club_name as string })),
  );
  const countries = uniq(
    clubs
      .map((c) => data.clubCountry[c.name])
      .filter((n): n is string => !!n)
      .map((n) => ({ kind: "country" as const, name: n })),
  );
  const comps = uniq(
    rows
      .filter((r) => r.league)
      .map((r) => ({ kind: "competition" as const, name: r.league as string })),
  );
  const groups: RelatedGroup[] = [];
  if (clubs.length) groups.push({ id: "clubs", label: "Clubes", items: clubs });
  if (countries.length) groups.push({ id: "countries", label: "Países", items: countries });
  if (comps.length) groups.push({ id: "competitions", label: "Competições", items: comps });
  return groups;
}
