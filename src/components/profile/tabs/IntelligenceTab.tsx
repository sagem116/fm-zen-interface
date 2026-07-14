import { ProfileSubTabs, type SubTabDef } from "../ProfileSubTabs";
import { IntelligentTab } from "./IntelligentTab";
import { StyleTab } from "./StyleTab";
import { InsightsTab } from "./InsightsTab";
import { Sparkles, Radar, Rss } from "lucide-react";
import type { ProfileContext } from "@/lib/profile/types";

export function IntelligenceTab({ ctx }: { ctx: ProfileContext }) {
  const tabs: SubTabDef[] = [
    {
      id: "intelligent",
      label: "Perfil Inteligente",
      icon: <Sparkles className="size-3.5" />,
      render: () => <IntelligentTab ctx={ctx} />,
    },
    {
      id: "style",
      label: "Estilo de Jogo",
      icon: <Radar className="size-3.5" />,
      render: () => <StyleTab ctx={ctx} />,
    },
    {
      id: "insights",
      label: "Insights",
      icon: <Rss className="size-3.5" />,
      render: () => <InsightsTab ctx={ctx} />,
    },
  ];
  return (
    <ProfileSubTabs
      storageKey="fm.profile.intelligence.sub"
      kind={ctx.kind}
      tabs={tabs}
      defaultId="intelligent"
    />
  );
}
