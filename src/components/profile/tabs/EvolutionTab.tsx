import type { ProfileContext } from "@/lib/profile/types";
import { TemporalEvolutionPanel } from "../temporal/TemporalEvolutionPanel";

export function EvolutionTab({ ctx }: { ctx: ProfileContext }) {
  return <TemporalEvolutionPanel ctx={ctx} />;
}
