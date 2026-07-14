import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DebugReport, ExplainResult, ValidationResult } from "@/lib/scores";

interface Props {
  explain: ExplainResult | null;
  validation?: ValidationResult | null;
  debug?: DebugReport | null;
}

export function ScoreExplain({ explain, validation, debug }: Props) {
  if (!explain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Explain</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem explain disponível.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Explain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Score: <b>{(explain.score ?? 0).toFixed(2)}</b>
          </p>
          <p>
            Grade: <b>{explain.grade ?? "n/a"}</b>
          </p>
          <p>
            Confidence: <b>{(explain.confidence?.value ?? 0).toFixed(1)}%</b>
          </p>
          <div className="rounded-md border bg-muted/40 p-2 text-xs max-h-40 overflow-auto">
            {explain.trace.slice(0, 30).map((step, idx) => (
              <p key={`${step.id}-${idx}`}>
                {step.group} | {step.id} | raw={step.rawValue ?? "n/a"} | norm=
                {step.normalizedValue.toFixed(3)} | w={step.weight.toFixed(2)}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {validation ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p>
              Errors: {validation.errors.length} | Warnings: {validation.warnings.length}
            </p>
            {validation.errors.slice(0, 5).map((issue, idx) => (
              <p key={`e-${idx}`}>- {issue.message}</p>
            ))}
            {validation.warnings.slice(0, 5).map((issue, idx) => (
              <p key={`w-${idx}`}>- {issue.message}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {debug ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-52 overflow-auto rounded-md bg-muted p-3 text-xs">
              {debug.text}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
