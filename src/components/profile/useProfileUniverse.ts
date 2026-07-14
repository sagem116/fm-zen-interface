import { useMemo } from "react";
import { usePlayerUniverse } from "@/lib/player-universe";
import type { ProfileContext } from "@/lib/profile/types";

export function useProfileUniverse(ctx: ProfileContext) {
  const universe = usePlayerUniverse();
  return useMemo(() => {
    const idu = (ctx.profile as any)?.idu;
    return idu ? universe.getByIdu(idu) : universe.getByName(ctx.name);
  }, [universe, ctx.profile, ctx.name]);
}
