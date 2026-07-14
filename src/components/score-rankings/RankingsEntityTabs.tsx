import type { ScoreEntityKind } from "@/lib/scores";
import { Users, Building2, Trophy, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { id: ScoreEntityKind; label: string; icon: typeof Users }[] = [
  { id: "player", label: "Jogadores", icon: Users },
  { id: "club", label: "Clubes", icon: Building2 },
  { id: "competition", label: "Competições", icon: Trophy },
  { id: "country", label: "Países", icon: Globe },
];

interface Props {
  value: ScoreEntityKind;
  onChange: (kind: ScoreEntityKind) => void;
}

export function RankingsEntityTabs({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
