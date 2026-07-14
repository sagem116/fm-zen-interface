import { RankingEvolutionSection } from "@/components/RankingEvolutionSection";
import type { ProfileContext } from "@/lib/profile/types";

export function RankingsTab({ ctx }: { ctx: ProfileContext }) {
  if (ctx.kind !== "club" && ctx.kind !== "coach" && ctx.kind !== "country") {
    return <p className="text-sm text-muted-foreground">Ranking não aplicável a esta entidade.</p>;
  }
  return <RankingEvolutionSection kind={ctx.kind} name={ctx.name} />;
}
