
-- ============ Reference tables ============
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL UNIQUE,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
  continent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nationality text,
  idu text,
  age int,
  tactical_style text,
  play_style text,
  attacking_formation text,
  defensive_formation text,
  preferred_formation text,
  secondary_formation text,
  mentality text,
  marking_type text,
  pressing_type text,
  training_type text,
  personality text,
  press_relationship text,
  rm numeric,
  rc numeric,
  ca numeric,
  cp numeric,
  is_national_team boolean DEFAULT false,
  national_team text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, nationality)
);

-- ============ Season data tables ============
CREATE TABLE public.standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  module text NOT NULL,
  competition text,
  division_label text,
  division_num int,
  position int,
  info text,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  club_name text NOT NULL,
  played int,
  wins int,
  draws int,
  losses int,
  gf int,
  ga int,
  gd int,
  points int,
  is_champion boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_standings_season ON public.standings(season_id);
CREATE INDEX idx_standings_module ON public.standings(module);

CREATE TABLE public.continental_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  competition text NOT NULL,
  team1 text,
  team2 text,
  result text,
  club1_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  club2_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  winner_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  sf1 text, sf2 text,
  qf1 text, qf2 text, qf3 text, qf4 text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_continental_season ON public.continental_results(season_id);

CREATE TABLE public.international_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  competition text NOT NULL,
  team1 text, team2 text,
  coach1 text, coach2 text,
  result text,
  winner text,
  sf1 text, sf1_coach text,
  sf2 text, sf2_coach text,
  qf1 text, qf1_coach text,
  qf2 text, qf2_coach text,
  qf3 text, qf3_coach text,
  qf4 text, qf4_coach text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_international_season ON public.international_results(season_id);

CREATE TABLE public.coach_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  module text NOT NULL,
  coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE,
  coach_name text NOT NULL,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  club_name text,
  country_name text,
  club_role text,
  intl_role text,
  salary numeric,
  intl_salary numeric,
  rm numeric, rc numeric, ca numeric, cp numeric,
  info text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coach_assign_season ON public.coach_assignments(season_id);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  module text NOT NULL,
  idu text,
  name text NOT NULL,
  league text,
  club_name text,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  age int,
  gls numeric DEFAULT 0,
  ast numeric DEFAULT 0,
  salary numeric DEFAULT 0,
  ra numeric DEFAULT 0,
  rm numeric DEFAULT 0,
  ca numeric DEFAULT 0,
  cp numeric DEFAULT 0,
  vp numeric DEFAULT 0,
  info text,
  rec text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_players_season ON public.players(season_id);

-- ============ Player and competition stats ============
CREATE TABLE public.player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year int NOT NULL,
  comp_type text NOT NULL,
  competition text NOT NULL,
  country text,
  continent text,
  player_name text NOT NULL,
  idu text,
  nationality text,
  club text,
  age int,
  games int,
  gls numeric,
  ast numeric,
  xg numeric,
  pass_pct numeric,
  tackles_per90 numeric,
  fouls_per90 numeric,
  shot_pct numeric,
  yellows numeric,
  reds numeric,
  avg_rating numeric,
  ca numeric,
  cp numeric,
  vp numeric,
  ra numeric,
  rm numeric,
  rc numeric,
  salary numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_player_stats_season ON public.player_stats(season_year, comp_type);

CREATE TABLE public.competition_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year int NOT NULL,
  comp_type text NOT NULL,
  competition text NOT NULL,
  country text,
  continent text,
  n_players int,
  ca_avg numeric, cp_avg numeric, vp_avg numeric, salary_avg numeric,
  ra_avg numeric, rm_avg numeric, rc_avg numeric, age_avg numeric,
  xg_avg numeric, pass_pct_avg numeric,
  tackles_per90_avg numeric, fouls_per90_avg numeric,
  shot_pct_avg numeric, yellows_avg numeric, reds_avg numeric, avg_rating_avg numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_competition_stats_season ON public.competition_stats(season_year, comp_type);

-- ============ Reputation ============
CREATE TABLE public.competition_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition text NOT NULL,
  reputation numeric,
  country text,
  continent text,
  season_year int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comp_rep_season ON public.competition_reputation(season_year);

CREATE TABLE public.club_reputation_season (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  season_year int NOT NULL,
  club_name text NOT NULL,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  reputation numeric,
  avg_attendance numeric,
  season_ticket_holders numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_rep_season ON public.club_reputation_season(season_id);

-- ============ Configuration ============
CREATE TABLE public.weight_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.config_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.weight_profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  key text NOT NULL,
  value numeric NOT NULL
);
CREATE INDEX idx_config_weights_profile ON public.config_weights(profile_id);

-- ============ Import logs ============
CREATE TABLE public.imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  module text NOT NULL,
  filename text,
  status text NOT NULL DEFAULT 'ok',
  warnings jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_imports_season ON public.imports(season_id);

-- ============ Grants (no auth in app yet — allow anon + authenticated) ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'seasons','countries','clubs','coaches',
    'standings','continental_results','international_results','coach_assignments','players',
    'player_stats','competition_stats','competition_reputation','club_reputation_season',
    'weight_profiles','config_weights','imports'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Open read" ON public.%I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "Open insert" ON public.%I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Open update" ON public.%I FOR UPDATE USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Open delete" ON public.%I FOR DELETE USING (true)', t);
  END LOOP;
END $$;
