CREATE TABLE IF NOT EXISTS public.transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  season_year integer NOT NULL,
  transfer_date date NOT NULL,
  person_type text NOT NULL DEFAULT 'player',
  person_name text NOT NULL,
  person_name_key text NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL,
  from_club_name text,
  from_club_name_key text,
  from_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  to_club_name text,
  to_club_name_key text,
  to_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  value numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS transfers_dedup_key
  ON public.transfers (season_id, transfer_date, person_name_key,
    COALESCE(from_club_name_key, ''), COALESCE(to_club_name_key, ''), value);
CREATE INDEX IF NOT EXISTS idx_transfers_from_club ON public.transfers (from_club_id, transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_to_club   ON public.transfers (to_club_id, transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_coach     ON public.transfers (coach_id, transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_player    ON public.transfers (player_id, transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_season    ON public.transfers (season_year);
CREATE INDEX IF NOT EXISTS idx_transfers_value     ON public.transfers (value DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_from_name ON public.transfers (from_club_name_key);
CREATE INDEX IF NOT EXISTS idx_transfers_to_name   ON public.transfers (to_club_name_key);
CREATE INDEX IF NOT EXISTS idx_transfers_person    ON public.transfers (person_name_key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO anon, authenticated;
GRANT ALL ON public.transfers TO service_role;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open read"   ON public.transfers;
DROP POLICY IF EXISTS "Open insert" ON public.transfers;
DROP POLICY IF EXISTS "Open update" ON public.transfers;
DROP POLICY IF EXISTS "Open delete" ON public.transfers;
CREATE POLICY "Open read"   ON public.transfers FOR SELECT USING (true);
CREATE POLICY "Open insert" ON public.transfers FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update" ON public.transfers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open delete" ON public.transfers FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.player_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  season_year integer NOT NULL,
  idu text,
  player_name text NOT NULL,
  club text, country text, nationality text, continent text,
  age integer, ca integer, cp integer, vp numeric, salary numeric,
  height numeric, weight numeric, preferred_foot text, personality text,
  reputation integer, primary_position text, secondary_positions text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_player_profiles_season ON public.player_profiles(season_id);
CREATE INDEX IF NOT EXISTS idx_player_profiles_year   ON public.player_profiles(season_year);
CREATE INDEX IF NOT EXISTS idx_player_profiles_idu    ON public.player_profiles(idu);
CREATE INDEX IF NOT EXISTS idx_player_profiles_name   ON public.player_profiles(player_name);
CREATE INDEX IF NOT EXISTS idx_player_profiles_club   ON public.player_profiles(club);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_profiles TO anon, authenticated;
GRANT ALL ON public.player_profiles TO service_role;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_player_profiles"  ON public.player_profiles;
DROP POLICY IF EXISTS "public_write_player_profiles" ON public.player_profiles;
CREATE POLICY "public_read_player_profiles"  ON public.player_profiles FOR SELECT USING (true);
CREATE POLICY "public_write_player_profiles" ON public.player_profiles FOR ALL USING (true) WITH CHECK (true);