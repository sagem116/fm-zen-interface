-- Helpers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enum: extend module_type
ALTER TYPE public.module_type ADD VALUE IF NOT EXISTS 'player_stats';
ALTER TYPE public.module_type ADD VALUE IF NOT EXISTS 'competitions';

-- Additive columns on existing tables
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS continent text;
ALTER TABLE public.standings ADD COLUMN IF NOT EXISTS competition text;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS idu text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS tactical_style text,
  ADD COLUMN IF NOT EXISTS play_style text,
  ADD COLUMN IF NOT EXISTS attacking_formation text,
  ADD COLUMN IF NOT EXISTS defensive_formation text,
  ADD COLUMN IF NOT EXISTS preferred_formation text,
  ADD COLUMN IF NOT EXISTS secondary_formation text,
  ADD COLUMN IF NOT EXISTS mentality text,
  ADD COLUMN IF NOT EXISTS marking_type text,
  ADD COLUMN IF NOT EXISTS pressing_type text,
  ADD COLUMN IF NOT EXISTS training_type text,
  ADD COLUMN IF NOT EXISTS personality text,
  ADD COLUMN IF NOT EXISTS press_relationship text,
  ADD COLUMN IF NOT EXISTS rm double precision,
  ADD COLUMN IF NOT EXISTS rc double precision,
  ADD COLUMN IF NOT EXISTS ca double precision,
  ADD COLUMN IF NOT EXISTS cp double precision,
  ADD COLUMN IF NOT EXISTS is_national_team boolean,
  ADD COLUMN IF NOT EXISTS national_team text;

ALTER TABLE public.coach_assignments
  ADD COLUMN IF NOT EXISTS country_name text,
  ADD COLUMN IF NOT EXISTS club_role text,
  ADD COLUMN IF NOT EXISTS intl_role text,
  ADD COLUMN IF NOT EXISTS salary double precision,
  ADD COLUMN IF NOT EXISTS intl_salary double precision,
  ADD COLUMN IF NOT EXISTS rm double precision,
  ADD COLUMN IF NOT EXISTS rc double precision,
  ADD COLUMN IF NOT EXISTS ca double precision,
  ADD COLUMN IF NOT EXISTS cp double precision;

-- player_stats
CREATE TABLE IF NOT EXISTS public.player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year integer NOT NULL,
  comp_type text NOT NULL CHECK (comp_type IN ('superleague','national','continental','international')),
  competition text NOT NULL,
  country text, continent text,
  player_name text NOT NULL,
  idu text, nationality text, club text,
  gls numeric DEFAULT 0, ast numeric DEFAULT 0, games numeric DEFAULT 0,
  hdj numeric DEFAULT 0,
  ca numeric DEFAULT 0, cp numeric DEFAULT 0, vp numeric DEFAULT 0,
  salary numeric DEFAULT 0,
  ra numeric DEFAULT 0, rm numeric DEFAULT 0, rc numeric DEFAULT 0,
  age numeric DEFAULT 0,
  xg double precision,
  pass_pct double precision,
  tackles_per90 double precision,
  fouls_per90 double precision,
  shot_pct double precision,
  yellows integer,
  reds integer,
  avg_rating double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_stats TO anon, authenticated;
GRANT ALL ON public.player_stats TO service_role;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read player_stats" ON public.player_stats;
DROP POLICY IF EXISTS "public write player_stats" ON public.player_stats;
CREATE POLICY "public read player_stats" ON public.player_stats FOR SELECT USING (true);
CREATE POLICY "public write player_stats" ON public.player_stats FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_player_stats_season_comp ON public.player_stats (season_year, comp_type);
CREATE INDEX IF NOT EXISTS idx_player_stats_idu ON public.player_stats (idu);
CREATE INDEX IF NOT EXISTS idx_player_stats_competition ON public.player_stats (competition);
CREATE INDEX IF NOT EXISTS idx_player_stats_club ON public.player_stats (club);

-- competition_stats
CREATE TABLE IF NOT EXISTS public.competition_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year integer NOT NULL,
  comp_type text NOT NULL CHECK (comp_type IN ('superleague','national','continental','international')),
  competition text NOT NULL,
  country text, continent text,
  n_players integer DEFAULT 0,
  ca_avg numeric DEFAULT 0, cp_avg numeric DEFAULT 0, vp_avg numeric DEFAULT 0,
  salary_avg numeric DEFAULT 0,
  ra_avg numeric DEFAULT 0, rm_avg numeric DEFAULT 0, rc_avg numeric DEFAULT 0,
  age_avg numeric DEFAULT 0,
  xg_avg double precision,
  pass_pct_avg double precision,
  tackles_per90_avg double precision,
  fouls_per90_avg double precision,
  shot_pct_avg double precision,
  yellows_avg double precision,
  reds_avg double precision,
  avg_rating_avg double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_year, comp_type, competition)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_stats TO anon, authenticated;
GRANT ALL ON public.competition_stats TO service_role;
ALTER TABLE public.competition_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read competition_stats" ON public.competition_stats;
DROP POLICY IF EXISTS "public write competition_stats" ON public.competition_stats;
CREATE POLICY "public read competition_stats" ON public.competition_stats FOR SELECT USING (true);
CREATE POLICY "public write competition_stats" ON public.competition_stats FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_comp_stats_season_comp ON public.competition_stats (season_year, comp_type);

-- competition_reputation (per-season)
CREATE TABLE IF NOT EXISTS public.competition_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition text NOT NULL,
  reputation numeric NOT NULL,
  country text,
  continent text,
  season_year integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS competition_reputation_comp_season_uniq
  ON public.competition_reputation (competition, COALESCE(season_year, -1));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_reputation TO anon, authenticated;
GRANT ALL ON public.competition_reputation TO service_role;
ALTER TABLE public.competition_reputation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read competition_reputation" ON public.competition_reputation;
DROP POLICY IF EXISTS "public write competition_reputation" ON public.competition_reputation;
CREATE POLICY "public read competition_reputation" ON public.competition_reputation FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write competition_reputation" ON public.competition_reputation FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS set_competition_reputation_updated_at ON public.competition_reputation;
CREATE TRIGGER set_competition_reputation_updated_at
  BEFORE UPDATE ON public.competition_reputation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- club_reputation_season
CREATE TABLE IF NOT EXISTS public.club_reputation_season (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  season_year integer NOT NULL,
  club_name text NOT NULL,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  reputation double precision,
  avg_attendance double precision,
  season_ticket_holders double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_year, club_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_reputation_season TO anon, authenticated;
GRANT ALL ON public.club_reputation_season TO service_role;
ALTER TABLE public.club_reputation_season ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read club_reputation_season" ON public.club_reputation_season;
DROP POLICY IF EXISTS "public write club_reputation_season" ON public.club_reputation_season;
CREATE POLICY "public read club_reputation_season" ON public.club_reputation_season FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write club_reputation_season" ON public.club_reputation_season FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS club_reputation_season_year_idx ON public.club_reputation_season (season_year);
CREATE INDEX IF NOT EXISTS club_reputation_season_club_idx ON public.club_reputation_season (club_name);
DROP TRIGGER IF EXISTS trg_club_reputation_season_updated_at ON public.club_reputation_season;
CREATE TRIGGER trg_club_reputation_season_updated_at
  BEFORE UPDATE ON public.club_reputation_season
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();