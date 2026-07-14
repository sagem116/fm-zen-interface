import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  assertDataSourceForModule,
  getDataConsumerPolicy,
  type DataConsumerModule,
} from "@/lib/data-consumption-architecture";

// NOTE: `player_profiles` is a legacy virtual table not present in the current
// schema. Types are cast to `any` so this remains compilable until the
// dedicated data source is materialized.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlayerProfileDataRow = any;

async function fetchAllPlayerProfilesRows(): Promise<PlayerProfileDataRow[]> {
  const pageSize = 1000;
  const out: PlayerProfileDataRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            order: (
              c: string,
              o: { ascending: boolean },
            ) => {
              range: (
                a: number,
                b: number,
              ) => Promise<{ data: PlayerProfileDataRow[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
    })
      .from("player_profiles")
      .select("*")
      .order("season_year", { ascending: false })
      .order("player_name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`player_profiles: ${error.message}`);
    }

    const rows = (data ?? []) as PlayerProfileDataRow[];
    out.push(...rows);

    if (rows.length === 0 || rows.length < pageSize) break;
    from += rows.length;
  }

  return out;
}

export function usePlayerProfilesData(module: DataConsumerModule = "recruitment") {
  assertDataSourceForModule(module, "player_profiles");
  const policy = getDataConsumerPolicy(module);

  return useQuery({
    queryKey: ["player-profiles-all", policy.module, policy.source],
    queryFn: fetchAllPlayerProfilesRows,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });
}
