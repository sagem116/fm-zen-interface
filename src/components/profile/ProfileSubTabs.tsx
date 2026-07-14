import { useMemo, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProfileEntityKind } from "@/lib/profile/types";

export interface SubTabDef {
  id: string;
  label: string;
  icon?: ReactNode;
  kinds?: ProfileEntityKind[];
  render: () => ReactNode;
}

interface Props {
  storageKey: string;
  kind: ProfileEntityKind;
  tabs: SubTabDef[];
  defaultId?: string;
  header?: ReactNode;
}

/**
 * Renders a horizontal sub-tab bar inside a composed profile tab. Persists
 * the active sub-tab in localStorage per group key so the user's preference
 * sticks between profiles.
 */
export function ProfileSubTabs({ storageKey, kind, tabs, defaultId, header }: Props) {
  const visible = useMemo(
    () => tabs.filter((t) => !t.kinds || t.kinds.includes(kind)),
    [tabs, kind],
  );

  const stored = readStored(storageKey);
  const initial =
    (stored && visible.find((t) => t.id === stored)?.id) ||
    (defaultId && visible.find((t) => t.id === defaultId)?.id) ||
    visible[0]?.id;

  if (!visible.length) return null;

  const onValueChange = (v: string) => {
    try {
      window.localStorage.setItem(storageKey, v);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      {header}
      <Tabs defaultValue={initial} onValueChange={onValueChange} className="w-full">
        <div className="overflow-x-auto -mx-2 px-2">
          <TabsList className="h-auto gap-1 bg-muted/40 rounded-lg">
            {visible.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs">
                {t.icon}
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {visible.map((t) => (
          <TabsContent
            key={t.id}
            value={t.id}
            className="mt-4 space-y-6 focus-visible:outline-none"
          >
            {t.render()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
