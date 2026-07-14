import {
  ClubRecordsSection,
  CompetitionRecordsSection,
  CountryRecordsSection,
} from "@/components/RecordsSection";
import { PlayerAchievementsSection } from "@/components/PlayerAchievementsSection";
import type { ProfileContext } from "@/lib/profile/types";

export function HallOfFameTab({ ctx }: { ctx: ProfileContext }) {
  if (ctx.kind === "club") return <ClubRecordsSection clubName={ctx.name} />;
  if (ctx.kind === "competition") return <CompetitionRecordsSection competition={ctx.name} />;
  if (ctx.kind === "country") {
    return <CountryRecordsSection countryName={ctx.name} clubCountry={ctx.data.data.clubCountry} />;
  }
  if (ctx.kind === "player") return <PlayerAchievementsSection playerName={ctx.name} />;
  return <p className="text-sm text-muted-foreground">Sem destaques disponíveis.</p>;
}
