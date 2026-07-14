import { ProfileSubTabs, type SubTabDef } from "../ProfileSubTabs";
import { TimelineTab } from "./TimelineTab";
import { HallOfFameTab } from "./HallOfFameTab";
import { TransfersTab } from "./TransfersTab";
import { Clock, Award, ArrowLeftRight } from "lucide-react";
import type { ProfileContext } from "@/lib/profile/types";

export function HistoryTab({ ctx }: { ctx: ProfileContext }) {
  const tabs: SubTabDef[] = [
    {
      id: "timeline",
      label: "Cronologia",
      icon: <Clock className="size-3.5" />,
      render: () => <TimelineTab ctx={ctx} />,
    },
    {
      id: "hall-of-fame",
      label: "Hall of Fame",
      icon: <Award className="size-3.5" />,
      render: () => <HallOfFameTab ctx={ctx} />,
    },
    {
      id: "transfers",
      label: "Transferências",
      icon: <ArrowLeftRight className="size-3.5" />,
      kinds: ["club", "coach"],
      render: () => <TransfersTab ctx={ctx} />,
    },
  ];
  return (
    <ProfileSubTabs
      storageKey="fm.profile.history.sub"
      kind={ctx.kind}
      tabs={tabs}
      defaultId="timeline"
    />
  );
}
