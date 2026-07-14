import { ProfileSubTabs, type SubTabDef } from "../ProfileSubTabs";
import { RankingsTab } from "./RankingsTab";
import { StatsTab } from "./StatsTab";
import { EvolutionTab } from "./EvolutionTab";
import { ScoresTab } from "./ScoresTab";
import { Trophy, BarChart3, LineChart } from "lucide-react";
import type { ProfileContext } from "@/lib/profile/types";

export function PerformanceTab({ ctx }: { ctx: ProfileContext }) {
  const tabs: SubTabDef[] = [
    {
      id: "rankings",
      label: "Rankings",
      icon: <Trophy className="size-3.5" />,
      kinds: ["club", "coach", "country"],
      render: () => <RankingsTab ctx={ctx} />,
    },
    {
      id: "stats",
      label: "Estatísticas",
      icon: <BarChart3 className="size-3.5" />,
      render: () => <StatsTab ctx={ctx} />,
    },
    {
      id: "evolution",
      label: "Evolução",
      icon: <LineChart className="size-3.5" />,
      render: () => <EvolutionTab ctx={ctx} />,
    },
    {
      id: "scores",
      label: "Scores",
      icon: <Trophy className="size-3.5" />,
      render: () => <ScoresTab ctx={ctx} />,
    },
  ];
  return (
    <ProfileSubTabs
      storageKey="fm.profile.performance.sub"
      kind={ctx.kind}
      tabs={tabs}
      defaultId="rankings"
    />
  );
}
