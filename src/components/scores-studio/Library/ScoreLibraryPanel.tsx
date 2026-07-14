import { ArrowDownAZ, ArrowDownZA, Copy, PencilLine, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ScoreDefinition } from "@/lib/scores";

interface Props {
  scores: ScoreDefinition[];
  selectedScoreId?: string;
  sortKey: "name" | "category" | "position" | "duty" | "status" | "updatedAt";
  sortDirection: "asc" | "desc";
  onSortChange: (key: Props["sortKey"]) => void;
  onSelectScore?: (id: string) => void;
  onDuplicateScore?: (id: string) => void;
  onRemoveScore?: (id: string) => void;
  onToggleStatus?: (score: ScoreDefinition) => void;
}

function scorePosition(score: ScoreDefinition): string {
  const metadataPosition = score.metadata?.position;
  if (typeof metadataPosition === "string" && metadataPosition.trim()) return metadataPosition;
  if (score.categoryId.includes("goalkeeper")) return "GK";
  if (score.categoryId.includes("defender")) return "DEF";
  if (score.categoryId.includes("midfielder")) return "MID";
  if (score.categoryId.includes("forward")) return "FWD";
  return "—";
}

function scoreDuty(score: ScoreDefinition): string {
  const metadataDuty = score.metadata?.duty;
  if (typeof metadataDuty === "string" && metadataDuty.trim()) return metadataDuty;
  const tags = new Set((score.tags ?? []).map((tag) => tag.toLowerCase()));
  if (tags.has("attack")) return "Ataque";
  if (tags.has("defend") || tags.has("defensive")) return "Defesa";
  if (tags.has("support")) return "Suporte";
  if (tags.has("balanced")) return "Equilibrado";
  return "—";
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function ScoreLibraryPanel(props: Props) {
  const sortableHeader = (label: string, key: Props["sortKey"]) => (
    <button
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => onSortChange(key)}
    >
      {label}
      {sortKey === key ? (
        sortDirection === "asc" ? (
          <ArrowDownAZ className="size-3.5" />
        ) : (
          <ArrowDownZA className="size-3.5" />
        )
      ) : null}
    </button>
  );

  const {
    scores,
    selectedScoreId,
    sortKey,
    sortDirection,
    onSortChange,
    onSelectScore,
    onDuplicateScore,
    onRemoveScore,
    onToggleStatus,
  } = props;

  const sortedScores = [...scores].sort((left, right) => {
    const compare = (leftValue: string | number, rightValue: string | number) => {
      if (typeof leftValue === "number" && typeof rightValue === "number")
        return leftValue - rightValue;
      return String(leftValue).localeCompare(String(rightValue));
    };
    const leftMap = {
      name: left.name,
      category: left.categoryId,
      position: scorePosition(left),
      duty: scoreDuty(left),
      status: left.status ?? "draft",
      updatedAt: left.metadata?.updatedAt ?? left.metadata?.createdAt ?? left.version ?? "",
    } as const;
    const rightMap = {
      name: right.name,
      category: right.categoryId,
      position: scorePosition(right),
      duty: scoreDuty(right),
      status: right.status ?? "draft",
      updatedAt: right.metadata?.updatedAt ?? right.metadata?.createdAt ?? right.version ?? "",
    } as const;
    const key = sortKey;
    const comparison = compare(String(leftMap[key] ?? ""), String(rightMap[key] ?? ""));
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">Score Studio Library</CardTitle>
        <p className="text-sm text-muted-foreground">
          Gestão central de scores com seleção, status, duplicação e remoção.
        </p>
      </CardHeader>
      <CardContent>
        <div className="max-h-[55vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{sortableHeader("Nome", "name")}</TableHead>
                <TableHead>{sortableHeader("Categoria", "category")}</TableHead>
                <TableHead>{sortableHeader("Posição", "position")}</TableHead>
                <TableHead>{sortableHeader("Duty", "duty")}</TableHead>
                <TableHead>Atributos</TableHead>
                <TableHead>Métricas</TableHead>
                <TableHead>{sortableHeader("Estado", "status")}</TableHead>
                <TableHead>{sortableHeader("Last change", "updatedAt")}</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedScores.map((score) => {
                const active = score.id === selectedScoreId;
                return (
                  <TableRow key={score.id} className={active ? "bg-primary/5" : ""}>
                    <TableCell className="min-w-[240px]">
                      <button className="text-left" onClick={() => onSelectScore?.(score.id)}>
                        <div className="font-medium">{score.name}</div>
                        <div className="text-xs text-muted-foreground">{score.id}</div>
                      </button>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">{score.categoryId}</TableCell>
                    <TableCell>{scorePosition(score)}</TableCell>
                    <TableCell>{scoreDuty(score)}</TableCell>
                    <TableCell>{score.attributeRefs?.length ?? 0}</TableCell>
                    <TableCell>{score.metricRefs?.length ?? 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          score.status === "active"
                            ? "default"
                            : score.status === "deprecated"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {score.status ?? "draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(score.metadata?.updatedAt as string | undefined)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => onSelectScore?.(score.id)}
                        >
                          <PencilLine className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => onDuplicateScore?.(score.id)}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => onToggleStatus?.(score)}
                        >
                          {score.status === "active" ? (
                            <Square className="size-4" />
                          ) : (
                            <Play className="size-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive"
                          onClick={() => onRemoveScore?.(score.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
