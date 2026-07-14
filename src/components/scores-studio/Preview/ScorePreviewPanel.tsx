import { Shuffle, RotateCcw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Slider } from "@/components/ui/slider";
import type { ScoreEntityKind } from "@/lib/scores";
import type { StudioScenario } from "../Common/types";
import { getEntityOptions } from "../Common/useScoreStudioState";

interface Props {
  entityKind: ScoreEntityKind;
  entityName: string;
  scenarios: StudioScenario[];
  activeScenarioId: string;
  values: Record<string, number>;
  scoreNow: number;
  scoreBefore: number;
  gradeNow: string;
  gradeBefore: string;
  confidenceNow: number;
  onEntityKind: (kind: ScoreEntityKind) => void;
  onEntityName: (name: string) => void;
  onScenario: (id: string) => void;
  onSaveScenario: (name: string) => void;
  onValueChange: (componentId: string, value: number) => void;
  onReset: () => void;
  onRandomize: () => void;
}

export function ScorePreviewPanel(props: Props) {
  const delta = props.scoreNow - props.scoreBefore;
  const scoreColor =
    delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-foreground";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Playground</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Entidade</Label>
            <Select
              value={props.entityKind}
              onValueChange={(value) => props.onEntityKind(value as ScoreEntityKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="club">Club</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
                <SelectItem value="country">Country</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Select value={props.entityName} onValueChange={props.onEntityName}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getEntityOptions(props.entityKind).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scenario</Label>
            <Select value={props.activeScenarioId} onValueChange={props.onScenario}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {props.scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Score Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{props.scoreNow.toFixed(1)}</div>
            <p className={`text-sm ${scoreColor}`}>
              Delta: {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge>{props.gradeNow}</Badge>
              <span className="text-xs text-muted-foreground">antes: {props.gradeBefore}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{props.confidenceNow.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Simulação por componente</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => props.onSaveScenario(`Scenario ${props.scenarios.length + 1}`)}
            >
              <Save className="mr-1 size-4" /> Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={props.onReset}>
              <RotateCcw className="mr-1 size-4" /> Reset
            </Button>
            <Button size="sm" variant="outline" onClick={props.onRandomize}>
              <Shuffle className="mr-1 size-4" /> Random
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(props.values).map(([id, value]) => (
            <div key={id} className="rounded-md border p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{id}</p>
                </div>
                <Input
                  className="w-24"
                  type="number"
                  value={value}
                  onChange={(event) => props.onValueChange(id, Number(event.target.value))}
                />
              </div>
              <Slider
                value={[value]}
                min={id.startsWith("attribute.") ? 1 : 0}
                max={id.startsWith("attribute.") ? 20 : 100}
                step={1}
                onValueChange={(next) => props.onValueChange(id, next[0] ?? value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
