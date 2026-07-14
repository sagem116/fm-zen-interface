import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScoreDefinition, ScoreEntityKind } from "@/lib/scores";
import type { ScoreEvaluationEntry } from "./types";
import { ScoreCard } from "./ScoreCard";

interface Props {
  score: ScoreDefinition | undefined;
  entityName: string;
  evaluation: ScoreEvaluationEntry | null;
  formula: string;
}

function profilePath(kind: ScoreEntityKind, name: string): string {
  const encoded = encodeURIComponent(name);
  if (kind === "player") return `/jogadores/${encoded}`;
  if (kind === "coach") return `/treinadores/${encoded}`;
  if (kind === "club") return `/clubes/${encoded}`;
  if (kind === "competition") return `/competicoes/${encoded}`;
  return `/paises/${encoded}`;
}

export function ScoreProfile({ score, entityName, evaluation, formula }: Props) {
  if (!score) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Selecione um score.
        </CardContent>
      </Card>
    );
  }

  const components = [
    ...(score.attributeRefs ?? []).map((ref) => ({
      id: ref.attributeId,
      w: ref.weight ?? 1,
      t: "A",
    })),
    ...(score.metricRefs ?? []).map((ref) => ({ id: ref.metricId, w: ref.weight ?? 1, t: "M" })),
    ...(score.contextRefs ?? []).map((ref) => ({ id: ref.contextId, w: ref.weight ?? 1, t: "C" })),
    ...(score.modifierRefs ?? []).map((ref) => ({
      id: ref.modifierId,
      w: ref.weight ?? 1,
      t: "Mod",
    })),
  ];

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{score.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{score.categoryId}</Badge>
            <Badge variant="outline">{score.entityKind}</Badge>
            <Badge variant="outline">{score.status ?? "draft"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{score.description ?? "Sem descrição."}</p>
          <div className="text-xs">
            {}
            <Link
              to={profilePath(score.entityKind, entityName) as any}
              className="text-primary hover:underline"
              search={true}
            >
              Abrir perfil de {entityName}
            </Link>
          </div>
        </CardContent>
      </Card>

      <ScoreCard title={`Score de ${entityName}`} entry={evaluation} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fórmula</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-md bg-muted p-3 text-xs overflow-auto">
            {formula || "Sem componentes."}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Componentes e Pesos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {components.length === 0 ? (
            <p className="text-muted-foreground">Sem componentes.</p>
          ) : (
            components.map((component) => (
              <div
                key={component.id}
                className="flex items-center justify-between rounded-md border px-2 py-1"
              >
                <span>{component.id}</span>
                <span className="tabular-nums">
                  {component.t} | {component.w.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
