import { IntelligentProfileSection } from "@/components/IntelligentProfileSection";
import type { ProfileContext } from "@/lib/profile/types";

export function IntelligentTab({ ctx }: { ctx: ProfileContext }) {
  return <IntelligentProfileSection kind={ctx.kind} name={ctx.name} />;
}
