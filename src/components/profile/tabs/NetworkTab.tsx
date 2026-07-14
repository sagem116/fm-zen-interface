import { ProfileSubTabs, type SubTabDef } from "../ProfileSubTabs";
import { RelatedTab } from "./RelatedTab";
import { RecruitmentTab } from "./RecruitmentTab";
import { Network, BriefcaseBusiness } from "lucide-react";
import type { ProfileContext } from "@/lib/profile/types";

export function NetworkTab({ ctx }: { ctx: ProfileContext }) {
  const tabs: SubTabDef[] = [
    {
      id: "related",
      label: "Relacionados",
      icon: <Network className="size-3.5" />,
      render: () => <RelatedTab ctx={ctx} />,
    },
    {
      id: "recruitment",
      label: "Recruitment",
      icon: <BriefcaseBusiness className="size-3.5" />,
      render: () => <RecruitmentTab ctx={ctx} />,
    },
  ];
  return (
    <ProfileSubTabs
      storageKey="fm.profile.network.sub"
      kind={ctx.kind}
      tabs={tabs}
      defaultId="related"
    />
  );
}
