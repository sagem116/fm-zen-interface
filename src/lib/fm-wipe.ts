import { supabase } from "@/integrations/supabase/client";

/** Chaves de localStorage consideradas "dados derivados/importados" do universo FM. */
export const DERIVED_LOCAL_KEYS: readonly string[] = [
  "fm-highlights-v1",
  "fm-insights-snapshots-v1",
  "fm-desafios-v2",
  "fm-hall-of-fame-v1",
  "fm-career-v1",
  "fm-club-reputation-imports-v1",
];

/** Limpa apenas dados derivados no localStorage; mantém configuração, dictionary, studios, tema. */
export function clearDerivedLocalStorage(): number {
  if (typeof window === "undefined") return 0;
  let n = 0;
  for (const k of DERIVED_LOCAL_KEYS) {
    if (window.localStorage.getItem(k) !== null) {
      window.localStorage.removeItem(k);
      n++;
    }
  }
  return n;
}

/** Deletes ALL imported FM data. Keeps weight_profiles/config_weights (configuração). */
export async function wipeAllData(): Promise<void> {
  const NEVER_MATCH = "00000000-0000-0000-0000-000000000000";
  // Order matters for FKs: leaves first
  const tables = [
    "player_stats",
    "player_profiles",
    "players",
    "coach_assignments",
    "continental_results",
    "international_results",
    "competition_stats",
    "competition_reputation",
    "club_reputation_season",
    "standings",
    "imports",
    "coaches",
    "clubs",
    "countries",
    "seasons",
  ] as const;
  for (const t of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from(t).delete().neq("id", NEVER_MATCH);
    // Ignora tabelas inexistentes ou vazias — só rethrow em erros reais.
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      throw new Error(`${t}: ${error.message}`);
    }
  }
}
