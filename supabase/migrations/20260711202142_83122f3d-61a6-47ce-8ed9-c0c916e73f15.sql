
CREATE TABLE public.player_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  season_year integer NOT NULL,
  idu text,
  player_name text NOT NULL,
  club text,
  country text,
  nationality text,
  continent text,
  age integer,
  ca integer,
  cp integer,
  vp numeric,
  salary numeric,
  height numeric,
  weight numeric,
  preferred_foot text,
  personality text,
  reputation integer,
  primary_position text,
  secondary_positions text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_profiles_season ON public.player_profiles(season_id);
CREATE INDEX idx_player_profiles_year ON public.player_profiles(season_year);
CREATE INDEX idx_player_profiles_idu ON public.player_profiles(idu);
CREATE INDEX idx_player_profiles_name ON public.player_profiles(player_name);
CREATE INDEX idx_player_profiles_club ON public.player_profiles(club);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_profiles TO authenticated;
GRANT SELECT ON public.player_profiles TO anon;
GRANT ALL ON public.player_profiles TO service_role;

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_player_profiles" ON public.player_profiles
  FOR SELECT USING (true);
CREATE POLICY "public_write_player_profiles" ON public.player_profiles
  FOR ALL USING (true) WITH CHECK (true);
