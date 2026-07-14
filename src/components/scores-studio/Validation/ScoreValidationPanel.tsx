import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ValidationResult } from "@/lib/scores";

interface Props {
  report: ValidationResult;
}

function IssueList({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: string[];
  tone: "error" | "warning" | "info";
}) {
  const color =
    tone === "error"
      ? "text-red-600"
      : tone === "warning"
        ? "text-yellow-600"
        : "text-muted-foreground";
  return (
    <div className="rounded-md border p-3">
      <h4 className={`mb-2 text-sm font-medium ${color}`}>{title}</h4>
      {issues.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem itens.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {issues.map((issue, index) => (
            <li key={`${title}-${index}`}>• {issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ScoreValidationPanel({ report }: Props) {
  const isHealthy = report.errors.length === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validation</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {isHealthy ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="size-5 text-red-600" />
          )}
          <div className="flex items-center gap-2">
            <Badge variant={isHealthy ? "default" : "destructive"}>
              {isHealthy ? "Sem erros críticos" : `${report.errors.length} erros`}
            </Badge>
            <Badge variant="secondary">{report.warnings.length} warnings</Badge>
            <Badge variant="outline">{report.missingInputs.length} missing</Badge>
            <Badge variant="outline">{report.unusedInputs.length} unused</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <IssueList
          title="Erros"
          issues={report.errors.map((issue) => issue.message)}
          tone="error"
        />
        <IssueList
          title="Warnings"
          issues={report.warnings.map((issue) => issue.message)}
          tone="warning"
        />
        <IssueList title="Missing" issues={report.missingInputs} tone="info" />
        <IssueList title="Unused" issues={report.unusedInputs} tone="info" />
      </div>
    </div>
  );
}
