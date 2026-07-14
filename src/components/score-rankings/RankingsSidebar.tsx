import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoreDefinition, ScoreEntityKind } from "@/lib/scores";
import { buildCatalog, buildPlayerCatalog, type CatalogGroup } from "./RankingsCatalog";

interface Props {
  scores: ScoreDefinition[];
  entityKind: ScoreEntityKind;
  selectedScoreId: string;
  onSelect: (id: string) => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
}

export function RankingsSidebar({
  scores,
  entityKind,
  selectedScoreId,
  onSelect,
  favorites = [],
  onToggleFavorite,
}: Props) {
  const groups = useMemo<CatalogGroup[]>(() => {
    if (entityKind === "player") return buildPlayerCatalog(scores);
    return buildCatalog(scores, entityKind);
  }, [scores, entityKind]);

  return (
    <aside className="rounded-lg border bg-card p-2">
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {groups.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            selectedScoreId={selectedScoreId}
            onSelect={onSelect}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
        {!groups.length && (
          <p className="p-3 text-xs text-muted-foreground">Sem scores para esta entidade.</p>
        )}
      </div>
    </aside>
  );
}

function SidebarGroup({
  group,
  selectedScoreId,
  onSelect,
  favorites,
  onToggleFavorite,
}: {
  group: CatalogGroup;
  selectedScoreId: string;
  onSelect: (id: string) => void;
  favorites: string[];
  onToggleFavorite?: (id: string) => void;
}) {
  const hasSelected = group.scores.some((s) => s.id === selectedScoreId);
  const [open, setOpen] = useState(hasSelected || group.scores.length <= 8);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/60"
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          {group.label}
        </span>
        <span className="text-[10px] font-normal opacity-70">{group.scores.length}</span>
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {group.scores.map((score) => {
            const active = score.id === selectedScoreId;
            const isFav = favorites.includes(score.id);
            return (
              <li key={score.id}>
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(score.id)}
                    className="flex-1 truncate text-left"
                  >
                    {score.name}
                  </button>
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(score.id)}
                      className={cn(
                        "opacity-0 transition-opacity group-hover:opacity-100",
                        isFav && "opacity-100",
                      )}
                      aria-label={isFav ? "Remover favorito" : "Adicionar favorito"}
                    >
                      <Star className={cn("size-3.5", isFav && "fill-current text-amber-500")} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
