import type { ScoreEntityKind } from "@/lib/scores";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Props {
  entityKind: ScoreEntityKind | "all";
  category: string;
  tag: string;
  status: "all" | "draft" | "active" | "deprecated";
  favoritesOnly: boolean;
  categories: string[];
  tags: string[];
  onEntityKind: (value: ScoreEntityKind | "all") => void;
  onCategory: (value: string) => void;
  onTag: (value: string) => void;
  onStatus: (value: "all" | "draft" | "active" | "deprecated") => void;
  onFavoritesOnly: (value: boolean) => void;
}

export function ScoreFilters(props: Props) {
  return (
    <div className="grid gap-2 md:grid-cols-5">
      <Select
        value={props.entityKind}
        onValueChange={(value) => props.onEntityKind(value as ScoreEntityKind | "all")}
      >
        <SelectTrigger>
          <SelectValue placeholder="Entidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="player">Jogadores</SelectItem>
          <SelectItem value="coach">Treinadores</SelectItem>
          <SelectItem value="club">Clubes</SelectItem>
          <SelectItem value="competition">Competições</SelectItem>
          <SelectItem value="country">Países</SelectItem>
        </SelectContent>
      </Select>

      <Select value={props.category} onValueChange={props.onCategory}>
        <SelectTrigger>
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {props.categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={props.tag} onValueChange={props.onTag}>
        <SelectTrigger>
          <SelectValue placeholder="Tag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas tags</SelectItem>
          {props.tags.map((tag) => (
            <SelectItem key={tag} value={tag}>
              {tag}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={props.status}
        onValueChange={(value) =>
          props.onStatus(value as "all" | "draft" | "active" | "deprecated")
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos estados</SelectItem>
          <SelectItem value="draft">draft</SelectItem>
          <SelectItem value="active">active</SelectItem>
          <SelectItem value="deprecated">deprecated</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between rounded-md border px-3">
        <Label htmlFor="scores-fav-only" className="text-xs">
          Favoritos
        </Label>
        <Switch
          id="scores-fav-only"
          checked={props.favoritesOnly}
          onCheckedChange={props.onFavoritesOnly}
        />
      </div>
    </div>
  );
}
