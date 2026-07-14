
-- Enable trigram search for fast fuzzy name lookups
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Standings: profile pages filter by club_name; rankings by (season, module)
CREATE INDEX IF NOT EXISTS idx_standings_club_name ON public.standings (club_name);
CREATE INDEX IF NOT EXISTS idx_standings_season_module ON public.standings (season_id, module);

-- Coach assignments: heavy filters by coach_name and club_name
CREATE INDEX IF NOT EXISTS idx_coach_assign_coach_name ON public.coach_assignments (coach_name);
CREATE INDEX IF NOT EXISTS idx_coach_assign_club_name ON public.coach_assignments (club_name);
CREATE INDEX IF NOT EXISTS idx_coach_assign_country_name ON public.coach_assignments (country_name);

-- Players (per season aggregate): profile pages filter by name/club/idu
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players (name);
CREATE INDEX IF NOT EXISTS idx_players_club_name ON public.players (club_name);
CREATE INDEX IF NOT EXISTS idx_players_idu ON public.players (idu);

-- Player stats (large table): filter by player, club, competition per season
CREATE INDEX IF NOT EXISTS idx_player_stats_name ON public.player_stats (player_name);
CREATE INDEX IF NOT EXISTS idx_player_stats_idu ON public.player_stats (idu);
CREATE INDEX IF NOT EXISTS idx_player_stats_club ON public.player_stats (club);
CREATE INDEX IF NOT EXISTS idx_player_stats_competition ON public.player_stats (competition, season_year);

-- Competition stats: filter by competition
CREATE INDEX IF NOT EXISTS idx_competition_stats_competition ON public.competition_stats (competition, season_year);

-- Continental / international results: joined by team names
CREATE INDEX IF NOT EXISTS idx_continental_competition ON public.continental_results (competition, season_id);
CREATE INDEX IF NOT EXISTS idx_international_competition ON public.international_results (competition, season_id);

-- Transfers: profile tabs (person, from_club, to_club) and history
CREATE INDEX IF NOT EXISTS idx_transfers_person_key ON public.transfers (person_name_key);
CREATE INDEX IF NOT EXISTS idx_transfers_from_key ON public.transfers (from_club_name_key);
CREATE INDEX IF NOT EXISTS idx_transfers_to_key ON public.transfers (to_club_name_key);
CREATE INDEX IF NOT EXISTS idx_transfers_season ON public.transfers (season_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON public.transfers (transfer_date DESC);

-- Trigram indexes for global search (sub-100ms fuzzy match on very large tables)
CREATE INDEX IF NOT EXISTS idx_clubs_name_trgm ON public.clubs USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_coaches_name_trgm ON public.coaches USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_countries_name_trgm ON public.countries USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_players_name_trgm ON public.players USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_player_stats_name_trgm ON public.player_stats USING gin (player_name gin_trgm_ops);
