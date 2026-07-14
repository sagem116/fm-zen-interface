import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SmartPickerItem {
  id: string;
  name: string;
  abbreviation?: string;
  aliases?: string[];
  category?: string;
  subcategory?: string;
  description?: string;
}

export interface Selection {
  weight: number;
}

interface SmartPickerProps {
  items: SmartPickerItem[];
  selected: Record<string, Selection>;
  onToggle: (id: string, on: boolean) => void;
  onWeight: (id: string, weight: number) => void;
  emptyLabel?: string;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SmartPicker({ items, selected, onToggle, onWeight, emptyLabel }: SmartPickerProps) {
  const [query, setQuery] = useState("");
  const [subFilter, setSubFilter] = useState<string>("all");

  const subcategories = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) if (i.subcategory) set.add(i.subcategory);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter((it) => {
      if (subFilter !== "all" && it.subcategory !== subFilter) return false;
      if (!q) return true;
      const hay = [it.name, it.abbreviation ?? "", ...(it.aliases ?? [])]
        .map(normalize)
        .join(" | ");
      return hay.includes(q);
    });
  }, [items, query, subFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, SmartPickerItem[]>();
    for (const it of filtered) {
      const key = it.subcategory ?? "outros";
      const arr = groups.get(key) ?? [];
      arr.push(it);
      groups.set(key, arr);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Pesquisar por nome, sinónimo ou abreviatura…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={subFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSubFilter("all")}
            >
              todas
            </Badge>
            {subcategories.map((sub) => (
              <Badge
                key={sub}
                variant={subFilter === sub ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSubFilter(sub)}
              >
                {sub}
              </Badge>
            ))}
          </div>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {Object.keys(selected).length} selecionados · {filtered.length} visíveis
        </div>
      </div>

      <ScrollArea className="h-[320px] rounded-md border p-2">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {emptyLabel ?? "Sem resultados."}
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([groupKey, groupItems]) => (
              <div key={groupKey} className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {groupKey}
                </div>
                <div className="grid gap-1">
                  {groupItems.map((it) => {
                    const isSel = it.id in selected;
                    const weight = selected[it.id]?.weight ?? 10;
                    return (
                      <div
                        key={it.id}
                        className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                          isSel ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={(v) => onToggle(it.id, !!v)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{it.name}</span>
                            {it.abbreviation && (
                              <span className="text-xs text-muted-foreground">
                                {it.abbreviation}
                              </span>
                            )}
                          </div>
                          {it.description && (
                            <div className="truncate text-xs text-muted-foreground">
                              {it.description}
                            </div>
                          )}
                        </div>
                        {isSel && (
                          <div className="flex w-40 items-center gap-2">
                            <Slider
                              min={1}
                              max={30}
                              step={1}
                              value={[weight]}
                              onValueChange={(v) => onWeight(it.id, v[0] ?? weight)}
                            />
                            <span className="w-6 text-right text-xs tabular-nums">
                              {weight}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
