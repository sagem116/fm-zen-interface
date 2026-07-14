import type { ProfileContext } from "@/lib/profile/types";
import { ScoresPage } from "@/components/scores/ScoresPage";

export function ScoresTab({ ctx }: { ctx: ProfileContext }) {
  return <ScoresPage contextEntityKind={ctx.kind} contextEntityName={ctx.name} embedded />;
}
