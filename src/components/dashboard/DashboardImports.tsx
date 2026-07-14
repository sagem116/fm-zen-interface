import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashboardCard } from "./DashboardCard";
import type { DashboardImport } from "@/lib/dashboard/useDashboardData";

export function DashboardImports({ imports }: { imports: DashboardImport[] }) {
  return (
    <DashboardCard title="Últimos Imports" icon={UploadCloud} action={{ to: "/importar" }}>
      {imports.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Ainda sem imports.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {imports.map((imp) => {
            const warnCount = Array.isArray(imp.warnings) ? imp.warnings.length : 0;
            const ok =
              imp.status === "success" ||
              imp.status === "ok" ||
              (imp.status == null && warnCount === 0);
            return (
              <li
                key={(imp.id ?? "") + imp.created_at}
                className="flex items-center gap-3 py-2 text-sm"
              >
                {ok ? (
                  <CheckCircle2 className="size-4 text-success shrink-0" />
                ) : (
                  <AlertCircle className="size-4 text-amber-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{imp.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {imp.module}
                    {warnCount > 0 && (
                      <>
                        {" "}
                        · {warnCount} aviso{warnCount > 1 ? "s" : ""}
                      </>
                    )}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums hidden sm:inline">
                  {new Date(imp.created_at).toLocaleDateString("pt-PT")}
                </span>
                <Link
                  to="/importar"
                  className="text-xs text-gold hover:underline shrink-0"
                  search={{ tab: undefined }}
                >
                  Detalhes
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
