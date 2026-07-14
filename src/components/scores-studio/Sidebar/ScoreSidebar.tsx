import { Star, Plus, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { ScoreDefinition, ScoreEntityKind, ScoreId } from "@/lib/scores";

const ENTITY_LABEL: Record<ScoreEntityKind, string> = {
  player: "Jogadores",
  coach: "Treinadores",
  club: "Clubes",
  competition: "Competições",
  country: "Países",
};

interface Props {
  scores: ScoreDefinition[];
  selectedScoreId: string;
  favorites: Set<string>;
  entityFilter: ScoreEntityKind | "all";
  categoryFilter: string;
  tagFilter: string;
  searchTerm: string;
  onSearch: (value: string) => void;
  onEntityFilter: (value: ScoreEntityKind | "all") => void;
  onCategoryFilter: (value: string) => void;
  onTagFilter: (value: string) => void;
  onSelectScore: (id: ScoreId) => void;
  onToggleFavorite: (id: string) => void;
  onCreateScore: (kind: ScoreEntityKind) => void;
  onDuplicateScore: (id: ScoreId) => void;
  onRemoveScore: (id: ScoreId) => void;
}

export function ScoreSidebar(props: Props) {
  const categories = Array.from(new Set(props.scores.map((score) => score.categoryId))).sort();
  const tags = Array.from(
    new Set(props.scores.flatMap((score) => score.tags ?? []).map((tag) => tag.toLowerCase())),
  ).sort();

  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Biblioteca</CardTitle>
        <div className="space-y-2">
          <Label className="text-xs">Pesquisa</Label>
          <Input
            placeholder="Score, categoria, tag..."
            value={props.searchTerm}
            onChange={(event) => props.onSearch(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Select
            value={props.entityFilter}
            onValueChange={(value) => props.onEntityFilter(value as ScoreEntityKind | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              {Object.entries(ENTITY_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={props.categoryFilter} onValueChange={props.onCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={props.tagFilter} onValueChange={props.onTagFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => props.onCreateScore("player")}>
            <Plus className="mr-1 size-4" /> Jogador
          </Button>
          <Button size="sm" variant="outline" onClick={() => props.onCreateScore("coach")}>
            <Plus className="mr-1 size-4" /> Treinador
          </Button>
          <Button size="sm" variant="outline" onClick={() => props.onCreateScore("club")}>
            <Plus className="mr-1 size-4" /> Clube
          </Button>
          <Button size="sm" variant="outline" onClick={() => props.onCreateScore("competition")}>
            <Plus className="mr-1 size-4" /> Competição
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => props.onCreateScore("country")}
            className="col-span-2"
          >
            <Plus className="mr-1 size-4" /> País
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[58vh] space-y-2 overflow-auto pr-1">
          {props.scores.map((score) => {
            const active = score.id === props.selectedScoreId;
            return (
              <div
                key={score.id}
                className={`rounded-md border p-2 transition-colors ${active ? "border-primary bg-primary/10" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="min-w-0 text-left"
                    onClick={() => props.onSelectScore(score.id)}
                  >
                    <p className="truncate text-sm font-medium">{score.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{score.id}</p>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => props.onToggleFavorite(score.id)}
                  >
                    <Star
                      className={`size-4 ${props.favorites.has(score.id) ? "fill-current text-yellow-400" : ""}`}
                    />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {ENTITY_LABEL[score.entityKind]}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {score.categoryId}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => props.onDuplicateScore(score.id)}
                  >
                    <Copy className="mr-1 size-3.5" /> Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive"
                    onClick={() => props.onRemoveScore(score.id)}
                  >
                    <Trash2 className="mr-1 size-3.5" /> Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
