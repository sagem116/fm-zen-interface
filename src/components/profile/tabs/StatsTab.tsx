import type { ProfileContext } from "@/lib/profile/types";
import {
  PlayerHistorySections,
  ClubHistorySections,
  CoachHistorySections,
  CompetitionHistorySections,
  CountryHistorySections,
} from "./ProfileHistorySections";

export function StatsTab({ ctx }: { ctx: ProfileContext }) {
  if (ctx.kind === "player") return <PlayerHistorySections ctx={ctx} />;
  if (ctx.kind === "club") return <ClubHistorySections ctx={ctx} />;
  if (ctx.kind === "coach") return <CoachHistorySections ctx={ctx} />;
  if (ctx.kind === "competition") return <CompetitionHistorySections ctx={ctx} />;
  return <CountryHistorySections ctx={ctx} />;
}
