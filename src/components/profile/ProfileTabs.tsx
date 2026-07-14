// Renders the tab bar + active panel from the registry.
// URL search param `?tab=<id>` deep-links directly to a tab (used by future
// Global Search). Falls back to `defaultTab` when the param is absent.

import { useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProfileTabs } from "./registry";
import type { ProfileContext } from "@/lib/profile/types";

interface Props {
  ctx: ProfileContext;
  defaultTab?: string;
}

/**
 * Maps legacy tab ids (from before the profile UX reorganization) to the
 * new top-level tab so old deep-links keep working. Sub-tab selection inside
 * each group is remembered by ProfileSubTabs via localStorage.
 */
const LEGACY_TAB_MAP: Record<string, string> = {
  summary: "overview",
  intelligent: "intelligence",
  style: "intelligence",
  insights: "intelligence",
  rankings: "performance",
  stats: "performance",
  evolution: "performance",
  scores: "performance",
  timeline: "history",
  "hall-of-fame": "history",
  transfers: "history",
  related: "network",
  recruitment: "network",
};

export function ProfileTabs({ ctx, defaultTab = "overview" }: Props) {
  const navigate = useNavigate();
  const search = useRouterState({
    select: (s) => s.location.search as Record<string, unknown>,
  });
  const tabs = useMemo(
    () => getProfileTabs(ctx.kind).filter((t) => !t.enabled || t.enabled(ctx)),
    [ctx],
  );

  const requestedRaw = typeof search.tab === "string" ? (search.tab as string) : undefined;
  const requested = requestedRaw ? (LEGACY_TAB_MAP[requestedRaw] ?? requestedRaw) : undefined;
  const active =
    tabs.find((t) => t.id === requested)?.id ??
    tabs.find((t) => t.id === defaultTab)?.id ??
    tabs[0]?.id ??
    defaultTab;

  const setActive = (id: string) => {
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, tab: id }),
      replace: true,
    });
  };

  if (!tabs.length) return null;

  return (
    <Tabs value={active} onValueChange={setActive} className="w-full">
      <div className="overflow-x-auto -mx-2 px-2">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/60">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                {Icon && <Icon className="size-3.5" />}
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} className="mt-4 space-y-6 focus-visible:outline-none">
          {active === t.id ? t.render(ctx) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
